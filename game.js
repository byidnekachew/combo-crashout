// game.js

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

let player, enemy;
const keys = {};
let gameOver    = false;
let gameStarted = false;

// ── Mode & Difficulty ──
window.gameMode       = "1p";   // "1p" | "2p"
window.gameDifficulty = "normal"; // "easy" | "normal" | "hard"

// ── Round System ──
const ROUNDS_TO_WIN = 2;
let roundsPlayer = 0;
let roundsEnemy  = 0;
let roundNumber  = 1;
let roundTransition = false;

// ── Classroom Background ──
const BG = (() => {
    // Pre-computed static elements, animated via draw()
    const chalk = [];
    for (let i = 0; i < 18; i++) {
        chalk.push({
            x: 60 + Math.random() * 780,
            y: 40 + Math.random() * 120,
            w: 20 + Math.random() * 80,
            alpha: 0.04 + Math.random() * 0.10,
            type: Math.random() < 0.4 ? "line" : "text",
            text: ["2+2=4","∑","π≈3.14","E=mc²","x²+y²","∫dx","F=ma","Δt","√2","∂/∂x"][Math.floor(Math.random()*10)],
            fontSize: 10 + Math.floor(Math.random() * 12),
        });
    }

    const windows = [
        { x: 680, w: 160, sunBeams: true },
    ];

    let dustMotes = [];
    for (let i = 0; i < 22; i++) {
        dustMotes.push({
            x: 680 + Math.random() * 160,
            y: 80 + Math.random() * 200,
            r: 0.5 + Math.random() * 1.5,
            vx: (Math.random() - 0.5) * 0.12,
            vy: -0.05 - Math.random() * 0.1,
            alpha: 0.15 + Math.random() * 0.35,
        });
    }

    function updateDust() {
        dustMotes.forEach(d => {
            d.x += d.vx; d.y += d.vy;
            if (d.y < 60) { d.y = 280; d.x = 680 + Math.random() * 160; }
        });
    }

    function draw(ctx, w, h) {
        updateDust();

        // ── Back wall ──
        const wallGrad = ctx.createLinearGradient(0, 0, 0, h);
        wallGrad.addColorStop(0,   "#2a2015");
        wallGrad.addColorStop(0.55,"#1e1a10");
        wallGrad.addColorStop(1,   "#141008");
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, w, h);

        // ── Floor ──
        const floorGrad = ctx.createLinearGradient(0, 390, 0, h);
        floorGrad.addColorStop(0, "#1a130a");
        floorGrad.addColorStop(1, "#110d06");
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, 390, w, h - 390);

        // Floor planks
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 1;
        for (let px = 0; px < w; px += 55) {
            ctx.beginPath();
            ctx.moveTo(px, 390);
            ctx.lineTo(px + 20, h);
            ctx.stroke();
        }
        // Floor sheen
        const sheen = ctx.createLinearGradient(0, 390, 0, 420);
        sheen.addColorStop(0, "rgba(255,220,120,0.06)");
        sheen.addColorStop(1, "transparent");
        ctx.fillStyle = sheen;
        ctx.fillRect(0, 390, w, 30);

        // ── Blackboard ──
        ctx.fillStyle = "#1a2a1a";
        ctx.fillRect(40, 30, 540, 150);
        ctx.strokeStyle = "#4a3820";
        ctx.lineWidth = 6;
        ctx.strokeRect(40, 30, 540, 150);
        // Board inner frame
        ctx.strokeStyle = "rgba(255,255,255,0.04)";
        ctx.lineWidth = 1;
        ctx.strokeRect(48, 37, 524, 136);
        // Board surface texture
        const boardGrad = ctx.createLinearGradient(40, 30, 40, 180);
        boardGrad.addColorStop(0,   "rgba(255,255,255,0.03)");
        boardGrad.addColorStop(0.5, "rgba(0,0,0,0)");
        boardGrad.addColorStop(1,   "rgba(0,0,0,0.08)");
        ctx.fillStyle = boardGrad;
        ctx.fillRect(40, 30, 540, 150);

        // Chalk writings
        ctx.save();
        ctx.font = "bold 16px 'Courier New', monospace";
        ctx.fillStyle = "rgba(220,230,210,0.55)";
        ctx.fillText("COMBO CRASHOUT", 170, 70);
        ctx.font = "12px 'Courier New', monospace";
        ctx.fillStyle = "rgba(200,220,195,0.30)";
        ctx.fillText("Student vs Teacher — Fight or Fail!", 120, 92);
        chalk.forEach(c => {
            ctx.save();
            ctx.globalAlpha = c.alpha;
            ctx.fillStyle = "rgba(200,215,190,1)";
            if (c.type === "text") {
                ctx.font = `${c.fontSize}px 'Courier New', monospace`;
                ctx.fillText(c.text, c.x, c.y);
            } else {
                ctx.fillRect(c.x, c.y, c.w, 2);
            }
            ctx.restore();
        });
        ctx.restore();

        // Board eraser smudges
        for (let sm = 0; sm < 3; sm++) {
            const smx = 100 + sm * 160, smy = 130;
            ctx.fillStyle = "rgba(200,215,190,0.04)";
            ctx.fillRect(smx, smy, 90, 18);
        }

        // ── Chalk tray ──
        ctx.fillStyle = "#3a2c14";
        ctx.fillRect(40, 178, 540, 10);
        // Chalk pieces
        const chalkColors = ["#f0e8d0","#d0e8f0","#f0d0d0","#d0f0d0"];
        for (let ci = 0; ci < 8; ci++) {
            ctx.fillStyle = chalkColors[ci % 4];
            ctx.fillRect(60 + ci * 28, 180, 18, 6);
        }

        // ── Window (right side) ──
        ctx.fillStyle = "#0a0f1a";
        ctx.fillRect(680, 40, 170, 200);
        // Window frame
        ctx.strokeStyle = "#4a3820";
        ctx.lineWidth = 8;
        ctx.strokeRect(680, 40, 170, 200);
        // Window panes
        ctx.strokeStyle = "#5a4828";
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(765, 40); ctx.lineTo(765, 240); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(680, 140); ctx.lineTo(850, 140); ctx.stroke();

        // Sky gradient in window
        const skyGrad = ctx.createLinearGradient(680, 40, 680, 240);
        skyGrad.addColorStop(0, "rgba(20,35,80,0.9)");
        skyGrad.addColorStop(1, "rgba(5,10,30,0.95)");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(681, 41, 168, 198);

        // Stars in window
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        [[700,60],[720,90],[750,55],[780,75],[810,60],[830,90],[700,110],[740,130],[800,120]].forEach(([sx,sy]) => {
            ctx.beginPath(); ctx.arc(sx, sy, 0.8, 0, Math.PI*2); ctx.fill();
        });

        // Moon
        ctx.fillStyle = "rgba(255,240,180,0.8)";
        ctx.beginPath(); ctx.arc(820, 85, 18, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = "rgba(5,10,30,0.95)";
        ctx.beginPath(); ctx.arc(812, 82, 16, 0, Math.PI*2); ctx.fill();

        // Window light spill on floor
        const winSpill = ctx.createRadialGradient(765, 240, 0, 765, 340, 120);
        winSpill.addColorStop(0, "rgba(180,200,255,0.07)");
        winSpill.addColorStop(1, "transparent");
        ctx.fillStyle = winSpill;
        ctx.fillRect(650, 240, 230, 180);

        // Dust motes in window light
        dustMotes.forEach(d => {
            ctx.save();
            ctx.globalAlpha = d.alpha;
            ctx.fillStyle = "rgba(220,230,255,1)";
            ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        });

        // ── Desk silhouettes (foreground) ──
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        // Left desk
        ctx.fillRect(-20, 420, 160, 16);
        ctx.fillRect(10,  436, 20, 64);
        ctx.fillRect(90,  436, 20, 64);
        // Right desk
        ctx.fillRect(750, 420, 170, 16);
        ctx.fillRect(770, 436, 20, 64);
        ctx.fillRect(880, 436, 20, 64);

        // ── Poster on right wall ──
        ctx.fillStyle = "rgba(80,50,20,0.6)";
        ctx.fillRect(858, 60, 38, 55);
        ctx.strokeStyle = "#5a4020"; ctx.lineWidth = 2;
        ctx.strokeRect(858, 60, 38, 55);
        ctx.font = "bold 6px Arial";
        ctx.fillStyle = "rgba(255,200,100,0.5)";
        ctx.textAlign = "center";
        ctx.fillText("RULES", 877, 77);
        ctx.fillText("OF THE", 877, 87);
        ctx.fillText("DOJO", 877, 97);
        ctx.textAlign = "left";

        // ── Ambient wall light (ceiling strip) ──
        const ceilLight = ctx.createLinearGradient(0, 0, 0, 40);
        ceilLight.addColorStop(0, "rgba(255,220,120,0.06)");
        ceilLight.addColorStop(1, "transparent");
        ctx.fillStyle = ceilLight;
        ctx.fillRect(0, 0, w, 40);
    }

    return { draw };
})();

// ==============================
// INIT
// ==============================
function initGame() {
    const diff = window.gameDifficulty;

    player = new Player(150, 402, "sprite_sheet_clean.png");
    
    if (window.gameMode === "2p") {
        enemy = new Player2(650, 402, "teacher_sprite_sheet.png");
    } else {
        enemy = new Enemy(650, 398);
        // Apply difficulty
        if (diff === "easy") {
            enemy.aggression = 0.38;
            enemy.speed      = 2.8;
            enemy.SHIELD_RECHARGE_FRAMES = 100;
        } else if (diff === "hard") {
            enemy.aggression = 0.92;
            enemy.speed      = 5.5;
            enemy.SHIELD_RECHARGE_FRAMES = 240;
        }
    }

    gameOver    = false;
    gameStarted = true;
    roundTransition = false;

    inputBuffer.length  = 0;
    inputBuffer2.length = 0;
    currentFrame        = 0;
    effectManager.clear();
    screenFlash.active  = false;
    comboDisplay.timer  = 0;
}

function resetRounds() {
    roundsPlayer = 0;
    roundsEnemy  = 0;
    roundNumber  = 1;
}

// ==============================
// PLAYER 2 CLASS
// A keyboard-driven mirror of Player using arrow keys + numpad attacks
// ==============================
class Player2 {
    constructor(x, y, spriteSheetSrc) {
        this.x = x; this.y = y;
        this.width  = 201; this.height = 231;
        this.drawWidth  = 88; this.drawHeight = 102;

        this.vx = 0; this.vy = 0;
        this.speed     = 5;
        this.jumpForce = -14;
        this.gravity   = 0.6;
        this.ground    = 398;

        this.health     = 300;
        this.hitstun    = 0;
        this.comboCount = 0;
        this.attackBox     = null;
        this.attackTimer   = 0;
        this.attackLockout = 0;
        this.airUppercutCount = 0;
        this.canUppercutJump  = false;

        this.shieldActive   = false;
        this.shieldHp       = 5; this.shieldMax = 5;
        this.shieldBroken   = false;
        this.shieldRecharge = 0;
        this.SHIELD_RECHARGE_FRAMES = 180;
        this._shieldPulse   = 0; this._breakFlash = 0;

        this.state = "idle"; this.currentFrame = 0; this.frameCounter = 0;

        this.spriteSheet = new Image();
        this.spriteSheet.src = spriteSheetSrc;
        this.spriteLoaded = false;
        this.spriteSheet.onload = () => { this.spriteLoaded = true; };

        this.animations = {
            idle:     { row: 0, frames: 6, offsetX: 0 },
            punch:    { row: 1, frames: 6, offsetX: 0 },
            kick:     { row: 2, frames: 6, offsetX: 0 },
            uppercut: { row: 3, frames: 3, offsetX: 0 },
            jump:     { row: 3, frames: 3, offsetX: 3 },
        };
    }

    move(dir) { this.vx = dir * this.speed; }
    stop()    { this.vx = 0; }

    jump() {
        if (this.y >= this.ground) {
            this.vy = this.jumpForce; this.state = "jump";
        } else if (this.canUppercutJump) {
            this.vy = this.jumpForce; this.state = "jump";
            this.canUppercutJump = false;
        }
    }

    shieldOn()  { if (!this.shieldBroken) this.shieldActive = true; }
    shieldOff() { this.shieldActive = false; }

    absorbHit() {
        if (!this.shieldActive || this.shieldBroken) return false;
        this.shieldHp--; this._shieldPulse = 1.0;
        if (this.shieldHp <= 0) {
            this.shieldHp = 0; this.shieldBroken = true;
            this.shieldActive = false; this._breakFlash = 18;
            this.shieldRecharge = this.SHIELD_RECHARGE_FRAMES;
        }
        return true;
    }

    punch() {
        if (this.attackLockout > 0) return;
        this.state = "punch"; this.attackTimer = 12; this.attackLockout = 8;
        this.attackBox = { x: this.x - 28, y: this.y + 35, width: 28, height: 14, damage: 5, knockback: 2 };
    }
    kick() {
        if (this.attackLockout > 0) return;
        this.state = "kick"; this.attackTimer = 16; this.attackLockout = 10;
        this.attackBox = { x: this.x - 32, y: this.y + 52, width: 32, height: 14, damage: 7, knockback: 3 };
    }
    uppercut() {
        if (this.attackLockout > 0) return;
        if (this.airUppercutCount >= 2) return;
        this.state = "uppercut"; this.attackTimer = 20; this.attackLockout = 8;
        this.airUppercutCount++;
        this.canUppercutJump = true;
        this.vy = -8;
        this.attackBox = { x: this.x - 26, y: this.y + 5, width: 26, height: 36, damage: 10, knockback: 4 };
    }

    update() {
        if (this.hitstun > 0) this.hitstun--;
        if (this.shieldBroken) {
            this.shieldRecharge--;
            if (this.shieldRecharge <= 0) { this.shieldBroken = false; this.shieldHp = this.shieldMax; }
        }
        if (this._shieldPulse > 0) this._shieldPulse = Math.max(0, this._shieldPulse - 0.08);
        if (this._breakFlash  > 0) this._breakFlash--;
        if (this.attackLockout > 0) this.attackLockout--;

        this.x += this.vx; this.vy += this.gravity; this.y += this.vy;
        if (this.y >= this.ground) { this.y = this.ground; this.vy = 0; this.airUppercutCount = 0; this.canUppercutJump = false; if (this.state === "jump") this.state = "idle"; }

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

    updateAnimation() {
        this.frameCounter++;
        if (this.frameCounter > 6) {
            this.frameCounter = 0; this.currentFrame++;
            const anim = this.animations[this.state];
            if (this.currentFrame >= anim.frames) {
                this.currentFrame = 0;
                if (this.state !== "jump") this.state = "idle";
            }
        }
    }

    draw(ctx) {
        if (this.hitstun > 0 && Math.floor(this.hitstun / 3) % 2 === 0) return;
        if (!this.spriteLoaded) { ctx.fillStyle = "blue"; ctx.fillRect(this.x, this.y, this.drawWidth, this.drawHeight); return; }
        const anim = this.animations[this.state];
        // Teacher sprite already faces left — draw it straight, no flip needed
        ctx.drawImage(this.spriteSheet,
            (this.currentFrame + (anim.offsetX || 0)) * this.width, anim.row * this.height,
            this.width, this.height,
            this.x, this.y, this.drawWidth, this.drawHeight
        );

        if (this.shieldActive && !this.shieldBroken) this._drawShieldBubble(ctx);
        if (this._breakFlash > 0 && Math.floor(this._breakFlash / 3) % 2 === 0) this._drawShieldBreak(ctx);


    }

    _drawShieldBubble(ctx) {
        const cx = this.x + this.drawWidth / 2, cy = this.y + this.drawHeight / 2;
        const rx = this.drawWidth / 2 + 10, ry = this.drawHeight / 2 + 8;
        const hpFrac = this.shieldHp / this.shieldMax;
        const r = Math.round(30 + (1-hpFrac)*200), g2 = Math.round(160*hpFrac), b = Math.round(255*hpFrac);
        const pulse = this._shieldPulse * 6;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(cx, cy, rx+pulse+6, ry+pulse+4, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${r},${g2},${b},0.25)`; ctx.lineWidth = 8; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy, rx+pulse, ry+pulse, 0, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${r},${g2},${b},${0.55+this._shieldPulse*0.4})`; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx, cy, rx+pulse, ry+pulse, 0, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${r},${g2},${b},${0.08+this._shieldPulse*0.12})`; ctx.fill();
        ctx.restore();
    }

    _drawShieldBreak(ctx) {
        const cx = this.x + this.drawWidth/2, cy = this.y + this.drawHeight/2;
        const rx = this.drawWidth/2+14, ry = this.drawHeight/2+12;
        ctx.save(); ctx.globalAlpha = this._breakFlash/18;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI*2);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.stroke();
        ctx.restore();
    }
}

// ==============================
// INPUT HANDLING
// ==============================
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (!gameStarted || !window._countdownDone) return;

    // ── Player 1 ──
    if (e.key === "s" || e.key === "S") { e.preventDefault(); player.shieldOn(); return; }
    if (e.key === "i" || e.key === "I") { recordInput("i"); }
    if (e.key === "w" || e.key === "W") { recordInput("i"); player.jump(); }
    if (e.key === "c" || e.key === "C") { recordInput("j"); player.punch(); SFX.punch(); }
    if (e.key === "v" || e.key === "V") { recordInput("k"); player.kick();  SFX.kick();  }
    if (e.key === "b" || e.key === "B") { recordInput("l"); player.uppercut(); SFX.kick(); }

    // ── Player 2 (2P mode only) — Arrow keys + , . / attacks ──
    if (window.gameMode === "2p" && enemy instanceof Player2) {
        if (e.key === "ArrowUp")    { e.preventDefault(); recordInput2("i"); enemy.jump(); }
        if (e.key === ",")          { recordInput2("j"); enemy.punch();    SFX.punch(); }
        if (e.key === ".")          { recordInput2("k"); enemy.kick();     SFX.kick();  }
        if (e.key === "/")          { recordInput2("l"); enemy.uppercut(); SFX.kick();  }
        if (e.key === "ArrowDown")  { e.preventDefault(); enemy.shieldOn(); }
    }
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
    if (e.key === "s" || e.key === "S") player.shieldOff();
    if (window.gameMode === "2p" && e.key === "ArrowDown") {
        if (enemy instanceof Player2) enemy.shieldOff();
    }
});

// ==============================
// GAME UPDATE
// ==============================
function update() {
    if (!gameStarted || roundTransition) return;

    tickFrame();
    screenFlash.update();
    comboDisplay.update();
    effectManager.update();

    const locked = !window._countdownDone;

    // ── P1 movement ──
    if (!locked) {
        if (keys["a"] || keys["A"])       player.move(-1);
        else if (keys["d"] || keys["D"])  player.move(1);
        else                              player.stop();
    } else { player.stop(); }

    // ── P2 movement (2P mode) ──
    if (window.gameMode === "2p" && enemy instanceof Player2) {
        if (!locked) {
            if (keys["ArrowLeft"])       enemy.move(-1);
            else if (keys["ArrowRight"]) enemy.move(1);
            else                         enemy.stop();
        } else { enemy.stop(); }
    }

    player.update();
    enemy.update(locked ? null : (window.gameMode === "1p" ? player : null));

    player.x = Math.max(0, Math.min(canvas.width - player.width,    player.x));
    enemy.x  = Math.max(0, Math.min(canvas.width - (enemy.drawWidth || enemy.width), enemy.x));

    if (!locked) {
        // Fist glows
        if (player.attackBox) spawnFistGlow(player.attackBox.x + player.attackBox.width/2, player.attackBox.y + player.attackBox.height/2, player.state);
        if (enemy.attackBox)  spawnFistGlow(enemy.attackBox.x  + enemy.attackBox.width/2,  enemy.attackBox.y  + enemy.attackBox.height/2,  enemy.state);

        // Collision checks
        const enemyHitbox = { x: enemy.x, y: enemy.y, width: enemy.drawWidth || enemy.width, height: enemy.drawHeight || enemy.height };
        const playerHitbox = { x: player.x, y: player.y, width: player.width, height: player.height };

        if (player.attackBox && checkCollision(player.attackBox, enemyHitbox)) {
            applyHit(player, enemy, player.attackBox.damage, 1, player.attackBox.knockback, inputBuffer);
            player.attackBox = null;
        }
        if (enemy.attackBox && checkCollision(enemy.attackBox, playerHitbox)) {
            const buf = (window.gameMode === "2p") ? inputBuffer2 : inputBuffer;
            applyHit(enemy, player, enemy.attackBox.damage, -1, enemy.attackBox.knockback, buf);
            enemy.attackBox = null;
        }
    }

    player.health = Math.max(0, player.health);
    enemy.health  = Math.max(0, enemy.health);

    if (!gameOver && (player.health <= 0 || enemy.health <= 0)) {
        gameOver = true;
        SFX.ko();

        const playerWonRound = enemy.health <= 0;
        if (playerWonRound) roundsPlayer++;
        else                roundsEnemy++;

        // Check match winner
        if (roundsPlayer >= ROUNDS_TO_WIN || roundsEnemy >= ROUNDS_TO_WIN) {
            const winnerId = roundsPlayer >= ROUNDS_TO_WIN ? "player" : "enemy";
            setTimeout(() => showEndScreen(winnerId), 1100);
        } else {
            // Next round
            roundNumber++;
            roundTransition = true;
            setTimeout(() => {
                SFX.roundWin();
                showRoundBanner(roundNumber, () => {
                    // Reset fighters health but keep round scores
                    player.health = 300;
                    enemy.health  = 300;
                    player.x = 150; enemy.x = 650;
                    player.vx = 0;  enemy.vx = 0;
                    gameOver = false;
                    roundTransition = false;
                    inputBuffer.length = 0;
                    effectManager.clear();
                    beginCountdown();
                });
            }, 1200);
        }
    }
}

// ── Round Banner ──
function showRoundBanner(num, cb) {
    const el = document.getElementById("round-banner");
    el.textContent = `ROUND ${num}`;
    el.classList.remove("hidden", "pop");
    void el.offsetWidth;
    el.classList.add("pop");
    setTimeout(() => { el.classList.add("hidden"); if (cb) cb(); }, 1400);
}

// ==============================
// DRAW HELPERS
// ==============================
function drawHealthBar(x, y, w, h, current, max, color) {
    // Background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(x, y, w, h);
    // Low-health pulse
    if (current / max < 0.25) {
        const pulse = 0.65 + 0.35 * Math.sin(Date.now() / 120);
        ctx.fillStyle = `rgba(255,50,50,${pulse})`;
    } else {
        ctx.fillStyle = color;
    }
    ctx.fillRect(x, y, w * (current / max), h);
    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(x, y, w * (current / max), h / 2);
    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
}

function drawShieldHUD(x, y, combatant, showLabel, rightAlign) {
    const pip = { w: 28, h: 14, gap: 5 };
    const totalW = combatant.shieldMax * pip.w + (combatant.shieldMax - 1) * pip.gap;
    const startX = rightAlign ? x - totalW : x;
    ctx.save();
    if (combatant.shieldBroken) {
        const progress = 1 - (combatant.shieldRecharge / combatant.SHIELD_RECHARGE_FRAMES);
        ctx.fillStyle = "#222"; ctx.fillRect(startX, y, totalW, pip.h);
        ctx.fillStyle = `rgba(200,50,50,0.8)`; ctx.fillRect(startX, y, totalW * progress, pip.h);
        ctx.strokeStyle = "rgba(255,100,100,0.5)"; ctx.lineWidth = 1.5; ctx.strokeRect(startX, y, totalW, pip.h);
        if (showLabel) { ctx.fillStyle = "rgba(255,120,120,0.85)"; ctx.font = "bold 10px Arial"; ctx.textAlign = "left"; ctx.fillText("RECHARGING", startX + totalW + 6, y + pip.h - 2); }
    } else {
        for (let i = 0; i < combatant.shieldMax; i++) {
            const pipIndex = rightAlign ? (combatant.shieldMax - 1 - i) : i;
            const px = startX + i * (pip.w + pip.gap);
            const filled = pipIndex < combatant.shieldHp;
            ctx.fillStyle = filled ? "rgba(60,160,255,0.25)" : "rgba(60,60,80,0.4)";
            ctx.fillRect(px, y, pip.w, pip.h);
            if (filled) {
                ctx.fillStyle = combatant.shieldActive ? `rgba(100,200,255,${0.7 + 0.3 * Math.sin(Date.now()/80+i)})` : "rgba(60,150,240,0.75)";
                ctx.fillRect(px+2, y+2, pip.w-4, pip.h-4);
            }
            ctx.strokeStyle = filled ? (combatant.shieldActive ? "rgba(140,220,255,0.9)" : "rgba(80,160,255,0.6)") : "rgba(80,80,100,0.5)";
            ctx.lineWidth = 1.5; ctx.strokeRect(px, y, pip.w, pip.h);
        }
        if (showLabel) {
            const label = window.gameMode === "2p" ? "SHIELD [↓]" : "SHIELD [S]";
            ctx.fillStyle = combatant.shieldActive ? "rgba(140,220,255,0.9)" : "rgba(255,255,255,0.3)";
            ctx.font = "bold 10px Arial"; ctx.textAlign = "left";
            ctx.fillText(label, startX + totalW + 6, y + pip.h - 2);
        }
    }
    ctx.restore();
}

function drawRoundPips(x, y, wins, color, rightAlign) {
    const r = 7, gap = 20;
    for (let i = 0; i < ROUNDS_TO_WIN; i++) {
        const px = rightAlign ? x - i * gap : x + i * gap;
        ctx.beginPath(); ctx.arc(px, y, r, 0, Math.PI*2);
        ctx.fillStyle = i < wins ? color : "rgba(255,255,255,0.12)";
        ctx.fill();
        ctx.strokeStyle = i < wins ? color : "rgba(255,255,255,0.25)";
        ctx.lineWidth = 1.5; ctx.stroke();
    }
}

// ==============================
// DRAW
// ==============================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) return;

    // Classroom background
    BG.draw(ctx, canvas.width, canvas.height);

    // Ground line
    ctx.strokeStyle = "rgba(255,220,100,0.12)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, 404); ctx.lineTo(canvas.width, 404); ctx.stroke();

    player.draw(ctx);
    enemy.draw(ctx);

    effectManager.draw(ctx);
    screenFlash.draw(ctx, canvas.width, canvas.height);

    // ── Player 1 HUD ──
    ctx.save();
    // Name plate
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(14, 14, 220, 80);
    ctx.strokeStyle = "rgba(34,204,68,0.4)"; ctx.lineWidth = 1; ctx.strokeRect(14, 14, 220, 80);
    ctx.fillStyle = "#22cc44"; ctx.font = "bold 13px 'Bebas Neue', Arial"; ctx.textAlign = "left";
    ctx.fillText("PLAYER 1", 22, 30);
    drawHealthBar(20, 35, 200, 18, player.health, 300, "#22cc44");
    drawShieldHUD(20, 60, player, true, false);
    drawRoundPips(22, 86, roundsPlayer, "#22cc44", false);
    ctx.restore();

    // ── Enemy / Player 2 HUD ──
    ctx.save();
    const p2label = window.gameMode === "2p" ? "PLAYER 2" : "TEACHER";
    const p2color = window.gameMode === "2p" ? "#4488ff" : "#ee3333";
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(canvas.width - 234, 14, 220, 80);
    ctx.strokeStyle = `${p2color}66`; ctx.lineWidth = 1; ctx.strokeRect(canvas.width - 234, 14, 220, 80);
    ctx.fillStyle = p2color; ctx.font = "bold 13px 'Bebas Neue', Arial"; ctx.textAlign = "right";
    ctx.fillText(p2label, canvas.width - 22, 30);
    drawHealthBar(canvas.width - 220, 35, 200, 18, enemy.health, 300, p2color);
    drawShieldHUD(canvas.width - 20, 60, enemy, window.gameMode === "2p", true);
    drawRoundPips(canvas.width - 22, 86, roundsEnemy, p2color, true);
    ctx.restore();

    // ── Round number ──
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(canvas.width/2 - 50, 14, 100, 26);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "bold 13px 'Bebas Neue', Arial";
    ctx.fillText(`ROUND ${roundNumber}`, canvas.width/2, 31);
    ctx.restore();

    // ── Combo counter ──
    if (player.comboCount > 1) {
        ctx.textAlign = "left";
        ctx.fillStyle = "yellow";
        ctx.font = "bold 28px Arial";
        ctx.fillText(player.comboCount + "x COMBO!", 20, 130);
    }
    if (enemy.comboCount > 1) {
        ctx.textAlign = "right";
        ctx.fillStyle = "#ff9944";
        ctx.font = "bold 28px Arial";
        ctx.fillText(enemy.comboCount + "x COMBO!", canvas.width - 20, 130);
    }

    comboDisplay.draw(ctx, canvas.width);

    // ── Controls hint ──
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.font = "10px Arial";
    if (window.gameMode === "2p") {
        ctx.fillText("P1: A/D move  W jump  C punch  V kick  B uppercut  S shield", 10, canvas.height - 18);
        ctx.fillText("P2: ←/→ move  ↑ jump  , punch  . kick  / uppercut  ↓ shield", 10, canvas.height - 6);
    } else {
        ctx.fillText("COMBOS: C+C  C+C+V  C+V+B  V+V  W+C  W+V+B  and more...", 12, canvas.height - 10);
    }

    // ── KO overlay ──
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 80px 'Bebas Neue', Arial";
        ctx.textAlign = "center";
        ctx.fillText("K.O.", canvas.width/2, canvas.height/2);
    }
}

// ==============================
// GAME LOOP
// ==============================
function gameLoop() {
    if (!gameOver && !roundTransition) update();
    else if (!gameOver && roundTransition) {
        // Still animate effects during transition
        effectManager.update();
        screenFlash.update();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
