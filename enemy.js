// enemy.js

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        // Sprite sheet cell size (source)
        this.width  = 201; // 1206px / 6 cols
        this.height = 231; // 924px  / 4 rows

        // On-screen draw size (scaled to match player)
        this.drawWidth  = 88;
        this.drawHeight = 102;

        // Physics
        this.vx = 0;
        this.vy = 0;
        this.speed     = 3;
        this.jumpForce = -14;
        this.gravity   = 0.6;
        this.ground    = 398; // canvas 500 - drawHeight 102

        // Combat stats
        this.health     = 100;
        this.hitstun    = 0;
        this.comboCount = 0;

        // Attack
        this.attackBox   = null;
        this.attackTimer = 0;

        // Animation
        this.state        = "idle";
        this.currentFrame = 0;
        this.frameCounter = 0;

        // AI
        this.aiTimer = 0;

        // Sprite — 4 rows: idle, punch, kick, jump
        this.spriteSheet = new Image();
        this.spriteSheet.src = "teacher_sprite_sheet.png";
        this.spriteLoaded = false;
        this.spriteSheet.onload = () => { this.spriteLoaded = true; };

        this.animations = {
            idle:  { row: 0, frames: 6 },
            punch: { row: 1, frames: 6 },
            kick:  { row: 2, frames: 6 },
            jump:  { row: 3, frames: 3 },
        };
    }

    /* ── AI ── */
    updateAI(player) {
        this.aiTimer--;
        if (this.aiTimer > 0) return;
        this.aiTimer = 40 + Math.floor(Math.random() * 40);

        const dist = this.x - player.x;

        if (Math.abs(dist) > 180) {
            // Move toward player
            this.vx = dist > 0 ? -this.speed : this.speed;
        } else if (Math.abs(dist) < 100) {
            // Close enough — attack
            const roll = Math.random();
            if (roll < 0.5)      this.punch();
            else if (roll < 0.8) this.kick();
            else                 this.jump();
            this.vx = 0;
        } else {
            this.vx = 0;
        }
    }

    /* ── Attacks ── */
    // Enemy faces LEFT, so attacks fire to the left (x - offset)
    punch() {
        if (this.attackTimer > 0) return;
        this.state = "punch";
        this.attackTimer = 12;
        this.attackBox = { x: this.x - 28, y: this.y + 35, width: 28, height: 14, damage: 5, knockback: 2 };
    }

    kick() {
        if (this.attackTimer > 0) return;
        this.state = "kick";
        this.attackTimer = 16;
        this.attackBox = { x: this.x - 32, y: this.y + 52, width: 32, height: 14, damage: 7, knockback: 3 };
    }

    jump() {
        if (this.y >= this.ground) {
            this.vy = this.jumpForce;
            this.state = "jump";
        }
    }

    /* ── Update ── */
    update(player) {
        if (this.hitstun > 0) this.hitstun--;

        this.updateAI(player);

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
                this.attackBox.x = this.x - (this.state === "kick" ? 50 : 40);
                this.attackBox.y = this.y + (this.state === "kick" ? 40 : 20);
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
        if (this.hitstun > 0 && Math.floor(this.hitstun / 3) % 2 === 0) return;

        if (!this.spriteLoaded) {
            ctx.fillStyle = "blue";
            ctx.fillRect(this.x, this.y, this.drawWidth, this.drawHeight);
            return;
        }

        const anim = this.animations[this.state];

        ctx.drawImage(
            this.spriteSheet,
            this.currentFrame * this.width,  // source x
            anim.row          * this.height, // source y
            this.width,  this.height,        // source size
            this.x,      this.y,             // dest position
            this.drawWidth, this.drawHeight  // dest size (scaled down)
        );
    }
}
