// Obstacle and Entity Manager handling 3D-Z projection, spawning, and collision checks

import { LANES, LANE_X_OFFSETS, OBSTACLE_TYPES } from './Constants.js';

export class ObstacleManager {
  constructor(game) {
    this.game = game;
    this.items = []; // all active objects on track
    this.baseSpeed = 340;
    this.currentSpeed = this.baseSpeed;
    this.speedMultiplier = 1.0;
    this.speedBoostTimer = 0;

    this.spawnTimer = 0;
    this.spawnInterval = 1.6; // seconds between spawns
    this.frequencyMultiplier = 1.0;

    this.magnetActive = false;
    this.magnetTimer = 0;

    this.totalDistance = 0;
  }

  reset() {
    this.items = [];
    this.baseSpeed = 340;
    this.currentSpeed = this.baseSpeed;
    this.speedMultiplier = 1.0;
    this.speedBoostTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.6;
    this.frequencyMultiplier = 1.0;
    this.magnetActive = false;
    this.magnetTimer = 0;
    this.totalDistance = 0;
  }

  boostSpeed(multiplier, duration) {
    this.speedMultiplier = multiplier;
    this.speedBoostTimer = duration;
  }

  boostFrequency(multiplier) {
    this.frequencyMultiplier = multiplier;
  }

  resetFrequency() {
    this.frequencyMultiplier = 1.0;
  }

  activateMagnet(duration) {
    this.magnetActive = true;
    this.magnetTimer = duration;
  }

  update(dt, player) {
    // Speed boost timer
    if (this.speedBoostTimer > 0) {
      this.speedBoostTimer -= dt;
      if (this.speedBoostTimer <= 0) {
        this.speedMultiplier = 1.0;
      }
    }

    // Magnet timer
    if (this.magnetTimer > 0) {
      this.magnetTimer -= dt;
      if (this.magnetTimer <= 0) {
        this.magnetActive = false;
      }
    }

    // Gradually ramp speed over time
    const stageSpeedBonus = (this.game.eventManager.stage - 1) * 35;
    this.currentSpeed = (this.baseSpeed + stageSpeedBonus) * this.speedMultiplier;
    this.totalDistance += this.currentSpeed * dt;

    // Spawning logic
    this.spawnTimer -= dt * this.frequencyMultiplier;
    if (this.spawnTimer <= 0) {
      this.spawnPattern();
      // Decrease spawn interval as stages increase
      const baseInterval = Math.max(0.9, 1.6 - (this.game.eventManager.stage - 1) * 0.2);
      this.spawnTimer = (baseInterval + Math.random() * 0.4) / this.frequencyMultiplier;
    }

    // Update all items moving along Z towards camera
    const playerBox = player.getHitbox();

    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.z -= this.currentSpeed * dt;

      // Magnet effect: attract obstacles to player lane!
      if (this.magnetActive && item.isObstacle && item.z > 80 && item.z < 600) {
        if (item.lane !== player.lane) {
          item.lane = player.lane;
          item.targetX = LANE_X_OFFSETS[item.lane];
        }
      }

      // Smooth horizontal shift if lane changes
      item.x += (item.targetX - item.x) * Math.min(1.0, dt * 10);

      // Check collision and crossings when object reaches player depth (z ~= 0 to 45)
      if (!item.resolved) {
        this.checkInteraction(item, playerBox, player);
      }

      // Remove objects that have passed far behind camera
      if (item.z < -160) {
        this.items.splice(i, 1);
      }
    }
  }

  checkInteraction(item, playerBox, player) {
    // Interaction window: around z = 0
    const inZRange = item.z <= 40 && item.z >= -40;

    if (!inZRange) return;

    const sameLane = Math.abs(item.x - player.x) < 48;

    if (item.isCoin) {
      if (sameLane && !item.collected && !item.passed) {
        // Did player touch coin?
        if (playerBox.y < 80) {
          // Collected!
          item.collected = true;
          item.resolved = true;
          this.game.onCoinCollected(item);
        }
      } else if (item.z <= -15 && !item.collected && !item.passed) {
        // Missed coin!
        item.passed = true;
        item.resolved = true;
        this.game.onCoinMissed(item);
      }
      return;
    }

    if (item.isPowerup) {
      if (sameLane && !item.collected) {
        item.collected = true;
        item.resolved = true;
        this.game.onPowerupCollected(item);
      }
      return;
    }

    // Normal or Train Obstacle
    if (item.isObstacle) {
      if (sameLane && !item.collided && !item.avoided) {
        let isHit = false;

        if (item.type === OBSTACLE_TYPES.BARRIER || item.type === OBSTACLE_TYPES.LOW_BARRIER) {
          // Jumpable: hitting happens if NOT jumping
          if (!playerBox.isJumping) {
            isHit = true;
          }
        } else if (item.type === OBSTACLE_TYPES.OVERHEAD) {
          // Overhead beam: hitting happens if NOT ducking
          if (!playerBox.isDucking) {
            isHit = true;
          }
        } else if (item.type === OBSTACLE_TYPES.TRAIN) {
          // Train cannot be jumped over or ducked under! Direct hit!
          isHit = true;
        }

        if (isHit) {
          item.collided = true;
          item.resolved = true;
          this.game.onObstacleHit(item, player);
        }
      }

      // If obstacle passed player without collision
      if (item.z <= -20 && !item.collided && !item.avoided) {
        item.avoided = true;
        item.resolved = true;
        this.game.onObstacleAvoided(item, player);
      }
    }
  }

  spawnPattern() {
    const stage = this.game.eventManager.stage;
    const rand = Math.random();

    // Spawn powerups occasionally in stages 2+
    if (stage >= 2 && Math.random() < 0.18) {
      const powerups = [OBSTACLE_TYPES.POWERUP_SPEED, OBSTACLE_TYPES.POWERUP_MAGNET, OBSTACLE_TYPES.POWERUP_INVERT];
      const pType = powerups[Math.floor(Math.random() * powerups.length)];
      const pLane = Math.floor(Math.random() * 3);
      this.createItem(pType, pLane, 950);
      return;
    }

    // Pattern 1: Single Obstacle (ground or overhead)
    if (rand < 0.35) {
      const lane = Math.floor(Math.random() * 3);
      const type = Math.random() < 0.65 ? OBSTACLE_TYPES.BARRIER : OBSTACLE_TYPES.OVERHEAD;
      this.createItem(type, lane, 950);

      // Maybe spawn coins in other lanes to tempt the player!
      const coinLane = (lane + 1 + Math.floor(Math.random() * 2)) % 3;
      this.spawnCoinTrail(coinLane, 950, 3);
      return;
    }

    // Pattern 2: Subway Train
    if (rand < 0.65) {
      const trainLane = Math.floor(Math.random() * 3);
      this.createItem(OBSTACLE_TYPES.TRAIN, trainLane, 980);
      this.game.audio.playTrainHorn();

      // Spawn coins in a safe lane
      const otherLane = (trainLane + 1) % 3;
      if (Math.random() < 0.7) {
        this.spawnCoinTrail(otherLane, 980, 4);
      }
      return;
    }

    // Pattern 3: Multi-Lane Obstacle (stages 2+)
    if (stage >= 2 && rand < 0.85) {
      const openLane = Math.floor(Math.random() * 3);
      for (let l = 0; l < 3; l++) {
        if (l !== openLane) {
          const type = Math.random() < 0.5 ? OBSTACLE_TYPES.BARRIER : OBSTACLE_TYPES.OVERHEAD;
          this.createItem(type, l, 950);
        }
      }
      // Fill open lane with dangerous coins!
      this.spawnCoinTrail(openLane, 950, 3);
      return;
    }

    // Pattern 4: Coin Storm (tempting golden treasure)
    const coinLane1 = Math.floor(Math.random() * 3);
    this.spawnCoinTrail(coinLane1, 950, 4);
    if (stage >= 3) {
      const coinLane2 = (coinLane1 + 1) % 3;
      this.spawnCoinTrail(coinLane2, 980, 3);
    }
  }

  spawnCoinTrail(lane, startZ, count) {
    const spacing = 75;
    for (let i = 0; i < count; i++) {
      this.createItem(OBSTACLE_TYPES.COIN, lane, startZ + i * spacing);
    }
  }

  createItem(type, lane, z) {
    const isObstacle = [
      OBSTACLE_TYPES.BARRIER,
      OBSTACLE_TYPES.LOW_BARRIER,
      OBSTACLE_TYPES.OVERHEAD,
      OBSTACLE_TYPES.TRAIN,
    ].includes(type);

    const isCoin = type === OBSTACLE_TYPES.COIN;
    const isPowerup = [
      OBSTACLE_TYPES.POWERUP_SPEED,
      OBSTACLE_TYPES.POWERUP_MAGNET,
      OBSTACLE_TYPES.POWERUP_INVERT,
    ].includes(type);

    const item = {
      type,
      lane,
      x: LANE_X_OFFSETS[lane],
      targetX: LANE_X_OFFSETS[lane],
      z,
      isObstacle,
      isCoin,
      isPowerup,
      collided: false,
      avoided: false,
      collected: false,
      passed: false,
      resolved: false,
      animCycle: Math.random() * 10,
    };

    this.items.push(item);
    return item;
  }
}
