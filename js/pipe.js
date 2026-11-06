/**
 * @fileoverview Pipe Pairs — defines individual pipe obstacles and the PipeManager
 * that spawns, updates, culls, and renders pipe pairs with circle-rectangle collision detection.
 */

function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

class Pipe {
  constructor(game, x, gapY) {
    this.game = game;
    this.x = x;
    this.gapY = gapY;
    this.width = CONSTANTS.PIPE_WIDTH;
    this.gap = game.getPipeGap();
    this.scored = false;
  }

  update(dt) {
    this.x -= this.game.pipeSpeed * dt;

    const bird = this.game.bird;
    const r = bird.radius;

    // Check scoring (bird passed the pipe)
    if (!this.scored && bird.x > this.x + this.width) {
      this.scored = true;
      this.game.addScore(1);
    }

    // Collision detection: circle-rect
    if (this.checkCollision(bird)) {
      this.game.die();
    }
  }

  checkCollision(bird) {
    const r = bird.radius;
    const cx = bird.x;
    const cy = bird.y;
    const left = this.x;
    const right = this.x + this.width;
    const topGap = this.gapY - this.gap / 2;
    const bottomGap = this.gapY + this.gap / 2;

    // Closest point on pipe rect to circle center
    const closestX = Math.max(left, Math.min(cx, right));

    // Top pipe
    const closestTopY = Math.min(cy, topGap);
    const dxTop = cx - closestX;
    const dyTop = cy - closestTopY;
    if (dxTop * dxTop + dyTop * dyTop < r * r) return true;

    // Bottom pipe
    const closestBotY = Math.max(cy, bottomGap);
    const dxBot = cx - closestX;
    const dyBot = cy - closestBotY;
    if (dxBot * dxBot + dyBot * dyBot < r * r) return true;

    return false;
  }

  render(ctx) {
    const topHeight = this.gapY - this.gap / 2;
    const bottomY = this.gapY + this.gap / 2;
    const bottomHeight = this.game.height - bottomY - CONSTANTS.GROUND_HEIGHT;
    const capHeight = 24;

    // Top pipe body
    this.drawPipeBody(ctx, this.x, 0, this.width, topHeight - capHeight);
    // Top pipe cap
    this.drawPipeCap(ctx, this.x - 3, topHeight - capHeight, this.width + 6, capHeight);

    // Bottom pipe body
    this.drawPipeBody(ctx, this.x, bottomY + capHeight, this.width, bottomHeight - capHeight);
    // Bottom pipe cap
    this.drawPipeCap(ctx, this.x - 3, bottomY, this.width + 6, capHeight);
  }

  drawPipeBody(ctx, x, y, w, h) {
    if (h <= 0) return;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(x + 3, y + 3, w, h);

    // Main green
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(x, y, w, h);

    // Left highlight
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x, y, 8, h);

    // Right shadow
    ctx.fillStyle = '#1e8449';
    ctx.fillRect(x + w - 8, y, 8, h);

    // Border
    ctx.strokeStyle = '#145a32';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
  }

  drawPipeCap(ctx, x, y, w, h) {
    const r = 6;

    ctx.save();
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    roundRectPath(ctx, x + 3, y + 3, w, h, r);
    ctx.fill();

    // Main
    ctx.fillStyle = '#27ae60';
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fill();

    // Left highlight
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(x, y, 10, h);

    // Right shadow
    ctx.fillStyle = '#1e8449';
    ctx.fillRect(x + w - 10, y, 10, h);

    // Border
    ctx.strokeStyle = '#145a32';
    ctx.lineWidth = 1.5;
    roundRectPath(ctx, x, y, w, h, r);
    ctx.stroke();
    ctx.restore();
  }

  isOffScreen() {
    return this.x + this.width < -50;
  }
}

class PipeManager {
  constructor(game) {
    this.game = game;
    this.pipes = [];
    this.spawnTimer = 0;
    this.initialDelay = 0.8;
  }

  reset() {
    this.pipes = [];
    this.spawnTimer = this.initialDelay;
  }

  update(dt) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn();
      this.spawnTimer = CONSTANTS.PIPE_SPAWN_INTERVAL;
    }

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      this.pipes[i].update(dt);
      if (this.pipes[i].isOffScreen()) {
        this.pipes.splice(i, 1);
      }
    }
  }

  spawn() {
    const margin = 80;
    const gap = this.game.getPipeGap();
    const minGapY = margin + gap / 2;
    const maxGapY = this.game.height - CONSTANTS.GROUND_HEIGHT - margin - gap / 2;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);

    this.pipes.push(new Pipe(this.game, this.game.width + 20, gapY));
  }

  render(ctx) {
    for (const pipe of this.pipes) {
      pipe.render(ctx);
    }
  }
}
