// combat.js

function checkCollision(a, b) {
    return (
        a.x < b.x + b.width  &&
        a.x + a.width > b.x  &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

// ── Input Buffer ──
const INPUT_BUFFER_WINDOW = 40;

// P1 buffer (j/k/l/i keys)
const inputBuffer = [];
// P2 buffer (1/2/3/jump keys mapped to same symbols)
const inputBuffer2 = [];

let currentFrame = 0;

function tickFrame() { currentFrame++; }

function recordInput(key) {
    inputBuffer.push({ key, frame: currentFrame });
    if (inputBuffer.length > 20) inputBuffer.shift();
}

function recordInput2(key) {
    inputBuffer2.push({ key, frame: currentFrame });
    if (inputBuffer2.length > 20) inputBuffer2.shift();
}

function getRecentInputs(buf, windowFrames) {
    const cutoff = currentFrame - windowFrames;
    return buf.filter(e => e.frame >= cutoff).map(e => e.key);
}

// ── Combos ──
const COMBO_LIST = [
    { sequence: ["j","j","k"], name: "HAYMAKER FINISH",  damageMultiplier: 2.8, tier: 3 },
    { sequence: ["j","k","l"], name: "CHAIN BREAKER",    damageMultiplier: 3.0, tier: 3 },
    { sequence: ["k","k","j"], name: "DOUBLE KICK JAB",  damageMultiplier: 2.6, tier: 3 },
    { sequence: ["i","j","j"], name: "AIR ASSAULT",      damageMultiplier: 2.5, tier: 3 },
    { sequence: ["i","k","l"], name: "SKY SLAM",         damageMultiplier: 3.2, tier: 3 },
    { sequence: ["j","j"],     name: "DOUBLE PUNCH",     damageMultiplier: 1.8, tier: 2 },
    { sequence: ["k","k"],     name: "DOUBLE KICK",      damageMultiplier: 1.9, tier: 2 },
    { sequence: ["j","k"],     name: "JAB KICK",         damageMultiplier: 1.7, tier: 2 },
    { sequence: ["k","l"],     name: "KICK UPPERCUT",    damageMultiplier: 2.0, tier: 2 },
    { sequence: ["i","j"],     name: "JUMP PUNCH",       damageMultiplier: 1.6, tier: 2 },
    { sequence: ["i","k"],     name: "JUMP KICK",        damageMultiplier: 1.7, tier: 2 },
    { sequence: ["i","l"],     name: "DIVE UPPERCUT",    damageMultiplier: 2.2, tier: 2 },
];

function checkCombo(buf) {
    const recent = getRecentInputs(buf || inputBuffer, INPUT_BUFFER_WINDOW);
    for (const combo of COMBO_LIST) {
        const seq = combo.sequence;
        if (recent.length < seq.length) continue;
        const tail = recent.slice(recent.length - seq.length);
        if (tail.every((k, i) => k === seq[i])) return combo;
    }
    return null;
}

// ── Screen Flash ──
const screenFlash = {
    active: false, timer: 0, duration: 10, color: "", tier: 1,
    trigger(tier) {
        this.active = true; this.timer = this.duration; this.tier = tier;
        if (tier === 3)      this.color = "rgba(255,80,80,0.50)";
        else if (tier === 2) this.color = "rgba(255,220,50,0.35)";
        else                 this.color = "rgba(255,255,255,0.20)";
    },
    update() { if (this.active) { this.timer--; if (this.timer <= 0) this.active = false; } },
    draw(ctx, w, h) {
        if (!this.active) return;
        ctx.save(); ctx.globalAlpha = this.timer / this.duration;
        ctx.fillStyle = this.color; ctx.fillRect(0, 0, w, h); ctx.restore();
    }
};

// ── Combo Name Display ──
const comboDisplay = {
    name: "", timer: 0, duration: 90, rightSide: false,
    trigger(name, rightSide) { this.name = name; this.timer = this.duration; this.rightSide = !!rightSide; },
    update() { if (this.timer > 0) this.timer--; },
    draw(ctx, cw) {
        if (this.timer <= 0) return;
        const alpha = Math.min(1, this.timer / 20);
        const x = this.rightSide ? cw * 0.75 : cw * 0.25;
        ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center";
        ctx.fillStyle = this.rightSide ? "#ff9944" : "#FFD700";
        ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
        ctx.font = "bold 22px Arial";
        ctx.strokeText(this.name, x, 115); ctx.fillText(this.name, x, 115);
        ctx.restore();
    }
};

// ── Shield block effect ──
function spawnShieldBlockEffect(x, y) {
    // Bright blue-white burst rings
    effectManager.spawn(new BurstRing(x, y, "#aaddff", 40, 4));
    effectManager.spawn(new BurstRing(x, y, "#ffffff", 22, 2));
    // Sparks that fan outward
    const colors = ["#aaddff", "#ffffff", "#88ccff"];
    for (let i = 0; i < 14; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        effectManager.spawn(new Spark(x, y, colors[Math.floor(Math.random() * 3)], angle, speed));
    }
}

// ── Apply Hit ──
function applyHit(attacker, defender, baseDamage, knockbackDir, knockback, buf) {

    // ── Shield intercept ──
    if (typeof defender.absorbHit === "function" && defender.absorbHit()) {
        const bx = defender.x + (defender.drawWidth  || defender.width)  / 2;
        const by = defender.y + (defender.drawHeight || defender.height) / 2;
        spawnShieldBlockEffect(bx, by);
        if (typeof SFX !== "undefined") SFX.block();
        defender.vx = knockbackDir * 1.5;
        screenFlash.active = true;
        screenFlash.timer  = screenFlash.duration;
        screenFlash.color  = "rgba(100,180,255,0.18)";
        return;
    }

    // ── Normal hit ──
    // buf is passed in from game.js — inputBuffer for P1, inputBuffer2 for P2
    const activeBuf = buf || inputBuffer;
    const isP2      = (activeBuf === inputBuffer2);
    const combo     = checkCombo(activeBuf);
    let finalDamage = baseDamage, tier = 1;

    const hx = defender.x + (defender.drawWidth  || defender.width)  / 2;
    const hy = defender.y + (defender.drawHeight || defender.height) / 2;

    const type = attacker.state;
    if      (type === "punch")    spawnPunchEffect(hx, hy);
    else if (type === "kick")     spawnKickEffect(hx, hy);
    else if (type === "uppercut") spawnUppercutEffect(hx, hy);

    if (combo) {
        finalDamage = Math.round(baseDamage * combo.damageMultiplier);
        tier = combo.tier;
        comboDisplay.trigger(combo.name, isP2);
        activeBuf.length = 0;
        if (typeof SFX !== "undefined") SFX.comboFinish();
        if (tier === 3) spawnComboExplosion(hx, hy);
        else            effectManager.spawn(new BurstRing(hx, hy, "#fff", 55, 4));
    }

    if (defender.hitstun > 0) attacker.comboCount++;
    else                      attacker.comboCount = 1;

    defender.health  -= finalDamage;
    defender.hitstun  = 20;

    const kb = (knockback || 6) * (combo ? 1 + (tier - 1) * 0.4 : 1);
    defender.vx = knockbackDir * kb;
    defender.vy = -1;

    screenFlash.trigger(tier);
}
