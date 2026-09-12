// Player entity with 3-lane horizontal lerping, jump/duck physics, and collision states

import { LANES, LANE_X_OFFSETS, PLAYER_STATES } from './Constants.js';

export class Player {
  constructor() {
    this.lane = LANES.CENTER;
    this.x = LANE_X_OFFSETS[this.lane];
    this.targetX = this.x;
    this.y = 0; // vertical height above ground
    this.state = PLAYER_STATES.RUNNING;

    this.jumpVel = 0;
    this.gravity = 1400; // px/s^2
    this.jumpStrength = 520;

    this.duckDuration = 0.55;
    this.duckTimer = 0;

    this.hitDuration = 0.4;
    this.hitTimer = 0;

    this.fallTimer = 0;
    this.fallVelY = 0;
    this.fallVelX = 0;
    this.rotation = 0;

    this.runCycle = 0; // for running leg swing animation
    this.width = 44;
    this.height = 70;
  }

  reset() {
    this.lane = LANES.CENTER;
    this.x = LANE_X_OFFSETS[this.lane];
    this.targetX = this.x;
    this.y = 0;
    this.state = PLAYER_STATES.RUNNING;
    this.jumpVel = 0;
    this.duckTimer = 0;
    this.hitTimer = 0;
    this.fallTimer = 0;
    this.rotation = 0;
    this.runCycle = 0;
  }

  moveLeft() {
    if (this.state === PLAYER_STATES.FALLING) return;
    if (this.lane > LANES.LEFT) {
      this.lane--;
      this.targetX = LANE_X_OFFSETS[this.lane];
    }
  }

  moveRight() {
    if (this.state === PLAYER_STATES.FALLING) return;
    if (this.lane < LANES.RIGHT) {
      this.lane++;
      this.targetX = LANE_X_OFFSETS[this.lane];
    }
  }

  setLane(targetLane) {
    if (this.state === PLAYER_STATES.FALLING) return;
    if (targetLane >= LANES.LEFT && targetLane <= LANES.RIGHT && this.lane !== targetLane) {
      this.lane = targetLane;
      this.targetX = LANE_X_OFFSETS[this.lane];
    }
  }

  jump() {
    if (this.state === PLAYER_STATES.FALLING) return;
    if (this.y <= 0 && this.state !== PLAYER_STATES.HIT) {
      this.state = PLAYER_STATES.JUMPING;
      this.jumpVel = this.jumpStrength;
      this.duckTimer = 0;
    }
  }

  duck() {
    if (this.state === PLAYER_STATES.FALLING) return;
    if (this.state === PLAYER_STATES.JUMPING) {
      // Fast drop
      this.jumpVel = -600;
    } else if (this.state !== PLAYER_STATES.HIT) {
      this.state = PLAYER_STATES.DUCKING;
      this.duckTimer = this.duckDuration;
    }
  }

  hit() {
    this.state = PLAYER_STATES.HIT;
    this.hitTimer = this.hitDuration;
  }

  fallOffTrack(direction = 1) {
    this.state = PLAYER_STATES.FALLING;
    this.fallTimer = 2.0;
    this.fallVelX = direction * 220;
    this.fallVelY = -250;
  }

  update(dt, gameSpeed) {
    // Run cycle animation
    this.runCycle += dt * (gameSpeed * 0.035);

    // Smooth horizontal movement towards lane
    if (this.state !== PLAYER_STATES.FALLING) {
      this.x += (this.targetX - this.x) * Math.min(1.0, dt * 18);
    }

    // Handle Falling With Style state
    if (this.state === PLAYER_STATES.FALLING) {
      this.fallTimer -= dt;
      this.fallVelY += this.gravity * 0.8 * dt;
      this.y -= this.fallVelY * dt;
      this.x += this.fallVelX * dt;
      this.rotation += dt * 8.0;
      return;
    }

    // Handle Hit State
    if (this.state === PLAYER_STATES.HIT) {
      this.hitTimer -= dt;
      if (this.hitTimer <= 0) {
        this.state = this.y > 0 ? PLAYER_STATES.JUMPING : PLAYER_STATES.RUNNING;
      }
    }

    // Handle Ducking State
    if (this.state === PLAYER_STATES.DUCKING) {
      this.duckTimer -= dt;
      if (this.duckTimer <= 0) {
        this.state = PLAYER_STATES.RUNNING;
      }
    }

    // Handle Jump Physics
    if (this.y > 0 || this.jumpVel !== 0) {
      this.y += this.jumpVel * dt;
      this.jumpVel -= this.gravity * dt;

      if (this.y <= 0) {
        this.y = 0;
        this.jumpVel = 0;
        if (this.state !== PLAYER_STATES.HIT) {
          this.state = this.duckTimer > 0 ? PLAYER_STATES.DUCKING : PLAYER_STATES.RUNNING;
        }
      } else {
        if (this.state !== PLAYER_STATES.HIT) {
          this.state = PLAYER_STATES.JUMPING;
        }
      }
    }
  }

  getHitbox() {
    // Return relative bounding dimensions
    const isDuck = this.state === PLAYER_STATES.DUCKING;
    return {
      lane: this.lane,
      x: this.x,
      y: this.y,
      width: this.width,
      height: isDuck ? 32 : this.height,
      isJumping: this.y > 35,
      isDucking: isDuck,
    };
  }
}
