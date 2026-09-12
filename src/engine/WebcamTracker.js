// High-Precision Adaptive Webcam Motion & Optical Centroid Lane Tracker

export class WebcamTracker {
  constructor(onActionCallback, onSetLaneCallback, onStatusCallback) {
    this.onAction = onActionCallback;
    this.onSetLane = onSetLaneCallback;
    this.onStatus = onStatusCallback;

    this.video = document.createElement('video');
    this.video.setAttribute('playsinline', 'true');
    this.video.setAttribute('webkit-playsinline', 'true');
    this.video.setAttribute('autoplay', 'true');
    this.video.muted = true;

    // Internal low-res processing canvas (80x60 is optimal for fast pixel analysis)
    this.procWidth = 80;
    this.procHeight = 60;
    this.procCanvas = document.createElement('canvas');
    this.procCanvas.width = this.procWidth;
    this.procCanvas.height = this.procHeight;
    this.procCtx = this.procCanvas.getContext('2d', { willReadFrequently: true });

    this.prevFrame = null;
    this.bgFrame = null;
    this.stream = null;
    this.isRunning = false;
    this.isAvailable = false;
    this.isEnabled = true;
    this.errorMessage = '';

    // Head / Body Centroid Tracking (Normalized 0.0 to 1.0)
    this.headX = 0.50; // horizontal center
    this.headY = 0.42; // vertical neutral
    this.neutralY = 0.42; // calibrated baseline
    this.prevHeadY = 0.42;
    this.currentLane = 1; // 0: Left, 1: Center, 2: Right
    this.hasDetection = false;

    // Timers & Cooldowns
    this.lastTriggerTime = {
      jump: 0,
      duck: 0,
      lane: 0,
    };
    this.jumpCooldownMs = 450;
    this.duckCooldownMs = 450;

    this.sensitivity = 1.0;
    this.metrics = {
      activeLane: 'CENTER',
      actionTriggered: null,
      actionTime: 0,
      confidence: 0,
    };
  }

  async start() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.handleError('Camera API not supported in this browser context (requires localhost or HTTPS).');
      return false;
    }

    try {
      // Release any previous stream first
      this.stop();

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      this.video.srcObject = this.stream;
      
      await new Promise((resolve) => {
        this.video.onloadedmetadata = () => {
          this.video.play().then(resolve).catch(resolve);
        };
        setTimeout(resolve, 800); // safety fallback
      });

      this.isAvailable = true;
      this.isRunning = true;
      this.errorMessage = '';
      if (this.onStatus) {
        this.onStatus({ available: true, active: true, message: 'Webcam Connected & Tracking Active' });
      }

      return true;
    } catch (err) {
      console.warn('Webcam startup error:', err);
      let friendlyMsg = 'Webcam unavailable. Playing with keyboard.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        friendlyMsg = 'Camera permission denied! Click the camera icon in your address bar to allow.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        friendlyMsg = 'No webcam detected on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        friendlyMsg = 'Camera is busy with another app (Zoom/Teams/browser tab).';
      }
      this.handleError(friendlyMsg);
      return false;
    }
  }

  handleError(msg) {
    this.isAvailable = false;
    this.isRunning = false;
    this.errorMessage = msg;
    if (this.onStatus) {
      this.onStatus({
        available: false,
        active: false,
        message: msg,
      });
    }
  }

  stop() {
    this.isRunning = false;
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.onStatus) {
      this.onStatus({ available: this.isAvailable, active: false, message: 'Webcam Paused' });
    }
  }

  toggleEnabled() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      if (this.onStatus) {
        this.onStatus({ available: this.isAvailable, active: false, message: 'Webcam Disabled (Keyboard Only)' });
      }
    } else {
      if (!this.stream) {
        this.start();
      } else if (this.onStatus) {
        this.onStatus({ available: this.isAvailable, active: this.isRunning, message: this.isRunning ? 'Webcam Active' : 'Webcam Standby' });
      }
    }
    return this.isEnabled;
  }

  // Calibrate user's current head position as the neutral center
  calibrateNeutral() {
    this.neutralY = this.headY;
    this.prevFrame = null;
    this.bgFrame = null;
    return { x: this.headX, y: this.neutralY };
  }

  // Called each frame in the game loop
  update() {
    if (!this.isRunning || !this.isEnabled || !this.video || this.video.readyState < 2) {
      return;
    }

    const w = this.procWidth;
    const h = this.procHeight;

    // Draw mirrored video frame
    this.procCtx.save();
    this.procCtx.scale(-1, 1);
    this.procCtx.drawImage(this.video, -w, 0, w, h);
    this.procCtx.restore();

    const imgData = this.procCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // Initialize previous & background frames
    if (!this.prevFrame) {
      this.prevFrame = new Uint8Array(w * h);
      this.bgFrame = new Float32Array(w * h);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const g = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        this.prevFrame[j] = g;
        this.bgFrame[j] = g;
      }
      return;
    }

    let sumX = 0;
    let sumY = 0;
    let totalWeight = 0;

    for (let y = 0; y < h; y++) {
      // Weight upper 60% of frame higher to focus on head & face
      const yNorm = y / h;
      const headWeight = yNorm < 0.65 ? (1.5 - yNorm * 1.2) : 0.25;

      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const pIdx = idx * 4;

        const r = data[pIdx];
        const g = data[pIdx + 1];
        const b = data[pIdx + 2];
        const gray = (r * 299 + g * 587 + b * 114) / 1000;

        // Motion difference
        const motion = Math.abs(gray - this.prevFrame[idx]);

        // Background difference
        const bgDiff = Math.abs(gray - this.bgFrame[idx]);
        // Adapt background slowly
        this.bgFrame[idx] = this.bgFrame[idx] * 0.98 + gray * 0.02;

        // Skin tone heuristic across lightings
        const isSkin = r > 45 && g > 25 && b > 15 && (r - g) >= 5 && (r - b) >= 5 && r > g && g > b;

        // Pixel score
        let score = 0;
        if (isSkin) score += 3.0;
        if (motion > 15) score += 2.0;
        if (bgDiff > 20) score += 1.5;

        if (score > 1.0) {
          const wgt = score * headWeight;
          sumX += x * wgt;
          sumY += y * wgt;
          totalWeight += wgt;
        }

        this.prevFrame[idx] = gray;
      }
    }

    // Centroid calculation if enough mass detected
    if (totalWeight > 25) {
      const rawX = (sumX / totalWeight) / w; // 0.0 to 1.0
      const rawY = (sumY / totalWeight) / h; // 0.0 to 1.0

      // Exponential moving average for silky smooth response
      const alpha = 0.30;
      this.headX = this.headX * (1 - alpha) + rawX * alpha;
      this.headY = this.headY * (1 - alpha) + rawY * alpha;
      this.hasDetection = true;
      this.metrics.confidence = Math.min(1.0, totalWeight / 300);
    } else {
      this.hasDetection = false;
      this.metrics.confidence = 0;
    }

    // --- LANE DETECTION (0: LEFT, 1: CENTER, 2: RIGHT) ---
    // User leaning left -> headX < 0.38
    // User centered -> 0.38 to 0.62
    // User leaning right -> headX > 0.62
    let newLane = this.currentLane;
    const hx = this.headX;

    if (this.currentLane === 1) { // Currently CENTER
      if (hx < 0.38) newLane = 0; // Move LEFT
      else if (hx > 0.62) newLane = 2; // Move RIGHT
    } else if (this.currentLane === 0) { // Currently LEFT
      if (hx > 0.44) newLane = 1; // Return to CENTER
    } else if (this.currentLane === 2) { // Currently RIGHT
      if (hx < 0.56) newLane = 1; // Return to CENTER
    }

    if (newLane !== this.currentLane) {
      this.currentLane = newLane;
      this.metrics.activeLane = newLane === 0 ? 'LEFT' : (newLane === 1 ? 'CENTER' : 'RIGHT');
      if (this.onSetLane) {
        this.onSetLane(newLane);
      }
    }

    // --- JUMP & DUCK GESTURES ---
    const now = Date.now();
    const dy = this.headY - this.neutralY;
    const vVel = this.headY - this.prevHeadY; // delta Y

    // Jump: head is significantly above neutral baseline OR moving rapidly up
    if ((dy < -0.08 || vVel < -0.045) && (now - this.lastTriggerTime.jump > this.jumpCooldownMs)) {
      this.triggerAction('JUMP', now);
      this.lastTriggerTime.jump = now;
    }
    // Duck: head is significantly below neutral baseline OR moving rapidly down
    else if ((dy > 0.10 || vVel > 0.045) && (now - this.lastTriggerTime.duck > this.duckCooldownMs)) {
      this.triggerAction('DUCK', now);
      this.lastTriggerTime.duck = now;
    }

    this.prevHeadY = this.headY;
  }

  triggerAction(action, time) {
    this.metrics.actionTriggered = action;
    this.metrics.actionTime = time;
    if (this.onAction) {
      this.onAction(action);
    }
  }

  // Draw high-visibility retro cyber monitor onto canvas
  renderMonitor(targetCanvas) {
    if (!targetCanvas) return;
    const ctx = targetCanvas.getContext('2d');
    const w = targetCanvas.width;
    const h = targetCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (this.isRunning && this.video && this.video.readyState >= 2) {
      // 1. Draw mirrored video
      ctx.save();
      ctx.scale(-1, 1);
      ctx.drawImage(this.video, -w, 0, w, h);
      ctx.restore();

      // CRT phosphor color overlay
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fillRect(0, 0, w, h);

      // 2. Draw 3 Lane Columns
      const xLeft = w * 0.38;
      const xRight = w * 0.62;

      // Left Column
      ctx.fillStyle = this.currentLane === 0 ? 'rgba(34, 197, 94, 0.28)' : 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, xLeft, h);

      // Center Column
      ctx.fillStyle = this.currentLane === 1 ? 'rgba(34, 197, 94, 0.28)' : 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(xLeft, 0, xRight - xLeft, h);

      // Right Column
      ctx.fillStyle = this.currentLane === 2 ? 'rgba(34, 197, 94, 0.28)' : 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(xRight, 0, w - xRight, h);

      // Lane separator lines
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(xLeft, 0);
      ctx.lineTo(xLeft, h);
      ctx.moveTo(xRight, 0);
      ctx.lineTo(xRight, h);
      ctx.stroke();

      // Jump / Duck threshold lines
      const jumpY = (this.neutralY - 0.08) * h;
      const duckY = (this.neutralY + 0.10) * h;
      ctx.strokeStyle = '#facc15';
      ctx.beginPath();
      ctx.moveTo(0, jumpY);
      ctx.lineTo(w, jumpY);
      ctx.moveTo(0, duckY);
      ctx.lineTo(w, duckY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 3. Draw Tracked Head Position Reticle
      const hx = this.headX * w;
      const hy = this.headY * h;

      ctx.strokeStyle = this.hasDetection ? '#22c55e' : '#f59e0b';
      ctx.lineWidth = 2;

      // Reticle Circle
      ctx.beginPath();
      ctx.arc(hx, hy, 12, 0, Math.PI * 2);
      ctx.stroke();

      // Reticle Crosshairs
      ctx.beginPath();
      ctx.moveTo(hx - 18, hy);
      ctx.lineTo(hx + 18, hy);
      ctx.moveTo(hx, hy - 18);
      ctx.lineTo(hx, hy + 18);
      ctx.stroke();

      // Lane text indicator at bottom
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      const laneNames = ['[ LEFT ]', '[ CENTER ]', '[ RIGHT ]'];
      ctx.fillText(`LANE: ${laneNames[this.currentLane]}`, w / 2, h - 8);

      // Action banner if jump/duck recently triggered
      const timeSinceAction = Date.now() - this.metrics.actionTime;
      if (timeSinceAction < 400 && this.metrics.actionTriggered) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.85)';
        ctx.fillRect(0, h / 2 - 12, w, 24);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`GESTURE: ${this.metrics.actionTriggered}`, w / 2, h / 2 + 3);
      }
    } else {
      // Offline / Standby screen
      ctx.fillStyle = '#0a101d';
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.isEnabled ? 'WEBCAM STANDBY' : 'WEBCAM OFF', w / 2, h / 2 - 12);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText('CLICK TO START CAM', w / 2, h / 2 + 4);
      ctx.fillStyle = '#38bdf8';
      ctx.fillText('OR USE KEYBOARD', w / 2, h / 2 + 18);
    }

    // Scanlines
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }

    // Border
    ctx.strokeStyle = this.isRunning ? '#00f0ff' : '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Live Badge
    ctx.fillStyle = this.isRunning ? '#22c55e' : '#ef4444';
    ctx.beginPath();
    ctx.arc(8, 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '7px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(this.isRunning ? 'VISION AI' : 'OFFLINE', 15, 10);
  }
}
