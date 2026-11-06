/**
 * @fileoverview Input Handler — captures keyboard, mouse, and touch events and
 * maps them to game actions (flap, start, restart, menu navigation).
 */

class Input {
  constructor(game) {
    this.game = game;
    this.canvas = game.canvas;

    this.onFlap = null;
    this.onStart = null;
    this.onRestart = null;
    this.onMenu = null;
    this.onMute = null;

    this._boundKeyDown = this.handleKeyDown.bind(this);
    this._boundPointerDown = this.handlePointerDown.bind(this);
    this._boundTouchStart = this.handleTouchStart.bind(this);

    window.addEventListener('keydown', this._boundKeyDown);
    // Attach to document so taps anywhere work (overlays won't block)
    document.addEventListener('mousedown', this._boundPointerDown);
    document.addEventListener('touchstart', this._boundTouchStart, { passive: false });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  destroy() {
    window.removeEventListener('keydown', this._boundKeyDown);
    document.removeEventListener('mousedown', this._boundPointerDown);
    document.removeEventListener('touchstart', this._boundTouchStart);
  }

  handleKeyDown(e) {
    // Let text fields (player name) receive keys normally
    if (e.target.closest && e.target.closest('input, textarea')) return;

    if (e.code === 'KeyM') {
      if (this.onMute) this.onMute();
      return;
    }

    if (e.repeat) return;

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'Enter') {
      e.preventDefault();
      this.handleAction('flap');
    }

    if (e.code === 'Escape') {
      if (this.game.state === STATES.LEADERBOARD) {
        if (this.onMenu) this.onMenu();
      }
    }
  }

  handlePointerDown(e) {
    if (e.button !== 0) return;
    // Ignore if the target is a button, input, or other interactive element
    if (e.target.closest('button, input, .btn, .btn-group, .audio-panel')) return;
    e.preventDefault();
    this.handleAction('flap');
  }

  handleTouchStart(e) {
    // Ignore if the target is a button, input, or other interactive element
    if (e.target.closest('button, input, .btn, .btn-group, .audio-panel')) return;
    e.preventDefault();
    this.handleAction('flap');
  }

  handleAction(action) {
    if (this.game.state === STATES.PLAYING) {
      this.game.bird.flap();
      if (this.onFlap) this.onFlap();
    } else if (this.game.state === STATES.MENU) {
      if (this.onStart) this.onStart();
      this.game.start();
      // Immediate flap on start
      setTimeout(() => this.game.bird.flap(), 50);
    } else if (this.game.state === STATES.DEAD) {
      if (this.onRestart) this.onRestart();
      this.game.start();
      setTimeout(() => this.game.bird.flap(), 50);
    }
  }
}
