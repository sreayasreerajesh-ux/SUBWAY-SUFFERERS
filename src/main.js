// Main Application Entrypoint: DOM wiring, modals, UI callbacks, and lifecycle

import { Game, GAME_STATES } from './engine/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const gameCanvas = document.getElementById('game-canvas');
  const monitorCanvas = document.getElementById('webcam-monitor');
  const settingsCamCanvas = document.getElementById('settings-camera-canvas');

  // Screens
  const screenTitle = document.getElementById('screen-title');
  const screenHowToPlay = document.getElementById('screen-how-to-play');
  const screenAchievements = document.getElementById('screen-achievements');
  const screenSettings = document.getElementById('screen-settings');
  const screenPause = document.getElementById('screen-pause');
  const screenGameOver = document.getElementById('screen-game-over');
  const gameHUD = document.getElementById('game-hud');

  // HUD Elements
  const hudScore = document.getElementById('hud-score');
  const hudHighscore = document.getElementById('hud-highscore');
  const hudCombo = document.getElementById('hud-combo');
  const hudStageName = document.getElementById('hud-stage-name');
  const hudRatingBar = document.getElementById('hud-rating-bar');
  const hudRatingText = document.getElementById('hud-rating-text');
  const hudTickerText = document.getElementById('hud-ticker-text');
  const hudBanner = document.getElementById('hud-banner');

  // Status Badges
  const titleCamBadge = document.getElementById('title-cam-badge');
  const webcamStatusDot = document.getElementById('webcam-status-dot');
  const webcamStatusText = document.getElementById('webcam-status-text');

  // Toast
  const achievementToast = document.getElementById('achievement-toast');
  const toastName = document.getElementById('toast-name');
  let toastTimeout = null;

  // UI Callbacks
  const uiCallbacks = {
    onGameStateChange(state) {
      if (state === GAME_STATES.PLAYING) {
        screenTitle.classList.add('hidden');
        screenPause.classList.add('hidden');
        screenGameOver.classList.add('hidden');
        gameHUD.classList.remove('hidden');
      } else if (state === GAME_STATES.PAUSED) {
        screenPause.classList.remove('hidden');
      } else if (state === GAME_STATES.GAMEOVER) {
        screenPause.classList.add('hidden');
        screenGameOver.classList.remove('hidden');
      } else if (state === GAME_STATES.MENU) {
        screenTitle.classList.remove('hidden');
        screenPause.classList.add('hidden');
        screenGameOver.classList.add('hidden');
        gameHUD.classList.add('hidden');
      }
    },

    updateHUD(data) {
      // Score
      hudScore.textContent = (data.score >= 0 ? '+' : '') + data.score;
      if (data.score >= 0) {
        hudScore.className = 'hud-value positive';
      } else {
        hudScore.className = 'hud-value negative';
      }

      hudHighscore.textContent = (data.highScore >= 0 ? '+' : '') + data.highScore;
      hudCombo.textContent = `×${data.combo}`;
      hudStageName.textContent = data.stageName;

      // Failure Rating
      hudRatingBar.style.width = `${data.failureRating}%`;
      hudRatingText.textContent = `${data.failureRating}%`;

      // Rule commentary
      if (data.controlsReversed) {
        hudTickerText.textContent = '🔄 CONTROLS REVERSED! LEFT IS RIGHT!';
      } else {
        hudTickerText.textContent = data.commentary;
      }
    },

    updateBanner(text) {
      if (text) {
        hudBanner.textContent = text;
        hudBanner.classList.remove('hidden');
      } else {
        hudBanner.classList.add('hidden');
      }
    },

    showAchievementToast(ach) {
      toastName.textContent = `${ach.icon} ${ach.title}`;
      achievementToast.classList.remove('hidden');
      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        achievementToast.classList.add('hidden');
      }, 3500);
    },

    showGameOverModal(data) {
      document.getElementById('go-score').textContent = (data.score >= 0 ? '+' : '') + data.score;
      document.getElementById('go-rating').textContent = `${data.failureRating}%`;
      document.getElementById('go-verdict').textContent = data.verdict;

      document.getElementById('go-stat-hit').textContent = data.stats.obstaclesHit;
      document.getElementById('go-stat-avoid').textContent = data.stats.obstaclesAvoided;
      document.getElementById('go-stat-trains').textContent = data.stats.trainsHit;
      document.getElementById('go-stat-coins-got').textContent = data.stats.coinsCollected;
      document.getElementById('go-stat-coins-missed').textContent = data.stats.coinsMissed;
      document.getElementById('go-stat-achievements').textContent = `${data.achievementsCount}/10`;
    },

    onWebcamStatus(status) {
      const btnEnableCam = document.getElementById('btn-enable-cam');
      if (status.active) {
        titleCamBadge.innerHTML = '<span class="status-dot online"></span> 📷 Webcam Vision AI Active (Lean Left/Right to Steer, Jump, Duck)';
        webcamStatusDot.className = 'status-dot online';
        webcamStatusText.textContent = 'VISION AI ACTIVE';
        if (btnEnableCam) {
          btnEnableCam.textContent = '📷 CAMERA ACTIVE ✓';
          btnEnableCam.className = 'arcade-btn btn-secondary';
        }
      } else {
        titleCamBadge.innerHTML = `<span class="status-dot"></span> ⌨️ ${status.message || 'Keyboard Ready'}`;
        webcamStatusDot.className = 'status-dot';
        webcamStatusText.textContent = 'KEYBOARD ACTIVE';
      }
    },
  };

  // Instantiate Game Engine
  const game = new Game(gameCanvas, monitorCanvas, uiCallbacks);
  game.init();

  // Settings preview loop
  let settingsPreviewActive = false;
  function updateSettingsCamera() {
    if (settingsPreviewActive && settingsCamCanvas && game.webcam) {
      game.webcam.renderMonitor(settingsCamCanvas);
      requestAnimationFrame(updateSettingsCamera);
    }
  }

  // --- BUTTON EVENT LISTENERS ---

  // Enable/Test Webcam Button
  const btnEnableCam = document.getElementById('btn-enable-cam');
  if (btnEnableCam) {
    btnEnableCam.addEventListener('click', async () => {
      btnEnableCam.textContent = '⏳ REQUESTING CAMERA...';
      const ok = await game.webcam.start();
      if (ok) {
        btnEnableCam.textContent = '📷 CAMERA ACTIVE ✓';
        btnEnableCam.className = 'arcade-btn btn-secondary';
      } else {
        btnEnableCam.textContent = '⚠️ CAMERA BLOCKED - RETRY';
        alert(game.webcam.errorMessage || 'Please check browser camera permissions (click the camera icon in your address bar).');
      }
    });
  }

  // HUD In-Game Quick Calibrate Button
  const btnHudCamCalib = document.getElementById('btn-hud-cam-calib');
  if (btnHudCamCalib) {
    btnHudCamCalib.addEventListener('click', () => {
      game.webcam.calibrateNeutral();
      game.showBanner('🎯 NEUTRAL CENTER CALIBRATED!', 2.0);
    });
  }

  // Play button
  document.getElementById('btn-play').addEventListener('click', async () => {
    if (!game.webcam.isRunning && game.webcam.isEnabled) {
      await game.webcam.start().catch(() => {});
    }
    game.startNewGame();
  });

  // How to Play Modal
  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    screenHowToPlay.classList.remove('hidden');
  });

  document.getElementById('btn-close-how-to-play').addEventListener('click', () => {
    screenHowToPlay.classList.add('hidden');
  });

  // Reveal Truth Toggle
  const btnRevealTruth = document.getElementById('btn-reveal-truth');
  const truthContent = document.getElementById('actual-truth-content');
  btnRevealTruth.addEventListener('click', () => {
    truthContent.classList.toggle('hidden');
    btnRevealTruth.textContent = truthContent.classList.contains('hidden')
      ? '⚠️ CLICK TO REVEAL THE ACTUAL TRUTH'
      : '🙈 HIDE TRUTH (PRETEND TO BE GOOD)';
  });

  // Achievements Modal
  const btnAchievements = document.getElementById('btn-achievements');
  const achievementsGrid = document.getElementById('achievements-grid');
  btnAchievements.addEventListener('click', () => {
    renderAchievementsList();
    screenAchievements.classList.remove('hidden');
  });

  document.getElementById('btn-close-achievements').addEventListener('click', () => {
    screenAchievements.classList.add('hidden');
  });

  function renderAchievementsList() {
    achievementsGrid.innerHTML = '';
    const all = game.achievementManager.getAll();
    all.forEach((item) => {
      const el = document.createElement('div');
      el.className = `achievement-item ${item.unlocked ? 'unlocked' : 'locked'}`;
      el.innerHTML = `
        <span class="ach-icon">${item.icon}</span>
        <div class="ach-info">
          <div class="ach-title">${item.title} ${item.unlocked ? '✓' : '🔒'}</div>
          <div class="ach-desc">${item.desc}</div>
        </div>
      `;
      achievementsGrid.appendChild(el);
    });
  }

  // Settings Modal
  document.getElementById('btn-settings').addEventListener('click', () => {
    settingsPreviewActive = true;
    screenSettings.classList.remove('hidden');
    updateSettingsCamera();
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => {
    settingsPreviewActive = false;
    screenSettings.classList.add('hidden');
  });

  // Webcam Toggle inside Settings
  const btnToggleCamEnable = document.getElementById('btn-toggle-camera-enable');
  btnToggleCamEnable.addEventListener('click', () => {
    const isEnabled = game.webcam.toggleEnabled();
    btnToggleCamEnable.textContent = isEnabled ? 'ENABLED' : 'DISABLED';
    btnToggleCamEnable.className = `arcade-btn ${isEnabled ? 'btn-secondary' : 'btn-outline'}`;
  });

  // HUD Webcam button toggle
  document.getElementById('btn-hud-cam-toggle').addEventListener('click', () => {
    const isEnabled = game.webcam.toggleEnabled();
    btnToggleCamEnable.textContent = isEnabled ? 'ENABLED' : 'DISABLED';
  });

  // Sensitivity Slider
  const sensitivitySlider = document.getElementById('sensitivity-slider');
  const sensitivityVal = document.getElementById('sensitivity-val');
  sensitivitySlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    game.webcam.sensitivity = val;
    sensitivityVal.textContent = `${val.toFixed(1)}×`;
  });

  // Recalibrate button
  document.getElementById('btn-recalibrate').addEventListener('click', () => {
    game.webcam.calibrateNeutral();
    alert('Center position re-calibrated. Keep your neutral face centered in frame.');
  });

  // Audio Toggles
  const btnQuickMute = document.getElementById('btn-quick-mute');
  const btnTitleMute = document.getElementById('btn-title-mute');

  function toggleAudio() {
    game.audio.init();
    const muted = game.audio.toggleMute();
    btnQuickMute.textContent = muted ? '🔇' : '🔊';
    btnTitleMute.textContent = muted ? '🔇 AUDIO: OFF' : '🔊 AUDIO: ON';
  }

  btnQuickMute.addEventListener('click', toggleAudio);
  btnTitleMute.addEventListener('click', toggleAudio);

  // Pause Controls
  document.getElementById('btn-quick-pause').addEventListener('click', () => {
    game.pauseGame();
  });

  document.getElementById('btn-resume').addEventListener('click', () => {
    game.resumeGame();
  });

  document.getElementById('btn-pause-restart').addEventListener('click', () => {
    game.startNewGame();
  });

  document.getElementById('btn-pause-quit').addEventListener('click', () => {
    game.state = GAME_STATES.MENU;
    game.audio.stopMusic();
    uiCallbacks.onGameStateChange(GAME_STATES.MENU);
  });

  // Game Over Buttons
  document.getElementById('btn-retry').addEventListener('click', () => {
    game.startNewGame();
  });

  document.getElementById('btn-go-menu').addEventListener('click', () => {
    game.state = GAME_STATES.MENU;
    uiCallbacks.onGameStateChange(GAME_STATES.MENU);
  });
});
