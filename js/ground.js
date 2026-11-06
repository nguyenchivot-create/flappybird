/**
 * @fileoverview Scrolling Ground — renders an infinitely scrolling dirt tile
 * pattern with grass, seams, and dirt speckles that syncs to pipe scroll speed.
 */

class Ground {
  constructor(game) {
    this.game = game;
    this.offset = 0;
    this.tileWidth = 40;
    this.reset();
  }

  reset() {
    this.offset = 0;
  }

  update(dt) {
    const speed = this.game.pipeSpeed;
    this.offset += speed * dt;
    if (this.offset >= this.tileWidth) {
      this.offset %= this.tileWidth;
    }
  }

  render(ctx) {
    const y = this.game.height - CONSTANTS.GROUND_HEIGHT;
    const w = this.game.width;
    const h = CONSTANTS.GROUND_HEIGHT;
    const tw = this.tileWidth;

    // Main ground fill
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(0, y, w, h);

    // Top grass line
    ctx.fillStyle = '#2ecc71';
    ctx.fillRect(0, y, w, 14);

    // Grass highlight
    ctx.fillStyle = '#27ae60';
    ctx.fillRect(0, y + 10, w, 4);

    // Tile pattern
    const startOffset = -this.offset;
    for (let x = startOffset; x < w; x += tw) {
      // Vertical seam
      ctx.strokeStyle = '#b8895a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + 14);
      ctx.lineTo(x, y + h);
      ctx.stroke();

      // Dirt specks
      ctx.fillStyle = '#b8895a';
      ctx.beginPath();
      ctx.arc(x + 12, y + 30, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 28, y + 55, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 18, y + 80, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 34, y + 95, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Subtle highlight on left of tile
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + 1, y + 15, 4, h - 15);
    }

    // Bottom border
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(0, y + h - 6, w, 6);

    // Top border over grass
    ctx.strokeStyle = '#1e8449';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y + 14);
    ctx.lineTo(w, y + 14);
    ctx.stroke();
  }
}
