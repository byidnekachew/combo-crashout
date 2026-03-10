// combat.js

/**
 * Check collision between two rectangles
 */
function checkCollision(a, b) {
    return (
        a.x < b.x + b.width  &&
        a.x + a.width > b.x  &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

/**
 * Apply hit from attacker to defender
 * @param {Object} attacker
 * @param {Object} defender
 * @param {number} damage
 * @param {number} knockbackDir  - +1 (push right) or -1 (push left)
 * @param {number} knockback     - how far to push
 */
function applyHit(attacker, defender, damage, knockbackDir, knockback) {
    if (defender.hitstun > 0) {
        attacker.comboCount++;
    } else {
        attacker.comboCount = 1;
    }

    defender.health  -= damage;
    defender.hitstun  = 20;

    // Apply knockback — push defender away from attacker
    defender.vx = knockbackDir * (knockback || 6);
    defender.vy = -1; // small upward bump
}
