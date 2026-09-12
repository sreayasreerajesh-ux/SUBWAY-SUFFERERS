// Achievement System tracking 10 satirical badges with LocalStorage persistence

import { ACHIEVEMENTS } from './Constants.js';

export class AchievementManager {
  constructor(onUnlockCallback) {
    this.onUnlock = onUnlockCallback;
    this.achievements = ACHIEVEMENTS;
    this.unlocked = new Set(JSON.parse(localStorage.getItem('subway_sufferes_achievements') || '[]'));
  }

  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  getAll() {
    return this.achievements.map((item) => ({
      ...item,
      unlocked: this.unlocked.has(item.id),
    }));
  }

  check(stats, score, combo) {
    const checks = [
      { id: 'prof_failure', cond: stats.obstaclesHit >= 10 },
      { id: 'financial_disaster', cond: stats.coinsCollected >= 5 },
      { id: 'traffic_violation', cond: stats.trainsHit >= 3 },
      { id: 'pacifist', cond: stats.obstaclesAvoided >= 10 },
      { id: 'worst_player', cond: combo >= 8 },
      { id: 'actually_trying', cond: stats.obstaclesAvoided >= 20 },
      { id: 'game_hates_you', cond: score < 0 },
      { id: 'why_still_playing', cond: stats.survivalTimeSeconds >= 60 },
      { id: 'overqualified', cond: score <= -200 },
      { id: 'falling_with_style', cond: stats.fallsCount >= 1 },
    ];

    checks.forEach(({ id, cond }) => {
      if (cond && !this.unlocked.has(id)) {
        this.unlock(id);
      }
    });
  }

  unlock(id) {
    this.unlocked.add(id);
    localStorage.setItem('subway_sufferes_achievements', JSON.stringify(Array.from(this.unlocked)));

    const ach = this.achievements.find((a) => a.id === id);
    if (ach && this.onUnlock) {
      this.onUnlock(ach);
    }
  }

  getUnlockedCount() {
    return this.unlocked.size;
  }
}
