// enemy.js

class Enemy {
    /**
     * Creates a new enemy instance
     * @param {number} x - initial x position
     * @param {number} y - initial y position
     */
    constructor(x, y) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 160;

        // Combat stats
        this.health = 100;
        this.hitstun = 0;
    }

    /**
     * Update enemy per frame
     */
    update() {
        // Reduce hitstun if active
        if (this.hitstun > 0) this.hitstun--;
    }

    /**
     * Draw the enemy
     * @param {CanvasRenderingContext2D} ctx
     */
    draw(ctx) {
        // Color changes if in hitstun
        ctx.fillStyle = this.hitstun > 0 ? "purple" : "blue";
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}