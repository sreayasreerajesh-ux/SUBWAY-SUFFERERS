// 2.5D Perspective Track Renderer with Parallax Skyline, Particles, Screen Shake, and Pixel Sprites

import { LANES, LANE_X_OFFSETS, OBSTACLE_TYPES, PLAYER_STATES } from './Constants.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.focalLength = 320;
    this.cameraY = 160;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;

    // Particles & Popups
    this.particles = [];
    this.popups = [];
    this.comicBubbles = [];

    // Background track animation offset
    this.trackOffset = 0;

    // Parallax billboard lights
    this.neonBlink = 0;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  triggerShake(intensity = 15) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  addParticle(x, y, color, count = 12, speed = 180, isConfetti = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const vel = (Math.random() * 0.7 + 0.3) * speed;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel - (isConfetti ? 120 : 40),
        size: isConfetti ? Math.random() * 6 + 4 : Math.random() * 5 + 3,
        color: Array.isArray(color) ? color[Math.floor(Math.random() * color.length)] : color,
        life: 1.0,
        decay: Math.random() * 0.8 + 0.8,
        isConfetti,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }

  addScorePopup(text, x, y, color = '#22c55e', isBig = false) {
    this.popups.push({
      text,
      x,
      y,
      color,
      isBig,
      life: 1.0,
      decay: isBig ? 0.7 : 1.2,
      vy: isBig ? -70 : -45,
    });
  }

  addComicBubble(text, x, y, duration = 2.0) {
    this.comicBubbles.push({
      text,
      x,
      y,
      life: duration,
      maxLife: duration,
    });
  }

  // Perspective 3D -> 2D projection
  project(worldX, worldY, worldZ, cw, ch) {
    const horizonY = ch * 0.42;
    const groundY = ch * 0.90;

    // Projection factor
    const z = Math.max(-120, worldZ);
    const scale = this.focalLength / (this.focalLength + z + 120);

    const screenX = cw * 0.5 + worldX * scale * 2.8;
    const baseScreenY = horizonY + (groundY - horizonY) * scale;
    const screenY = baseScreenY - worldY * scale * 2.2;

    return {
      x: screenX,
      y: screenY,
      baseY: baseScreenY,
      scale: Math.max(0, scale),
      visible: z >= -120 && scale > 0.05,
    };
  }

  render(game, dt) {
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const ctx = this.ctx;

    // Update screen shake
    if (this.shakeIntensity > 0) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 35);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    ctx.save();
    ctx.translate(this.shakeOffsetX, this.shakeOffsetY);

    // 1. Draw Parallax Sky & Skyline
    this.drawSkyline(ctx, cw, ch, dt);

    // 2. Draw 2.5D Perspective Track & Tunnels
    this.drawTracks(ctx, cw, ch, game.obstacleManager.totalDistance);

    // 3. Collect items and player for depth sorting (back to front by Z)
    const drawList = [];

    // Obstacles, coins, powerups
    for (const item of game.obstacleManager.items) {
      drawList.push({
        type: 'ITEM',
        z: item.z,
        item,
      });
    }

    // Player entity at z = 0
    drawList.push({
      type: 'PLAYER',
      z: 0,
      player: game.player,
    });

    // Sort descending by Z so farthest objects render first
    drawList.sort((a, b) => b.z - a.z);

    // Render sorted entities
    for (const entity of drawList) {
      if (entity.type === 'ITEM') {
        this.drawItem(ctx, entity.item, cw, ch);
      } else if (entity.type === 'PLAYER') {
        this.drawPlayer(ctx, entity.player, cw, ch);
      }
    }

    // 4. Particles & Popups
    this.updateAndDrawParticles(ctx, dt);
    this.updateAndDrawPopups(ctx, dt);
    this.updateAndDrawComicBubbles(ctx, cw, ch, dt);

    ctx.restore();
  }

  drawSkyline(ctx, cw, ch, dt) {
    const horizonY = ch * 0.42;

    // Gradient retro sunset/cyber sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, '#0c0a20');
    skyGrad.addColorStop(0.5, '#2e1065');
    skyGrad.addColorStop(0.85, '#831843');
    skyGrad.addColorStop(1.0, '#f59e0b');

    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, cw, horizonY + 2);

    // Retro glowing sun / horizon flare
    const sunGrad = ctx.createRadialGradient(cw * 0.5, horizonY, 10, cw * 0.5, horizonY, cw * 0.35);
    sunGrad.addColorStop(0, 'rgba(255, 230, 100, 0.9)');
    sunGrad.addColorStop(0.3, 'rgba(244, 63, 94, 0.4)');
    sunGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(cw * 0.5, horizonY, cw * 0.35, Math.PI, 0);
    ctx.fill();

    // Distant skyscraper silhouettes
    ctx.fillStyle = '#170f2f';
    const numBuildings = 14;
    const bWidth = cw / numBuildings;
    for (let i = 0; i < numBuildings; i++) {
      const bh = 30 + ((i * 37) % 80);
      const bx = i * bWidth;
      ctx.fillRect(bx, horizonY - bh, bWidth - 2, bh);

      // Skyscraper lit windows
      ctx.fillStyle = (i % 2 === 0) ? '#fde047' : '#06b6d4';
      for (let wy = horizonY - bh + 6; wy < horizonY - 6; wy += 12) {
        if ((i + wy) % 3 === 0) {
          ctx.fillRect(bx + 4, wy, 3, 5);
          ctx.fillRect(bx + bWidth - 9, wy, 3, 5);
        }
      }
      ctx.fillStyle = '#170f2f';
    }

    // Tunnel wall sides receding into perspective
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(cw * 0.15, horizonY);
    ctx.lineTo(0, ch);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cw, 0);
    ctx.lineTo(cw * 0.85, horizonY);
    ctx.lineTo(cw, ch);
    ctx.fill();
  }

  drawTracks(ctx, cw, ch, totalDistance) {
    const horizonY = ch * 0.42;

    // Track bed background (ballast gravel)
    const trackGrad = ctx.createLinearGradient(0, horizonY, 0, ch);
    trackGrad.addColorStop(0, '#1e293b');
    trackGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = trackGrad;

    const pLeftNear = this.project(-220, 0, -40, cw, ch);
    const pRightNear = this.project(220, 0, -40, cw, ch);
    const pLeftFar = this.project(-220, 0, 1000, cw, ch);
    const pRightFar = this.project(220, 0, 1000, cw, ch);

    ctx.beginPath();
    ctx.moveTo(pLeftNear.x, pLeftNear.baseY);
    ctx.lineTo(pLeftFar.x, pLeftFar.baseY);
    ctx.lineTo(pRightFar.x, pRightFar.baseY);
    ctx.lineTo(pRightNear.x, pRightNear.baseY);
    ctx.closePath();
    ctx.fill();

    // Moving Wooden Sleepers (Ties)
    const tieSpacing = 65;
    const tieOffset = totalDistance % tieSpacing;

    for (let z = 1000; z >= -60; z -= 35) {
      const actualZ = z - tieOffset;
      if (actualZ < -60 || actualZ > 1000) continue;

      const p1 = this.project(-180, 0, actualZ, cw, ch);
      const p2 = this.project(180, 0, actualZ, cw, ch);

      if (p1.visible) {
        ctx.fillStyle = '#3e2723';
        ctx.lineWidth = Math.max(1.5, 6 * p1.scale);
        ctx.strokeStyle = '#271915';

        const tieHeight = Math.max(1, 5 * p1.scale);
        ctx.fillRect(p1.x, p1.baseY, p2.x - p1.x, tieHeight);
      }
    }

    // Lane Rails (Left, Center-Left, Center-Right, Right)
    const laneDividers = [-210, -70, 70, 210];
    for (const lx of laneDividers) {
      const near = this.project(lx, 0, -50, cw, ch);
      const far = this.project(lx, 0, 1000, cw, ch);

      // Steel rail
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = Math.max(2, 6 * near.scale);
      ctx.beginPath();
      ctx.moveTo(near.x, near.baseY);
      ctx.lineTo(far.x, far.baseY);
      ctx.stroke();

      // Top specular highlight
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = Math.max(1, 2 * near.scale);
      ctx.beginPath();
      ctx.moveTo(near.x, near.baseY - 1);
      ctx.lineTo(far.x, far.baseY - 1);
      ctx.stroke();
    }

    // Overhead Tunnel Arches with caution stripes
    const archSpacing = 280;
    const archOffset = totalDistance % archSpacing;
    for (let z = 1000; z >= 0; z -= archSpacing) {
      const actualZ = z - archOffset;
      if (actualZ < 0 || actualZ > 1000) continue;

      const pLeft = this.project(-200, 160, actualZ, cw, ch);
      const pRight = this.project(200, 160, actualZ, cw, ch);

      if (pLeft.visible) {
        ctx.strokeStyle = '#eab308'; // Warning yellow
        ctx.lineWidth = Math.max(2, 8 * pLeft.scale);
        ctx.beginPath();
        ctx.moveTo(pLeft.x, pLeft.baseY);
        ctx.lineTo(pLeft.x, pLeft.y);
        ctx.lineTo(pRight.x, pRight.y);
        ctx.lineTo(pRight.x, pRight.baseY);
        ctx.stroke();

        // Flashing beacon light on top
        ctx.fillStyle = (Math.sin(totalDistance * 0.05 + actualZ) > 0) ? '#ef4444' : '#7f1d1d';
        const midX = (pLeft.x + pRight.x) * 0.5;
        const bSize = Math.max(2, 8 * pLeft.scale);
        ctx.beginPath();
        ctx.arc(midX, pLeft.y - bSize, bSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawPlayer(ctx, player, cw, ch) {
    const proj = this.project(player.x, player.y, 0, cw, ch);
    if (!proj.visible) return;

    const s = proj.scale * 1.5;
    const x = proj.x;
    const y = proj.y;
    const groundY = proj.baseY;

    ctx.save();
    ctx.translate(x, y);

    if (player.state === PLAYER_STATES.FALLING) {
      ctx.rotate(player.rotation);
    }

    // 1. Cast Shadow on ground rail
    const shadowScale = Math.max(0.2, 1.0 - player.y / 280);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, groundY - y, 22 * s * shadowScale, 7 * s * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Character Body Rendering (Chunky Retro Runner)
    const isDucking = player.state === PLAYER_STATES.DUCKING;
    const isHit = player.state === PLAYER_STATES.HIT;
    const legSwing = Math.sin(player.runCycle) * (player.y === 0 ? 14 : 2);

    if (isDucking) {
      // Ducking crouch slide
      ctx.fillStyle = '#0284c7'; // Blue pants slide
      ctx.fillRect(-18 * s, -14 * s, 36 * s, 14 * s);

      ctx.fillStyle = '#e11d48'; // Red hoodie
      ctx.fillRect(-16 * s, -28 * s, 32 * s, 16 * s);

      // Cap & Head lowered
      ctx.fillStyle = '#fbcfe8'; // Face
      ctx.fillRect(-10 * s, -38 * s, 20 * s, 12 * s);
      ctx.fillStyle = '#fbbf24'; // Backwards cap
      ctx.fillRect(-14 * s, -42 * s, 28 * s, 8 * s);

      // Slide spark particles
      if (Math.random() < 0.4) {
        this.addParticle(x + (Math.random() - 0.5) * 20, groundY - 2, '#fbbf24', 2, 80);
      }
    } else {
      // Running or Jumping Stature
      // Legs
      ctx.fillStyle = '#0284c7';
      // Left leg
      ctx.fillRect(-12 * s, -24 * s, 9 * s, 24 * s + legSwing * s);
      // Right leg
      ctx.fillRect(3 * s, -24 * s, 9 * s, 24 * s - legSwing * s);

      // Sneakers
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-14 * s, -2 * s + legSwing * s, 12 * s, 5 * s);
      ctx.fillRect(2 * s, -2 * s - legSwing * s, 12 * s, 5 * s);

      // Torso / Hoodie
      ctx.fillStyle = isHit ? '#f43f5e' : '#e11d48';
      ctx.fillRect(-16 * s, -52 * s, 32 * s, 30 * s);

      // Spray paint logo on hoodie
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-6 * s, -42 * s, 12 * s, 10 * s);

      // Head / Face
      ctx.fillStyle = '#fed7aa';
      ctx.fillRect(-11 * s, -68 * s, 22 * s, 18 * s);

      // Eyes
      if (isHit) {
        // Dizzy X eyes
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${Math.round(10 * s)}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('X X', 0, -56 * s);
      } else {
        // Pixel sunglasses
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-9 * s, -64 * s, 18 * s, 6 * s);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-7 * s, -63 * s, 4 * s, 3 * s);
        ctx.fillRect(3 * s, -63 * s, 4 * s, 3 * s);
      }

      // Backwards Cap
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-14 * s, -74 * s, 28 * s, 8 * s);
      ctx.fillRect(6 * s, -70 * s, 10 * s, 4 * s); // cap bill facing backwards
    }

    // Spinning stars when hit
    if (isHit) {
      const starAngle = Date.now() * 0.01;
      ctx.fillStyle = '#facc15';
      for (let i = 0; i < 3; i++) {
        const a = starAngle + (i * Math.PI * 2) / 3;
        const sx = Math.cos(a) * 26 * s;
        const sy = Math.sin(a) * 10 * s - 72 * s;
        ctx.fillText('⭐', sx, sy);
      }
    }

    ctx.restore();
  }

  drawItem(ctx, item, cw, ch) {
    const proj = this.project(item.x, 0, item.z, cw, ch);
    if (!proj.visible) return;

    const s = proj.scale * 1.5;
    const x = proj.x;
    const groundY = proj.baseY;

    ctx.save();
    ctx.translate(x, groundY);

    if (item.type === OBSTACLE_TYPES.BARRIER || item.type === OBSTACLE_TYPES.LOW_BARRIER) {
      // Road barrier with hazard stripes
      const w = 48 * s;
      const h = 38 * s;

      // Wooden legs
      ctx.fillStyle = '#475569';
      ctx.fillRect(-w * 0.45, -h, 6 * s, h);
      ctx.fillRect(w * 0.45 - 6 * s, -h, 6 * s, h);

      // Hazard bar
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.5, -h + 8 * s, w, 16 * s);

      // Black stripes
      ctx.fillStyle = '#0f172a';
      for (let sx = -w * 0.45; sx < w * 0.45; sx += 14 * s) {
        ctx.beginPath();
        ctx.moveTo(sx, -h + 8 * s);
        ctx.lineTo(sx + 8 * s, -h + 24 * s);
        ctx.lineTo(sx + 4 * s, -h + 24 * s);
        ctx.lineTo(sx - 4 * s, -h + 8 * s);
        ctx.fill();
      }

      // Blinking red beacon
      ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#ef4444' : '#7f1d1d';
      ctx.beginPath();
      ctx.arc(0, -h + 4 * s, 4 * s, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.type === OBSTACLE_TYPES.OVERHEAD) {
      // Overhead gantry / Low clearance beam
      const w = 54 * s;
      const h = 76 * s;

      // Metal side poles
      ctx.fillStyle = '#64748b';
      ctx.fillRect(-w * 0.5, -h, 5 * s, h);
      ctx.fillRect(w * 0.5 - 5 * s, -h, 5 * s, h);

      // Overhead caution banner
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-w * 0.5, -h, w, 18 * s);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.max(6, Math.round(7 * s))}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('DUCK OR HIT', 0, -h + 12 * s);
    } else if (item.type === OBSTACLE_TYPES.TRAIN) {
      // Massive Subway Locomotive
      const w = 62 * s;
      const h = 100 * s;
      const depth = 90 * s;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(-w * 0.55, -8 * s, w * 1.1, 14 * s);

      // Locomotive Front Face
      const trainGrad = ctx.createLinearGradient(0, -h, 0, 0);
      trainGrad.addColorStop(0, '#0284c7');
      trainGrad.addColorStop(0.6, '#0369a1');
      trainGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = trainGrad;
      ctx.fillRect(-w * 0.5, -h, w, h);

      // Windshield
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-w * 0.4, -h + 16 * s, w * 0.8, 26 * s);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(-w * 0.35, -h + 18 * s, 10 * s, 22 * s);

      // Glowing Headlights
      const lightY = -h + 52 * s;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-w * 0.3, lightY, 7 * s, 0, Math.PI * 2);
      ctx.arc(w * 0.3, lightY, 7 * s, 0, Math.PI * 2);
      ctx.fill();

      // Headlight Beam
      ctx.fillStyle = 'rgba(254, 240, 138, 0.15)';
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, lightY);
      ctx.lineTo(-w * 0.8, 0);
      ctx.lineTo(w * 0.8, 0);
      ctx.lineTo(w * 0.3, lightY);
      ctx.fill();

      // Front Cowcatcher / Bumper grill
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-w * 0.52, -18 * s, w * 1.04, 16 * s);
      ctx.fillStyle = '#0f172a';
      for (let bx = -w * 0.45; bx < w * 0.45; bx += 10 * s) {
        ctx.fillRect(bx, -18 * s, 4 * s, 16 * s);
      }
    } else if (item.isCoin) {
      // Rotating Golden Coin
      const coinY = -35 * s;
      const spin = Math.sin(Date.now() * 0.007 + item.x);
      const coinW = Math.max(2, Math.abs(spin) * 14 * s);
      const coinH = 16 * s;

      // Glow aura
      ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.beginPath();
      ctx.ellipse(0, coinY, 18 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      // Gold medallion
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(0, coinY, coinW, coinH, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(0, coinY, coinW * 0.65, coinH * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.isPowerup) {
      // Floating Crate with glowing icon
      const bob = Math.sin(Date.now() * 0.006) * 6 * s;
      const crateY = -40 * s + bob;
      const size = 30 * s;

      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(-size * 0.5, crateY - size * 0.5, size, size);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2 * s;
      ctx.strokeRect(-size * 0.5, crateY - size * 0.5, size, size);

      // Icon
      ctx.font = `${Math.round(16 * s)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let icon = '🎁';
      if (item.type === OBSTACLE_TYPES.POWERUP_SPEED) icon = '🚀';
      else if (item.type === OBSTACLE_TYPES.POWERUP_MAGNET) icon = '🧲';
      else if (item.type === OBSTACLE_TYPES.POWERUP_INVERT) icon = '👓';

      ctx.fillText(icon, 0, crateY);
    }

    ctx.restore();
  }

  updateAndDrawParticles(ctx, dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * p.decay;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt; // gravity
      p.rotation += p.rotSpeed * dt;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;

      if (p.isConfetti) {
        ctx.fillRect(-p.size * 0.5, -p.size * 0.25, p.size, p.size * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  updateAndDrawPopups(ctx, dt) {
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.life -= dt * pop.decay;
      if (pop.life <= 0) {
        this.popups.splice(i, 1);
        continue;
      }

      pop.y += pop.vy * dt;

      ctx.save();
      ctx.globalAlpha = Math.max(0, pop.life);
      ctx.fillStyle = pop.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = pop.isBig ? 4 : 2.5;
      ctx.font = `bold ${pop.isBig ? '20px' : '15px'} "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }
  }

  updateAndDrawComicBubbles(ctx, cw, ch, dt) {
    for (let i = this.comicBubbles.length - 1; i >= 0; i--) {
      const b = this.comicBubbles[i];
      b.life -= dt;
      if (b.life <= 0) {
        this.comicBubbles.splice(i, 1);
        continue;
      }

      ctx.save();
      const alpha = Math.min(1.0, b.life * 2);
      ctx.globalAlpha = alpha;

      ctx.font = 'bold 12px monospace';
      const textWidth = ctx.measureText(b.text).width;
      const padX = 14;
      const padY = 8;
      const bw = textWidth + padX * 2;
      const bh = 28;

      const bx = Math.max(bw / 2 + 10, Math.min(cw - bw / 2 - 10, b.x));
      const by = b.y - 45;

      // Comic Bubble Box
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.roundRect(bx - bw / 2, by - bh / 2, bw, bh, 8);
      ctx.fill();
      ctx.stroke();

      // Tail pointing to player
      ctx.beginPath();
      ctx.moveTo(bx - 6, by + bh / 2);
      ctx.lineTo(bx, by + bh / 2 + 10);
      ctx.lineTo(bx + 6, by + bh / 2);
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(b.text, bx, by);

      ctx.restore();
    }
  }
}
