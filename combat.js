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
const inputBuffer = [];
let currentFrame = 0;

function tickFrame() { currentFrame++; }

function recordInput(key) {
    inputBuffer.push({ key, frame: currentFrame });
    if (inputBuffer.length > 20) inputBuffer.shift();
}

function getRecentInputs(windowFrames) {
    const cutoff = currentFrame - windowFrames;
    return inputBuffer.filter(e => e.frame >= cutoff).map(e => e.key);
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

function checkCombo() {
    const recent = getRecentInputs(INPUT_BUFFER_WINDOW);
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
    name: "", timer: 0, duration: 90,
    trigger(name) { this.name = name; this.timer = this.duration; },
    update() { if (this.timer > 0) this.timer--; },
    draw(ctx, cw) {
        if (this.timer <= 0) return;
        const alpha = Math.min(1, this.timer / 20);
        ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = "center";
        ctx.fillStyle = "#FFD700"; ctx.strokeStyle = "#000"; ctx.lineWidth = 4;
        ctx.font = "bold 22px Arial";
        ctx.strokeText(this.name, cw/2, 115); ctx.fillText(this.name, cw/2, 115);
        ctx.restore();
    }
};

// ── Apply Hit ──
function applyHit(attacker, defender, baseDamage, knockbackDir, knockback) {
    const combo = checkCombo();
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
        comboDisplay.trigger(combo.name);
        inputBuffer.length = 0;
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
