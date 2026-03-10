// player.js

class Player {
    constructor(x, y, spriteSheetSrc) {
        this.x = x;
        this.y = y;
        this.width  = 88;  // cell width  (528px / 6 cols)
        this.height = 98;  // cell height (490px / 5 rows)

        // Movement physics
        this.vx = 0;
        this.vy = 0;
        this.speed     = 5;
        this.jumpForce = -14;
        this.gravity   = 0.6;
        this.ground    = 402; // canvas 500 - sprite height 98

        // Combat stats
        this.health     = 100;
        this.hitstun    = 0;
        this.comboCount = 0;

        // Attack box
        this.attackBox  = null;
        this.attackTimer = 0;

        // Animation state
        this.state        = "idle";
        this.currentFrame = 0;
        this.frameCounter = 0;

        // Sprite sheet
        this.spriteSheet = new Image();
        this.spriteSheet.src = spriteSheetSrc;
        this.spriteLoaded = false;
        this.spriteSheet.onload = () => { this.spriteLoaded = true; };

        // Row index and frame count per animation
        this.animations = {
            idle:     { row: 0, frames: 6 },
            punch:    { row: 1, frames: 6 },
            kick:     { row: 2, frames: 6 },
            uppercut: { row: 3, frames: 5 },
            jump:     { row: 4, frames: 3 },
        };
    }

    /* ── Movement ── */
    move(dir) { this.vx = dir * this.speed; }
    stop()    { this.vx = 0; }

    jump() {
        if (this.y >= this.ground) {
            this.vy = this.jumpForce;
            this.state = "jump";
        }
    }

    /* ── Attacks ── */
    punch() {
        if (this.attackTimer > 0) return;
        this.state = "punch";
        this.attackTimer = 12;
        this.attackBox = { x: this.x + this.width, y: this.y + 30, width: 40, height: 18, damage: 5 };
    }

    kick() {
        if (this.attackTimer > 0) return;
        this.state = "kick";
        this.attackTimer = 16;
        this.attackBox = { x: this.x + this.width, y: this.y + 50, width: 50, height: 18, damage: 7 };
    }

    uppercut() {
        if (this.attackTimer > 0) return;
        this.state = "uppercut";
        this.attackTimer = 20;
        this.vy = -8;
        this.attackBox = { x: this.x + this.width - 10, y: this.y, width: 36, height: 48, damage: 10 };
    }

    /* ── Update ── */
    update() {
        if (this.hitstun > 0) this.hitstun--;

        this.x += this.vx;
        this.vy += this.gravity;
        this.y += this.vy;

        if (this.y >= this.ground) {
            this.y  = this.ground;
            this.vy = 0;
            if (this.state === "jump") this.state = "idle";
        }

        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackBox) {
                this.attackBox.x = this.x + this.width;
                this.attackBox.y = this.y + (this.state === "kick" ? 50 : 30);
            }
        } else {
            this.attackBox = null;
            if (this.state !== "jump") this.state = "idle";
        }

        this.updateAnimation();
    }

    /* ── Animate ── */
    updateAnimation() {
        this.frameCounter++;
        if (this.frameCounter > 6) {
            this.frameCounter = 0;
            this.currentFrame++;
            const anim = this.animations[this.state];
            if (this.currentFrame >= anim.frames) {
                this.currentFrame = 0;
                if (this.state !== "jump") this.state = "idle";
            }
        }
    }

    /* ── Draw ── */
    draw(ctx) {
        // Hitstun flash
        if (this.hitstun > 0 && Math.floor(this.hitstun / 3) % 2 === 0) return;

        if (!this.spriteLoaded) return;

        const anim = this.animations[this.state];
        ctx.drawImage(
            this.spriteSheet,
            this.currentFrame * this.width,  // source x
            anim.row           * this.height, // source y
            this.width,  this.height,         // source w, h
            this.x,      this.y,              // dest x, y
            this.width,  this.height          // dest w, h
        );

        // Debug: show attack hitbox
        if (this.attackBox) {
            ctx.fillStyle = "rgba(255,255,0,0.4)";
            ctx.fillRect(this.attackBox.x, this.attackBox.y, this.attackBox.width, this.attackBox.height);
        }
    }
}
