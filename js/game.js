/**
 * @fileoverview Core Game Engine — manages the main loop, state machine,
 * fixed-timestep physics, scoring, canvas resizing, and best-score persistence.
 */

const STATES = {
  MENU: 'MENU',
  PLAYING: 'PLAYING',
  DEAD: 'DEAD',
  LEADERBOARD: 'LEADERBOARD',
  NAME_ENTRY: 'NAME_ENTRY'
};

const CONSTANTS = {
  GRAVITY: 1800,
  FLAP_VELOCITY: -550,
  MAX_FALL_SPEED: 900,
  PIPE_SPEED_BASE: 280,
  PIPE_SPAWN_INTERVAL: 1.5,
  PIPE_WIDTH: 80,
  GROUND_HEIGHT: 112,
  BIRD_X: 80,
  BIRD_RADIUS: 14
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.state = STATES.MENU;
    this.score = 0;
    this.bestScore = 0;
    this.highScoreKey = 'flappy_bird_best';
    this.loadBestScore();

    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDt = 1 / 60;

    this.bird = new Bird(this);
    this.pipeManager = new PipeManager(this);
    this.ground = new Ground(this);
    this.input = new Input(this);
    this.leaderboard = new Leaderboard();
    this.sound = new SoundManager();

    this.onStateChange = null;
    this.onScoreChange = null;
    this.previousState = null;
    this.loop = this.loop.bind(this);

    this.resize();
  }

  loadBestScore() {
    try {
      const saved = localStorage.getItem(this.highScoreKey);
      this.bestScore = saved ? parseInt(saved, 10) : 0;
    } catch (e) {
      this.bestScore = 0;
    }
  }

  saveBestScore() {
    try {
      localStorage.setItem(this.highScoreKey, String(this.bestScore));
    } catch (e) {}
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    if (this.canvas.width !== Math.floor(width * dpr) || this.canvas.height !== Math.floor(height * dpr)) {
      this.canvas.width = Math.floor(width * dpr);
      this.canvas.height = Math.floor(height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.width = width;
    this.height = height;

    // Scale metrics relative to canvas size
    CONSTANTS.BIRD_X = Math.round(width * 0.15);
    CONSTANTS.PIPE_WIDTH = Math.round(width * 0.12);
    CONSTANTS.BIRD_RADIUS = Math.round(Math.min(width, height) * 0.025);
    CONSTANTS.GROUND_HEIGHT = Math.round(Math.min(height * 0.18, 140));
    this.pipeSpeed = (CONSTANTS.PIPE_SPEED_BASE / 600) * width;
    if (this.bird) this.bird.radius = CONSTANTS.BIRD_RADIUS;
  }

  init() {
    this.reset();
    this.loop(performance.now());
  }

  reset() {
    this.score = 0;
    this.bird.reset();
    this.pipeManager.reset();
    this.ground.reset();
    if (this.onScoreChange) this.onScoreChange(this.score);
  }

  start() {
    if (this.state === STATES.MENU || this.state === STATES.DEAD || this.state === STATES.LEADERBOARD) {
      this.previousState = null;
      this.reset();
      this.state = STATES.PLAYING;
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  die() {
    if (this.state !== STATES.PLAYING) return;
    this.state = STATES.DEAD;

    this.sound.hit();
    this.sound.die();

    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      this.saveBestScore();
    }

    if (this.onStateChange) this.onStateChange(this.state);
  }

  showLeaderboard() {
    this.previousState = this.state;
    this.state = STATES.LEADERBOARD;
    if (this.onStateChange) this.onStateChange(this.state);
  }

  showNameEntry() {
    this.previousState = this.state;
    this.state = STATES.NAME_ENTRY;
    if (this.onStateChange) this.onStateChange(this.state);
  }

  hideLeaderboard() {
    if (this.previousState) {
      this.state = this.previousState;
      this.previousState = null;
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  restoreState() {
    if (this.previousState) {
      this.state = this.previousState;
      this.previousState = null;
      if (this.onStateChange) this.onStateChange(this.state);
    }
  }

  backToMenu() {
    this.state = STATES.MENU;
    if (this.onStateChange) this.onStateChange(this.state);
  }

  getPipeGap() {
    const gap = Math.round(this.height * 0.25);
    return Math.max(120, Math.min(200, gap));
  }

  getPipeSpeed() {
    return this.pipeSpeed;
  }

  loop(now) {
    requestAnimationFrame(this.loop);

    if (!this.lastTime) this.lastTime = now;
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;

    if (dt > 0.1) dt = 0.1;

    this.accumulator += dt;
    while (this.accumulator >= this.fixedDt) {
      this.fixedUpdate(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    this.render();
  }

  fixedUpdate(dt) {
    if (this.state === STATES.MENU || this.state === STATES.PLAYING) {
      this.ground.update(dt);
    }

    if (this.state === STATES.PLAYING) {
      this.bird.update(dt);
      this.pipeManager.update(dt);

      if (this.bird.y + this.bird.radius >= this.height - CONSTANTS.GROUND_HEIGHT) {
        this.bird.y = this.height - CONSTANTS.GROUND_HEIGHT - this.bird.radius;
        this.die();
      }

      if (this.bird.y - this.bird.radius <= 0) {
        this.bird.y = this.bird.radius;
        this.bird.velocityY = 0;
      }
    } else if (this.state === STATES.MENU) {
      this.bird.menuFloat(dt);
    } else {
      // DEAD / overlays after a crash: let the bird drop to the ground
      this.bird.deathFall(dt, this.height - CONSTANTS.GROUND_HEIGHT);
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawSky();
    this.pipeManager.render(this.ctx);
    this.ground.render(this.ctx);
    this.bird.render(this.ctx);
  }

  drawSky() {
    const grad = this.ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#4facfe');
    grad.addColorStop(0.5, '#00f2fe');
    grad.addColorStop(1, '#4facfe');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  addScore(amount = 1) {
    this.score += amount;
    this.sound.score();
    if (this.onScoreChange) this.onScoreChange(this.score);
  }
}
