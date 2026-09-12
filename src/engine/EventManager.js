// Event Manager handling stages, random absurd events, power-ups, and snarky commentary

import { SNARKY_MESSAGES } from './Constants.js';

export class EventManager {
  constructor(game) {
    this.game = game;
    this.stage = 1;
    this.stageName = 'Stage 1: Normal';
    this.timeElapsed = 0;
    this.lastEventTime = 0;
    this.activeEvent = null;
    this.activeEventTimer = 0;

    this.taxSeason = false;
    this.currentCommentary = 'CURRENT RULE: Hitting obstacles is good. Dodging is bad.';
    this.commentaryTimer = 0;
  }

  reset() {
    this.stage = 1;
    this.stageName = 'Stage 1: Normal';
    this.timeElapsed = 0;
    this.lastEventTime = 0;
    this.activeEvent = null;
    this.activeEventTimer = 0;
    this.taxSeason = false;
    this.currentCommentary = 'CURRENT RULE: Hitting obstacles is good. Dodging is bad.';
    this.commentaryTimer = 0;
  }

  update(dt) {
    this.timeElapsed += dt;

    // Stage progression
    if (this.timeElapsed > 60 && this.stage < 4) {
      this.setStage(4, 'Stage 4: Unstable Chaos');
    } else if (this.timeElapsed > 35 && this.stage < 3) {
      this.setStage(3, 'Stage 3: Chaotic Escalation');
    } else if (this.timeElapsed > 15 && this.stage < 2) {
      this.setStage(2, 'Stage 2: Suspicious Behavior');
    }

    // Active event timer
    if (this.activeEvent) {
      this.activeEventTimer -= dt;
      if (this.activeEventTimer <= 0) {
        this.clearActiveEvent();
      }
    }

    // Random absurd events starting in stage 3 & 4
    if (this.stage >= 3 && !this.activeEvent && (this.timeElapsed - this.lastEventTime > 16)) {
      if (Math.random() < 0.6) {
        this.triggerRandomEvent();
      }
      this.lastEventTime = this.timeElapsed;
    }

    // Periodic snarky commentary
    this.commentaryTimer += dt;
    if (this.commentaryTimer > 6.5) {
      this.commentaryTimer = 0;
      this.triggerPeriodicCommentary();
    }
  }

  setStage(stage, name) {
    this.stage = stage;
    this.stageName = name;
    this.game.showBanner(`⚠️ ${name.toUpperCase()}!`, 2.5);
  }

  triggerRandomEvent() {
    const events = ['REVERSE_DAY', 'TAX_SEASON', 'PROMOTION', 'MOTIVATION'];
    const selected = events[Math.floor(Math.random() * events.length)];

    switch (selected) {
      case 'REVERSE_DAY':
        this.activeEvent = 'REVERSE_DAY';
        this.activeEventTimer = 7.0;
        this.game.inputManager.setReversed(true);
        this.game.showBanner('🔄 GAME UPDATE: LEFT IS NOW RIGHT. THANK YOU.', 3.0);
        this.currentCommentary = '⚠️ CONTROLS REVERSED: Left is Right! Enjoy the confusion.';
        break;

      case 'TAX_SEASON':
        this.activeEvent = 'TAX_SEASON';
        this.activeEventTimer = 8.0;
        this.taxSeason = true;
        this.game.showBanner('💸 TAX SEASON: Coin penalties are now DOUBLED (-100)!', 3.0);
        this.currentCommentary = '💸 TAX SEASON: Avoid coins at all costs!';
        break;

      case 'PROMOTION':
        this.activeEvent = 'PROMOTION';
        this.activeEventTimer = 6.0;
        this.game.obstacleManager.boostFrequency(1.8);
        this.game.showBanner('🎖️ CONGRATULATIONS! You have been promoted to Obstacle Magnet.', 3.0);
        this.currentCommentary = '🚨 PROMOTION: More obstacles coming your way!';
        break;

      case 'MOTIVATION':
        const quotes = [
          'Failure is not just an option, it is your duty.',
          'Why avoid pain when it gives you +100 points?',
          'True masters face oncoming trains head first.',
          'Doubt kills more dreams than hitting concrete ever will.',
        ];
        const quote = quotes[Math.floor(Math.random() * quotes.length)];
        this.game.showBanner(`💡 INSPIRATION: "${quote}"`, 3.5);
        break;
    }
  }

  clearActiveEvent() {
    if (this.activeEvent === 'REVERSE_DAY') {
      this.game.inputManager.setReversed(false);
      this.game.showBanner('✅ Controls restored to normal.', 2.0);
    } else if (this.activeEvent === 'TAX_SEASON') {
      this.taxSeason = false;
      this.game.showBanner('🏦 Tax season has concluded.', 2.0);
    } else if (this.activeEvent === 'PROMOTION') {
      this.game.obstacleManager.resetFrequency();
    }
    this.activeEvent = null;
    this.currentCommentary = 'CURRENT RULE: Hitting obstacles is good. Dodging is bad.';
  }

  triggerPeriodicCommentary() {
    const list = SNARKY_MESSAGES.SURVIVAL;
    const msg = list[Math.floor(Math.random() * list.length)];
    this.currentCommentary = msg;
  }

  // Called when player avoids too many obstacles
  checkSkillDetection(avoidStreak) {
    if (avoidStreak >= 4 && !this.activeEvent) {
      this.game.showBanner('🛑 SKILL ISSUE DETECTED: You are playing too well! Stop dodging!', 3.0);
      this.game.obstacleManager.boostSpeed(1.3, 4.0);
    }
  }

  applyPowerup(type) {
    if (type === 'POWERUP_SPEED') {
      this.game.obstacleManager.boostSpeed(1.7, 5.0);
      this.game.showBanner('🚀 SPEED BOOST: Congratulations. You made it worse.', 3.0);
      this.game.audio.playPowerupSound();
      return 'SPEED BOOST (FASTER PAIN)';
    } else if (type === 'POWERUP_MAGNET') {
      this.game.obstacleManager.activateMagnet(5.0);
      this.game.showBanner('🧲 MAGNET ACTIVATED: Pulling obstacles directly to you!', 3.0);
      this.game.audio.playPowerupSound();
      return 'OBSTACLE MAGNET';
    } else if (type === 'POWERUP_INVERT') {
      this.game.inputManager.setReversed(true);
      setTimeout(() => {
        if (this.game.inputManager && this.activeEvent !== 'REVERSE_DAY') {
          this.game.inputManager.setReversed(false);
          this.game.showBanner('👓 Invert goggles expired. Controls normal.', 2.0);
        }
      }, 5000);
      this.game.showBanner('👓 INVERTED GOGGLES: Left is Right! You asked for this.', 3.0);
      this.game.audio.playPowerupSound();
      return 'INVERT GOGGLES';
    }
    return 'POWER-UP';
  }
}
