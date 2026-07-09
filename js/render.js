// js/render.js
window.Render = (() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let W = 0, H = 0;

    const ROAD = { horizon: 0, vanishX: 0, time: 0 };

    function resize() {
        if (!canvas) return;
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
        ROAD.horizon = H * 0.46;
        ROAD.vanishX = W / 2;
        if (ctx) ctx.imageSmoothingEnabled = true;
    }

    window.addEventListener('resize', resize);
    resize();

    function lerp(a, b, t) { return a + (b - a) * t; }

    const THEMES = {
        1: { sky: '#0B1120', road: '#1C2030', line: '#F5C842', details: 'city' },      // Kuching Waterfront
        2: { sky: '#1A0A00', road: '#1A1208', line: '#E8761A', details: 'sunset' },    // Jalan Masjid Jamek
        3: { sky: '#090E1D', road: '#151822', line: '#5B8CFF', details: 'neon' },      // Jam City Samarahan
        4: { sky: '#040408', road: '#0E1118', line: '#2ECC71', details: 'forest' },    // Sematan Highway
        5: { sky: '#000005', road: '#080A10', line: '#A855F7', details: 'void' }       // Ultimate Pan Borneo
    };

    return {
        resize,
        updateTime: (dt, speed) => { ROAD.time += dt * 0.0008 * speed; },
        clear: () => { if (ctx) ctx.clearRect(0, 0, W, H); },
        
        drawRoad: (levelId, carOffset, flashAlpha, flashColorHex) => {
            if (!ctx || !W || !H) return;
            const theme = THEMES[levelId] || THEMES[1];
            const hz = ROAD.horizon;
            const vx = ROAD.vanishX;
            const bt = H - (H * 0.18);
            const bw = W * 1.1;
            const hw = 40;

            // 1. Draw Sky & Sun
            ctx.fillStyle = theme.sky;
            ctx.fillRect(0, 0, W, hz);
            ctx.beginPath();
            ctx.arc(vx, hz, 60, Math.PI, 0);
            ctx.fillStyle = theme.line;
            ctx.globalAlpha = 0.5;
            ctx.shadowColor = theme.line;
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;

            // 2. Add Environment Details
            ctx.fillStyle = '#050505';
            if (theme.details === 'city') {
                ctx.fillRect(0, hz - 40, 100, 40);
                ctx.fillRect(W - 120, hz - 60, 120, 60);
            } else if (theme.details === 'forest') {
                ctx.fillStyle = '#051005';
                for(let i=0; i<W; i+=60) ctx.fillRect(i, hz - 30, 30, 30);
            } else if (theme.details === 'neon') {
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                for(let i=0; i<H/2; i+=40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }
            }

            // 3. Draw Road Base
            ctx.fillStyle = theme.road;
            ctx.beginPath();
            ctx.moveTo(vx - hw, hz); ctx.lineTo(vx + hw, hz);
            ctx.lineTo(vx + bw/2, bt); ctx.lineTo(vx - bw/2, bt);
            ctx.fill();
            
            ctx.fillStyle = '#0A0B0F';
            ctx.fillRect(0, bt, W, H - bt);

            // 4. Draw Track Lines
            const numLines = 14;
            ctx.shadowColor = theme.line;
            ctx.shadowBlur = 10;
            for (let i = 0; i < numLines; i++) {
                const t = ((i / numLines) + (ROAD.time % 1));
                const tt = t * t;
                const y = lerp(hz, bt, tt);
                const xw = lerp(hw, bw / 2, tt);
                const lh = Math.max(1, (bt - hz) / numLines * tt * 1.8);
                
                ctx.strokeStyle = theme.line;
                ctx.globalAlpha = 0.35 * tt;
                ctx.lineWidth = Math.max(1, 2 * tt);
                
                ctx.beginPath(); ctx.moveTo(vx - 2, y); ctx.lineTo(vx - 2, y + lh); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(vx + 2, y); ctx.lineTo(vx + 2, y + lh); ctx.stroke();
                
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(vx - xw, y); ctx.lineTo(vx + xw, y); ctx.stroke();
            }
            ctx.globalAlpha = 1;
            ctx.shadowBlur = 0;

           // 5. Draw Detailed Retro-Wave Car (Scaled Up)
            const carY = bt - 5; // Slightly lower to sit better on the track
            const carX = vx + carOffset;
            const w = 96;  // Significantly bigger
            const h = 48;  // Significantly bigger
            
            // Determine if player is hitting a wrong answer (acting as brakes)
            const isBraking = (flashAlpha > 0 && flashColorHex === '#FF3B3B');

            ctx.save();
            ctx.translate(carX, carY);

            // --- A. Wide Racing Tires ---
            ctx.fillStyle = '#050505';
            ctx.fillRect(-w/2 - 12, -18, 28, 20); // Left rear tire
            ctx.fillRect(w/2 - 16, -18, 28, 20);  // Right rear tire
            
            ctx.fillStyle = '#111';
            ctx.fillRect(-w/2 - 12, -15, 28, 4);
            ctx.fillRect(w/2 - 16, -15, 28, 4);

            // --- B. Main Lower Body ---
            ctx.fillStyle = '#0a0a0f';
            ctx.strokeStyle = theme.line;
            ctx.lineWidth = 3; // Thicker neon outline for the larger car
            
            ctx.beginPath();
            ctx.moveTo(-w/2, -10);
            ctx.lineTo(w/2, -10);
            ctx.lineTo(w/2 - 8, -26);
            ctx.lineTo(-w/2 + 8, -26);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // --- C. Cabin / Window ---
            ctx.fillStyle = '#020203';
            ctx.beginPath();
            ctx.moveTo(-w/2 + 12, -26);
            ctx.lineTo(w/2 - 12, -26);
            ctx.lineTo(w/2 - 24, -44);
            ctx.lineTo(-w/2 + 24, -44);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Window reflection
            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.beginPath();
            ctx.moveTo(-w/2 + 18, -28);
            ctx.lineTo(0, -28);
            ctx.lineTo(-10, -42);
            ctx.lineTo(-w/2 + 30, -42);
            ctx.fill();

            // --- D. Classic Retro Spoiler ---
            ctx.beginPath();
            ctx.moveTo(-w/2 - 8, -38);
            ctx.lineTo(-w/2 + 12, -26);
            ctx.moveTo(w/2 + 8, -38);
            ctx.lineTo(w/2 - 12, -26);
            ctx.stroke();
            
            ctx.fillStyle = '#111';
            ctx.fillRect(-w/2 - 12, -42, w + 24, 6);
            ctx.strokeRect(-w/2 - 12, -42, w + 24, 6);

            // --- E. Dynamic Glowing Taillights ---
            const tailLightColor = isBraking ? '#FF0033' : '#FF0055';
            ctx.shadowColor = tailLightColor;
            ctx.shadowBlur = isBraking ? 40 : 20;
            ctx.fillStyle = tailLightColor;
            
            // Left and Right main lights
            ctx.fillRect(-w/2 + 6, -20, 20, 8);
            ctx.fillRect(w/2 - 26, -20, 20, 8);
            
            // Center neon strip
            ctx.shadowBlur = isBraking ? 25 : 10;
            ctx.fillRect(-w/2 + 34, -18, w - 68, 3);

            // --- F. Exhaust Flames ---
            if (!isBraking) {
                ctx.shadowColor = '#42C0FB';
                ctx.shadowBlur = 15;
                ctx.fillStyle = '#E0F7FA';
                ctx.beginPath();
                ctx.arc(-w/5, -6, 6 + Math.random() * 3, 0, Math.PI * 2);
                ctx.arc(w/5, -6, 6 + Math.random() * 3, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        }
    };
})();