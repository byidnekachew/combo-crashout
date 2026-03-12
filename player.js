// player.js

class Player {
    constructor(x, y, spriteSheetSrc) {
        this.x = x;
        this.y = y;
        this.width  = 88;
        this.height = 98;

        // Movement physics
        this.vx = 0;
        this.vy = 0;
        this.speed     = 5;
        this.jumpForce = -14;
        this.gravity   = 0.6;
        this.ground    = 402;

        // Combat stats
        this.health     = 300;
        this.hitstun    = 0;
        this.comboCount = 0;

        // Attack box
        this.attackBox     = null;
        this.attackTimer   = 0;
        this.attackLockout = 0;  // separate short window that gates new attack inputs
        this.airUppercutCount = 0; // max 2 uppercuts before landing
        this.canUppercutJump  = false; // grants a jump after uppercut launches you

        // ── Shield ──
        this.shieldActive   = false;  // is SPACE held right now?
        this.shieldHp       = 5;      // hits remaining (max 5)
        this.shieldMax      = 5;
        this.shieldBroken   = false;  // true while recharging
        this.shieldRecharge = 0;      // frames remaining until recharged
        this.SHIELD_RECHARGE_FRAMES = 180; // 3 s @ 60 fps

        // Shield draw — pulse / crack animation
        this._shieldPulse   = 0;      // 0–1, bumps on hit then decays
        this._breakFlash    = 0;      // frames of white flash when broken

        // Animation state
        this.state        = "idle";
        this.currentFrame = 0;
        this.frameCounter = 0;

        // Sprite sheet
        this.spriteSheet = new Image();
        this.spriteSheet.src = spriteSheetSrc;
        this.spriteLoaded = false;
        this.spriteSheet.onload = () => { this.spriteLoaded = true; };

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
        } else if (this.canUppercutJump) {
            // Allow one jump after an uppercut launches you airborne
            this.vy = this.jumpForce;
            this.state = "jump";
            this.canUppercutJump = false;
        }
    }

    /* ── Shield control ── */
    shieldOn() {
        if (this.shieldBroken) return; // can't raise while broken
        this.shieldActive = true;
    }

    shieldOff() {
        this.shieldActive = false;
    }

    /**
     * Called by combat.js when a hit would land while shield is up.
     * Returns true if the shield absorbed the hit, false if it should pass through.
     */
    absorbHit() {
        if (!this.shieldActive || this.shieldBroken) return false;

        this.shieldHp--;
        this._shieldPulse = 1.0; // trigger hit-flash on shield

        if (this.shieldHp <= 0) {
            this.shieldHp     = 0;
            this.shieldBroken = true;
            this.shieldActive = false;
            this._breakFlash  = 18;
            this.shieldRecharge = this.SHIELD_RECHARGE_FRAMES;
        }

        return true; // hit absorbed
    }

    /* ── Attacks ── */
    punch() {
        if (this.attackLockout > 0) return;
        this.state = "punch";
        this.attackTimer   = 12;
        this.attackLockout = 8;
        this.attackBox = { x: this.x + this.width, y: this.y + 35, width: 28, height: 14, damage: 5, knockback: 2 };
    }

    kick() {
        if (this.attackLockout > 0) return;
        this.state = "kick";
        this.attackTimer   = 16;
        this.attackLockout = 10;
        this.attackBox = { x: this.x + this.width, y: this.y + 52, width: 32, height: 14, damage: 7, knockback: 3 };
    }

    uppercut() {
        if (this.attackLockout > 0) return;
        if (this.airUppercutCount >= 2) return; // max 2 in the air
        this.state = "uppercut";
        this.attackTimer   = 20;
        this.attackLockout = 8;
        this.airUppercutCount++;
        this.canUppercutJump = true;
        this.vy = -8;
        this.attackBox = { x: this.x + this.width - 10, y: this.y + 5, width: 26, height: 36, damage: 10, knockback: 4 };
    }

    /* ── Update ── */
    update() {
        if (this.hitstun > 0) this.hitstun--;

        // Shield recharge countdown
        if (this.shieldBroken) {
            this.shieldRecharge--;
            if (this.shieldRecharge <= 0) {
                this.shieldBroken = false;
                this.shieldHp     = this.shieldMax;
            }
        }

        // Decay shield pulse
        if (this._shieldPulse > 0)  this._shieldPulse  = Math.max(0, this._shieldPulse  - 0.08);
        if (this._breakFlash  > 0)  this._breakFlash--;

        this.x += this.vx;
        this.vy += this.gravity;
        this.y += this.vy;

        if (this.y >= this.ground) {
            this.y  = this.ground;
            this.vy = 0;
            this.airUppercutCount = 0;
            this.canUppercutJump  = false;
            if (this.state === "jump") this.state = "idle";
        }

        if (this.attackLockout > 0) this.attackLockout--;

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
        if (this.hitstun > 0 && Math.floor(this.hitstun / 3) % 2 === 0) return;
        if (!this.spriteLoaded) return;

        const anim = this.animations[this.state];
        ctx.drawImage(
            this.spriteSheet,
            this.currentFrame * this.width,
            anim.row           * this.height,
            this.width,  this.height,
            this.x,      this.y,
            this.width,  this.height
        );

        // Draw shield bubble over sprite
        if (this.shieldActive && !this.shieldBroken) {
            this._drawShieldBubble(ctx);
        }

        // Break flash — white strobe when shield shatters
        if (this._breakFlash > 0 && Math.floor(this._breakFlash / 3) % 2 === 0) {
            this._drawShieldBreak(ctx);
        }


    }

    /* ── Shield bubble ── */
    _drawShieldBubble(ctx) {
        const cx = this.x + this.width  / 2;
        const cy = this.y + this.height / 2;
        const rx = this.width  / 2 + 10;
        const ry = this.height / 2 + 8;

        // Color shifts from cool blue → orange as hp drops
        const hpFrac = this.shieldHp / this.shieldMax; // 1 → 0
        const r = Math.round(30  + (1 - hpFrac) * 200);
        const g = Math.round(160 * hpFrac);
        const b = Math.round(255 * hpFrac);

        // Pulse radius bump on hit
        const pulse = this._shieldPulse * 6;

        ctx.save();

        // Outer glow
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse + 6, ry + pulse + 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.lineWidth   = 8;
        ctx.stroke();

        // Main shield ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse, ry + pulse, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 + this._shieldPulse * 0.4})`;
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        // Translucent fill
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse, ry + pulse, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + this._shieldPulse * 0.12})`;
        ctx.fill();

        // Hexagonal facet lines (decorative)
        ctx.globalAlpha = 0.18 + this._shieldPulse * 0.15;
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth   = 1;
        const sides = 6;
        for (let i = 0; i < sides; i++) {
            const a1 = (i / sides) * Math.PI * 2;
            const a2 = ((i + 1) / sides) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a1) * (rx + pulse), cy + Math.sin(a1) * (ry + pulse));
            ctx.lineTo(cx + Math.cos(a2) * (rx + pulse), cy + Math.sin(a2) * (ry + pulse));
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ── Shield break shatter flash ── */
    _drawShieldBreak(ctx) {
        const cx = this.x + this.width  / 2;
        const cy = this.y + this.height / 2;
        const rx = this.width  / 2 + 14;
        const ry = this.height / 2 + 12;

        ctx.save();
        ctx.globalAlpha = this._breakFlash / 18;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = 4;
        ctx.stroke();

        // Shard lines bursting outward
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(angle) * rx * 0.7, cy + Math.sin(angle) * ry * 0.7);
            ctx.lineTo(cx + Math.cos(angle) * (rx + 18), cy + Math.sin(angle) * (ry + 18));
            ctx.strokeStyle = "rgba(180,220,255,0.9)";
            ctx.lineWidth   = 1.5;
            ctx.stroke();
        }
        ctx.restore();
    }
}
