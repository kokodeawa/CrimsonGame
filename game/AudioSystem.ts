
import { SFX_CONFIG, AMBIENCE_CONFIG } from './audioData';

export type StageType = 'OUTSIDE' | 'BASE' | 'MINE';

export class AudioSystem {
    private ctx: AudioContext | null = null;
    private ambienceNodes: { nodes: AudioNode[], gain: GainNode | null } = { nodes: [], gain: null };
    
    constructor() {}

    public init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    public close() {
        if (this.ctx) {
            this.ctx.close();
            this.ctx = null;
        }
    }

    public updateAmbienceVolume(volume: number) {
        if (this.ambienceNodes.gain && this.ctx) {
            try {
                this.ambienceNodes.gain.gain.setTargetAtTime(volume, this.ctx.currentTime, 0.1);
            } catch(e) {}
        }
    }

    public playSfx(type: string, volume: number) {
        if (!this.ctx || volume <= 0) return;
        try {
            const config = SFX_CONFIG[type];
            if (!config) return;

            const ctx = this.ctx;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            const now = ctx.currentTime;
            
            osc.type = config.type;
            osc.frequency.setValueAtTime(config.freqStart, now);
            
            if (config.ramp === 'linear') {
                osc.frequency.linearRampToValueAtTime(config.freqEnd, now + config.duration);
            } else {
                osc.frequency.exponentialRampToValueAtTime(config.freqEnd, now + config.duration);
            }

            // Special cases logic handling preserved or genericized
            if (type === 'start') {
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(config.vol * volume, now + 0.1);
            } else if (type === 'creak') {
                 gain.gain.setValueAtTime(0, now); 
                 gain.gain.linearRampToValueAtTime(config.vol * volume, now+0.2); 
                 gain.gain.linearRampToValueAtTime(0, now+config.duration); 
            } else {
                gain.gain.setValueAtTime(config.vol * volume, now);
            }
            
            gain.gain.exponentialRampToValueAtTime(0.001, now + config.duration);
            osc.start(now);
            osc.stop(now + config.duration + 0.1);

        } catch(e) {}
    }

    public updateAmbience(stage: StageType, volume: number) {
        if (!this.ctx) return;
        try {
          const ctx = this.ctx;
          const now = ctx.currentTime;
          if (this.ambienceNodes.nodes.length > 0) {
              this.ambienceNodes.nodes.forEach(node => { try { if (node instanceof OscillatorNode || (node as any).stop) (node as any).stop(now + 0.5); node.disconnect(); } catch(e) {} });
          }
          this.ambienceNodes.nodes = []; this.ambienceNodes.gain = null;
          
          const gain = ctx.createGain();
          this.ambienceNodes.gain = gain; 
          const newNodes: AudioNode[] = [gain];
          const config = AMBIENCE_CONFIG[stage];
          
          // Master Gain for this stage (Includes the 200% boost from config)
          const effectiveVolume = volume; 

          if (stage === 'OUTSIDE') {
              const osc = ctx.createOscillator();
              const lfo = ctx.createOscillator(); 
              const lfoGain = ctx.createGain();
              
              osc.type = config.oscType; 
              osc.frequency.value = config.freq; 
              
              lfo.type = 'sine'; 
              lfo.frequency.value = (config as any).lfoFreq; 
              lfoGain.gain.value = (config as any).lfoGain; 
              
              lfo.connect(lfoGain); 
              lfoGain.connect(osc.frequency); 
              
              gain.gain.value = config.baseGain * effectiveVolume; 
              
              osc.connect(gain); 
              gain.connect(ctx.destination); 
              
              lfo.start(now); 
              osc.start(now); 
              newNodes.push(osc, lfo, lfoGain);

          } else if (stage === 'MINE') {
              const osc = ctx.createOscillator();
              const lfo = ctx.createOscillator(); 
              const lfoGain = ctx.createGain();
              
              osc.type = config.oscType; 
              osc.frequency.value = config.freq; 
              
              lfo.type = 'sine'; 
              lfo.frequency.value = (config as any).lfoFreq; 
              lfoGain.gain.value = (config as any).lfoGain; 
              
              lfo.connect(lfoGain); 
              lfoGain.connect(osc.frequency); 
              
              gain.gain.value = config.baseGain * effectiveVolume; 
              
              osc.connect(gain); 
              gain.connect(ctx.destination); 
              
              lfo.start(now); 
              osc.start(now); 
              newNodes.push(osc, lfo, lfoGain);

          } else { 
              const osc = ctx.createOscillator();
              osc.type = config.oscType; 
              osc.frequency.value = config.freq; 
              gain.gain.value = config.baseGain * effectiveVolume;
              
              osc.connect(gain); 
              gain.connect(ctx.destination); 
              osc.start(now);
              
              // Noise Generator
              const bufferSize = ctx.sampleRate * 2; 
              const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); 
              const data = buffer.getChannelData(0);
              let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
              for (let i = 0; i < bufferSize; i++) {
                  const white = Math.random() * 2 - 1; 
                  b0 = 0.99886 * b0 + white * 0.0555179; 
                  b1 = 0.99332 * b1 + white * 0.0750759; 
                  b2 = 0.96900 * b2 + white * 0.1538520; 
                  b3 = 0.86650 * b3 + white * 0.3104856; 
                  b4 = 0.55000 * b4 + white * 0.5329522; 
                  b5 = -0.7616 * b5 - white * 0.0168980;
                  data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362; 
                  data[i] *= 0.11; 
                  b6 = white * 0.115926;
              }
              const noise = ctx.createBufferSource(); 
              noise.buffer = buffer; 
              noise.loop = true;
              
              const filter = ctx.createBiquadFilter(); 
              filter.type = 'lowpass'; 
              filter.frequency.value = 200; 
              
              const noiseGain = ctx.createGain(); 
              noiseGain.gain.value = (config as any).noiseGain * effectiveVolume; 
              
              noise.connect(filter); 
              filter.connect(noiseGain); 
              noiseGain.connect(ctx.destination); 
              noise.start(now);
              
              newNodes.push(osc, noise, filter, noiseGain);
          }
          this.ambienceNodes.nodes = newNodes;
        } catch(e) { console.error("Audio error", e); }
    }
}
