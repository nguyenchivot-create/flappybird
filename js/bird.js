/**
 * @fileoverview Bird Entity — handles bird physics (gravity, flapping, velocity
 * clamping), rotation based on fall speed, menu idle floating, and pixel-art sprite rendering.
 */

/**
 * Original pixel-art bird (16x14 cells). Each character is one pixel:
 * '.' transparent, others map to BIRD_SPRITE.palette. The wing is a separate
 * layer drawn over the body so it can flap between two frames.
 */
const BIRD_SPRITE = {
  width: 16,
  height: 14,
  palette: {
    o: '#3b2414', // outline
    y: '#ffcf40', // body
    l: '#fff3b0', // highlight
    s: '#e8962e', // belly shade
    a: '#f07c1e', // wing
    k: '#1b1b1b', // eye
    w: '#ffffff', // eye glint
    r: '#ff7a1a', // beak
    d: '#b84a12'  // beak shadow
  },
  body: [
    '......oo........',
    '.....oyyo.......',
    '...oooyooo......',
    '..oyyyyyyyoo....',
    '.oyllyyyyyyyo...',
    '.oylyyyyyyyyyo..',
    'oyyyyyyyyykwyo..',
    'oyyyyyyyyykkyoo.',
    'oyyyyyyyyyyyyorr',
    'osyyyyyyyyyyyod.',
    '.osyyyyyyyyyyo..',
    '..ossyyyyyysso..',
    '...oossssssoo...',
    '.....oooooo.....'
  ],
  wingDown: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.ooooo..........',
    'oaaaaao.........',
    '.oaaaao.........',
    '..oooo..........',
    '................',
    '................'
  ],
  wingUp: [
    '................',
    '................',
    '................',
    '................',
    '.o..............',
    'oao.............',
    'oaaoo...........',
    'oaaaao..........',
    '.ooooo..........',
    '................',
    '................',
    '................',
    '................',
    '................'
  ]
};

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
    const sprite = Bird.getSprite(this.frame);
    // Sprite is ~2.4x the collision radius wide, like the old vector bird.
    // Whole-number pixel size keeps every "pixel" the same size.
    const px = Math.max(1, Math.round((this.radius * 2.4) / BIRD_SPRITE.width));
    const w = BIRD_SPRITE.width * px;
    const h = BIRD_SPRITE.height * px;

    ctx.save();
    ctx.translate(Math.round(this.x), Math.round(this.y));
    ctx.rotate(this.rotation);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sprite, -Math.round(w / 2), -Math.round(h / 2), w, h);
    ctx.restore();
  }

  /** Builds (once) a 1-pixel-per-cell canvas for each animation frame. */
  static getSprite(frame) {
    if (!Bird._sprites) {
      Bird._sprites = [BIRD_SPRITE.wingDown, BIRD_SPRITE.wingUp].map((wing) => {
        const c = document.createElement('canvas');
        c.width = BIRD_SPRITE.width;
        c.height = BIRD_SPRITE.height;
        const g = c.getContext('2d');
        const layers = [BIRD_SPRITE.body, wing];
        for (const rows of layers) {
          rows.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
              const color = BIRD_SPRITE.palette[row[x]];
              if (!color) continue;
              g.fillStyle = color;
              g.fillRect(x, y, 1, 1);
            }
          });
        }
        return c;
      });
    }
    return Bird._sprites[frame === 1 ? 1 : 0];
  }
}
