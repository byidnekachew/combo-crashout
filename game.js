// game.js

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

let player, enemy;
const keys = {};
let gameOver    = false;
let gameStarted = false; // set to true by initGame()

// ==============================
// INIT  (called by title screen)
// ==============================
function initGame() {
    // Reset characters
    player = new Player(150, 402, "sprite_sheet_clean.png");
    enemy  = new Enemy(650, 398);

    // Reset state
    gameOver    = false;
    gameStarted = true;

    // Clear combo/effect state
    inputBuffer.length = 0;
    currentFrame       = 0;
    effectManager.clear();
    screenFlash.active  = false;
    comboDisplay.timer  = 0;
}

// ==============================
// INPUT HANDLING
// ==============================
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (!gameStarted || !window._countdownDone) return; // locked during countdown

    if (e.key === "i" || e.key === "I") recordInput("i");
    if (e.key === "w" || e.key === "ArrowUp") {
        recordInput("i");
        player.jump();
    }
    if (e.key === "j" || e.key === "J") { recordInput("j"); player.punch(); }
    if (e.key === "k" || e.key === "K") { recordInput("k"); player.kick();  }
    if (e.key === "l" || e.key === "L") { recordInput("l"); player.uppercut(); }
});

document.addEventListener("keyup", e => { keys[e.key] = false; });

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

    // Block movement + AI during countdown
    if (!locked) {
        if (keys["a"] || keys["ArrowLeft"])       player.move(-1);
        else if (keys["d"] || keys["ArrowRight"]) player.move(1);
        else                                       player.stop();
    } else {
        player.stop();
    }

    player.update();
    enemy.update(locked ? null : player); // pass null = enemy idles

    player.x = Math.max(0, Math.min(canvas.width - player.width,    player.x));
    enemy.x  = Math.max(0, Math.min(canvas.width - enemy.drawWidth, enemy.x));

    if (!locked) {
        // Fist glows
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

        // Player hits enemy
        if (player.attackBox && checkCollision(player.attackBox, {
            x: enemy.x, y: enemy.y,
            width: enemy.drawWidth, height: enemy.drawHeight
        })) {
            applyHit(player, enemy, player.attackBox.damage, 1, player.attackBox.knockback);
            player.attackBox = null;
        }

        // Enemy hits player
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

    if (player.health <= 0 || enemy.health <= 0) gameOver = true;
}

// ==============================
// DRAW
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

    // HUD
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("PLAYER", 20, 28);
    drawHealthBar(20, 35, 200, 18, player.health, 100, "#22cc44");

    ctx.textAlign = "right";
    ctx.fillText("TEACHER", canvas.width - 20, 28);
    drawHealthBar(canvas.width - 220, 35, 200, 18, enemy.health, 100, "#ee3333");

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

    // KO screen
    if (player.health <= 0 || enemy.health <= 0) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 72px Arial";
        ctx.textAlign = "center";
        ctx.fillText("K.O.", canvas.width / 2, canvas.height / 2);
        ctx.font = "bold 24px Arial";
        const winner = player.health <= 0 ? "TEACHER WINS" : "PLAYER WINS";
        ctx.fillText(winner, canvas.width / 2, canvas.height / 2 + 50);
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
