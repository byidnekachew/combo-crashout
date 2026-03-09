// combat.js

/**
 * Check collision between two rectangles
 * @param {Object} a - object with x, y, width, height
 * @param {Object} b - object with x, y, width, height
 * @returns {boolean} true if rectangles overlap
 */
function checkCollision(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/**
 * Apply hit from attacker to defender
 * Handles combo counting and hitstun
 * @param {Object} attacker - the attacking player
 * @param {Object} defender - the defending player/enemy
 * @param {number} damage - damage to apply
 */
function applyHit(attacker, defender, damage) {
    if (defender.hitstun > 0) {
        // If already in hitstun, continue combo
        attacker.comboCount++;
    } else {
        // New hit starts combo
        attacker.comboCount = 1;
    }
    // Reduce health
    defender.health -= damage;

    // Apply hitstun (frames of stun)
    defender.hitstun = 20;
}