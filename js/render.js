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
        if (ctx) {
            ctx.imageSmoothingEnabled = true;
        }
    }

    window.addEventListener('resize', resize);
    resize();

    function lerp(a, b, t) { return a + (b - a) * t; }

    return {
        resize,
        updateTime: (dt, speed) => {
            ROAD.time += dt * 0.0008 * speed;
        },
        clear: () => {
            if (!ctx || !W || !H) return;
            ctx.clearRect(0, 0, W, H);
        },
        drawRoad: (levelId, carOffset, flashAlpha, flashColorHex) => {
            if (!ctx || !W || !H) return;

            const hz = ROAD.horizon;
            const vx = ROAD.vanishX;
            const bt = H - (H * 0.18);
            const bw = W * 1.1;
            const hw = 40;

            const skyColors = ['#0B1120','#1A0A00','#090E1D','#040408','#000005'];
            const roadColors = ['#1C2030','#1A1208','#151822','#0E1118','#080A10'];
            const lineColors = ['#F5C842','#E8761A','#5B8CFF','#2ECC71','#A855F7'];

            const idx = Math.max(0, Math.min(4, levelId - 1));
            const lineC = lineColors[idx];

            ctx.fillStyle = skyColors[idx];
            ctx.fillRect(0, 0, W, hz);

            ctx.fillStyle = roadColors[idx];
            ctx.beginPath();
            ctx.moveTo(vx - hw, hz); ctx.lineTo(vx + hw, hz);
            ctx.lineTo(vx + bw/2, bt); ctx.lineTo(vx - bw/2, bt);
            ctx.fill();

            ctx.fillStyle = '#0A0B0F';
            ctx.fillRect(0, bt, W, H - bt);

            const numLines = 14;
            for (let i = 0; i < numLines; i++) {
                const t = ((i / numLines) + (ROAD.time % 1));
                const tt = t * t;
                const y = lerp(hz, bt, tt);
                const xw = lerp(hw, bw / 2, tt);
                const lh = Math.max(1, (bt - hz) / numLines * tt * 1.8);

                ctx.strokeStyle = lineC;
                ctx.globalAlpha = 0.35 * tt;
                ctx.lineWidth = Math.max(1, 2 * tt);

                ctx.beginPath(); ctx.moveTo(vx - 2, y); ctx.lineTo(vx - 2, y + lh); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(vx + 2, y); ctx.lineTo(vx + 2, y + lh); ctx.stroke();

                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(vx - xw, y); ctx.lineTo(vx + xw, y); ctx.stroke();
            }
            ctx.globalAlpha = 1;

            const arcY = hz + (bt - hz) * 0.55;
            const arcW = lerp(hw * 2, bw, 0.55) * 0.5;
            const archH = 28 + arcW * 0.08;

            ctx.strokeStyle = lineC; ctx.lineWidth = 3; ctx.globalAlpha = 0.7;
            ctx.beginPath(); ctx.moveTo(vx - arcW, arcY - archH); ctx.lineTo(vx - arcW, arcY + archH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(vx + arcW, arcY - archH); ctx.lineTo(vx + arcW, arcY + archH); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(vx - arcW, arcY - archH); ctx.lineTo(vx + arcW, arcY - archH); ctx.stroke();
            ctx.globalAlpha = 1;

            const carY = bt - 10;
            const carX = vx + carOffset;
            const cw = 34, ch = 22;

            ctx.fillStyle = '#222'; ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(carX - cw/2, carY - ch, cw, ch, 4);
            } else {
                ctx.moveTo(carX - cw/2, carY - ch);
                ctx.lineTo(carX + cw/2, carY - ch);
                ctx.lineTo(carX + cw/2, carY - ch + ch);
                ctx.lineTo(carX - cw/2, carY - ch + ch);
                ctx.closePath();
            }
            ctx.fill(); ctx.stroke();

            ctx.fillStyle = lineC; ctx.globalAlpha = 0.8;
            ctx.fillRect(carX - cw/2 + 3, carY - ch + 3, cw - 6, 5);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#111';
            ctx.fillRect(carX - cw/2, carY - 8, cw, 8);

            if (flashAlpha > 0 && flashColorHex) {
                ctx.save();
                ctx.globalAlpha = flashAlpha;
                ctx.fillStyle = flashColorHex;
                ctx.fillRect(0, 0, W, H);
                ctx.restore();
            }
        }
    };
})();