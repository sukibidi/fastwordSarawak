// js/ui.js
window.UI = (() => {
    const els = {
        screens: {
            title: document.getElementById('screen-title'),
            levels: document.getElementById('screen-levels'),
            game: document.getElementById('screen-game'),
            result: document.getElementById('screen-result')
        },
        hud: {
            score: document.getElementById('hud-score'),
            streak: document.getElementById('hud-streak'),
            check: document.getElementById('hud-check'),
            progress: document.getElementById('progress-fill'),
            track: document.getElementById('track-name')
        },
        center: {
            prompt: document.getElementById('prompt-text'),
            audioCue: document.getElementById('audio-cue'),
            bannerWrap: document.getElementById('banner-wrap'),
            left: document.getElementById('banner-left'),
            right: document.getElementById('banner-right'),
            feedback: document.getElementById('feedback-text')
        },
        res: {
            grade: document.getElementById('res-grade'),
            title: document.getElementById('res-title'),
            score: document.getElementById('res-score'),
            acc: document.getElementById('res-acc'),
            streak: document.getElementById('res-streak'),
            unlocks: document.getElementById('unlocks'),
            vocab: document.getElementById('r-vocab')
        }
    };

    return {
        showScreen: (id) => {
            Object.values(els.screens).forEach(s => s.classList.add('hidden'));
            if (els.screens[id]) els.screens[id].classList.remove('hidden');
        },
        updateHUD: (score, streak, qi, total, levelName) => {
            const pct = total > 0 ? Math.min(100, (qi / total) * 100) : 0;
            els.hud.score.textContent = String(score).padStart(4, '0');
            els.hud.streak.textContent = 'x' + streak;
            els.hud.check.textContent = `${qi}/${total}`;
            els.hud.progress.style.width = `${pct}%`;
            els.hud.track.textContent = levelName;
            console.log('HUD update', { score, streak, qi, total, levelName });
        },
        showBanners: (qText, leftText, rightText, isAudioOnly) => {
            els.center.left.className = 'banner';
            els.center.right.className = 'banner';
            els.center.left.classList.remove('correct', 'wrong');
            els.center.right.classList.remove('correct', 'wrong');

            if (isAudioOnly) {
                els.center.prompt.style.display = 'none';
                els.center.audioCue.style.display = 'block';
                els.center.audioCue.textContent = 'DENGAR BAIT-BAIT!';
            } else {
                els.center.audioCue.style.display = 'none';
                els.center.prompt.style.display = 'block';
                els.center.prompt.style.opacity = 1;
                els.center.prompt.textContent = `What does "${qText}" mean?`;
            }

            els.center.left.textContent = leftText;
            els.center.right.textContent = rightText;
            els.center.bannerWrap.classList.add('visible');
        },
        hideBanners: () => {
            els.center.prompt.style.opacity = 0;
            els.center.prompt.style.display = 'block';
            els.center.audioCue.style.display = 'none';
            els.center.bannerWrap.classList.remove('visible');
            els.center.left.classList.remove('correct', 'wrong');
            els.center.right.classList.remove('correct', 'wrong');
        },
        displayFeedback: (dir, isCorrect, msgText, correctDir) => {
            els.center.left.classList.remove('correct', 'wrong');
            els.center.right.classList.remove('correct', 'wrong');

            const selectedBanner = dir === 'left' ? els.center.left : els.center.right;
            const correctBanner = correctDir === 'left' ? els.center.left : els.center.right;

            if (isCorrect) {
                selectedBanner.classList.add('correct');
                correctBanner.classList.add('correct');
            } else {
                selectedBanner.classList.add('wrong');
                correctBanner.classList.add('correct');
            }

            els.center.feedback.textContent = msgText;
            els.center.feedback.style.color = isCorrect ? 'var(--neon-teal)' : 'var(--neon-red)';
            els.center.feedback.classList.add('pop');
            setTimeout(() => { els.center.feedback.classList.remove('pop'); }, 600);
        },
        showResult: (grade, color, title, score, acc, streak, unlockText, vocabList) => {
            els.res.grade.textContent = grade;
            els.res.grade.style.color = color;
            els.res.title.textContent = title;
            els.res.title.style.color = color;
            els.res.score.textContent = score;
            els.res.acc.textContent = acc + '%';
            els.res.streak.textContent = 'x' + streak;
            els.res.unlocks.textContent = unlockText;
            els.res.vocab.innerHTML = '';

            (vocabList || []).forEach(item => {
                const node = document.createElement('div');
                node.className = `vocab-item${item.learned ? ' learned' : ''}`;
                node.textContent = `${item.q} — ${item.a}`;
                els.res.vocab.appendChild(node);
            });

            window.UI.showScreen('result');
        }
    };
})();