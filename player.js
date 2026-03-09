// player.js

class Player {
    /**
     * Creates a new player instance
     * @param {number} x - initial x position
     * @param {number} y - initial y position
     * @param {string} spriteSheetSrc - path to sprite sheet PNG
     */
    constructor(x, y, spriteSheetSrc) {
        // Position and size
        this.x = x;
        this.y = y;
        this.width = 80;   // width of one sprite frame (480px / 6 cols)
        this.height = 104; // height of one sprite frame (520px / 5 rows)

        // Movement physics
        this.vx = 0;
        this.vy = 0;
        this.speed = 5;
        this.jumpForce = -12;
        this.gravity = 0.6;
        this.ground = 396; // y-position of ground (canvas 500px - sprite height 104px)

        // Combat stats
        this.health = 100;
        this.hitstun = 0;
        this.comboCount = 0;

        // Attack box
        this.attackBox = null;
        this.attackTimer = 0;

        // Animation state
        this.state = "idle"; // idle, punch, kick, uppercut, jump
        this.currentFrame = 0;
        this.frameCounter = 0;

        // Load sprite sheet
        this.spriteSheet = new Image();
        this.spriteSheet.src = spriteSheetSrc;
        this.spriteLoaded = false;
        this.spriteSheet.onload = () => { this.spriteLoaded = true; };

        // Animation frames mapping
        this.animations = {
            idle:     { row: 0, frames: 6 },
            punch:    { row: 1, frames: 6 },
            kick:     { row: 2, frames: 6 },
            uppercut: { row: 3, frames: 5 },
            jump:     { row: 4, frames: 3 }
        };
    }

    /* ================================
       Movement
    ================================= */
    move(dir) { this.vx = dir * this.speed; } // -1 = left, 1 = right
    stop() { this.vx = 0; }

    jump() {
        if (this.y >= this.ground) {
            this.vy = this.jumpForce;
            this.state = "jump";
        }
    }

    /* ================================
       Attacks
    ================================= */
    punch() {
        if (this.attackTimer > 0) return; // prevent attack spamming
        this.state = "punch";
        this.attackTimer = 12; // duration of attack frames
        this.attackBox = {
            x: this.x + this.width,
            y: this.y + 30,
            width: 35,
            height: 20,
            damage: 5
        };
    }

    kick() {
        if (this.attackTimer > 0) return;
        this.state = "kick";
        this.attackTimer = 16;
        this.attackBox = {
            x: this.x + this.width,
            y: this.y + 60,
            width: 45,
            height: 20,
            damage: 7
        };
    }

    uppercut() {
        if (this.attackTimer > 0) return;
        this.state = "uppercut";
        this.attackTimer = 20;
        this.vy = -8; // lift the player slightly for uppercut
        this.attackBox = {
            x: this.x + this.width,
            y: this.y,
            width: 35,
            height: 50,
            damage: 10
        };
    }

    /* ================================
       Update per frame
    ================================= */
    update() {
        // Reduce hitstun if in effect
        if (this.hitstun > 0) this.hitstun--;

        // Physics movement
        this.x += this.vx;
        this.vy += this.gravity;
        this.y += this.vy;

        // Ground collision
        if (this.y >= this.ground) {
            this.y = this.ground;
            this.vy = 0;
            if (this.state === "jump") this.state = "idle";
        }

        // Handle attack timer and hitbox
        if (this.attackTimer > 0) {
            this.attackTimer--;
            if (this.attackBox) {
                this.attackBox.x = this.x + this.width;
                this.attackBox.y = this.y + (this.state === "kick" ? 60 : 30);
            }
        } else {
            this.attackBox = null;
            if (this.state !== "jump") this.state = "idle";
        }

        // Animate sprite
        this.updateAnimation();
    }

    /* ================================
       Animate sprite
    ================================= */
    updateAnimation() {
        this.frameCounter++;
        if (this.frameCounter > 6) { // controls animation speed
            this.frameCounter = 0;
            this.currentFrame++;
            const anim = this.animations[this.state];
            if (this.currentFrame >= anim.frames) {
                this.currentFrame = 0;
                if (this.state !== "jump") this.state = "idle"; // return to idle after action
            }
        }
    }

    /* ================================
       Draw player
    ================================= */
    draw(ctx) {
        if (!this.spriteLoaded) return; // wait for sprite sheet to load

        const anim = this.animations[this.state];
        ctx.drawImage(
            this.spriteSheet,
            this.currentFrame * this.width, // source x
            anim.row * this.height,         // source y
            this.width, this.height,        // source w,h
            this.x, this.y,                 // destination x,y
            this.width, this.height         // destination w,h
        );

        // Optional: draw attack hitbox for debugging
        if(this.attackBox){
            ctx.fillStyle = "yellow";
            ctx.fillRect(
                this.attackBox.x,
                this.attackBox.y,
                this.attackBox.width,
                this.attackBox.height
            );
        }
    }
}