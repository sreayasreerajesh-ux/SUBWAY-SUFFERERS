// Reverse Scoring System & Satirical Failure Metrics

import { SCORING } from './Constants.js';

export class ScoreSystem {
  constructor() {
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('subway_sufferes_highscore') || '0', 10);
    this.combo = 1;
    this.maxCombo = 1;

    this.stats = {
      obstaclesHit: 0,
      obstaclesAvoided: 0,
      trainsHit: 0,
      coinsCollected: 0,
      coinsMissed: 0,
      powerupsUsed: 0,
      survivalTimeSeconds: 0,
      fallsCount: 0,
    };
  }

  reset() {
    this.score = 0;
    this.combo = 1;
    this.maxCombo = 1;
    this.stats = {
      obstaclesHit: 0,
      obstaclesAvoided: 0,
      trainsHit: 0,
      coinsCollected: 0,
      coinsMissed: 0,
      powerupsUsed: 0,
      survivalTimeSeconds: 0,
      fallsCount: 0,
    };
  }

  // Hit obstacle -> REWARD
  onHitObstacle(isTrain = false) {
    const base = isTrain ? SCORING.HIT_TRAIN : SCORING.HIT_OBSTACLE;
    const points = base * this.combo;
    this.score += points;

    this.stats.obstaclesHit++;
    if (isTrain) this.stats.trainsHit++;

    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }

    this.checkHighScore();
    return { points, combo: this.combo, type: isTrain ? 'TRAIN CRASH!' : 'HIT!' };
  }

  // Avoid obstacle -> PUNISHMENT
  onAvoidObstacle(isPerfect = false) {
    const penalty = isPerfect ? SCORING.PERFECT_AVOID : SCORING.AVOID_OBSTACLE;
    this.score += penalty; // negative number decreases score
    this.stats.obstaclesAvoided++;
    this.combo = 1; // broken combo!
    return { points: penalty, combo: this.combo, type: isPerfect ? 'PERFECT DODGE (WHY?!)' : 'AVOIDED (-10)' };
  }

  // Collect coin -> PUNISHMENT (-50)
  onCollectCoin() {
    const penalty = SCORING.COLLECT_COIN;
    this.score += penalty;
    this.stats.coinsCollected++;
    this.combo = 1; // Greed breaks combo!
    return { points: penalty, combo: this.combo, type: 'FINANCIAL DISASTER (-50)' };
  }

  // Miss coin -> REWARD (+10)
  onMissCoin() {
    const points = SCORING.MISS_COIN * Math.min(this.combo, 5);
    this.score += points;
    this.stats.coinsMissed++;
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    this.checkHighScore();
    return { points, combo: this.combo, type: 'RESPONSIBLE SPENDING (+10)' };
  }

  // Harmful powerup activated -> REWARD
  onActivatePowerup(name) {
    const points = SCORING.ACTIVATE_HARMFUL_POWERUP * this.combo;
    this.score += points;
    this.stats.powerupsUsed++;
    this.combo++;
    this.checkHighScore();
    return { points, combo: this.combo, type: `POW: ${name}` };
  }

  // Fall off track -> REWARD
  onFallOff() {
    const points = SCORING.FALL_OFF_MAP;
    this.score += points;
    this.stats.fallsCount++;
    this.checkHighScore();
    return { points, combo: this.combo, type: 'FALLING WITH STYLE (+300)' };
  }

  getFailureRating() {
    const badDecisions = this.stats.obstaclesHit + this.stats.coinsMissed + this.stats.powerupsUsed + this.stats.fallsCount;
    const goodDecisions = this.stats.obstaclesAvoided + this.stats.coinsCollected;
    const total = badDecisions + goodDecisions;

    if (total === 0) return 100;
    const rating = Math.round((badDecisions / total) * 100);
    return Math.max(0, Math.min(100, rating));
  }

  checkHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('subway_sufferes_highscore', this.highScore.toString());
    }
  }

  getVerdict() {
    const rating = this.getFailureRating();
    if (this.score < 0) {
      return 'TRAGICALLY COMPETENT: You clearly did not read the manual. Why did you try so hard?';
    }
    if (rating >= 95) {
      return 'MASTER OF DISASTER: You understood the assignment flawlessly. Pure chaotic excellence.';
    }
    if (rating >= 80) {
      return 'PROFESSIONAL BLUNDERER: Splendidly terrible performance. You have a bright future in messing up.';
    }
    if (rating >= 60) {
      return 'MEDIOCRE AT FAILING: You hit things, but occasionally dodged like a coward. Commit to the chaos!';
    }
    return 'DANGEROUSLY SKILLED: You kept avoiding obstacles and hoarding coins. Please leave.';
  }
}
