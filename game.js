// game.js

const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

// Create player and enemy
const player = new Player(150, 402, "sprite_sheet_clean.png");
const enemy  = new Enemy(650, 398);

// Track keys pressed
const keys = {};

let gameOver = false;

// ==============================
// INPUT HANDLING
// ==============================
document.addEventListener("keydown", e => {
    keys[e.key] = true;
    if (e.key === "j" || e.key === "J") player.punch();
    if (e.key === "k" || e.key === "K") player.kick();
    if (e.key === "l" || e.key === "L") player.uppercut();
    if (e.key === "w" || e.key === "ArrowUp") player.jump();
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
});

// ==============================
// GAME UPDATE
// ==============================
function update() {
    // Player movement
    if (keys["a"] || keys["ArrowLeft"])       player.move(-1);
    else if (keys["d"] || keys["ArrowRight"]) player.move(1);
    else                                       player.stop();

    // Update both characters — enemy needs player reference for AI
    player.update();
    enemy.update(player);

    // Keep player in canvas bounds
    player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
    enemy.x  = Math.max(0, Math.min(canvas.width - enemy.drawWidth, enemy.x));

    // Player attacks enemy
    if (player.attackBox && checkCollision(player.attackBox, {
        x: enemy.x, y: enemy.y,
        width: enemy.drawWidth, height: enemy.drawHeight
    })) {
        applyHit(player, enemy, player.attackBox.damage, 1, player.attackBox.knockback);
        player.attackBox = null; // one hit per swing
    }

    // Enemy attacks player
    if (enemy.attackBox && checkCollision(enemy.attackBox, {
        x: player.x, y: player.y,
        width: player.width, height: player.height
    })) {
        applyHit(enemy, player, enemy.attackBox.damage, -1, enemy.attackBox.knockback);
        enemy.attackBox = null; // one hit per swing
    }

    // Clamp health to 0
    player.health = Math.max(0, player.health);
    enemy.health  = Math.max(0, enemy.health);

    // Check for game over
    if (player.health <= 0 || enemy.health <= 0) gameOver = true;
}

// ==============================
// GAME DRAW
// ==============================
function drawHealthBar(x, y, w, h, current, max, color) {
    // Background
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, w, h);
    // Health fill
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * (current / max), h);
    // Border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Ground line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 404);
    ctx.lineTo(canvas.width, 404);
    ctx.stroke();

    player.draw(ctx);
    enemy.draw(ctx);

    // ── HUD ──
    // Player HP bar (left)
    ctx.fillStyle = "white";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "left";
    ctx.fillText("PLAYER", 20, 28);
    drawHealthBar(20, 35, 200, 18, player.health, 100, "#22cc44");

    // Enemy HP bar (right)
    ctx.textAlign = "right";
    ctx.fillText("TEACHER", canvas.width - 20, 28);
    drawHealthBar(canvas.width - 220, 35, 200, 18, enemy.health, 100, "#ee3333");

    // Combo counter
    if (player.comboCount > 1) {
        ctx.textAlign = "center";
        ctx.fillStyle = "yellow";
        ctx.font = "bold 28px Arial";
        ctx.fillText(player.comboCount + "x COMBO!", canvas.width / 2, 80);
    }

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
// MAIN GAME LOOP
// ==============================
function gameLoop() {
    if (!gameOver) update();
    draw();
    requestAnimationFrame(gameLoop);
}

gameLoop();
