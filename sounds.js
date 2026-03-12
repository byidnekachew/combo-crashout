// sounds.js — Procedural Web Audio engine for Combo Crashout

const SFX = (() => {
    let ctx = null;
    let musicGain = null;
    let sfxGain   = null;
    let musicNodes = [];
    let musicPlaying = false;

    function getCtx() {
        if (!ctx) {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
            sfxGain   = ctx.createGain(); sfxGain.gain.value   = 0.55; sfxGain.connect(ctx.destination);
            musicGain = ctx.createGain(); musicGain.gain.value = 0.18; musicGain.connect(ctx.destination);
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
    }

    // ── Utility ──
    function osc(type, freq, start, dur, gainVal, gainEnd, dest) {
        const c = getCtx();
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, start);
        g.gain.setValueAtTime(gainVal, start);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainEnd), start + dur);
        o.connect(g); g.connect(dest || sfxGain);
        o.start(start); o.stop(start + dur + 0.01);
        return { osc: o, gain: g };
    }

    function noise(dur, gainVal, filterFreq, dest) {
        const c = getCtx();
        const bufSize = c.sampleRate * dur;
        const buf = c.createBuffer(1, bufSize, c.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
        const src = c.createBufferSource();
        src.buffer = buf;
        const filt = c.createBiquadFilter();
        filt.type = "bandpass"; filt.frequency.value = filterFreq; filt.Q.value = 0.8;
        const g = c.createGain();
        g.gain.setValueAtTime(gainVal, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
        src.connect(filt); filt.connect(g); g.connect(dest || sfxGain);
        src.start(); src.stop(c.currentTime + dur);
    }

    // ── SFX ──
    function punch() {
        const c = getCtx(), t = c.currentTime;
        osc("sine",  140, t,        0.06, 0.7,  0.0001);
        osc("square", 90, t,        0.04, 0.4,  0.0001);
        osc("sine",   60, t + 0.03, 0.08, 0.5,  0.0001);
        noise(0.07, 0.35, 800);
    }

    function kick() {
        const c = getCtx(), t = c.currentTime;
        osc("sine",  200, t,        0.05, 0.8,  0.0001);
        osc("sine",   70, t + 0.02, 0.10, 0.6,  0.0001);
        osc("sawtooth", 110, t,     0.04, 0.3,  0.0001);
        noise(0.09, 0.4, 600);
    }

    function block() {
        const c = getCtx(), t = c.currentTime;
        osc("triangle", 900, t,        0.03, 0.5,  0.0001);
        osc("triangle", 700, t + 0.01, 0.05, 0.4,  0.0001);
        osc("sine",     300, t + 0.02, 0.06, 0.3,  0.0001);
        noise(0.05, 0.2, 2000);
    }

    function comboFinish() {
        const c = getCtx(), t = c.currentTime;
        // Ascending power chord sweep
        const freqs = [180, 240, 320, 420, 560];
        freqs.forEach((f, i) => {
            osc("sawtooth", f,   t + i*0.055, 0.22, 0.55, 0.0001);
            osc("square",   f*2, t + i*0.055, 0.14, 0.3,  0.0001);
        });
        noise(0.3, 0.6, 400);
        // Final boom
        osc("sine", 80, t + 0.3, 0.18, 0.9, 0.0001);
    }

    function ko() {
        const c = getCtx(), t = c.currentTime;
        // Deep descending boom
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.6);
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
        o.connect(g); g.connect(sfxGain);
        o.start(t); o.stop(t + 0.75);
        // Reverb noise burst
        noise(0.5, 0.7, 200);
        // High crack
        osc("square", 1200, t, 0.05, 0.6, 0.0001);
        // Round bell ping
        setTimeout(() => {
            const t2 = c.currentTime;
            osc("sine", 880, t2, 0.5, 0.4, 0.0001);
            osc("sine", 1320, t2 + 0.02, 0.4, 0.25, 0.0001);
        }, 400);
    }

    function roundWin() {
        const c = getCtx(), t = c.currentTime;
        // Victory sting
        const melody = [523, 659, 784, 1047];
        melody.forEach((f, i) => {
            osc("square", f,   t + i*0.12, 0.18, 0.4, 0.0001);
            osc("sine",   f,   t + i*0.12, 0.14, 0.3, 0.0001);
        });
    }

    // ── Background Music ──
    // Looping chiptune-style beat: kick + bass + hi-hat pattern
    function startMusic() {
        if (musicPlaying) return;
        musicPlaying = true;
        const c = getCtx();

        const BPM    = 128;
        const beat   = 60 / BPM;
        const bar    = beat * 4;

        // Bass line notes (two-bar pattern)
        const bassPattern = [110, 0, 110, 0, 138, 0, 110, 0,  110, 0, 165, 0, 138, 0, 110, 0];
        // Lead arp
        const arpPattern  = [440, 554, 659, 554, 440, 370, 440, 554];

        let startTime = c.currentTime + 0.1;
        const BARS = 8; // pattern length in bars before restart

        function scheduleBar(barIdx) {
            const barStart = startTime + barIdx * bar;

            // ── Kick on beats 1 & 3 ──
            [0, 2].forEach(b => {
                const t = barStart + b * beat;
                const o = c.createOscillator();
                const g = c.createGain();
                o.type = "sine";
                o.frequency.setValueAtTime(160, t);
                o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
                g.gain.setValueAtTime(0.55, t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
                o.connect(g); g.connect(musicGain);
                o.start(t); o.stop(t + 0.2);
                musicNodes.push(o);
            });

            // ── Snare on beats 2 & 4 ──
            [1, 3].forEach(b => {
                const t = barStart + b * beat;
                const bufSize = Math.floor(c.sampleRate * 0.12);
                const buf = c.createBuffer(1, bufSize, c.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i/bufSize);
                const src = c.createBufferSource();
                src.buffer = buf;
                const filt = c.createBiquadFilter();
                filt.type = "highpass"; filt.frequency.value = 1800;
                const g = c.createGain();
                g.gain.setValueAtTime(0.28, t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
                src.connect(filt); filt.connect(g); g.connect(musicGain);
                src.start(t); src.stop(t + 0.13);
                musicNodes.push(src);
            });

            // ── Hi-hat (eighth notes) ──
            for (let h = 0; h < 8; h++) {
                const t = barStart + h * beat * 0.5;
                const bufSize = Math.floor(c.sampleRate * 0.04);
                const buf = c.createBuffer(1, bufSize, c.sampleRate);
                const d = buf.getChannelData(0);
                for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
                const src = c.createBufferSource();
                src.buffer = buf;
                const filt = c.createBiquadFilter();
                filt.type = "highpass"; filt.frequency.value = 8000;
                const g = c.createGain();
                g.gain.setValueAtTime(h % 2 === 0 ? 0.15 : 0.08, t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
                src.connect(filt); filt.connect(g); g.connect(musicGain);
                src.start(t); src.stop(t + 0.05);
                musicNodes.push(src);
            }

            // ── Bass line (16th steps) ──
            const patIdx = (barIdx % 2) * 8;
            for (let s = 0; s < 8; s++) {
                const freq = bassPattern[patIdx + s];
                if (!freq) continue;
                const t = barStart + s * beat * 0.5;
                const o = c.createOscillator();
                const g = c.createGain();
                o.type = "sawtooth";
                o.frequency.value = freq;
                g.gain.setValueAtTime(0.22, t);
                g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.45);
                o.connect(g); g.connect(musicGain);
                o.start(t); o.stop(t + beat * 0.5);
                musicNodes.push(o);
            }

            // ── Arp lead (every 2 bars) ──
            if (barIdx % 2 === 0) {
                arpPattern.forEach((f, s) => {
                    const t = barStart + s * beat * 0.5;
                    const o = c.createOscillator();
                    const g = c.createGain();
                    o.type = "square";
                    o.frequency.value = f;
                    g.gain.setValueAtTime(0.09, t);
                    g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.38);
                    o.connect(g); g.connect(musicGain);
                    o.start(t); o.stop(t + beat * 0.4);
                    musicNodes.push(o);
                });
            }
        }

        function loop() {
            if (!musicPlaying) return;
            startTime = getCtx().currentTime + 0.05;
            for (let b = 0; b < BARS; b++) scheduleBar(b);
            // Re-schedule slightly before the loop ends
            const loopDur = BARS * bar * 1000;
            setTimeout(loop, loopDur - 200);
        }

        loop();
    }

    function stopMusic() {
        musicPlaying = false;
        musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
        musicNodes = [];
    }

    function setMusicVolume(v) {
        if (musicGain) musicGain.gain.value = v;
    }

    function setSfxVolume(v) {
        if (sfxGain) sfxGain.gain.value = v;
    }

    return { punch, kick, block, comboFinish, ko, roundWin, startMusic, stopMusic, setMusicVolume, setSfxVolume };
})();
