// js/game.js
const Game = (() => {
    let state = {
        levelIdx: 0, level: null, queue: [], qi: 0,
        score: 0, streak: 0, bestStreak: 0, correct: 0, total: 0,
        carOffset: 0, targetOffset: 0,
        phase: 'menu',
        checkTimer: 0, decisionTimer: 0, feedbackTimer: 0, flashTimer: 0,
        flashColorStr: null,
        answerDir: null, leftText: '', rightText: '',
        feedbackData: null, learned: []
    };

    let animId = null;
    let lastTs = 0;

    const PAINTS = ['Kalas (Pink)', 'Gadong (Green)', 'Ngkodok (Purple)', 'Sia (Red)', 'Krom (Metallic Chrome)'];
    const TITLES = ['Driver Newbie', 'Jalan Rookie', 'Bintang Bintang', 'Nang Driver', 'Nang Terer Driver!'];

    function getLevelDuration() {
        if (!state.level) return 1000;
        return state.level.speed > 2.0 ? 600 : (state.level.speed > 1.2 ? 800 : 1000);
    }

    async function initGame(levelIdInt) {
        state.levelIdx = levelIdInt - 1;
        state.learned = [];
        state.phase = 'menu';
        cancelAnimationFrame(animId);
        Render.resize();
        AudioEngine.startBackground();

        try {
            if (!state.feedbackData) {
                const fbRes = await fetch('vocab/feedback.json');
                state.feedbackData = await fbRes.json();
            }
            const lvRes = await fetch(`vocab/level${levelIdInt}.json`);
            state.level = await lvRes.json();
        } catch (e) {
            console.error('Data load failed. Running locally without server?', e);
            return;
        }

        state.queue = [...state.level.vocab].sort(() => Math.random() - 0.5);
        state.qi = 0; state.score = 0; state.streak = 0; state.bestStreak = 0;
        state.correct = 0; state.total = 0;
        state.carOffset = 0; state.targetOffset = 0;
        state.flashColorStr = null; state.flashTimer = 0;

        UI.updateHUD(state.score, state.streak, state.qi, state.queue.length, state.level.name);
        UI.showScreen('game');

        state.phase = 'driving';
        state.checkTimer = getLevelDuration();

        lastTs = performance.now();
        animId = requestAnimationFrame(loop);
    }

    function showBanners() {
        if (!state.level || state.phase !== 'driving') return;
        state.phase = 'decision';
        const q = state.queue[state.qi];

        state.answerDir = Math.random() < 0.5 ? 'left' : 'right';
        if (state.answerDir === 'left') {
            state.leftText = q.a; state.rightText = q.wrong;
        } else {
            state.leftText = q.wrong; state.rightText = q.a;
        }

        UI.showBanners(q.q, state.leftText, state.rightText, Boolean(state.level.audioOnly));
        AudioEngine.playWord(q.audioSrc);
        AudioEngine.playCheckpoint();

        state.decisionTimer = state.level.speed > 2.0 ? 2200 : 3000;
    }

    function handleAnswer(dir) {
        if (state.phase !== 'decision') return;
        state.phase = 'feedback';
        state.total++;
        
        // Immediately stop the prompt audio to prevent overlap
        AudioEngine.stopWord(); 

        const q = state.queue[state.qi];
        const isCorrect = (dir === state.answerDir);
        let fbText = '';

        if (isCorrect) {
            state.correct++;
            state.streak++;
            if (state.streak > state.bestStreak) state.bestStreak = state.streak;
            const pts = 10 * Math.max(1, state.streak);
            state.score += pts;
            state.flashColorStr = '#00E5B4';
            AudioEngine.playFeedbackSfx(true);
            const voiceLine = AudioEngine.playFeedbackVoice(state.feedbackData.correct) || 'Nang Pandey!';
            fbText = `+${pts} PTS - ${voiceLine}`;
            state.learned.push({ q: q.q, a: q.a, learned: true });
        } else {
            state.streak = 0;
            state.score = Math.max(0, state.score - 10);
            state.flashColorStr = '#FF3B3B';
            AudioEngine.playFeedbackSfx(false);
            const voiceLine = AudioEngine.playFeedbackVoice(state.feedbackData.wrong) || 'Cuba Lagi';
            fbText = `-10 PTS - ${voiceLine}`;
        }

        state.flashTimer = 400;
        state.targetOffset = dir === 'left' ? -(window.innerWidth * 0.12) : (window.innerWidth * 0.12);

        UI.displayFeedback(dir, isCorrect, fbText, state.answerDir);
        UI.updateHUD(state.score, state.streak, state.qi + 1, state.queue.length, state.level.name);

        state.feedbackTimer = 900;
    }

    function endGame() {
        state.phase = 'menu';
        cancelAnimationFrame(animId);
        animId = null;
        AudioEngine.stopBackground();
        AudioEngine.playLevelComplete();

        const acc = state.total > 0 ? Math.round((state.correct / state.total) * 100) : 0;
        let grade = 'E'; let color = '#FF3B3B'; let unlock = 'Cuba Lagik!';

        if (acc >= 90) {
            grade = 'A'; color = '#00E5B4'; unlock = `Unlocked: ${PAINTS[state.levelIdx]} + ${TITLES[state.levelIdx]}`;
        } else if (acc >= 70) {
            grade = 'B'; color = '#F5C842'; unlock = `Unlocked: ${PAINTS[state.levelIdx]}`;
        } else if (acc >= 50) {
            grade = 'C'; color = '#3B82F6'; unlock = 'Keep practicing for the paint unlock.';
        } else if (acc >= 30) {
            grade = 'D'; color = '#F97316'; unlock = 'Keep practicing!';
        }

        const title = grade === 'A' ? TITLES[state.levelIdx] : (grade === 'B' ? TITLES[Math.max(0, state.levelIdx - 1)] : 'Cuba Lagi');
        const vocabList = state.queue.map(item => ({
            q: item.q,
            a: item.a,
            learned: state.learned.some(entry => entry.q === item.q)
        }));

        UI.showResult(grade, color, title, state.score, acc, state.bestStreak, unlock, vocabList);
    }

    function loop(ts) {
        animId = requestAnimationFrame(loop);
        const dt = Math.min(ts - lastTs, 64);
        lastTs = ts;

        if (!state.level) return;

        Render.updateTime(dt, state.level ? state.level.speed : 1);
        state.carOffset += (state.targetOffset - state.carOffset) * (1 - Math.exp(-10 * (dt / 1000)));

        let flashAlpha = 0;
        if (state.flashTimer > 0) {
            state.flashTimer -= dt;
            flashAlpha = Math.max(0, (state.flashTimer / 400) * 0.3);
        }

        Render.drawRoad(state.level ? state.level.id : 1, state.carOffset, flashAlpha, state.flashColorStr);

        if (state.phase === 'driving') {
            state.checkTimer -= dt;
            if (state.checkTimer <= 0) showBanners();
        } else if (state.phase === 'decision') {
            state.decisionTimer -= dt;
            if (state.decisionTimer <= 0) {
                handleAnswer(state.answerDir === 'left' ? 'right' : 'left');
            }
        } else if (state.phase === 'feedback') {
            state.feedbackTimer -= dt;
            if (state.feedbackTimer <= 0) {
                state.targetOffset = 0;
                UI.hideBanners();
                state.qi++;
                if (state.qi >= state.queue.length) {
                    state.phase = 'menu';
                    setTimeout(endGame, 400);
                } else {
                    state.phase = 'driving';
                    state.checkTimer = getLevelDuration();
                }
            }
        }
    }

    document.getElementById('btn-start-game').onclick = () => initGame(1);
    document.getElementById('btn-retry').onclick = () => initGame(state.levelIdx + 1);
    document.getElementById('btn-menu').onclick = () => {
        cancelAnimationFrame(animId);
        animId = null;
        AudioEngine.stopBackground();
        UI.showScreen('title');
    };

    const TRACK_NAMES = [
        "1. Kuching Waterfront",
        "2. Jalan Masjid Jamek",
        "3. Jam City Samarahan",
        "4. Sematan Highway",
        "5. Ultimate Pan Borneo (Audio only)"
    ];

    document.getElementById('btn-level-select').onclick = () => {
        const list = document.getElementById('level-list');
        list.innerHTML = ''; // Clear old buttons
        
        // Build new buttons using your custom track names
        TRACK_NAMES.forEach((trackName, index) => {
            const levelId = index + 1;
            const btn = document.createElement('button');
            btn.className = 'btn';
            
            // Add a special elite class to Level 5 to make it stand out (optional styling)
            if (levelId === 5) {
                btn.style.color = '#FF3B3B'; // Neon red for the final boss level
                btn.style.borderColor = '#FF3B3B';
            }
            
            btn.textContent = trackName;
            btn.onclick = () => initGame(levelId);
            list.appendChild(btn);
        });
        
        UI.showScreen('levels');
    };

    document.getElementById('btn-back-title').onclick = () => UI.showScreen('title');

    const steer = (dir) => (e) => {
        e.preventDefault();
        handleAnswer(dir);
    };

    const leftBtn = document.getElementById('btn-left');
    const rightBtn = document.getElementById('btn-right');
    const setPressed = (btn, pressed) => btn.classList.toggle('pressed', pressed);

    leftBtn.addEventListener('touchstart', steer('left'), { passive: false });
    leftBtn.addEventListener('mousedown', steer('left'));
    leftBtn.addEventListener('pointerdown', () => setPressed(leftBtn, true));
    leftBtn.addEventListener('pointerup', () => setPressed(leftBtn, false));
    leftBtn.addEventListener('pointerleave', () => setPressed(leftBtn, false));
    leftBtn.addEventListener('pointercancel', () => setPressed(leftBtn, false));

    rightBtn.addEventListener('touchstart', steer('right'), { passive: false });
    rightBtn.addEventListener('mousedown', steer('right'));
    rightBtn.addEventListener('pointerdown', () => setPressed(rightBtn, true));
    rightBtn.addEventListener('pointerup', () => setPressed(rightBtn, false));
    rightBtn.addEventListener('pointerleave', () => setPressed(rightBtn, false));
    rightBtn.addEventListener('pointercancel', () => setPressed(rightBtn, false));

    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') handleAnswer('left');
        if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') handleAnswer('right');
    });


    
    let startX = null;
    document.getElementById('gameCanvas').addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    document.getElementById('gameCanvas').addEventListener('touchend', e => {
        if (!startX || state.phase !== 'decision') return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) handleAnswer(dx < 0 ? 'left' : 'right');
        startX = null;
    }, { passive: true });

    return { initGame };
})();