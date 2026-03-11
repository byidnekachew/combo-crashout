// effects.js

const effectManager = {
    effects: [],
    spawn(e)  { this.effects.push(e); },
    update()  { this.effects = this.effects.filter(e => { e.update(); return e.alive; }); },
    draw(ctx) { this.effects.forEach(e => e.draw(ctx)); },
    clear()   { this.effects = []; }
};

function randBetween(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b)     { return Math.floor(randBetween(a, b + 1)); }

// ── Burst Ring ──
class BurstRing {
    constructor(x, y, color, maxRadius = 38, lineWidth = 3) {
        this.x = x; this.y = y; this.color = color;
        this.radius = 4; this.maxRadius = maxRadius;
        this.lineWidth = lineWidth; this.alpha = 1; this.alive = true;
    }
    update() {
        this.radius += (this.maxRadius - this.radius) * 0.25;
        this.alpha  -= 0.07;
        if (this.alpha <= 0) this.alive = false;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = this.color; ctx.lineWidth = this.lineWidth;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

// ── Spark Particle ──
class Spark {
    constructor(x, y, color, angle, speed) {
        this.x = x; this.y = y;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.color = color; this.life = randBetween(0.6, 1.0);
        this.decay = randBetween(0.055, 0.09); this.radius = randBetween(2, 4); this.alive = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.25; this.vx *= 0.92; this.life -= this.decay;
        if (this.life <= 0) this.alive = false;
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.life); ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

// ── Slash Mark ──
class SlashMark {
    constructor(x, y, angle, color, length = 36) {
        this.x = x; this.y = y; this.angle = angle; this.color = color;
        this.length = length; this.alpha = 1; this.scale = 0.2; this.alive = true;
    }
    update() {
        this.scale = Math.min(1, this.scale + 0.18); this.alpha -= 0.09;
        if (this.alpha <= 0) this.alive = false;
    }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha);
        const len = this.length * this.scale;
        const dx = Math.cos(this.angle) * len, dy = Math.sin(this.angle) * len;
        ctx.strokeStyle = this.color; ctx.lineWidth = 3 * this.scale; ctx.lineCap = "round";
        ctx.beginPath(); ctx.moveTo(this.x - dx/2, this.y - dy/2); ctx.lineTo(this.x + dx/2, this.y + dy/2); ctx.stroke();
        ctx.strokeStyle = "white"; ctx.lineWidth = 1 * this.scale;
        ctx.beginPath(); ctx.moveTo(this.x - dx/2, this.y - dy/2); ctx.lineTo(this.x + dx/2, this.y + dy/2); ctx.stroke();
        ctx.restore();
    }
}

// ── Lightning Bolt ──
class LightningBolt {
    constructor(x, y) {
        this.x = x; this.y = y; this.alpha = 1; this.alive = true;
        this.segments = this._generate();
    }
    _generate() {
        const segs = []; let cx = this.x, cy = this.y;
        for (let i = 0; i < randInt(5, 8); i++) {
            const nx = cx + randBetween(-18, 18), ny = cy - randBetween(8, 18);
            segs.push([cx, cy, nx, ny]); cx = nx; cy = ny;
        }
        return segs;
    }
    update() { this.alpha -= 0.1; if (this.alpha <= 0) this.alive = false; }
    draw(ctx) {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.shadowColor = "#88f"; ctx.shadowBlur = 12;
        ctx.strokeStyle = "#ccf"; ctx.lineWidth = 2; ctx.lineCap = "round";
        ctx.beginPath();
        this.segments.forEach(([x1,y1,x2,y2]) => { ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); });
        ctx.stroke();
        ctx.shadowBlur = 0; ctx.strokeStyle = "white"; ctx.lineWidth = 1;
        ctx.beginPath();
        this.segments.forEach(([x1,y1,x2,y2]) => { ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); });
        ctx.stroke();
        ctx.restore();
    }
}

// ── Explosion (combo finisher) ──
class Explosion {
    constructor(x, y) {
        this.x = x; this.y = y; this.alive = true; this._spawn();
    }
    _spawn() {
        effectManager.spawn(new BurstRing(this.x, this.y, "#fff",    70, 5));
        effectManager.spawn(new BurstRing(this.x, this.y, "#ff8800", 55, 3));
        effectManager.spawn(new BurstRing(this.x, this.y, "#ffee00", 40, 2));
        const colors = ["#ff4400","#ff8800","#ffcc00","#ffffff"];
        for (let i = 0; i < 28; i++) {
            const angle = (i/28)*Math.PI*2 + randBetween(-0.2, 0.2);
            effectManager.spawn(new Spark(this.x, this.y, colors[randInt(0, 3)], angle, randBetween(3, 9)));
        }
        for (let i = 0; i < 6; i++) {
            const a = (i/6)*Math.PI*2;
            effectManager.spawn(new SlashMark(this.x + Math.cos(a)*20, this.y + Math.sin(a)*20, a, "#ff8800", 44));
        }
        this.alive = false;
    }
    update() {} draw() {}
}

// ── Public spawners ──
function spawnPunchEffect(x, y) {
    effectManager.spawn(new BurstRing(x, y, "#44aaff", 32, 3));
    effectManager.spawn(new BurstRing(x, y, "#aaddff", 18, 2));
    const colors = ["#44aaff","#88ccff","#ffffff"];
    for (let i = 0; i < 10; i++)
        effectManager.spawn(new Spark(x, y, colors[randInt(0,2)], randBetween(0, Math.PI*2), randBetween(2, 5)));
    effectManager.spawn(new SlashMark(x, y, randBetween(-0.4, 0.4), "#88ccff", 30));
}

function spawnKickEffect(x, y) {
    effectManager.spawn(new BurstRing(x, y, "#ff6600", 36, 3));
    effectManager.spawn(new BurstRing(x, y, "#ffaa00", 22, 2));
    const colors = ["#ff4400","#ff8800","#ffcc00","#ffffff"];
    for (let i = 0; i < 12; i++)
        effectManager.spawn(new Spark(x, y, colors[randInt(0,3)], randBetween(0, Math.PI*2), randBetween(2, 6)));
    effectManager.spawn(new SlashMark(x, y, randBetween(0.2, 0.8), "#ff8800", 38));
    effectManager.spawn(new SlashMark(x, y, randBetween(-0.8,-0.2), "#ffcc00", 28));
}

function spawnUppercutEffect(x, y) {
    effectManager.spawn(new BurstRing(x, y, "#aa88ff", 42, 4));
    effectManager.spawn(new BurstRing(x, y, "#eeccff", 24, 2));
    for (let i = 0; i < 4; i++)
        effectManager.spawn(new LightningBolt(x + randBetween(-14,14), y + randBetween(-10,10)));
    const colors = ["#aa88ff","#cc99ff","#ffffff"];
    for (let i = 0; i < 14; i++)
        effectManager.spawn(new Spark(x, y, colors[randInt(0,2)], randBetween(0, Math.PI*2), randBetween(2, 7)));
}

function spawnComboExplosion(x, y) {
    effectManager.spawn(new Explosion(x, y));
}

function spawnFistGlow(x, y, attackType) {
    let color;
    if      (attackType === "punch")    color = "rgba(68,170,255,0.55)";
    else if (attackType === "kick")     color = "rgba(255,100,0,0.55)";
    else if (attackType === "uppercut") color = "rgba(170,136,255,0.55)";
    else return;
    effectManager.spawn({
        x, y, color,
        radius: randBetween(7, 11), alpha: 0.7, alive: true,
        update() { this.alpha -= 0.18; if (this.alpha <= 0) this.alive = false; },
        draw(ctx) {
            ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha);
            ctx.fillStyle = this.color;
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    });
}
