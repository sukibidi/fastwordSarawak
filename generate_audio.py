import json, wave, math, struct
from pathlib import Path

root = Path(__file__).resolve().parent

vocab_files = [root / 'vocab' / 'feedback.json'] + [root / 'vocab' / f'level{i}.json' for i in range(1, 6)]
refs = []
for path in vocab_files:
    if not path.exists():
        continue
    data = json.loads(path.read_text(encoding='utf-8'))
    if isinstance(data, dict):
        for item in data.get('vocab', []):
            src = item.get('audioSrc')
            if src:
                refs.append(src)
        for item in data.get('correct', []) + data.get('wrong', []):
            src = item.get('src') if isinstance(item, dict) else None
            if src:
                refs.append(src)
    else:
        for item in data:
            if isinstance(item, dict):
                if 'audioSrc' in item:
                    refs.append(item['audioSrc'])
                if 'src' in item:
                    refs.append(item['src'])

for sfx in ['audio/sfx/engine_loop.mp3', 'audio/sfx/checkpoint_ping.mp3', 'audio/sfx/level_complete.mp3']:
    refs.append(sfx)

seen = set()
for ref in refs:
    if ref in seen:
        continue
    seen.add(ref)
    src_path = root / ref
    if src_path.suffix.lower() == '.mp3':
        wav_path = src_path.with_suffix('.wav')
        wav_path.parent.mkdir(parents=True, exist_ok=True)
        if wav_path.exists():
            continue
        name = wav_path.stem.lower()
        if 'engine' in name:
            freq, duration, volume = 180, 0.65, 0.12
        elif 'checkpoint' in name:
            freq, duration, volume = 900, 0.35, 0.13
        elif 'level' in name:
            freq, duration, volume = 700, 0.55, 0.12
        elif 'correct' in name:
            freq, duration, volume = 660, 0.35, 0.16
        elif 'wrong' in name:
            freq, duration, volume = 320, 0.35, 0.16
        else:
            freq, duration, volume = 520, 0.35, 0.12

        sample_rate = 22050
        n_samples = int(sample_rate * duration)
        with wave.open(str(wav_path), 'wb') as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            for i in range(n_samples):
                t = i / sample_rate
                value = math.sin(2 * math.pi * freq * t)
                if 'engine' in name:
                    value += 0.5 * math.sin(2 * math.pi * (freq * 0.5) * t)
                amplitude = int(32767 * volume * value)
                wav.writeframesraw(struct.pack('<h', amplitude))

print(f'Generated {len(seen)} audio asset references')
