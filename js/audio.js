// js/audio.js
window.AudioEngine = (() => {
    const wordPlayer = (() => {
        try { return new Audio(); } catch (e) { console.warn('Audio init failed:', e); return null; }
    })();
    const feedbackPlayer = (() => {
        try { return new Audio(); } catch (e) { console.warn('Audio init failed:', e); return null; }
    })();
    const feedbackSfxPlayer = (() => {
        try { return new Audio(); } catch (e) { console.warn('Audio init failed:', e); return null; }
    })();

    let audioCtx = null;
    let masterGain = null;
    let bgGain = null;
    let bgFilter = null;
    let bgOsc1 = null;
    let bgOsc2 = null;
    let bgLfo = null;
    let bgLfoGain = null;
    let backgroundActive = false;
    let isMuted = false;

    const ensureAudioContext = () => {
        if (!audioCtx) {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            audioCtx = new Ctx();
        }

        if (audioCtx.state === 'suspended') {
            audioCtx.resume().catch(() => {});
        }

        if (!masterGain) {
            masterGain = audioCtx.createGain();
            masterGain.gain.value = isMuted ? 0 : 1;
            masterGain.connect(audioCtx.destination);
        }

        return audioCtx;
    };

    const stopNode = (node) => {
        if (!node) return;
        try { node.stop(); } catch (e) {}
        try { node.disconnect(); } catch (e) {}
    };

    const getAudioCandidates = (src) => {
        if (!src) return [];
        const normalized = String(src).trim();
        if (!normalized) return [];
        const candidates = [normalized];
        if (/\.mp3$/i.test(normalized)) candidates.push(normalized.replace(/\.mp3$/i, '.wav'));
        if (/\.wav$/i.test(normalized)) candidates.push(normalized.replace(/\.wav$/i, '.mp3'));
        return [...new Set(candidates)];
    };

    const playAudioFile = (player, src, label, fallbackTone = null) => {
        if (!player || isMuted || !src) return Promise.resolve(false);
        const candidates = getAudioCandidates(src);
        if (!candidates.length) return Promise.resolve(false);

        return new Promise((resolve) => {
            let index = 0;
            const tryNext = () => {
                if (index >= candidates.length) {
                    if (fallbackTone) {
                        const [freq, duration, type, gainValue] = fallbackTone;
                        playTone(freq, duration, type, gainValue);
                    }
                    console.warn(`${label} audio could not be played`, src);
                    resolve(false);
                    return;
                }

                const candidate = candidates[index++];
                try {
                    player.pause();
                    player.currentTime = 0;
                    player.volume = 1;
                    player.src = candidate;
                    player.load();

                    const onCanPlay = () => {
                        player.removeEventListener('canplaythrough', onCanPlay);
                        player.removeEventListener('error', onError);
                        player.play().then(() => resolve(true)).catch(() => {
                            if (fallbackTone) {
                                const [freq, duration, type, gainValue] = fallbackTone;
                                playTone(freq, duration, type, gainValue);
                            }
                            resolve(false);
                        });
                    };
                    const onError = () => {
                        player.removeEventListener('canplaythrough', onCanPlay);
                        player.removeEventListener('error', onError);
                        tryNext();
                    };

                    player.addEventListener('canplaythrough', onCanPlay, { once: true });
                    player.addEventListener('error', onError, { once: true });
                } catch (e) {
                    console.warn(`${label} audio failed:`, e);
                    tryNext();
                }
            };

            tryNext();
        });
    };

    const stopBackgroundNodes = () => {
        if (!audioCtx || !backgroundActive) return;

        const now = audioCtx.currentTime;
        if (bgGain) {
            bgGain.gain.cancelScheduledValues(now);
            bgGain.gain.setTargetAtTime(0.0001, now, 0.25);
        }

        stopNode(bgOsc1);
        stopNode(bgOsc2);
        stopNode(bgLfo);

        bgOsc1 = null;
        bgOsc2 = null;
        bgLfo = null;
        bgLfoGain = null;
        bgFilter = null;
        bgGain = null;
        backgroundActive = false;
    };

    const playTone = (freq, duration, type = 'sine', gainValue = 0.04) => {
        const ctx = ensureAudioContext();
        if (!ctx || isMuted) return;

        const gain = ctx.createGain();
        gain.connect(masterGain || ctx.destination);
        gain.gain.value = 0.0001;
        gain.gain.linearRampToValueAtTime(gainValue, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;
        osc.connect(gain);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    };

    const setMuted = (muted) => {
        isMuted = !!muted;
        if (wordPlayer) wordPlayer.volume = isMuted ? 0 : 1;
        if (feedbackPlayer) feedbackPlayer.volume = isMuted ? 0 : 1;
        if (feedbackSfxPlayer) feedbackSfxPlayer.volume = isMuted ? 0 : 1;
        if (audioCtx && masterGain) {
            masterGain.gain.setTargetAtTime(isMuted ? 0 : 1, audioCtx.currentTime, 0.05);
        }
        return isMuted;
    };

    const soundButtons = Array.from(document.querySelectorAll('[data-sound-toggle], #btn-sound, #btn-sound-hud')).filter(Boolean);
    if (soundButtons.length) {
        const syncSoundButton = () => {
            soundButtons.forEach((btn) => {
                const labelOn = btn.getAttribute('data-label-on') || 'SOUND ON';
                const labelOff = btn.getAttribute('data-label-off') || 'SOUND OFF';
                btn.textContent = isMuted ? labelOff : labelOn;
                btn.setAttribute('aria-pressed', String(isMuted));
            });
        };
        syncSoundButton();
        soundButtons.forEach((btn) => {
            btn.addEventListener('click', () => {
                setMuted(!isMuted);
                syncSoundButton();
            });
        });
    }

   // Replace the return block in js/audio.js with this:
    return {
        stopWord: () => {
            if (wordPlayer) {
                wordPlayer.pause();
                wordPlayer.currentTime = 0;
            }
        },
        playWord: (src) => {
            if (!src) return;
            playAudioFile(wordPlayer, src, 'Word');
        },
        playFeedbackSfx: (isCorrect, delayMs = 300) => {
            const src = isCorrect ? 'audio/sfx/feedback_correct.wav' : 'audio/sfx/feedback_wrong.wav';
            const fallbackTone = isCorrect
                ? [1040, 0.16, 'triangle', 0.035]
                : [420, 0.18, 'sawtooth', 0.03];
            if (feedbackSfxPlayer) {
                setTimeout(() => playAudioFile(feedbackSfxPlayer, src, 'Feedback SFX', fallbackTone), delayMs);
            }
        },
        playFeedbackVoice: (pool, delayMs = 300) => {
            if (!pool || pool.length === 0) return null;
            const item = pool[Math.floor(Math.random() * pool.length)];
            if (!item) return null;
            const voiceSrc = item.voiceSrc || item.src || item.audioSrc || '';
            if (feedbackPlayer) {
                setTimeout(() => playAudioFile(feedbackPlayer, voiceSrc, 'Feedback'), delayMs);
            }
            return item.text;
        },
        playFeedback: function (pool, isCorrect) {
            this.playFeedbackSfx(isCorrect);
            return this.playFeedbackVoice(pool);
        },
        playCheckpoint: () => {
            playTone(880, 0.35, 'triangle', 0.03);
        },
        playLevelComplete: () => {
            playTone(660, 0.22, 'sine', 0.025);
            setTimeout(() => playTone(830, 0.28, 'triangle', 0.025), 180);
        },
        startBackground: () => {
            const ctx = ensureAudioContext();
            if (!ctx || backgroundActive) return;
            bgGain = ctx.createGain();
            bgGain.gain.value = 0.0001;
            bgGain.connect(masterGain || ctx.destination);
            bgFilter = ctx.createBiquadFilter();
            bgFilter.type = 'lowpass';
            bgFilter.frequency.value = 1100;
            bgFilter.Q.value = 0.7;
            bgFilter.connect(bgGain);
            bgOsc1 = ctx.createOscillator();
            bgOsc1.type = 'sine';
            bgOsc1.frequency.value = 220;
            bgOsc1.connect(bgFilter);
            bgOsc2 = ctx.createOscillator();
            bgOsc2.type = 'triangle';
            bgOsc2.frequency.value = 330;
            bgOsc2.connect(bgFilter);
            bgLfo = ctx.createOscillator();
            bgLfo.type = 'sine';
            bgLfo.frequency.value = 0.12;
            bgLfoGain = ctx.createGain();
            bgLfoGain.gain.value = 40;
            bgLfo.connect(bgLfoGain);
            bgLfoGain.connect(bgOsc1.frequency);
            bgLfoGain.connect(bgOsc2.frequency);
            bgOsc1.start();
            bgOsc2.start();
            bgLfo.start();
            bgGain.gain.setTargetAtTime(0.035, ctx.currentTime, 0.25);
            backgroundActive = true;
        },
        stopBackground: stopBackgroundNodes,
        startEngine: () => {
            return this.startBackground();
        },
        stopEngine: stopBackgroundNodes,
        setMuted,
        toggleMute: () => setMuted(!isMuted),
        isMuted: () => isMuted
    };
    
})();