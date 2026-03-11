// enemy.js

// ─────────────────────────────────────────────
//  AI STATE MACHINE
//
//  States:
//    idle       — brief pause between decisions
//    approach   — close distance to player
//    retreat    — back off to reset spacing
//    combo      — executing a queued attack sequence
//    shield     — blocking player hits
//    shieldWait — waiting after a block to punish
//    jumped     — airborne (jump-in attack)
//
//  Combo sequences are arrays of { action, delay }
//  where action is "punch" | "kick" | "jump"
//  and delay is frames to wait before firing the next step.
// ─────────────────────────────────────────────

const ENEMY_COMBOS = [
    // 1-hit probes
    [{ action: "punch", delay: 14 }],
    [{ action: "kick",  delay: 18 }],

    // 2-hit combos
    [{ action: "punch", delay: 14 }, { action: "punch", delay: 14 }],
    [{ action: "punch", delay: 14 }, { action: "kick",  delay: 18 }],
    [{ action: "kick",  delay: 18 }, { action: "kick",  delay: 18 }],
    [{ action: "kick",  delay: 18 }, { action: "punch", delay: 14 }],

    // 3-hit combos
    [{ action: "punch", delay: 14 }, { action: "punch", delay: 14 }, { action: "kick",  delay: 18 }],
    [{ action: "kick",  delay: 18 }, { action: "kick",  delay: 18 }, { action: "punch", delay: 14 }],
    [{ action: "punch", delay: 14 }, { action: "kick",  delay: 18 }, { action: "punch", delay: 14 }],

    // Jump-in openers
    [{ action: "jump",  delay: 22 }, { action: "punch", delay: 14 }],
    [{ action: "jump",  delay: 22 }, { action: "kick",  delay: 18 }],
    [{ action: "jump",  delay: 22 }, { action: "punch", delay: 14 }, { action: "kick", delay: 18 }],
];

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        // Sprite source cell size
        this.width  = 201;
        this.height = 231;

        // On-screen draw size
        this.drawWidth  = 88;
        this.drawHeight = 102;

        // Physics
        this.vx = 0;
        this.vy = 0;
        this.speed     = 4;       // slightly faster than original
        this.jumpForce = -14;
        this.gravity   = 0.6;
        this.ground    = 398;

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

        // ── Shield ──
        this.shieldActive   = false;
        this.shieldHp       = 5;
        this.shieldMax      = 5;
        this.shieldBroken   = false;
        this.shieldRecharge = 0;
        this.SHIELD_RECHARGE_FRAMES = 180;
        this._shieldPulse   = 0;
        this._breakFlash    = 0;

        // ── AI state machine ──
        this.aiState      = "idle";
        this.aiTimer      = 20;           // frames until next decision
        this.comboQueue   = [];           // steps remaining in current combo
        this.comboDelay   = 0;           // frames until next combo step fires
        this.shieldTimer  = 0;           // frames to hold shield
        this.retreatTimer = 0;           // frames to keep retreating
        this.punishWindow = 0;           // frames of open punish after blocking

        // Aggression tuning (0–1). Higher = attacks more, shields less hesitantly.
        this.aggression = 0.72;

        // Sprite
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

    // ─────────────────────────────────────────────
    //  SHIELD  (mirrors player shield API so
    //  combat.js absorbHit() works identically)
    // ─────────────────────────────────────────────
    shieldOn()  {
        if (this.shieldBroken) return;
        this.shieldActive = true;
        this.state = "idle"; // don't attack while blocking
    }
    shieldOff() { this.shieldActive = false; }

    absorbHit() {
        if (!this.shieldActive || this.shieldBroken) return false;
        this.shieldHp--;
        this._shieldPulse = 1.0;
        if (this.shieldHp <= 0) {
            this.shieldHp     = 0;
            this.shieldBroken = true;
            this.shieldActive = false;
            this._breakFlash  = 18;
            this.shieldRecharge = this.SHIELD_RECHARGE_FRAMES;
            this.aiState = "idle"; // reset AI after break
        }
        return true;
    }

    // ─────────────────────────────────────────────
    //  ATTACKS
    // ─────────────────────────────────────────────
    punch() {
        if (this.attackTimer > 0) return false;
        this.state = "punch";
        this.attackTimer = 12;
        this.attackBox = { x: this.x - 28, y: this.y + 35, width: 28, height: 14, damage: 5, knockback: 2 };
        return true;
    }

    kick() {
        if (this.attackTimer > 0) return false;
        this.state = "kick";
        this.attackTimer = 16;
        this.attackBox = { x: this.x - 32, y: this.y + 52, width: 32, height: 14, damage: 7, knockback: 3 };
        return true;
    }

    jumpAttack() {
        if (this.y >= this.ground) {
            this.vy = this.jumpForce;
            this.state = "jump";
        }
    }

    // ─────────────────────────────────────────────
    //  AI STATE MACHINE
    // ─────────────────────────────────────────────
    updateAI(player) {
        if (this.hitstun > 0) return; // can't act while stunned

        const dist       = this.x - player.x;         // + = enemy is right of player
        const absDist    = Math.abs(dist);
        const playerHurt = player.hitstun > 0;
        const playerShielding = player.shieldActive && !player.shieldBroken;

        // Tick shield recharge
        if (this.shieldBroken) {
            this.shieldRecharge--;
            if (this.shieldRecharge <= 0) {
                this.shieldBroken = false;
                this.shieldHp     = this.shieldMax;
            }
        }

        // Decay shield pulse
        if (this._shieldPulse > 0) this._shieldPulse = Math.max(0, this._shieldPulse - 0.08);
        if (this._breakFlash  > 0) this._breakFlash--;

        // ── React instantly to player attacking (raise shield opportunistically) ──
        if (player.attackBox && !this.shieldBroken && absDist < 140) {
            const shieldChance = 0.55 + (1 - this.aggression) * 0.3;
            if (Math.random() < shieldChance / 6) { // per-frame check (~10 frames window)
                this.shieldOn();
                this.aiState    = "shield";
                this.shieldTimer = 18 + Math.floor(Math.random() * 14);
                this.vx = 0;
                return;
            }
        }

        // ── Punish window after blocking ──
        if (this.punishWindow > 0) {
            this.punishWindow--;
            this.shieldOff();
            if (this.punishWindow === 0 && absDist < 140) {
                this._startCombo(true); // aggressive punish combo
            }
            return;
        }

        // ── STATE TRANSITIONS ──
        switch (this.aiState) {

            case "idle": {
                this.aiTimer--;
                if (this.aiTimer > 0) break;

                this.vx = 0;
                this.shieldOff();

                // Decision tree
                const roll = Math.random();

                if (absDist > 220) {
                    // Too far — always approach
                    this.aiState = "approach";

                } else if (absDist < 80 && playerShielding) {
                    // Player is shielding up close — back off and wait
                    this.aiState    = "retreat";
                    this.retreatTimer = 25 + Math.floor(Math.random() * 20);

                } else if (absDist < 140) {
                    // In attack range — weight toward attacking
                    if (roll < this.aggression) {
                        this._startCombo(playerHurt);
                    } else if (roll < this.aggression + 0.15 && !this.shieldBroken) {
                        // Brief defensive block
                        this.shieldOn();
                        this.aiState    = "shield";
                        this.shieldTimer = 20 + Math.floor(Math.random() * 20);
                    } else {
                        this.aiState  = "idle";
                        this.aiTimer  = 10 + Math.floor(Math.random() * 15);
                    }

                } else {
                    // Mid-range — approach or feint
                    if (roll < 0.7) {
                        this.aiState = "approach";
                    } else {
                        this.aiState  = "idle";
                        this.aiTimer  = 8 + Math.floor(Math.random() * 12);
                    }
                }
                break;
            }

            case "approach": {
                // Dash toward player
                if (absDist > 10) {
                    this.vx = dist > 0 ? -this.speed : this.speed;
                } else {
                    this.vx = 0;
                }

                // Once in range, switch to attack or idle
                if (absDist < 120) {
                    this.vx      = 0;
                    this.aiState = "idle";
                    this.aiTimer = 4 + Math.floor(Math.random() * 8);
                }

                // React to player lunging at us
                if (player.attackBox && !this.shieldBroken && Math.random() < 0.08) {
                    this.shieldOn();
                    this.aiState    = "shield";
                    this.shieldTimer = 16;
                    this.vx = 0;
                }
                break;
            }

            case "retreat": {
                this.retreatTimer--;
                // Move away from player
                this.vx = dist > 0 ? this.speed * 0.8 : -this.speed * 0.8;

                if (this.retreatTimer <= 0 || absDist > 260) {
                    this.vx      = 0;
                    this.aiState = "idle";
                    this.aiTimer = 10 + Math.floor(Math.random() * 15);
                }
                break;
            }

            case "shield": {
                this.shieldTimer--;

                // Drop shield if it breaks or timer expires
                if (this.shieldBroken || this.shieldTimer <= 0) {
                    this.shieldOff();
                    // After holding shield, small punish window
                    this.punishWindow = 12;
                    this.aiState      = "idle";
                    this.aiTimer      = 6;
                    break;
                }

                // While shielding — slowly creep toward player
                if (absDist > 100) {
                    this.vx = dist > 0 ? -this.speed * 0.4 : this.speed * 0.4;
                } else {
                    this.vx = 0;
                }
                break;
            }

            case "combo": {
                // Tick the inter-step delay
                if (this.comboDelay > 0) {
                    this.comboDelay--;
                    break;
                }

                // Fire next step
                if (this.comboQueue.length > 0) {
                    const step = this.comboQueue.shift();

                    if      (step.action === "punch") this.punch();
                    else if (step.action === "kick")  this.kick();
                    else if (step.action === "jump")  this.jumpAttack();

                    this.comboDelay = step.delay;

                    // Keep pressing toward player during combo
                    if (absDist > 60) {
                        this.vx = dist > 0 ? -this.speed * 0.5 : this.speed * 0.5;
                    }

                } else {
                    // Combo finished
                    this.vx      = 0;
                    this.aiState = "idle";
                    // After a full combo, pause briefly then decide
                    this.aiTimer = 12 + Math.floor(Math.random() * 18);
                }
                break;
            }
        }
    }

    // ─────────────────────────────────────────────
    //  Choose and queue a combo
    //  aggressive = true picks longer combos
    // ─────────────────────────────────────────────
    _startCombo(aggressive) {
        // Filter by length
        const pool = aggressive
            ? ENEMY_COMBOS.filter(c => c.length >= 2)   // 2–3 hit combos when punishing
            : ENEMY_COMBOS;

        this.comboQueue = [...pool[Math.floor(Math.random() * pool.length)]];
        this.comboDelay = 0;
        this.aiState    = "combo";
        this.shieldOff();
    }

    // ─────────────────────────────────────────────
    //  UPDATE
    // ─────────────────────────────────────────────
    update(player) {
        if (this.hitstun > 0) this.hitstun--;

        if (player) {
            this.updateAI(player);
        } else {
            // During countdown — stand still
            this.vx = 0;
            this.shieldOff();
        }

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

    // ─────────────────────────────────────────────
    //  ANIMATION
    // ─────────────────────────────────────────────
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

    // ─────────────────────────────────────────────
    //  DRAW
    // ─────────────────────────────────────────────
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
            this.currentFrame * this.width,
            anim.row          * this.height,
            this.width,  this.height,
            this.x,      this.y,
            this.drawWidth, this.drawHeight
        );

        // Draw shield bubble when active
        if (this.shieldActive && !this.shieldBroken) {
            this._drawShieldBubble(ctx);
        }

        // Break flash
        if (this._breakFlash > 0 && Math.floor(this._breakFlash / 3) % 2 === 0) {
            this._drawShieldBreak(ctx);
        }
    }

    // ─────────────────────────────────────────────
    //  SHIELD VISUALS  (same style as player)
    // ─────────────────────────────────────────────
    _drawShieldBubble(ctx) {
        const cx = this.x + this.drawWidth  / 2;
        const cy = this.y + this.drawHeight / 2;
        const rx = this.drawWidth  / 2 + 10;
        const ry = this.drawHeight / 2 + 8;

        const hpFrac = this.shieldHp / this.shieldMax;
        const r = Math.round(30  + (1 - hpFrac) * 200);
        const g = Math.round(160 * hpFrac);
        const b = Math.round(255 * hpFrac);

        const pulse = this._shieldPulse * 6;

        ctx.save();

        // Outer glow
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse + 6, ry + pulse + 4, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},0.25)`;
        ctx.lineWidth   = 8;
        ctx.stroke();

        // Main ring
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse, ry + pulse, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.55 + this._shieldPulse * 0.4})`;
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        // Fill
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx + pulse, ry + pulse, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${0.08 + this._shieldPulse * 0.12})`;
        ctx.fill();

        // Hex facets
        ctx.globalAlpha = 0.18 + this._shieldPulse * 0.15;
        ctx.strokeStyle = `rgb(${r},${g},${b})`;
        ctx.lineWidth   = 1;
        for (let i = 0; i < 6; i++) {
            const a1 = (i / 6) * Math.PI * 2;
            const a2 = ((i + 1) / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(a1) * (rx + pulse), cy + Math.sin(a1) * (ry + pulse));
            ctx.lineTo(cx + Math.cos(a2) * (rx + pulse), cy + Math.sin(a2) * (ry + pulse));
            ctx.closePath();
            ctx.stroke();
        }

        ctx.restore();
    }

    _drawShieldBreak(ctx) {
        const cx = this.x + this.drawWidth  / 2;
        const cy = this.y + this.drawHeight / 2;
        const rx = this.drawWidth  / 2 + 14;
        const ry = this.drawHeight / 2 + 12;

        ctx.save();
        ctx.globalAlpha = this._breakFlash / 18;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth   = 4;
        ctx.stroke();

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
