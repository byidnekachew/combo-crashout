// game.js

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

let player, enemy;
const keys = {};
let gameOver    = false;
let gameStarted = false;

// ==============================
// INIT
// ==============================
function initGame() {
    player = new Player(150, 402, "sprite_sheet_clean.png");
    enemy  = new Enemy(650, 398);

    gameOver    = false;
    gameStarted = true;

    inputBuffer.length  = 0;
    currentFrame        = 0;
    effectManager.clear();
    screenFlash.active  = false;
    comboDisplay.timer  = 0;
}

// ==============================
// INPUT HANDLING
// ==============================
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (!gameStarted || !window._countdownDone) return;

    if (e.key === " ") {
        e.preventDefault();
        player.shieldOn();
        return;
    }

    if (e.key === "i" || e.key === "I") recordInput("i");
    if (e.key === "w" || e.key === "ArrowUp") {
        recordInput("i");
        player.jump();
    }
    if (e.key === "j" || e.key === "J") { recordInput("j"); player.punch(); }
    if (e.key === "k" || e.key === "K") { recordInput("k"); player.kick();  }
    if (e.key === "l" || e.key === "L") { recordInput("l"); player.uppercut(); }
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
    if (e.key === " ") player.shieldOff();
});

// ==============================
// GAME UPDATE
// ==============================
function update() {
    if (!gameStarted) return;

    tickFrame();
    screenFlash.update();
    comboDisplay.update();
    effectManager.update();

    const locked = !window._countdownDone;

    if (!locked) {
        if (keys["a"] || keys["ArrowLeft"])       player.move(-1);
        else if (keys["d"] || keys["ArrowRight"]) player.move(1);
        else                                       player.stop();
    } else {
        player.stop();
    }

    player.update();
    enemy.update(locked ? null : player);

    player.x = Math.max(0, Math.min(canvas.width - player.width,    player.x));
    enemy.x  = Math.max(0, Math.min(canvas.width - enemy.drawWidth, enemy.x));

    if (!locked) {
        if (player.attackBox) {
            spawnFistGlow(
                player.attackBox.x + player.attackBox.width  / 2,
                player.attackBox.y + player.attackBox.height / 2,
                player.state
            );
        }
        if (enemy.attackBox) {
            spawnFistGlow(
                enemy.attackBox.x + enemy.attackBox.width  / 2,
                enemy.attackBox.y + enemy.attackBox.height / 2,
                enemy.state
            );
        }

        if (player.attackBox && checkCollision(player.attackBox, {
            x: enemy.x, y: enemy.y,
            width: enemy.drawWidth, height: enemy.drawHeight
        })) {
            applyHit(player, enemy, player.attackBox.damage, 1, player.attackBox.knockback);
            player.attackBox = null;
        }

        if (enemy.attackBox && checkCollision(enemy.attackBox, {
            x: player.x, y: player.y,
            width: player.width, height: player.height
        })) {
            applyHit(enemy, player, enemy.attackBox.damage, -1, enemy.attackBox.knockback);
            enemy.attackBox = null;
        }
    }

    player.health = Math.max(0, player.health);
    enemy.health  = Math.max(0, enemy.health);

    if (!gameOver && (player.health <= 0 || enemy.health <= 0)) {
        gameOver = true;
        const winnerId = player.health <= 0 ? "enemy" : "player";
        setTimeout(() => showEndScreen(winnerId), 900);
    }
}

// ==============================
// DRAW HELPERS
// ==============================
function drawHealthBar(x, y, w, h, current, max, color) {
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * (current / max), h);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
}

/**
 * Draw shield pip HUD for any combatant that has a shield.
 * @param {number}  x         left edge
 * @param {number}  y         top edge
 * @param {object}  combatant player or enemy instance
 * @param {boolean} showLabel show the SPACE label (player only)
 * @param {boolean} rightAlign draw pips right-to-left (enemy side)
 */
function drawShieldHUD(x, y, combatant, showLabel, rightAlign) {
    const pip    = { w: 28, h: 14, gap: 5 };
    const totalW = combatant.shieldMax * pip.w + (combatant.shieldMax - 1) * pip.gap;
    const startX = rightAlign ? x - totalW : x;

    ctx.save();

    if (combatant.shieldBroken) {
        const progress = 1 - (combatant.shieldRecharge / combatant.SHIELD_RECHARGE_FRAMES);
        const pulse    = 0.5 + 0.5 * Math.sin(Date.now() / 120);

        ctx.fillStyle = "#222";
        ctx.fillRect(startX, y, totalW, pip.h);
        ctx.fillStyle = `rgba(${Math.round(180 + pulse * 60)},${Math.round(40 + pulse * 30)},40,0.9)`;
        ctx.fillRect(startX, y, totalW * progress, pip.h);
        ctx.strokeStyle = "rgba(255,100,100,0.5)";
        ctx.lineWidth   = 1.5;
        ctx.strokeRect(startX, y, totalW, pip.h);

        if (showLabel) {
            ctx.fillStyle  = "rgba(255,120,120,0.85)";
            ctx.font       = "bold 10px Arial";
            ctx.textAlign  = "left";
            ctx.fillText("RECHARGING", startX + totalW + 6, y + pip.h - 2);
        }
    } else {
        for (let i = 0; i < combatant.shieldMax; i++) {
            const pipIndex = rightAlign ? (combatant.shieldMax - 1 - i) : i;
            const px       = startX + i * (pip.w + pip.gap);
            const filled   = pipIndex < combatant.shieldHp;

            ctx.fillStyle = filled ? "rgba(60,160,255,0.25)" : "rgba(60,60,80,0.4)";
            ctx.fillRect(px, y, pip.w, pip.h);

            if (filled) {
                ctx.fillStyle = combatant.shieldActive
                    ? `rgba(100,200,255,${0.7 + 0.3 * Math.sin(Date.now() / 80 + i)})`
                    : "rgba(60,150,240,0.75)";
                ctx.fillRect(px + 2, y + 2, pip.w - 4, pip.h - 4);
            }

            ctx.strokeStyle = filled
                ? (combatant.shieldActive ? "rgba(140,220,255,0.9)" : "rgba(80,160,255,0.6)")
                : "rgba(80,80,100,0.5)";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px, y, pip.w, pip.h);
        }

        if (showLabel) {
            ctx.fillStyle  = combatant.shieldActive ? "rgba(140,220,255,0.9)" : "rgba(255,255,255,0.3)";
            ctx.font       = "bold 10px Arial";
            ctx.textAlign  = "left";
            ctx.fillText("SHIELD [SPACE]", startX + totalW + 6, y + pip.h - 2);
        }
    }

    ctx.restore();
}

// ==============================
// DRAW
// ==============================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!gameStarted) return;

    // Ground line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 404);
    ctx.lineTo(canvas.width, 404);
    ctx.stroke();

    player.draw(ctx);
    enemy.draw(ctx);

    effectManager.draw(ctx);
    screenFlash.draw(ctx, canvas.width, canvas.height);

    // ── Player HUD (left) ──
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("PLAYER", 20, 28);
    drawHealthBar(20, 35, 200, 18, player.health, 100, "#22cc44");
    drawShieldHUD(20, 60, player, true, false);

    // ── Enemy HUD (right) ──
    ctx.textAlign = "right";
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.fillText("TEACHER", canvas.width - 20, 28);
    drawHealthBar(canvas.width - 220, 35, 200, 18, enemy.health, 100, "#ee3333");
    // Draw enemy shield pips right-aligned under their HP bar
    drawShieldHUD(canvas.width - 20, 60, enemy, false, true);

    // ── Combo counter ──
    if (player.comboCount > 1) {
        ctx.textAlign = "center";
        ctx.fillStyle = "yellow";
        ctx.font = "bold 28px Arial";
        ctx.fillText(player.comboCount + "x COMBO!", canvas.width / 2, 80);
    }

    comboDisplay.draw(ctx, canvas.width);

    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.font = "11px Arial";
    ctx.fillText("COMBOS: J+J  J+J+K  J+K+L  K+K  W+J  W+K+L  and more...", 12, canvas.height - 10);

    // Brief KO flash on canvas before end screen
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 80px Arial";
        ctx.textAlign = "center";
        ctx.fillText("K.O.", canvas.width / 2, canvas.height / 2);
    }
}

// ==============================
// GAME LOOP
// ==============================
function gameLoop() {
    if (!gameOver) update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
