// Input Manager supporting Keyboard and Webcam with dynamic control reversal

export class InputManager {
  constructor(onActionCallback, onSetLaneCallback) {
    this.onAction = onActionCallback;
    this.onSetLane = onSetLaneCallback;
    this.reversed = false;
    this.enabled = true;
    this.keyState = {};

    this.bindKeyboard();
  }

  setReversed(isReversed) {
    this.reversed = isReversed;
  }

  isReversed() {
    return this.reversed;
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      if (!this.enabled) return;

      // Prevent default scrolling for arrow keys & space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (this.keyState[e.code]) return; // ignore repeated hold events
      this.keyState[e.code] = true;

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          this.handleAction('LEFT');
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.handleAction('RIGHT');
          break;
        case 'ArrowUp':
        case 'KeyW':
          this.handleAction('JUMP');
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.handleAction('DUCK');
          break;
        case 'Space':
          this.handleAction('SPACE');
          break;
        case 'KeyP':
        case 'Escape':
          this.handleAction('PAUSE');
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyState[e.code] = false;
    });
  }

  handleAction(action) {
    let finalAction = action;

    // Control reversal logic (e.g. Reverse Day or Inverted Glasses powerup)
    if (this.reversed) {
      if (action === 'LEFT') finalAction = 'RIGHT';
      else if (action === 'RIGHT') finalAction = 'LEFT';
    }

    if (this.onAction) {
      this.onAction(finalAction, action !== finalAction);
    }
  }

  // Handle direct lane change from webcam
  handleSetLane(lane) {
    if (!this.enabled) return;
    let finalLane = lane;
    if (this.reversed) {
      if (lane === 0) finalLane = 2;
      else if (lane === 2) finalLane = 0;
    }
    if (this.onSetLane) {
      this.onSetLane(finalLane);
    }
  }

  // Handle webcam incoming actions
  handleWebcamAction(action) {
    this.handleAction(action);
  }
}
