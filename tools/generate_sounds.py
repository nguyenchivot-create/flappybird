#!/usr/bin/env python3
"""Generate the game's original sound assets into public/sounds/.

Every sound here is synthesized from scratch by this script, so the output is
free of third-party copyright and can be regenerated at any time:

    python3 tools/generate_sounds.py

Needs only the Python standard library. background.mp3 additionally needs
ffmpeg on PATH (without it, background.wav is kept instead and you can convert
it yourself).
"""
import math
import os
import random
import shutil
import struct
import subprocess
import wave

RATE = 22050
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'sounds')
random.seed(7)


def env(i, n, attack=0.005, release=None):
    """Linear attack, exponential-ish decay envelope (0..1)."""
    t = i / RATE
    a = min(1.0, t / attack) if attack > 0 else 1.0
    d = 1.0 - i / n
    return a * (d ** (release or 2))


def sweep(f0, f1, dur, shape='square', vol=0.5, release=2):
    n = int(RATE * dur)
    out, phase = [], 0.0
    for i in range(n):
        f = f0 * (f1 / f0) ** (i / n)
        phase += f / RATE
        p = phase % 1.0
        if shape == 'square':
            s = 1.0 if p < 0.5 else -1.0
        elif shape == 'triangle':
            s = 4 * abs(p - 0.5) - 1
        elif shape == 'saw':
            s = 2 * p - 1
        else:
            s = math.sin(2 * math.pi * p)
        out.append(s * vol * env(i, n, release=release))
    return out


def noise(dur, vol=0.5, cutoff_from=0.6, cutoff_to=0.05, release=2):
    """White noise through a one-pole low-pass whose cutoff sweeps over time."""
    n = int(RATE * dur)
    out, y = [], 0.0
    for i in range(n):
        k = cutoff_from + (cutoff_to - cutoff_from) * (i / n)
        y += k * (random.uniform(-1, 1) - y)
        out.append(y * vol * env(i, n, release=release))
    return out


def mix(*tracks, offsets=None):
    offsets = offsets or [0] * len(tracks)
    length = max(int(o * RATE) + len(t) for t, o in zip(tracks, offsets))
    out = [0.0] * length
    for t, o in zip(tracks, offsets):
        start = int(o * RATE)
        for i, s in enumerate(t):
            out[start + i] += s
    return out


def write_wav(name, samples):
    path = os.path.join(OUT, name)
    peak = max(1e-9, max(abs(s) for s in samples))
    scale = min(1.0, 0.9 / peak)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, s * scale)) * 32767)) for s in samples))
    return path


def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def background():
    """Original 8-bar chiptune loop (C - Am - F - G), 120 BPM, exactly 16 s."""
    bpm, bars = 120, 8
    beat = 60 / bpm
    total = int(RATE * beat * 4 * bars)
    out = [0.0] * total
    chords = [(60, 64, 67), (57, 60, 64), (53, 57, 60), (55, 59, 62)]
    melody = [72, 76, 79, 76, 74, 72, 69, 72, 69, 72, 76, 72, 71, 74, 79, 74]

    def add(start_s, samples):
        s0 = int(start_s * RATE)
        for i, v in enumerate(samples):
            if s0 + i < total:
                out[s0 + i] += v

    for bar in range(bars):
        root = chords[bar % 4]
        t_bar = bar * 4 * beat
        # Bass: root on every beat, an octave down
        for b in range(4):
            add(t_bar + b * beat, sweep(note(root[0] - 12), note(root[0] - 12), beat * 0.9, 'triangle', 0.35, 1.5))
        # Arpeggio in eighth notes
        for e in range(8):
            m = root[e % 3] + (12 if e >= 6 else 0)
            add(t_bar + e * beat / 2, sweep(note(m), note(m), beat / 2 * 0.8, 'square', 0.06, 3))
        # Simple lead on bars 5-8
        if bar >= 4:
            for q in range(4):
                m = melody[((bar - 4) * 4 + q) % len(melody)]
                add(t_bar + q * beat, sweep(note(m), note(m), beat * 0.85, 'triangle', 0.16, 1.2))
        # Soft hi-hat on off-beats
        for b in range(4):
            add(t_bar + b * beat + beat / 2, noise(0.04, 0.05, 0.9, 0.7, 3))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    write_wav('flap.wav', mix(noise(0.12, 0.6, 0.15, 0.5), sweep(380, 720, 0.09, 'triangle', 0.4)))
    write_wav('score.wav', mix(sweep(988, 988, 0.08, 'square', 0.3, 1),
                               sweep(1319, 1319, 0.22, 'square', 0.3, 2), offsets=[0, 0.08]))
    write_wav('hit.wav', mix(noise(0.18, 0.9, 0.5, 0.02), sweep(220, 70, 0.18, 'square', 0.45)))
    write_wav('die.wav', mix(sweep(700, 110, 0.6, 'saw', 0.3, 1.2),
                             sweep(523, 523, 0.15, 'triangle', 0.25), sweep(392, 392, 0.15, 'triangle', 0.25),
                             sweep(262, 262, 0.35, 'triangle', 0.3), offsets=[0, 0.55, 0.72, 0.89]))

    wav = write_wav('background.wav', background())
    if shutil.which('ffmpeg'):
        mp3 = os.path.join(OUT, 'background.mp3')
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame',
                        '-b:a', '96k', mp3], check=True)
        os.remove(wav)
        print('wrote', mp3)
    else:
        print('ffmpeg not found: kept background.wav; convert it to background.mp3 yourself')
    print('done ->', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
