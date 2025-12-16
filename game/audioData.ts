
export const SFX_CONFIG: Record<string, { type: 'square' | 'sine' | 'sawtooth' | 'triangle', freqStart: number, freqEnd: number, duration: number, vol: number, ramp: 'linear' | 'exponential' }> = {
    'jump': { type: 'sine', freqStart: 150, freqEnd: 300, duration: 0.2, vol: 0.15, ramp: 'exponential' },
    'mine': { type: 'square', freqStart: 80, freqEnd: 30, duration: 0.15, vol: 0.22, ramp: 'exponential' },
    'mine_metal': { type: 'square', freqStart: 60, freqEnd: 20, duration: 0.12, vol: 0.22, ramp: 'exponential' },
    'clank': { type: 'sawtooth', freqStart: 800, freqEnd: 200, duration: 0.08, vol: 0.15, ramp: 'exponential' },
    'attack': { type: 'sawtooth', freqStart: 800, freqEnd: 100, duration: 0.35, vol: 0.15, ramp: 'exponential' },
    'laser': { type: 'square', freqStart: 1200, freqEnd: 600, duration: 0.15, vol: 0.15, ramp: 'exponential' },
    'damage': { type: 'sawtooth', freqStart: 150, freqEnd: 50, duration: 0.35, vol: 0.30, ramp: 'linear' },
    'collect': { type: 'sine', freqStart: 1200, freqEnd: 1800, duration: 0.15, vol: 0.08, ramp: 'linear' },
    'step': { type: 'triangle', freqStart: 80, freqEnd: 40, duration: 0.1, vol: 0.15, ramp: 'exponential' },
    'ui_open': { type: 'sine', freqStart: 600, freqEnd: 1200, duration: 0.15, vol: 0.15, ramp: 'linear' },
    'ui_close': { type: 'sine', freqStart: 1200, freqEnd: 600, duration: 0.1, vol: 0.15, ramp: 'linear' },
    'start': { type: 'sawtooth', freqStart: 200, freqEnd: 800, duration: 1.0, vol: 0.30, ramp: 'exponential' },
    'teleport': { type: 'sine', freqStart: 100, freqEnd: 1500, duration: 0.8, vol: 0.30, ramp: 'exponential' },
    'squish': { type: 'sawtooth', freqStart: 300, freqEnd: 100, duration: 0.15, vol: 0.2, ramp: 'linear' },
    'error': { type: 'square', freqStart: 150, freqEnd: 100, duration: 0.2, vol: 0.2, ramp: 'linear' },
    'creak': { type: 'sawtooth', freqStart: 150, freqEnd: 100, duration: 0.6, vol: 0.08, ramp: 'linear' },
    'upgrade': { type: 'sine', freqStart: 400, freqEnd: 800, duration: 0.3, vol: 0.2, ramp: 'linear' },
    'craft': { type: 'square', freqStart: 400, freqEnd: 200, duration: 0.1, vol: 0.2, ramp: 'exponential' },
    'install': { type: 'triangle', freqStart: 600, freqEnd: 300, duration: 0.2, vol: 0.2, ramp: 'exponential' },
    'consume': { type: 'sine', freqStart: 800, freqEnd: 1200, duration: 0.1, vol: 0.15, ramp: 'linear' },
    'click': { type: 'sine', freqStart: 600, freqEnd: 600, duration: 0.05, vol: 0.1, ramp: 'linear' },
    
    // Break Sounds
    'break_stone': { type: 'square', freqStart: 100, freqEnd: 20, duration: 0.25, vol: 0.3, ramp: 'exponential' },
    'break_metal': { type: 'sawtooth', freqStart: 1200, freqEnd: 100, duration: 0.2, vol: 0.25, ramp: 'exponential' },
    'break_wood': { type: 'triangle', freqStart: 150, freqEnd: 50, duration: 0.2, vol: 0.3, ramp: 'linear' },
    'break_glass': { type: 'sine', freqStart: 2000, freqEnd: 1000, duration: 0.15, vol: 0.2, ramp: 'exponential' }, // Ice
    'break_organic': { type: 'sawtooth', freqStart: 400, freqEnd: 50, duration: 0.25, vol: 0.25, ramp: 'linear' },
};

export const AMBIENCE_CONFIG = {
    OUTSIDE: {
        oscType: 'triangle' as OscillatorType,
        freq: 80,
        lfoFreq: 0.5,
        lfoGain: 40,
        baseGain: 0.075 
    },
    MINE: {
        oscType: 'sine' as OscillatorType,
        freq: 50,
        lfoFreq: 0.2,
        lfoGain: 10,
        baseGain: 0.57 
    },
    BASE: {
        oscType: 'sine' as OscillatorType,
        freq: 60,
        baseGain: 0.30, 
        noiseGain: 0.21 
    }
};
