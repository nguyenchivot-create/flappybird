/**
 * @fileoverview Bird Entity — handles bird physics (gravity, flapping, velocity
 * clamping), rotation based on fall speed, menu idle floating, and vector-art rendering.
 */

class Bird {
  constructor(game) {
    this.game = game;
    this.reset();
    this.flapTimer = 0;
    this.flapDuration = 0.12;
  }

  reset() {
    this.x = CONSTANTS.BIRD_X;
    this.y = this.game.height / 2;
    this.velocityY = 0;
    this.rotation = 0;
    this.frame = 0;
    this.floatAngle = 0;
    this.radius = CONSTANTS.BIRD_RADIUS;
  }

  update(dt) {
    this.velocityY += CONSTANTS.GRAVITY * dt;

    if (this.velocityY > CONSTANTS.MAX_FALL_SPEED) {
      this.velocityY = CONSTANTS.MAX_FALL_SPEED;
    }

    this.y += this.velocityY * dt;

    this.rotation = Math.min(Math.PI / 3, Math.max(-Math.PI / 6, (this.velocityY / 600) * (Math.PI / 3)));

    if (this.flapTimer > 0) {
      this.flapTimer -= dt;
      this.frame = 1;
    } else {
      this.frame = 0;
    }
  }

  menuFloat(dt) {
    this.floatAngle += dt * 3;
    this.y = (this.game.height / 2) + Math.sin(this.floatAngle) * 12;
    this.rotation = Math.sin(this.floatAngle) * 0.1;
    this.velocityY = 0;
  }

  deathFall(dt, groundY) {
    if (this.y + this.radius >= groundY) {
      this.y = groundY - this.radius;
      this.velocityY = 0;
    } else {
      this.velocityY = Math.min(this.velocityY + CONSTANTS.GRAVITY * dt, CONSTANTS.MAX_FALL_SPEED);
      this.y = Math.min(this.y + this.velocityY * dt, groundY - this.radius);
    }
    this.rotation = Math.min(Math.PI / 2, this.rotation + dt * 8);
    this.frame = 0;
  }

  flap() {
    this.game.sound.flap();
    this.velocityY = CONSTANTS.FLAP_VELOCITY;
    this.flapTimer = this.flapDuration;
    this.frame = 1;
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const r = this.radius;
    const s = this.radius / 14; // scale factor relative to reference radius 14

    // Body shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(2 * s, 2 * s, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main body (yellow)
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body highlight
    ctx.fillStyle = '#f9d71c';
    ctx.beginPath();
    ctx.ellipse(-2 * s, -3 * s, r * 0.7, r * 0.55, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.15, r, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Eye white
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(5 * s, -5 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 0.5 * s;
    ctx.stroke();

    // Eye pupil
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(7 * s, -5 * s, 2.2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eye shine
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(8 * s, -6 * s, 1 * s, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(8 * s, 1 * s);
    ctx.lineTo(18 * s, 5 * s);
    ctx.lineTo(8 * s, 9 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // Wing
    const wingY = this.frame === 1 ? -6 * s : 2 * s;
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(-5 * s, wingY, 7 * s, 5 * s, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    // Tail
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-r, 2 * s);
    ctx.lineTo(-r - 6 * s, -2 * s);
    ctx.lineTo(-r - 6 * s, 6 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4ac0d';
    ctx.lineWidth = 1 * s;
    ctx.stroke();

    ctx.restore();
  }
}
