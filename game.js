// game.js

// Get canvas and context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Create player and enemy
const player = new Player(200, 396, "sprite_sheet_clean.png");
const enemy = new Enemy(600, 396);

// Track keys pressed
const keys = {};

// ==============================
// INPUT HANDLING
// ==============================
document.addEventListener("keydown", e => {
    keys[e.key] = true;

    // Attack keys
    if(e.key === "j") player.punch();
    if(e.key === "k") player.kick();
    if(e.key === "l") player.uppercut();

    // Jump
    if(e.key === "w") player.jump();
});

document.addEventListener("keyup", e => {
    keys[e.key] = false;
});

// ==============================
// GAME UPDATE
// ==============================
function update() {
    // Horizontal movement
    if(keys["a"] || keys["ArrowLeft"]) player.move(-1);
    else if(keys["d"] || keys["ArrowRight"]) player.move(1);
    else player.stop();

    // Update player and enemy
    player.update();
    enemy.update();

    // Check attacks
    if(player.attackBox && checkCollision(player.attackBox, enemy)) {
        applyHit(player, enemy, player.attackBox.damage);
    }
}

// ==============================
// GAME DRAW
// ==============================
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player and enemy
    player.draw(ctx);
    enemy.draw(ctx);

    // Draw HUD
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText("Enemy HP: " + enemy.health, 650, 40);
    ctx.fillText("Combo: " + player.comboCount, 20, 40);
}

// ==============================
// MAIN GAME LOOP
// ==============================
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop();