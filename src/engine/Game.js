// Master Game Engine coordinating states, physics, scoring, audio, webcam, and DOM updates

import { Renderer } from './Renderer.js';
import { Player } from './Player.js';
import { ObstacleManager } from './ObstacleManager.js';
import { ScoreSystem } from './ScoreSystem.js';
import { AchievementManager } from './AchievementManager.js';
import { EventManager } from './EventManager.js';
import { AudioManager } from './AudioManager.js';
import { WebcamTracker } from './WebcamTracker.js';
import { InputManager } from './InputManager.js';
import { SNARKY_MESSAGES } from './Constants.js';

export const GAME_STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
};

export class Game {
  constructor(canvas, monitorCanvas, uiCallbacks) {
    this.canvas = canvas;
    this.monitorCanvas = monitorCanvas;
    this.ui = uiCallbacks;

    this.state = GAME_STATES.MENU;
    this.lastTime = 0;

    // Subsystems
    this.renderer = new Renderer(canvas);
    this.player = new Player();
    this.audio = new AudioManager();
    this.scoreSystem = new ScoreSystem();

    this.achievementManager = new AchievementManager((ach) => {
      this.ui.showAchievementToast(ach);
      this.audio.playAchievementSound();
    });

    this.eventManager = new EventManager(this);
    this.obstacleManager = new ObstacleManager(this);

    // Input & Webcam
    this.inputManager = new InputManager(
      (action) => this.handlePlayerAction(action),
      (lane) => this.handleSetLane(lane)
    );
    this.webcam = new WebcamTracker(
      (action) => this.inputManager.handleWebcamAction(action),
      (lane) => this.inputManager.handleSetLane(lane),
      (status) => this.ui.onWebcamStatus(status)
    );

    this.avoidStreak = 0;
    this.survivalTimer = 0;
    this.bannerText = '';
    this.bannerTimer = 0;

    // Secret off-track key trigger: double tap edge lane or key 'X'
    this.bindSecretFall();
  }

  bindSecretFall() {
    window.addEventListener('keydown', (e) => {
      if (this.state === GAME_STATES.PLAYING && (e.key === 'x' || e.key === 'X')) {
        this.triggerSecretFall();
      }
    });
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Try starting webcam (handles errors gracefully if unavailable)
    this.webcam.start();

    // Start master animation loop
    requestAnimationFrame((t) => this.loop(t));
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : window.innerWidth;
    const h = parent ? parent.clientHeight : window.innerHeight;
    this.renderer.resize(w, h);
  }

  startNewGame() {
    this.audio.init();
    this.audio.startMusic();

    // Start webcam on explicit user click if enabled
    if (!this.webcam.isRunning && this.webcam.isEnabled) {
      this.webcam.start().catch((e) => console.warn('Camera autostart:', e));
    }

    this.state = GAME_STATES.PLAYING;
    this.player.reset();
    this.obstacleManager.reset();
    this.scoreSystem.reset();
    this.eventManager.reset();

    this.avoidStreak = 0;
    this.survivalTimer = 0;
    this.bannerText = '';
    this.bannerTimer = 0;

    this.showBanner('🔥 GO! REMEMBER: HITTING OBSTACLES = REWARD!', 3.0);
    this.ui.onGameStateChange(this.state);
  }

  handleSetLane(lane) {
    if (this.state !== GAME_STATES.PLAYING) return;
    this.player.setLane(lane);
  }

  pauseGame() {
    if (this.state === GAME_STATES.PLAYING) {
      this.state = GAME_STATES.PAUSED;
      this.audio.stopMusic();
      this.ui.onGameStateChange(this.state);
    } else if (this.state === GAME_STATES.PAUSED) {
      this.resumeGame();
    }
  }

  resumeGame() {
    if (this.state === GAME_STATES.PAUSED) {
      this.state = GAME_STATES.PLAYING;
      this.audio.startMusic();
      this.lastTime = performance.now();
      this.ui.onGameStateChange(this.state);
    }
  }

  handlePlayerAction(action) {
    if (this.state === GAME_STATES.MENU || this.state === GAME_STATES.GAMEOVER) {
      if (action === 'SPACE') {
        this.startNewGame();
      }
      return;
    }

    if (action === 'PAUSE') {
      this.pauseGame();
      return;
    }

    if (this.state !== GAME_STATES.PLAYING) return;

    switch (action) {
      case 'LEFT':
        this.player.moveLeft();
        break;
      case 'RIGHT':
        this.player.moveRight();
        break;
      case 'JUMP':
      case 'SPACE':
        this.player.jump();
        this.audio.playJumpSound();
        break;
      case 'DUCK':
        this.player.duck();
        this.audio.playDuckSound();
        break;
    }
  }

  // --- GAMEPLAY EVENTS & REVERSE SCORING ---

  onObstacleHit(item, player) {
    const isTrain = item.type === 'TRAIN';
    const res = this.scoreSystem.onHitObstacle(isTrain);
    this.avoidStreak = 0;

    // Camera shake & Audio
    this.renderer.triggerShake(isTrain ? 25 : 14);
    this.audio.playCrashSound(isTrain);
    this.player.hit();

    // Celebration Confetti & Spark Particles (Reward for failing!)
    const proj = this.renderer.project(player.x, player.y, 0, this.canvas.width, this.canvas.height);
    const colors = ['#22c55e', '#eab308', '#ec4899', '#3b82f6', '#f97316'];
    this.renderer.addParticle(proj.x, proj.y, colors, isTrain ? 40 : 20, 260, true);

    // Comic score popup
    this.renderer.addScorePopup(`+${res.points}`, proj.x, proj.y - 30, '#22c55e', true);

    // Snarky positive remark
    const msgs = SNARKY_MESSAGES.HIT;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.renderer.addComicBubble(msg, proj.x, proj.y, 1.8);

    this.checkComboCelebration(res.combo);
    this.checkAchievements();
  }

  onObstacleAvoided(item, player) {
    this.avoidStreak++;
    const res = this.scoreSystem.onAvoidObstacle(false);

    this.audio.playAvoidSound();

    const proj = this.renderer.project(player.x, player.y, 0, this.canvas.width, this.canvas.height);
    this.renderer.addScorePopup(`${res.points}`, proj.x, proj.y - 30, '#ef4444', false);

    const msgs = SNARKY_MESSAGES.AVOID;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.renderer.addComicBubble(msg, proj.x, proj.y, 1.6);

    this.eventManager.checkSkillDetection(this.avoidStreak);
    this.checkAchievements();
  }

  onCoinCollected(item) {
    const res = this.scoreSystem.onCollectCoin();
    this.avoidStreak = 0;

    this.audio.playSadCoinSound();

    const proj = this.renderer.project(item.x, 0, 0, this.canvas.width, this.canvas.height);
    this.renderer.addScorePopup(`${res.points}`, proj.x, proj.y - 20, '#a855f7', true);

    const msgs = SNARKY_MESSAGES.COLLECT_COIN;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.renderer.addComicBubble(msg, proj.x, proj.y, 1.8);

    this.checkAchievements();
  }

  onCoinMissed(item) {
    const res = this.scoreSystem.onMissCoin();
    this.audio.playMissCoinSound();

    const proj = this.renderer.project(item.x, 0, 0, this.canvas.width, this.canvas.height);
    this.renderer.addParticle(proj.x, proj.y, '#fef08a', 8, 90, false);
    this.renderer.addScorePopup(`+${res.points}`, proj.x, proj.y - 20, '#eab308', false);

    const msgs = SNARKY_MESSAGES.MISS_COIN;
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    this.renderer.addComicBubble(msg, proj.x, proj.y, 1.5);

    this.checkComboCelebration(res.combo);
    this.checkAchievements();
  }

  onPowerupCollected(item) {
    const pName = this.eventManager.applyPowerup(item.type);
    const res = this.scoreSystem.onActivatePowerup(pName);

    const proj = this.renderer.project(item.x, 0, 0, this.canvas.width, this.canvas.height);
    this.renderer.addParticle(proj.x, proj.y, ['#38bdf8', '#f59e0b', '#ec4899'], 25, 200, true);
    this.renderer.addScorePopup(`+${res.points}`, proj.x, proj.y - 30, '#38bdf8', true);

    this.checkAchievements();
  }

  triggerSecretFall() {
    if (this.player.state === 'FALLING') return;
    const res = this.scoreSystem.onFallOff();
    this.player.fallOffTrack(this.player.lane === 0 ? -1 : 1);
    this.renderer.triggerShake(20);
    this.showBanner('🪂 ACHIEVEMENT: FALLING WITH STYLE! (+300)', 3.0);
    this.audio.playCrashSound(true);
    this.checkAchievements();

    setTimeout(() => {
      this.endGame();
    }, 1800);
  }

  checkComboCelebration(combo) {
    if (combo > 1 && combo % 2 === 0) {
      this.audio.playComboSound(combo);
      this.showBanner(`🔥 FAILURE COMBO ×${combo}! KEEP FAILING!`, 2.0);
    }
  }

  checkAchievements() {
    this.achievementManager.check(
      this.scoreSystem.stats,
      this.scoreSystem.score,
      this.scoreSystem.combo
    );
  }

  showBanner(text, duration = 3.0) {
    this.bannerText = text;
    this.bannerTimer = duration;
    this.ui.updateBanner(text);
  }

  endGame() {
    this.state = GAME_STATES.GAMEOVER;
    this.audio.stopMusic();

    const stats = this.scoreSystem.stats;
    const score = this.scoreSystem.score;
    const highScore = this.scoreSystem.highScore;
    const failureRating = this.scoreSystem.getFailureRating();
    const verdict = this.scoreSystem.getVerdict();
    const achievementsCount = this.achievementManager.getUnlockedCount();

    this.ui.showGameOverModal({
      score,
      highScore,
      stats,
      failureRating,
      verdict,
      achievementsCount,
    });
    this.ui.onGameStateChange(this.state);
  }

  // Master Game Loop
  loop(time) {
    if (!this.lastTime) this.lastTime = time;
    const dt = Math.min((time - this.lastTime) / 1000, 0.1); // clamp delta
    this.lastTime = time;

    // Update webcam motion
    this.webcam.update();

    if (this.state === GAME_STATES.PLAYING) {
      this.survivalTimer += dt;
      this.scoreSystem.stats.survivalTimeSeconds = Math.floor(this.survivalTimer);

      // Banner timer
      if (this.bannerTimer > 0) {
        this.bannerTimer -= dt;
        if (this.bannerTimer <= 0) {
          this.bannerText = '';
          this.ui.updateBanner('');
        }
      }

      // Update Subsystems
      this.player.update(dt, this.obstacleManager.currentSpeed);
      this.obstacleManager.update(dt, this.player);
      this.eventManager.update(dt);

      // Periodically check achievements
      this.checkAchievements();

      // Update HUD in DOM
      this.ui.updateHUD({
        score: this.scoreSystem.score,
        highScore: this.scoreSystem.highScore,
        combo: this.scoreSystem.combo,
        failureRating: this.scoreSystem.getFailureRating(),
        stageName: this.eventManager.stageName,
        commentary: this.eventManager.currentCommentary,
        speed: Math.round(this.obstacleManager.currentSpeed),
        controlsReversed: this.inputManager.isReversed(),
      });
    }

    // Render Canvas
    this.renderer.render(this, dt);

    // Render retro webcam monitor
    if (this.monitorCanvas) {
      this.webcam.renderMonitor(this.monitorCanvas);
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}
