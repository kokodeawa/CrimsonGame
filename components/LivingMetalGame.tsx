
import React, { useRef, useEffect } from 'react';
import { GameState, Vector2, Particle, LevelObject, PlayerStats, Projectile, Language } from '../types';

interface GameProps {
  gameState: GameState;
  stats: PlayerStats;
  onUpdateStats: (stats: Partial<PlayerStats>) => void;
  onToggleBase: (isOpen: boolean, type?: 'engineering' | 'lab') => void;
  interactionTrigger: number;
  onCanInteract: (can: boolean) => void;
  onShowLocationSelect: () => void;
  requestedStage: 'OUTSIDE' | 'MINE' | 'BASE' | null;
  onStageChanged: (stage: 'OUTSIDE' | 'MINE' | 'BASE') => void;
  onTravel: (destination: 'OUTSIDE' | 'MINE' | 'BASE') => void;
  mobileActionMode: 'MINE' | 'ATTACK';
  onGameOver: () => void;
  volumeSettings: { sfx: number; ambience: number };
  language: Language;
  toggleInventory: () => void; 
  isLoading: boolean;
}

const PIXEL_SCALE = 2; 
const BLOCK_SIZE = 8; 
const CHUNK_SIZE = 300; // Spatial Grid Chunk Size

type StageType = 'OUTSIDE' | 'BASE' | 'MINE';

interface FloatingText {
    id: number;
    x: number;
    y: number;
    text: string;
    life: number;
    color: string;
    velocity: number;
}

const STAGE_CONFIG = {
    OUTSIDE: { width: 2400, height: 1000 },
    MINE: { width: 3000, height: 1600 },
    BASE: { width: 1000, height: 800 }
};

const createOffscreenCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { alpha: true });
  if (!ctx) throw new Error("Could not create canvas context");
  return { canvas: c, ctx: ctx as CanvasRenderingContext2D };
};

const generateGlowSprite = (radius: number, color: string) => {
  const size = radius * 2;
  const { canvas, ctx } = createOffscreenCanvas(size, size);
  const grad = ctx.createRadialGradient(radius, radius, 1, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
};

const generateCrackTextures = () => {
  const size = BLOCK_SIZE;
  const stages = 3;
  const textures = [];
  for(let i=1; i<=stages; i++) {
      const { canvas, ctx } = createOffscreenCanvas(size, size);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for(let j=0; j<i*2; j++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          ctx.moveTo(x, y);
          ctx.lineTo(x + (Math.random()-0.5)*6, y + (Math.random()-0.5)*6);
      }
      ctx.stroke();
      textures.push(canvas);
  }
  return textures;
};

const generateMetalTexture = () => {
  const { canvas, ctx } = createOffscreenCanvas(32, 32);
  ctx.fillStyle = '#2d0a0a';
  ctx.fillRect(0, 0, 32, 32);
  return canvas;
};

const generateResourceTextures = () => {
  const textures: Record<string, HTMLCanvasElement> = {};
  const size = BLOCK_SIZE;
  const init = (w = size, h = size) => createOffscreenCanvas(w, h);
  {
    const { canvas, ctx } = init();
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#553322'; ctx.fillRect(1, 1, 4, 2);
    ctx.fillStyle = '#111'; ctx.fillRect(1, 1, 1, 1); ctx.fillRect(4, 1, 1, 1);
    textures['scrap'] = canvas;
  }
  {
    const { canvas, ctx } = init();
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#8899aa'; ctx.fillRect(1, 2, 2, 2); ctx.fillRect(3, 1, 1, 1); ctx.fillRect(2, 4, 2, 1);
    ctx.fillStyle = '#fff'; ctx.fillRect(2, 3, 1, 1);
    textures['iron'] = canvas;
  }
  {
    const { canvas, ctx } = init();
    ctx.fillStyle = '#3e2723'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(1, 0); ctx.lineTo(2, size); ctx.moveTo(3, 0); ctx.lineTo(4, size); ctx.moveTo(5, 0); ctx.lineTo(4, size); ctx.stroke();
    textures['wood'] = canvas;
  }
  {
    const { canvas, ctx } = init();
    ctx.fillStyle = '#006064'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#00bcd4'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(3, 0); ctx.lineTo(0, 3); ctx.fill(); ctx.beginPath(); ctx.moveTo(size,2); ctx.lineTo(3, 3); ctx.lineTo(size, size); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(1, 1, 1, 1);
    textures['ice'] = canvas;
  }
  {
    // Living Metal - Textured Base
    const { canvas, ctx } = init();
    ctx.fillStyle = '#2a0505'; // Deeper base red
    ctx.fillRect(0, 0, size, size);
    
    // Veins / Organic Texture
    ctx.fillStyle = '#4a1515';
    ctx.fillRect(0, 0, 2, 1);
    ctx.fillRect(1, 1, 1, 1);
    ctx.fillRect(4, 2, 2, 1);
    ctx.fillRect(3, 3, 1, 1);
    ctx.fillRect(1, 4, 1, 2);
    
    // Dark pores
    ctx.fillStyle = '#100000';
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(5, 5, 1, 1);

    textures['living_metal'] = canvas;
  }
  {
      // Infected Living Metal - TEXTURE REDESIGN
      const { canvas, ctx } = init();
      // Base: Dark Violet/Maroon (Bruised/Sickly look)
      ctx.fillStyle = '#2d0a1e'; 
      ctx.fillRect(0, 0, size, size);
      
      // Details: Neon Pink/Red "Pustules" or "Sores"
      ctx.fillStyle = '#ff0055';
      ctx.fillRect(1, 2, 2, 1);
      ctx.fillRect(4, 1, 1, 1);
      ctx.fillRect(3, 4, 1, 2);
      
      // Core darkness
      ctx.fillStyle = '#000000';
      ctx.fillRect(2, 2, 1, 1);

      textures['infected_living_metal'] = canvas;
  }
  {
      // HARDENED METAL WALL TEXTURE
      const { canvas, ctx } = init(16, 16);
      ctx.fillStyle = '#1a0505'; 
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = '#300a0a';
      ctx.fillRect(1, 1, 6, 6); ctx.fillRect(9, 1, 6, 6);
      ctx.fillRect(1, 9, 6, 6); ctx.fillRect(9, 9, 6, 6);
      ctx.fillStyle = '#501515';
      ctx.fillRect(1, 1, 1, 1); ctx.fillRect(6, 1, 1, 1);
      ctx.fillRect(9, 1, 1, 1); ctx.fillRect(14, 1, 1, 1);
      ctx.fillRect(1, 9, 1, 1); ctx.fillRect(6, 9, 1, 1);
      ctx.fillRect(9, 9, 1, 1); ctx.fillRect(14, 9, 1, 1);
      ctx.fillStyle = '#0a0000';
      ctx.fillRect(8, 0, 1, 16);
      ctx.fillRect(0, 8, 16, 1);
      textures['hardened_metal'] = canvas;
  }
  {
    const { canvas, ctx } = init();
    ctx.fillStyle = '#151515'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#252525'; ctx.fillRect(1, 1, 2, 2); ctx.fillRect(3, 3, 2, 2);
    ctx.fillStyle = '#000'; ctx.fillRect(2, 2, 1, 1);
    textures['coal'] = canvas;
  }
  {
      const { canvas, ctx } = init();
      ctx.fillStyle = '#555'; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#ccc'; ctx.fillRect(1, 1, size-2, size-2);
      ctx.fillStyle = '#fff'; ctx.fillRect(1, 1, 2, 2);
      ctx.fillStyle = '#99a'; ctx.fillRect(size-2, size-2, 1, 1);
      textures['titanium'] = canvas;
  }
  {
      const { canvas, ctx } = init();
      ctx.fillStyle = '#1a201a'; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#39ff14'; ctx.fillRect(1, 3, 4, 1); ctx.fillRect(3, 1, 1, 4);
      ctx.fillStyle = '#000'; ctx.fillRect(2, 2, 1, 1);
      ctx.fillStyle = '#ccffcc'; ctx.fillRect(3, 3, 1, 1);
      textures['uranium'] = canvas;
  }
  return textures;
};

const generatePlayerSprites = () => {
  const { canvas, ctx } = createOffscreenCanvas(48, 20);
  const drawScavenger = (offsetX: number, frame: number) => {
    ctx.save();
    ctx.translate(offsetX, 0);
    const suitDark = '#2a2a35'; const suitLight = '#4a4a55'; const highlight = '#606070'; const visor = '#00eaff'; const backpack = '#353535'; const redLight = '#ff4444';
    ctx.fillStyle = backpack; ctx.fillRect(2, 5, 4, 8); 
    ctx.fillStyle = redLight; ctx.fillRect(3, 6, 1, 1); 
    ctx.fillStyle = suitDark; ctx.fillRect(5, 6, 6, 7); 
    ctx.fillStyle = suitLight; ctx.fillRect(6, 6, 4, 6); 
    ctx.fillStyle = suitLight; ctx.fillRect(5, 1, 6, 5); 
    ctx.fillStyle = highlight; ctx.fillRect(6, 1, 4, 1); 
    ctx.fillStyle = visor; ctx.fillRect(9, 3, 2, 2); 
    ctx.fillStyle = '#0099bb'; ctx.fillRect(8, 3, 1, 2); 
    if (frame === 0) {
        ctx.fillStyle = suitDark; ctx.fillRect(7, 7, 2, 4); 
        ctx.fillStyle = '#222'; ctx.fillRect(7, 11, 2, 2); 
    } else if (frame === 1) {
        ctx.fillStyle = suitDark; ctx.fillRect(4, 8, 2, 3); 
        ctx.fillStyle = '#222'; ctx.fillRect(3, 10, 2, 2);
    } else if (frame === 2) {
        ctx.fillStyle = suitDark; ctx.fillRect(8, 8, 2, 3);
        ctx.fillStyle = '#222'; ctx.fillRect(9, 9, 2, 2);
    }
    ctx.fillStyle = suitDark;
    if (frame === 0) {
        ctx.fillRect(6, 13, 2, 3); ctx.fillRect(9, 13, 2, 3); 
        ctx.fillStyle = '#222'; ctx.fillRect(5, 16, 3, 2); ctx.fillRect(9, 16, 3, 2);
    } else if (frame === 1) {
        ctx.fillRect(5, 13, 2, 2); ctx.fillRect(9, 13, 2, 3); 
        ctx.fillStyle = '#222'; ctx.fillRect(4, 15, 3, 2); ctx.fillRect(10, 16, 2, 1); 
    } else if (frame === 2) {
        ctx.fillRect(6, 13, 2, 3); ctx.fillRect(9, 13, 2, 2); 
        ctx.fillStyle = '#222'; ctx.fillRect(5, 16, 2, 1); ctx.fillRect(10, 15, 3, 2); 
    }
    ctx.restore();
  };
  drawScavenger(0, 0); drawScavenger(16, 1); drawScavenger(32, 2);
  return canvas;
};

const generateSpikyBackground = (width: number, height: number, color: string) => {
  const { canvas, ctx } = createOffscreenCanvas(width, height);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(0, 0);
  for (let x = 0; x <= width; x += 20) { const h = Math.random() * 80 + 20; ctx.lineTo(x, h); ctx.lineTo(x + 10, 0); }
  ctx.lineTo(width, 0); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 30) { const h = Math.random() * 100 + 40; ctx.lineTo(x, height - h); ctx.lineTo(x + 15, height); }
  ctx.lineTo(width, height); ctx.fill();
  return canvas;
};

export const LivingMetalGame: React.FC<GameProps> = ({ 
    gameState, stats, onUpdateStats, onToggleBase, 
    interactionTrigger, onCanInteract, onShowLocationSelect, 
    requestedStage, onStageChanged, onTravel, mobileActionMode, onGameOver, volumeSettings,
    language, toggleInventory, isLoading
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number>(0);
  const assetsRef = useRef<any>({});
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambienceNodesRef = useRef<{ nodes: AudioNode[], gain: GainNode | null }>({ nodes: [], gain: null });
  
  const statsRef = useRef(stats);
  const volRef = useRef(volumeSettings);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => {
      volRef.current = volumeSettings;
      if (ambienceNodesRef.current.gain) {
          ambienceNodesRef.current.gain.gain.setTargetAtTime(volumeSettings.ambience, (audioCtxRef.current?.currentTime || 0), 0.1);
      }
  }, [volumeSettings]);

  // Handle Mobile Interaction Trigger
  useEffect(() => {
      if (interactionTrigger > 0) {
          handleInteraction();
      }
  }, [interactionTrigger]);

  // Default start stage is BASE as requested
  const stageRef = useRef<StageType>('BASE');

  const playerRef = useRef({
    pos: { x: 500, y: 400 } as Vector2, // Base center approx
    vel: { x: 0, y: 0 } as Vector2,
    width: 14,
    height: 18,
    isGrounded: false,
    facingRight: true,
    isMoving: false,
    animFrame: 0,
    animTimer: 0,
    canInteractWith: null as string | null,
    lastAttackTime: 0,
    lastMineTime: 0,
    lastClankTime: 0,
    lastHardenedTextTime: 0, 
    oxygen: 100,
    infection: 0,
    damageTimer: 0,
    infectionDamageTimer: 0,
    baseHealTimer: 0, 
    baseHealthRegenTimer: 0,
    hazardTimer: 0,
    jumpCount: 0,
    noOxygenInfectionTimer: 0
  });
  
  const cameraRef = useRef<Vector2>({ x: 0, y: 0 });
  const shakeRef = useRef({ x: 0, y: 0, intensity: 0, timer: 0 });

  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ x: 0, y: 0, isDown: false, isRightClick: false });

  const leftJoystickRef = useRef({ active: false, originX: 0, originY: 0, currentX: 0, currentY: 0, id: -1 });
  const rightJoystickRef = useRef({ active: false, originX: 0, originY: 0, currentX: 0, currentY: 0, id: -1 });
  const mobileCursorRef = useRef({ x: 0, y: 0 }); 

  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  
  // SPATIAL GRID REFS
  const chunksRef = useRef<Map<string, LevelObject[]>>(new Map());
  const largeObjectsRef = useRef<LevelObject[]>([]);
  
  // OPTIMIZATION: Reusable array for rendering loop to prevent GC churn
  const visibleObjectsRef = useRef<LevelObject[]>([]);
  
  const lastTimeRef = useRef<number>(0);
  const bgLayersRef = useRef<HTMLCanvasElement[]>([]);

  // OBJECT MANAGEMENT HELPERS
  const clearObjects = () => {
      chunksRef.current.clear();
      largeObjectsRef.current = [];
  };

  const addObject = (obj: LevelObject) => {
      if (obj.width > CHUNK_SIZE || obj.height > CHUNK_SIZE) {
          largeObjectsRef.current.push(obj);
      } else {
          // Add to center chunk
          const cx = obj.x + obj.width / 2;
          const cy = obj.y + obj.height / 2;
          const key = `${Math.floor(cx / CHUNK_SIZE)},${Math.floor(cy / CHUNK_SIZE)}`;
          if (!chunksRef.current.has(key)) chunksRef.current.set(key, []);
          chunksRef.current.get(key)!.push(obj);
      }
  };

  // Optimization: Populate reusing reference array instead of returning new one
  const updateVisibleObjects = (rect: {x: number, y: number, width: number, height: number}) => {
      visibleObjectsRef.current.length = 0;
      
      const startX = Math.floor(rect.x / CHUNK_SIZE);
      const endX = Math.floor((rect.x + rect.width) / CHUNK_SIZE);
      const startY = Math.floor(rect.y / CHUNK_SIZE);
      const endY = Math.floor((rect.y + rect.height) / CHUNK_SIZE);

      // Add large objects (always checked)
      const largeLen = largeObjectsRef.current.length;
      for (let i = 0; i < largeLen; i++) {
          visibleObjectsRef.current.push(largeObjectsRef.current[i]);
      }
      
      for (let x = startX; x <= endX; x++) {
          for (let y = startY; y <= endY; y++) {
              const key = `${x},${y}`;
              const chunk = chunksRef.current.get(key);
              if (chunk) {
                  const chunkLen = chunk.length;
                  for (let i = 0; i < chunkLen; i++) {
                      visibleObjectsRef.current.push(chunk[i]);
                  }
              }
          }
      }
  };

  const initAudio = () => {
      if (!audioCtxRef.current) {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContext) {
              audioCtxRef.current = new AudioContext();
              updateAmbience(stageRef.current);
          }
      } else if (audioCtxRef.current.state === 'suspended') {
          audioCtxRef.current.resume();
      }
  };

  const playSfx = (type: 'jump' | 'mine' | 'mine_metal' | 'attack' | 'damage' | 'collect' | 'step' | 'ui_open' | 'ui_close' | 'start' | 'teleport' | 'creak' | 'clank' | 'laser') => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      const vol = volRef.current.sfx;

      switch(type) {
          case 'jump': osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(300, now+0.1); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.15); osc.start(now); osc.stop(now+0.2); break;
          case 'mine': osc.type='square'; osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(30, now+0.15); gain.gain.setValueAtTime(0.22*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.15); osc.start(now); osc.stop(now+0.15); break;
          case 'mine_metal': osc.type='square'; osc.frequency.setValueAtTime(60, now); osc.frequency.exponentialRampToValueAtTime(20, now+0.1); gain.gain.setValueAtTime(0.22*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.1); osc.start(now); osc.stop(now+0.12); break;
          case 'clank': osc.type='sawtooth'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now+0.05); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.05); osc.start(now); osc.stop(now+0.08); break;
          case 'attack': osc.type='sawtooth'; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(100, now+0.3); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.3); osc.start(now); osc.stop(now+0.35); break;
          case 'laser': osc.type='square'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(600, now+0.1); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.1); osc.start(now); osc.stop(now+0.15); break;
          case 'damage': osc.type='sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.linearRampToValueAtTime(50, now+0.2); gain.gain.setValueAtTime(0.30*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.3); osc.start(now); osc.stop(now+0.35); break;
          case 'collect': osc.type='sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.linearRampToValueAtTime(1800, now+0.1); gain.gain.setValueAtTime(0.08*vol, now); gain.gain.linearRampToValueAtTime(0, now+0.1); osc.start(now); osc.stop(now+0.15); break;
          case 'step': osc.type='triangle'; osc.frequency.setValueAtTime(80, now); osc.frequency.exponentialRampToValueAtTime(40, now+0.1); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.08); osc.start(now); osc.stop(now+0.1); break;
          case 'ui_open': osc.type='sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.linearRampToValueAtTime(1200, now+0.1); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.linearRampToValueAtTime(0, now+0.1); osc.start(now); osc.stop(now+0.15); break;
          case 'ui_close': osc.type='sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.linearRampToValueAtTime(600, now+0.1); gain.gain.setValueAtTime(0.15*vol, now); gain.gain.linearRampToValueAtTime(0, now+0.1); osc.start(now); osc.stop(now+0.1); break;
          case 'start': osc.type='sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(800, now+0.5); gain.gain.setValueAtTime(0*vol, now); gain.gain.linearRampToValueAtTime(0.30*vol, now+0.1); gain.gain.exponentialRampToValueAtTime(0.001, now+1.0); osc.start(now); osc.stop(now+1.0); break;
          case 'teleport': osc.type='sine'; osc.frequency.setValueAtTime(100, now); osc.frequency.exponentialRampToValueAtTime(1500, now+0.8); gain.gain.setValueAtTime(0.30*vol, now); gain.gain.exponentialRampToValueAtTime(0.001, now+0.8); osc.start(now); osc.stop(now+0.8); break;
          case 'creak': 
            osc.type='sawtooth'; 
            osc.frequency.setValueAtTime(150, now); 
            osc.frequency.linearRampToValueAtTime(100, now+0.6); 
            gain.gain.setValueAtTime(0, now); 
            gain.gain.linearRampToValueAtTime(0.08*vol, now+0.2); 
            gain.gain.linearRampToValueAtTime(0, now+0.6); 
            osc.start(now); osc.stop(now+0.6); 
            break;
      }
  };

  const updateAmbience = (stage: StageType) => {
      if (!audioCtxRef.current) return;
      const ctx = audioCtxRef.current;
      const now = ctx.currentTime;
      if (ambienceNodesRef.current.nodes.length > 0) {
          ambienceNodesRef.current.nodes.forEach(node => { try { if (node instanceof OscillatorNode || (node as any).stop) (node as any).stop(now + 0.5); node.disconnect(); } catch(e) {} });
      }
      ambienceNodesRef.current.nodes = []; ambienceNodesRef.current.gain = null;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      ambienceNodesRef.current.gain = gain; const newNodes: AudioNode[] = [osc, gain];
      const baseVol = volRef.current.ambience;

      if (stage === 'OUTSIDE') {
          const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
          osc.type = 'triangle'; osc.frequency.value = 80; lfo.type = 'sine'; lfo.frequency.value = 0.5; lfoGain.gain.value = 40; 
          lfo.connect(lfoGain); lfoGain.connect(osc.frequency); gain.gain.value = 0.025 * baseVol; 
          osc.connect(gain); gain.connect(ctx.destination); lfo.start(now); osc.start(now); newNodes.push(lfo, lfoGain);
      } else if (stage === 'MINE') {
          const lfo = ctx.createOscillator(); const lfoGain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = 50; lfo.type = 'sine'; lfo.frequency.value = 0.2; lfoGain.gain.value = 10;
          lfo.connect(lfoGain); lfoGain.connect(osc.frequency); gain.gain.value = 0.19 * baseVol; 
          osc.connect(gain); gain.connect(ctx.destination); lfo.start(now); osc.start(now); newNodes.push(lfo, lfoGain);
      } else { 
          osc.type = 'sine'; osc.frequency.value = 60; gain.gain.value = 0.10 * baseVol;
          osc.connect(gain); gain.connect(ctx.destination); osc.start(now);
          const bufferSize = ctx.sampleRate * 2; const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate); const data = buffer.getChannelData(0);
          let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
          for (let i = 0; i < bufferSize; i++) {
              const white = Math.random() * 2 - 1; b0 = 0.99886 * b0 + white * 0.0555179; b1 = 0.99332 * b1 + white * 0.0750759; b2 = 0.96900 * b2 + white * 0.1538520; b3 = 0.86650 * b3 + white * 0.3104856; b4 = 0.55000 * b4 + white * 0.5329522; b5 = -0.7616 * b5 - white * 0.0168980;
              data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362; data[i] *= 0.11; b6 = white * 0.115926;
          }
          const noise = ctx.createBufferSource(); noise.buffer = buffer; noise.loop = true;
          const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 200; 
          const noiseGain = ctx.createGain(); noiseGain.gain.value = 0.07 * baseVol; 
          noise.connect(filter); filter.connect(noiseGain); noiseGain.connect(ctx.destination); noise.start(now);
          newNodes.push(noise, filter, noiseGain);
      }
      ambienceNodesRef.current.nodes = newNodes;
  };

  const triggerShake = (intensity: number, duration: number) => { shakeRef.current.intensity = intensity; shakeRef.current.timer = duration; };

  const loadCurrentStage = () => {
    clearObjects(); 
    particlesRef.current = []; projectilesRef.current = []; floatingTextsRef.current = []; 
    const config = STAGE_CONFIG[stageRef.current]; const w = config.width; const h = config.height;
    if (stageRef.current === 'OUTSIDE') loadOutsideStage(w, h); else if (stageRef.current === 'BASE') loadBaseStage(w, h); else if (stageRef.current === 'MINE') loadMineStage(w, h);
    
    // Immediate camera center on load
    const p = playerRef.current;
    if (canvasRef.current) {
        const viewportW = canvasRef.current.width / PIXEL_SCALE;
        const viewportH = canvasRef.current.height / PIXEL_SCALE;
        cameraRef.current.x = p.pos.x - viewportW / 2 + p.width / 2;
        cameraRef.current.y = p.pos.y - viewportH / 2 + p.height / 2;
    }
  };

  const loadOutsideStage = (w: number, h: number) => {
    addObject({ x: -100, y: -20, width: w + 200, height: 60, type: 'solid', id: 'ceil_main' });
    const airlockX = 400; addObject({ x: airlockX, y: -20, width: 32, height: 50, type: 'base_entrance', id: 'airlock_outside' });
  };

  const loadBaseStage = (w: number, h: number) => {
    const expansion = statsRef.current.baseExpansionLevel || 0;
    const roomW = 340 + (expansion * 150); 
    const roomH = 300; 
    const roomX = (w - roomW) / 2; 
    const roomY = (h - roomH) / 2;

    addObject({ x: roomX, y: roomY + roomH, width: roomW, height: 32, type: 'solid', id: 'floor' });
    addObject({ x: roomX, y: roomY - 32, width: 32, height: 32, type: 'solid', id: 'ceil' });
    addObject({ x: roomX - 32, y: roomY - 32, width: 32, height: roomH + 64, type: 'solid', id: 'wall_l' });
    addObject({ x: roomX + roomW, y: roomY - 32, width: 32, height: roomH + 64, type: 'solid', id: 'wall_r' });
    
    // Terminal
    addObject({ x: roomX + roomW - 60, y: roomY + roomH - 20, width: 20, height: 20, type: 'solid', id: 'terminal' });
    
    // Airlock
    addObject({ x: roomX + 10, y: roomY + roomH - 40, width: 24, height: 40, type: 'base_entrance', id: 'airlock_inside' });

    // Laboratory Station
    const labX = roomX + 120;
    addObject({ x: labX, y: roomY + roomH - 30, width: 30, height: 30, type: 'solid', id: 'lab_station' });

    // Decontamination Unit
    if (statsRef.current.hasDecontaminationUnit) {
        addObject({ x: roomX + roomW - 120, y: roomY + roomH - 50, width: 30, height: 50, type: 'solid', id: 'decon_machine' });
    }

    // Storage
    const storeLvl = statsRef.current.storageLevel || 0;
    if (storeLvl > 0) {
        for (let i = 0; i < storeLvl; i++) {
             const crateSize = 24;
             const xPos = roomX + 50 + (i * 30);
             if (xPos < labX - 20) {
                 addObject({ x: xPos, y: roomY + roomH - crateSize, width: crateSize, height: crateSize, type: 'solid', id: `storage_${i}` });
             }
        }
    }
  };

  const loadMineStage = (w: number, h: number) => {
    const floorHeight = 32; const ceilingHeight = 100; const startX = 150; const endX = w - 20; const startY = ceilingHeight;
    const approximateAvailableHeight = (h - floorHeight) - startY; 
    const rows = Math.floor(approximateAvailableHeight / BLOCK_SIZE);
    const gridBottomY = startY + (rows * BLOCK_SIZE);

    addObject({ x: -100, y: gridBottomY, width: w + 200, height: 200, type: 'solid', id: 'mine_floor' });
    addObject({ x: -100, y: -100, width: w + 200, height: 100, type: 'solid', id: 'mine_ceil' });
    addObject({ x: -32, y: 0, width: 32, height: h, type: 'solid', id: 'mine_wall_l' });
    addObject({ x: w, y: 0, width: 32, height: h, type: 'solid', id: 'mine_wall_r' });
    addObject({ x: 20, y: gridBottomY - 60, width: 32, height: 60, type: 'base_entrance', id: 'mine_door_inside' });

    const cols = Math.floor((endX - startX) / BLOCK_SIZE);
    const grid: number[][] = Array(cols).fill(0).map(() => Array(rows).fill(1));

    for(let x=0; x<cols; x++) { for(let y=0; y<rows; y++) { if (x === cols-1) grid[x][y] = 2; else if (Math.random() < 0.38) grid[x][y] = 2; } }
    for(let i=0; i<4; i++) { const nextGrid = grid.map(row => [...row]); for(let x=1; x<cols-1; x++) { for(let y=1; y<rows-1; y++) { let neighbors = 0; for(let dx=-1; dx<=1; dx++) { for(let dy=-1; dy<=1; dy++) { if (grid[x+dx][y+dy] === 2) neighbors++; } } if (neighbors >= 5) nextGrid[x][y] = 2; else nextGrid[x][y] = 1; } } for(let x=0; x<cols; x++) { for(let y=0; y<rows; y++) { grid[x][y] = nextGrid[x][y]; } } }

    const cosineInterpolate = (a: number, b: number, t: number) => { const ft = t * Math.PI; const f = (1 - Math.cos(ft)) * 0.5; return a * (1 - f) + b * f; };
    const noiseScale = 0.35; const stretchY = 0.5; const noiseW = Math.ceil(cols * noiseScale) + 1; const noiseH = Math.ceil(rows * noiseScale * stretchY) + 1; const noiseLattice = new Float32Array(noiseW * noiseH).map(() => Math.random());
    const getNoise = (x: number, y: number) => { const nx = x * noiseScale; const ny = y * noiseScale * stretchY; const x0 = Math.floor(nx); const x1 = x0 + 1; const y0 = Math.floor(ny); const y1 = y0 + 1; const sx = nx - x0; const sy = ny - y0; const n00 = noiseLattice[y0 * noiseW + x0] || 0; const n10 = noiseLattice[y0 * noiseW + x1] || 0; const n01 = noiseLattice[y1 * noiseW + x0] || 0; const n11 = noiseLattice[y1 * noiseW + x1] || 0; const ix0 = cosineInterpolate(n00, n10, sx); const ix1 = cosineInterpolate(n01, n11, sx); return cosineInterpolate(ix0, ix1, sy); };

    for(let x=0; x<cols; x++) { for(let y=0; y<rows; y++) { const n = getNoise(x, y); if (n > 0.6) { if (grid[x][y] === 1) { grid[x][y] = 0; } else if (grid[x][y] === 2 && n > 0.8) { grid[x][y] = 0; } } } }
    for(let x=0; x<15; x++) { for(let y=0; y<rows; y++) { if (grid[x][y] === 2) grid[x][y] = 1; if (y > rows - 4) grid[x][y] = 1; } }

    const scannerLevel = statsRef.current.oreScannerLevel || 1;
    const spawnVein = (centerX: number, centerY: number, typeCode: number, size: number) => { for(let i=0; i<size; i++) { const ox = centerX + Math.floor((Math.random() - 0.5) * 4); const oy = centerY + Math.floor((Math.random() - 0.5) * 4); if (ox >= 0 && ox < cols && oy >= 0 && oy < rows) { if (grid[ox][oy] === 1) { grid[ox][oy] = typeCode; } } } };

    for (let x = 0; x < cols; x += 3) {
      for (let y = 0; y < rows; y += 3) {
        const depthRatio = x / cols;
        const luck = Math.random() + (scannerLevel * 0.05);
        if (Math.random() > 0.85) {
          let veinType = 1;
          let veinSize = 6; 
          
          if (depthRatio > 0.7) {
            const r = Math.random();
            if (luck > 0.9 && r > 0.7) { veinType = 8; veinSize = 10; } // Titanium
            else if (luck > 0.8 && r > 0.6) { veinType = 9; veinSize = 8; } // Uranium
            else if (r > 0.5) { veinType = 4; veinSize = 15; } // Ice
            else { veinType = 5; veinSize = 13; } // Coal
          } else if (depthRatio > 0.3) {
            const r = Math.random();
            if (luck > 0.8 && r > 0.85) { veinType = 7; veinSize = 10; } // Iron
            else if (r > 0.55) { veinType = 6; veinSize = 8; } // Wood
            else if (r > 0.25) { veinType = 5; veinSize = 12; } // Coal
            else { veinType = 3; veinSize = 10; } // Scrap
          } else {
            if (x < 30) {
              const r = Math.random();
              if (r > 0.9) { veinType = 4; veinSize = 12; } // Ice
              else if (r > 0.7) { veinType = 6; veinSize = 6; } // Wood
              else if (r > 0.5) { veinType = 5; veinSize = 6; } // Coal
              else if (r > 0.2) { veinType = 3; veinSize = 10; } // Scrap
              else { veinType = 7; veinSize = 5; } // Iron
            } else {
              const r = Math.random();
              if (r > 0.6) { veinType = 6; veinSize = 8; } // Wood
              else if (r > 0.3) { veinType = 5; veinSize = 10; } // Coal
              else { veinType = 3; veinSize = 10; } // Scrap
            }
          }
          if (veinType !== 1) { spawnVein(x, y, veinType, veinSize); }
        }
      }
    }

    const processed = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++) { 
        for (let x = 0; x < cols; x++) { 
            if (processed[x * rows + y]) continue; 
            const cellType = grid[x][y]; 
            if (cellType === 0) continue; 
            
            if (cellType === 2) { 
                let width = 1; 
                while (x + width < cols && grid[x + width][y] === 2 && !processed[(x + width) * rows + y]) { width++; } 
                for(let k=0; k<width; k++) { processed[(x+k)*rows + y] = 1; } 
                const worldX = startX + x * BLOCK_SIZE; 
                const worldY = startY + y * BLOCK_SIZE; 
                addObject({ x: worldX, y: worldY, width: width * BLOCK_SIZE, height: BLOCK_SIZE, type: 'solid', id: `wall_${x}_${y}` }); 
                x += width - 1; 
                continue; 
            } 
            
            let size = 1; 
            if (x + 3 < cols && y + 3 < rows) { 
                let match = true; 
                for(let dx=0; dx<4; dx++) { for(let dy=0; dy<4; dy++) { if (processed[(x+dx)*rows + (y+dy)] || grid[x+dx][y+dy] !== cellType) { match = false; break; } } if (!match) break; } 
                if (match) size = 4; 
            } 
            if (size === 1 && x + 1 < cols && y + 1 < rows) { 
                let match = true; 
                for(let dx=0; dx<2; dx++) { for(let dy=0; dy<2; dy++) { if (processed[(x+dx)*rows + (y+dy)] || grid[x+dx][y+dy] !== cellType) { match = false; break; } } if (!match) break; } 
                if (match) size = 2; 
            } 
            
            for(let dx=0; dx<size; dx++) { for(let dy=0; dy<size; dy++) { processed[(x+dx)*rows + (y+dy)] = 1; } } 
            
            const worldX = startX + x * BLOCK_SIZE; 
            const worldY = startY + y * BLOCK_SIZE; 
            const pixelSize = size * BLOCK_SIZE; 
            
            let type: 'living_metal' | 'wood' | 'scrap' | 'iron' | 'ice' | 'coal' | 'titanium' | 'uranium' | 'infected_living_metal' = 'living_metal'; 
            let health = 80 * (size * size * 0.5); 
    
            let variant = 0;

            switch (cellType) { 
                case 3: type = 'scrap'; health = 40; break; 
                case 4: type = 'ice'; health = 90; break; 
                case 5: type = 'coal'; health = 50; break; 
                case 6: type = 'wood'; health = 60; break; 
                case 7: type = 'iron'; health = 120; break; 
                case 8: type = 'titanium'; health = 300; break; 
                case 9: type = 'uranium'; health = 150; break; 
                default: 
                    type = 'living_metal'; 
                    health = 80;
                    if (Math.random() < 0.13) { type = 'infected_living_metal'; health = 90; } 
                    else if (Math.random() < 0.05) { variant = 1; health = 100; }
                break; 
            } 
            if (size > 1) health *= 2; 
            
            addObject({ x: worldX, y: worldY, width: pixelSize, height: pixelSize, type: 'destructible', id: `ore_${x}_${y}`, resourceType: type, health: health, maxHealth: health, variant: variant }); 
        } 
    }
  };

  const switchStage = (newStage: StageType) => {
    stageRef.current = newStage;
    onStageChanged(newStage);
    updateAmbience(newStage); 
    playSfx('teleport'); 
    const p = playerRef.current;
    const config = STAGE_CONFIG[newStage]; const w = config.width; const h = config.height;

    if (newStage === 'BASE') {
        p.pos = { x: w / 2, y: h / 2 + 50 }; p.vel = { x: 0, y: 0 }; p.oxygen = 100; onUpdateStats({ oxygen: 100 });
    } else if (newStage === 'OUTSIDE') {
        p.pos = { x: 400, y: 80 }; p.vel = { x: 0, y: 0 };
    } else if (newStage === 'MINE') {
        p.pos = { x: 60, y: h - 100 }; p.vel = { x: 0, y: 0 };
    }
    loadCurrentStage();
  };

  useEffect(() => {
    if (requestedStage) {
          switchStage(requestedStage);
      }
  }, [requestedStage]);

  useEffect(() => {
    assetsRef.current.metal = generateMetalTexture();
    assetsRef.current.blockTextures = generateResourceTextures();
    assetsRef.current.cracks = generateCrackTextures(); 
    assetsRef.current.player = generatePlayerSprites();
    assetsRef.current.glow = generateGlowSprite(150, 'rgba(200, 255, 255, 0.08)');
    assetsRef.current.redGlow = generateGlowSprite(60, 'rgba(255, 0, 0, 0.15)');
    assetsRef.current.terminalGlow = generateGlowSprite(40, 'rgba(50, 255, 50, 0.1)');
    assetsRef.current.labGlow = generateGlowSprite(40, 'rgba(50, 255, 100, 0.2)'); 
    assetsRef.current.shockwaveGlow = generateGlowSprite(40, 'rgba(0, 255, 255, 0.3)');
    
    if (assetsRef.current.blockTextures['hardened_metal']) {
        const pCtx = createOffscreenCanvas(1, 1).ctx;
        assetsRef.current.hardenedPattern = pCtx.createPattern(assetsRef.current.blockTextures['hardened_metal'], 'repeat');
    }

    bgLayersRef.current = [ generateSpikyBackground(STAGE_CONFIG.OUTSIDE.width + 200, STAGE_CONFIG.OUTSIDE.height, '#0a0a10'), generateSpikyBackground(STAGE_CONFIG.OUTSIDE.width + 200, STAGE_CONFIG.OUTSIDE.height, '#111118'), ];
    fogCanvasRef.current = document.createElement('canvas');
    loadCurrentStage();
    mobileCursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const timeout = setTimeout(() => { initAudio(); playSfx('start'); }, 500);
    return () => { clearTimeout(timeout); if (audioCtxRef.current) { audioCtxRef.current.close(); } };
  }, []);

  // --- INPUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      initAudio();
      keysRef.current.add(e.code);
      if (e.code === 'KeyF') { 
          if (gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU) {
              playSfx('ui_close'); onToggleBase(false);
          } else {
              handleInteraction();
          }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    const handleMouseMove = (e: MouseEvent) => { if (canvasRef.current) { const rect = canvasRef.current.getBoundingClientRect(); mouseRef.current.x = e.clientX - rect.left; mouseRef.current.y = e.clientY - rect.top; } };
    const handleMouseDown = (e: MouseEvent) => { if (gameState !== GameState.PLAYING) return; initAudio(); mouseRef.current.isDown = true; mouseRef.current.isRightClick = (e.button === 2); };
    const handleMouseUp = () => { mouseRef.current.isDown = false; mouseRef.current.isRightClick = false; };
    const handleContextMenu = (e: Event) => { e.preventDefault(); };
    const handleTouchStart = (e: TouchEvent) => {
        if (e.target !== canvasRef.current) return; if (gameState !== GameState.PLAYING) return; initAudio(); if (e.cancelable) e.preventDefault();
        if (!canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect();
        const rightStickX = rect.width - 100; const rightStickY = rect.height - 100; const rightStickRadius = 60;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]; const tx = t.clientX - rect.left; const ty = t.clientY - rect.top; const distRight = Math.sqrt(Math.pow(tx - rightStickX, 2) + Math.pow(ty - rightStickY, 2));
            if (distRight < rightStickRadius + 20) { if (!rightJoystickRef.current.active) { rightJoystickRef.current = { active: true, originX: rightStickX, originY: rightStickY, currentX: tx, currentY: ty, id: t.identifier }; } } else if (tx < rect.width / 2) { if (!leftJoystickRef.current.active) { leftJoystickRef.current = { active: true, originX: tx, originY: ty, currentX: tx, currentY: ty, id: t.identifier }; } }
        }
    };
    const handleTouchMove = (e: TouchEvent) => {
        if (e.target !== canvasRef.current) return; if (e.cancelable) e.preventDefault(); if (gameState !== GameState.PLAYING) return; 
        if (!canvasRef.current) return; const rect = canvasRef.current.getBoundingClientRect();
        for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i]; const tx = t.clientX - rect.left; const ty = t.clientY - rect.top; if (t.identifier === leftJoystickRef.current.id) { leftJoystickRef.current.currentX = tx; leftJoystickRef.current.currentY = ty; } if (t.identifier === rightJoystickRef.current.id) { rightJoystickRef.current.currentX = tx; rightJoystickRef.current.currentY = ty; } }
    };
    const handleTouchEnd = (e: TouchEvent) => { for (let i = 0; i < e.changedTouches.length; i++) { const t = e.changedTouches[i]; if (t.identifier === leftJoystickRef.current.id) { leftJoystickRef.current.active = false; leftJoystickRef.current.id = -1; } if (t.identifier === rightJoystickRef.current.id) { rightJoystickRef.current.active = false; rightJoystickRef.current.id = -1; } } };
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp); window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mousedown', handleMouseDown); window.addEventListener('mouseup', handleMouseUp); window.addEventListener('contextmenu', handleContextMenu); window.addEventListener('touchstart', handleTouchStart, { passive: false }); window.addEventListener('touchend', handleTouchEnd, { passive: false }); window.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mousedown', handleMouseDown); window.removeEventListener('mouseup', handleMouseUp); window.removeEventListener('contextmenu', handleContextMenu); window.removeEventListener('touchstart', handleTouchStart); window.removeEventListener('touchend', handleTouchEnd); window.removeEventListener('touchmove', handleTouchMove); };
  }, [gameState]);

  const handleInteraction = () => {
    if (gameState === GameState.PLAYING) {
        const interactId = playerRef.current.canInteractWith;
        if (interactId === 'terminal') { playSfx('ui_open'); onToggleBase(true, 'engineering'); } 
        else if (interactId === 'lab_station') { 
            // The check is done inside App.tsx onToggleBase
            onToggleBase(true, 'lab'); 
        }
        else if (interactId === 'airlock_outside') { onTravel('BASE'); } 
        else if (interactId === 'airlock_inside') { onShowLocationSelect(); } 
        else if (interactId === 'mine_door_inside') { onShowLocationSelect(); }
    }
  };

  const spawnParticles = (x: number, y: number, count: number, color: string, gravityDir: number) => { if (particlesRef.current.length > 40) return; for (let i = 0; i < count; i++) { particlesRef.current.push({ id: Math.random(), x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() * 2) * gravityDir, life: 1.0, color, size: 1 }); } };
  const spawnFloatingText = (x: number, y: number, text: string, color: string) => { floatingTextsRef.current.push({ id: Math.random(), x, y, text, life: 1.0, color, velocity: -0.5 }); };
  
  const performAttack = () => { 
      const p = playerRef.current; 
      const now = Date.now(); 
      const weapon = statsRef.current.equippedWeapon;
      
      if (weapon === 'none') return; 

      let cooldown = 500;
      if (weapon === 'laser') cooldown = 200;
      if (weapon === 'sword') cooldown = 400;

      if (now - p.lastAttackTime < cooldown) return; 
      p.lastAttackTime = now; 

      const camera = cameraRef.current;
      const mouse = mouseRef.current;
      let angle = 0;

      if (rightJoystickRef.current.active) {
          const j = rightJoystickRef.current;
          angle = Math.atan2(j.currentY - j.originY, j.currentX - j.originX);
      } else {
          const worldMX = (mouse.x / PIXEL_SCALE) + camera.x;
          const worldMY = (mouse.y / PIXEL_SCALE) + camera.y;
          angle = Math.atan2(worldMY - (p.pos.y + p.height/2), worldMX - (p.pos.x + p.width/2));
      }

      if (weapon === 'force') {
          playSfx('attack'); triggerShake(2, 4); 
          const speed = 6;
          projectilesRef.current.push({ 
              id: Math.random(), 
              x: p.pos.x + p.width/2, 
              y: p.pos.y + p.height/2, 
              vx: Math.cos(angle) * speed, 
              vy: Math.sin(angle) * speed,
              type: 'force',
              angle: angle,
              life: 1.0, 
              width: 10, 
              height: 10, 
              color: '#0ff' 
          }); 
      } else if (weapon === 'laser') {
          playSfx('laser');
          const speed = 12;
          projectilesRef.current.push({ 
              id: Math.random(), 
              x: p.pos.x + p.width/2, 
              y: p.pos.y + p.height/2, 
              vx: Math.cos(angle) * speed, 
              vy: Math.sin(angle) * speed,
              type: 'laser',
              angle: angle,
              life: 1.5,
              width: 20, 
              height: 2, 
              color: '#f00' 
          }); 
      } else if (weapon === 'sword') {
          playSfx('attack');
          projectilesRef.current.push({ 
              id: Math.random(), 
              x: p.pos.x + p.width/2 + (Math.cos(angle) * 15), 
              y: p.pos.y + p.height/2 + (Math.sin(angle) * 15), 
              vx: Math.cos(angle) * 2, 
              vy: Math.sin(angle) * 2,
              type: 'sword',
              angle: angle,
              life: 0.2,
              width: 30, 
              height: 30, 
              color: '#f50' 
          }); 
      }
  };

  const mineAtPosition = (targetX: number, targetY: number, radius: number) => {
      const p = playerRef.current; const currentStats = statsRef.current; const isInvertedWorld = stageRef.current === 'OUTSIDE'; const now = Date.now(); let hitSomething = false;

      // UPDATE visibleObjectsRef for mining collision check area
      updateVisibleObjects({ x: targetX - radius, y: targetY - radius, width: radius * 2, height: radius * 2 });
      const objectsToCheck = visibleObjectsRef.current;
      const len = objectsToCheck.length;

      for (let j = len - 1; j >= 0; j--) {
          const obj = objectsToCheck[j];
          if (obj.type === 'destructible' || obj.type === 'solid') {
              const objCenterX = obj.x + obj.width / 2; const objCenterY = obj.y + obj.height / 2; const dx = objCenterX - targetX; const dy = objCenterY - targetY; const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist <= radius + (obj.width/2)) { 
                  hitSomething = true;
                  if (obj.type === 'solid') {
                      if (now - p.lastClankTime > 200) {
                          playSfx('clank'); p.lastClankTime = now;
                          spawnParticles(targetX, targetY, 1, '#888', 1);
                      }
                      continue; 
                  }
                  
                  const speedLvl = currentStats.miningSpeedLevel || 1; const damage = 1.0 * Math.pow(1.10, speedLvl - 1);
                  if (obj.health !== undefined) {
                      // CRITICAL FIX: Only apply jitter if health is > 0 to avoid moving object off its chunk during deletion frame
                      if (obj.health > 0) {
                          if (Math.random() > 0.5) { obj.x += (Math.random() - 0.5); obj.y += (Math.random() - 0.5); }
                      }

                      obj.health -= damage;
                      
                      if (Math.random() > 0.7) { spawnParticles(objCenterX, objCenterY, 1, '#ffaa00', isInvertedWorld ? -1 : 1); }
                      
                      if (obj.health <= 0) {
                          // REMOVE OBJECT - Find in actual storage to remove
                          if (obj.width > CHUNK_SIZE || obj.height > CHUNK_SIZE) {
                              const idx = largeObjectsRef.current.indexOf(obj);
                              if (idx !== -1) largeObjectsRef.current.splice(idx, 1);
                          } else {
                              const cx = obj.x + obj.width / 2;
                              const cy = obj.y + obj.height / 2;
                              const key = `${Math.floor(cx / CHUNK_SIZE)},${Math.floor(cy / CHUNK_SIZE)}`;
                              const chunk = chunksRef.current.get(key);
                              if (chunk) {
                                  const idx = chunk.indexOf(obj);
                                  if (idx !== -1) chunk.splice(idx, 1);
                              }
                          }
                          
                          if (obj.resourceType === 'infected_living_metal') {
                                playSfx('damage');
                                onUpdateStats({ infection: Math.min(100, currentStats.infection + 3) }); 
                                spawnFloatingText(objCenterX, objCenterY, `+3% Infection`, '#0f0');
                                spawnParticles(objCenterX, objCenterY, 5, '#0f0', isInvertedWorld ? -1 : 1);
                                if (Math.random() < 0.30) {
                                  const scrapAmount = Math.floor(Math.random() * 3) + 1;
                                  onUpdateStats({ scraps: currentStats.scraps + scrapAmount });
                                  spawnFloatingText(objCenterX, objCenterY, `+${scrapAmount} Scrap`, '#aaa');
                                  playSfx('collect');
                                }
                          } else if (obj.resourceType === 'living_metal') { 
                              playSfx('mine_metal'); 
                              if (Math.random() < 0.30) {
                                  const scrapAmount = Math.floor(Math.random() * 3) + 1; 
                                  onUpdateStats({ scraps: currentStats.scraps + scrapAmount });
                                  spawnFloatingText(objCenterX, objCenterY, `+${scrapAmount} Scrap`, '#aaa');
                                  playSfx('collect');
                              }
                          } else { 
                              playSfx('mine'); 
                          }
                          let shakeInt = 3; let shakeDur = 5; let pColor = '#500'; let resourceName = ""; let gainedAmount = 0; const update: Partial<PlayerStats> = {}; const isSpanish = language === 'es';
                          if (obj.resourceType === 'scrap') { gainedAmount = 2; update.scraps = currentStats.scraps + gainedAmount; pColor = '#aaa'; resourceName = isSpanish ? "Chatarra" : "Scraps"; } else if (obj.resourceType === 'wood') { gainedAmount = 1; update.wood = (currentStats.wood || 0) + gainedAmount; pColor = '#654321'; resourceName = isSpanish ? "Madera" : "Wood"; } else if (obj.resourceType === 'iron') { gainedAmount = 1; update.iron = (currentStats.iron || 0) + gainedAmount; pColor = '#ccc'; resourceName = isSpanish ? "Hierro" : "Iron"; } else if (obj.resourceType === 'ice') { gainedAmount = 1; update.ice = (currentStats.ice || 0) + gainedAmount; pColor = '#0ff'; resourceName = isSpanish ? "Hielo" : "Ice"; } else if (obj.resourceType === 'coal') { gainedAmount = 1; update.coal = (currentStats.coal || 0) + gainedAmount; pColor = '#111'; resourceName = isSpanish ? "Carbón" : "Coal"; } else if (obj.resourceType === 'titanium') { gainedAmount = 1; update.titanium = (currentStats.titanium || 0) + gainedAmount; pColor = '#fff'; resourceName = isSpanish ? "Titanio" : "Titanium"; shakeInt = 6; shakeDur = 10; } else if (obj.resourceType === 'uranium') { gainedAmount = 1; update.uranium = (currentStats.uranium || 0) + gainedAmount; pColor = '#0f0'; resourceName = isSpanish ? "Uranio" : "Uranium"; shakeInt = 6; shakeDur = 10; onUpdateStats({ health: Math.max(0, currentStats.health - 5) }); playSfx('damage'); } else { 
                             if (obj.resourceType !== 'living_metal' && obj.resourceType !== 'infected_living_metal' && Math.random() > 0.8) { gainedAmount = 1; update.scraps = currentStats.scraps + 1; resourceName = isSpanish ? "Chatarra" : "Scrap"; } 
                          }
                          triggerShake(shakeInt, shakeDur); if (gainedAmount > 0) { onUpdateStats(update); spawnFloatingText(objCenterX, objCenterY, `+${gainedAmount} ${resourceName}`, pColor === '#111' ? '#aaa' : pColor); playSfx('collect'); } spawnParticles(objCenterX, objCenterY, 3, pColor, isInvertedWorld ? -1 : 1);
                      }
                  }
              }
          }
      }
      return hitSomething;
  };

  const update = () => {
    // If loading, skip simulation to prevent health/oxygen decay or unfair deaths during travel sequences
    if (isLoading) return;

    const isPaused = gameState === GameState.PAUSED || gameState === GameState.MENU || gameState === GameState.GAME_OVER;
    
    if (rightJoystickRef.current.active && !isPaused) {
        const j = rightJoystickRef.current;
        const dx = j.currentX - j.originX;
        const dy = j.currentY - j.originY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxStickDist = 60; 
        
        const camera = cameraRef.current;
        const p = playerRef.current;
        const pScreenX = (p.pos.x - camera.x + p.width/2) * PIXEL_SCALE;
        const pScreenY = (p.pos.y - camera.y + p.height/2) * PIXEL_SCALE;

        const reachLvl = statsRef.current.miningReachLevel || 1; 
        const maxReachWorld = 50 * Math.pow(1.10, reachLvl - 1);
        const maxReachScreen = maxReachWorld * PIXEL_SCALE * 0.9; 

        if (dist > 5) {
            const nx = dx / dist;
            const ny = dy / dist;
            const strength = Math.min(1, dist / maxStickDist);
            mobileCursorRef.current.x = pScreenX + (nx * strength * maxReachScreen);
            mobileCursorRef.current.y = pScreenY + (ny * strength * maxReachScreen);
        } else {
            mobileCursorRef.current.x = pScreenX;
            mobileCursorRef.current.y = pScreenY;
        }
        
        mouseRef.current.x = mobileCursorRef.current.x;
        mouseRef.current.y = mobileCursorRef.current.y;
    }

    if ((stageRef.current === 'BASE' || stageRef.current === 'MINE') && Math.random() < 0.0005) { playSfx('creak'); }

    const p = playerRef.current; const keys = keysRef.current; const mouse = mouseRef.current; const currentStats = statsRef.current; 
    
    if (!isPaused) {
        if (currentStats.health <= 0) { onGameOver(); return; }
        
        const isInvertedWorld = stageRef.current === 'OUTSIDE'; 
        const isBase = stageRef.current === 'BASE';
        
        if (currentStats.infection !== undefined && Math.abs(currentStats.infection - p.infection) > 1) { p.infection = currentStats.infection; }

        if (!isBase) {
            // Increased base duration from 25 to 50 (100% more)
            const currentLevel = currentStats.oxygenLevel || 1; const totalDurationSeconds = 50 * Math.pow(1.10, currentLevel - 1); const decayPerFrame = 100 / (totalDurationSeconds * 60);
            p.oxygen = Math.max(0, p.oxygen - decayPerFrame);
            
            p.noOxygenInfectionTimer++;
            if (p.noOxygenInfectionTimer >= 180) { 
                p.noOxygenInfectionTimer = 0;
                p.infection = Math.min(100, p.infection + 1);
            }

            p.baseHealthRegenTimer = 0;
        } else {
            p.noOxygenInfectionTimer = 0; 
            p.oxygen = Math.min(100, p.oxygen + 2.0);
            
            p.baseHealTimer++;
            let healRate = 90; 
            
            if (currentStats.hasDecontaminationUnit) {
                // Check against decon machine in visible objects (should be visible if nearby)
                updateVisibleObjects({ x: p.pos.x - 200, y: p.pos.y - 200, width: 400, height: 400 });
                const deconObj = visibleObjectsRef.current.find(o => o.id === 'decon_machine');
                if (deconObj) {
                     const dx = (p.pos.x + p.width/2) - (deconObj.x + deconObj.width/2);
                     const dy = (p.pos.y + p.height/2) - (deconObj.y + deconObj.height/2);
                     const dist = Math.sqrt(dx*dx + dy*dy);
                     if (dist < 100) {
                         healRate = 10; 
                         if (Math.random() < 0.1) spawnParticles(p.pos.x + p.width/2, p.pos.y, 1, '#0f0', -1);
                     }
                }
            }

            if (p.baseHealTimer > healRate) {
                p.baseHealTimer = 0;
                p.infection = Math.max(0, p.infection - 1);
            }

            if (currentStats.health < currentStats.maxHealth) {
                p.baseHealthRegenTimer++;
                if (p.baseHealthRegenTimer > 60) {
                    p.baseHealthRegenTimer = 0;
                    onUpdateStats({ health: Math.min(currentStats.maxHealth, currentStats.health + 1) });
                }
            }
        }

        if (Math.floor(p.oxygen) !== Math.floor(currentStats.oxygen) || Math.floor(p.infection) !== Math.floor(currentStats.infection)) {
            onUpdateStats({ oxygen: p.oxygen, infection: p.infection });
        }

        // Reduced suffocation damage from 10 to 5
        if (p.oxygen <= 0) { p.damageTimer++; if (p.damageTimer > 60) { p.damageTimer = 0; onUpdateStats({ health: Math.max(0, currentStats.health - 5) }); spawnParticles(p.pos.x + p.width/2, p.pos.y + p.height/2, 5, '#f00', isInvertedWorld ? -1 : 1); triggerShake(3, 10); playSfx('damage'); } } else { p.damageTimer = 0; }
        if (p.infection >= 100) { p.infectionDamageTimer++; if (p.infectionDamageTimer > 120) { p.infectionDamageTimer = 0; onUpdateStats({ health: Math.max(0, currentStats.health - 5) }); spawnParticles(p.pos.x + p.width/2, p.pos.y + p.height/2, 5, '#a0f', isInvertedWorld ? -1 : 1); triggerShake(2, 5); playSfx('damage'); } } else { p.infectionDamageTimer = 0; }

        const GRAVITY = isInvertedWorld ? -0.3 : 0.3; const JUMP = currentStats.highJumpBoots ? 7.0 : 5.0; 
        let dx = 0; let jumpPressed = false;
        
        if (gameState === GameState.PLAYING) {
            if (keys.has('ArrowRight') || keys.has('KeyD')) dx = 2.5; if (keys.has('ArrowLeft') || keys.has('KeyA')) dx = -2.5; if (keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW')) jumpPressed = true;
            if (leftJoystickRef.current.active) { const j = leftJoystickRef.current; const deltaX = j.currentX - j.originX; const deltaY = j.currentY - j.originY; if (deltaX > 20) dx = 2.5; else if (deltaX < -20) dx = -2.5; if (deltaY < -40) jumpPressed = true; }
        }

        if (dx !== 0) { p.vel.x = dx; p.facingRight = dx > 0; p.isMoving = true; } else { p.vel.x *= 0.6; if (Math.abs(p.vel.x) < 0.1) p.vel.x = 0; p.isMoving = false; }

        const isMobileAutoAction = rightJoystickRef.current.active; const isMiningAction = (mouse.isDown && !mouse.isRightClick) || (isMobileAutoAction && mobileActionMode === 'MINE'); const isAttackAction = (mouse.isDown && mouse.isRightClick) || (keys.has('KeyV')) || (isMobileAutoAction && mobileActionMode === 'ATTACK');

        if (gameState === GameState.PLAYING) {
            if (isMiningAction) { const worldMX = (mouse.x / PIXEL_SCALE) + cameraRef.current.x; const worldMY = (mouse.y / PIXEL_SCALE) + cameraRef.current.y; const pCenterX = p.pos.x + p.width/2; const pCenterY = p.pos.y + p.height/2; const distToMouse = Math.sqrt(Math.pow(worldMX - pCenterX, 2) + Math.pow(worldMY - pCenterY, 2)); const reachLvl = currentStats.miningReachLevel || 1; 
            const maxReach = 50 * Math.pow(1.10, reachLvl - 1); 
            if (distToMouse < maxReach) { const radiusLvl = currentStats.miningRadiusLevel || 1; 
            let radius = (BLOCK_SIZE * 1.5) * Math.pow(1.10, radiusLvl - 1); 
            mineAtPosition(worldMX, worldMY, radius); } }
            if (isAttackAction) { performAttack(); }
        }

        if (p.isMoving) { p.animTimer++; if (p.animTimer > 5) { p.animFrame = (p.animFrame + 1) % 4; p.animTimer = 0; if (p.isGrounded) { spawnParticles(p.pos.x + p.width/2, p.pos.y + (isInvertedWorld ? 0 : p.height), 1, '#4a0000', isInvertedWorld ? -1 : 1); if (p.animFrame === 1 || p.animFrame === 3) { playSfx('step'); } } } } else { p.animFrame = 0; }
        if (jumpPressed) { if (p.isGrounded) { p.vel.y = isInvertedWorld ? JUMP : -JUMP; p.isGrounded = false; p.jumpCount = 1; playSfx('jump'); spawnParticles(p.pos.x + p.width/2, p.pos.y + (isInvertedWorld ? 0 : p.height), 3, '#fff', isInvertedWorld ? -1 : 1); } else if (currentStats.highJumpBoots && p.jumpCount < 2) { p.vel.y = isInvertedWorld ? JUMP * 0.8 : -JUMP * 0.8; p.jumpCount = 2; playSfx('jump'); spawnParticles(p.pos.x + p.width/2, p.pos.y + (isInvertedWorld ? 0 : p.height), 5, '#0ff', isInvertedWorld ? -1 : 1); } }

        p.vel.y += GRAVITY; p.pos.x += p.vel.x; p.pos.y += p.vel.y;

        const worldConfig = STAGE_CONFIG[stageRef.current]; const worldW = worldConfig.width; const worldH = worldConfig.height;
        if (p.pos.x < 0) { p.pos.x = 0; p.vel.x = 0; } if (p.pos.x + p.width > worldW) { p.pos.x = worldW - p.width; p.vel.x = 0; }
        if (p.pos.y > worldH + 50) { if (stageRef.current === 'MINE') { p.pos.x = 60; p.pos.y = worldH - 80; } else { p.pos.x = 400; p.pos.y = 80; } p.vel.y = 0; onUpdateStats({ health: Math.max(0, currentStats.health - 10) }); triggerShake(10, 20); playSfx('damage'); }

        const prevCanInteract = p.canInteractWith; p.canInteractWith = null; const playerCenterX = p.pos.x + p.width / 2; const playerCenterY = p.pos.y + p.height / 2; let inHazard = false;
        
        // Optimizing Collision Detection: Populate reused array with objects near player
        updateVisibleObjects({ x: p.pos.x - 50, y: p.pos.y - 50, width: p.width + 100, height: p.height + 100 });
        const nearbyObjects = visibleObjectsRef.current;
        const nbLen = nearbyObjects.length;

        for (let i = 0; i < nbLen; i++) { 
            const obj = nearbyObjects[i];
            if (p.pos.x < obj.x + obj.width && p.pos.x + p.width > obj.x && p.pos.y < obj.y + obj.height && p.pos.y + p.height > obj.y) { if (obj.type === 'solid' || obj.type === 'destructible') { const dx = (p.pos.x + p.width/2) - (obj.x + obj.width/2); const dy = (p.pos.y + p.height/2) - (obj.y + obj.height/2); const w2 = (p.width + obj.width) / 2; const h2 = (p.height + obj.height) / 2; const cx = Math.abs(dx); const cy = Math.abs(dy); if (Math.abs(cx - w2) < Math.abs(cy - h2)) { p.vel.x = 0; p.pos.x = dx > 0 ? obj.x + obj.width : obj.x - p.width; } else { if (isInvertedWorld) { if (dy > 0) { p.pos.y = obj.y + obj.height; p.vel.y = 0; p.isGrounded = true; p.jumpCount = 0; } else { p.pos.y = obj.y - p.height; p.vel.y = 0; } } else { if (dy < 0) { p.pos.y = obj.y - p.height; p.vel.y = 0; p.isGrounded = true; p.jumpCount = 0; } else { p.pos.y = obj.y + obj.height; p.vel.y = 0; } } } } if (obj.type === 'hazard' || obj.resourceType === 'uranium') { inHazard = true; } } if (obj.id === 'terminal' || obj.id === 'lab_station' || obj.id.includes('airlock') || obj.id.includes('mine_door')) { const objCenterX = obj.x + obj.width / 2; const objCenterY = obj.y + obj.height / 2; const margin = 40; const xOverlap = Math.abs(playerCenterX - objCenterX) < (obj.width/2 + p.width/2 + margin); const yOverlap = Math.abs(playerCenterY - objCenterY) < (obj.height/2 + p.height/2 + margin); if (xOverlap && yOverlap) { p.canInteractWith = obj.id; } } 
        }

        if (!!prevCanInteract !== !!p.canInteractWith) { onCanInteract(!!p.canInteractWith); }
        if (inHazard) { p.hazardTimer++; if (p.hazardTimer > 30) { p.hazardTimer = 0; onUpdateStats({ health: Math.max(0, currentStats.health - 5) }); spawnParticles(p.pos.x + p.width/2, p.pos.y + p.height/2, 3, '#0f0', isInvertedWorld ? -1 : 1); triggerShake(4, 10); playSfx('damage'); } } else { p.hazardTimer = 0; }
    }

    const worldW = STAGE_CONFIG[stageRef.current].width;
    const worldH = STAGE_CONFIG[stageRef.current].height;
    
    for (let i = particlesRef.current.length - 1; i >= 0; i--) { const part = particlesRef.current[i]; part.x += part.vx; part.y += part.vy; part.life -= 0.05; if (part.life <= 0) particlesRef.current.splice(i, 1); }
    // FIX: Changed condition to i >= 0 so it correctly processes ALL items, not just indices >= 10.
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) { const ft = floatingTextsRef.current[i]; ft.y += ft.velocity; ft.life -= 0.02; if (ft.life <= 0) floatingTextsRef.current.splice(i, 1); }
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) { const proj = projectilesRef.current[i]; proj.x += proj.vx; proj.y += proj.vy; proj.life -= 0.05; if (Math.random() > 0.5 && proj.type !== 'sword') { particlesRef.current.push({ id: Math.random(), x: proj.x + (Math.random() * 4 - 2), y: proj.y + Math.random() * proj.height, vx: -proj.vx * 0.2, vy: (Math.random() - 0.5), life: 0.5, color: proj.color, size: 1 }); } if (proj.life <= 0 || proj.x < 0 || proj.x > worldW) { projectilesRef.current.splice(i, 1); } }
    if (shakeRef.current.timer > 0) { shakeRef.current.timer--; shakeRef.current.x = (Math.random() - 0.5) * 2 * shakeRef.current.intensity; shakeRef.current.y = (Math.random() - 0.5) * 2 * shakeRef.current.intensity; } else { shakeRef.current.x = 0; shakeRef.current.y = 0; }
    
    if (canvasRef.current) { 
        const viewportW = canvasRef.current.width / PIXEL_SCALE; 
        const viewportH = canvasRef.current.height / PIXEL_SCALE; 
        const targetX = p.pos.x - viewportW / 2 + p.width / 2; 
        const targetY = p.pos.y - viewportH / 2 + p.height / 2; 
        
        const camera = cameraRef.current;
        camera.x += (targetX - camera.x) * 0.1; 
        camera.y += (targetY - camera.y) * 0.1; 
        
        camera.x = Math.max(0, Math.min(camera.x, worldW - viewportW)); 
        if (worldH < viewportH) { 
            camera.y = -(viewportH - worldH) / 2; 
        } else { 
            camera.y = Math.max(0, Math.min(camera.y, worldH - viewportH)); 
        } 
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, frameCount: number) => {
    const isBase = stageRef.current === 'BASE'; const screenW = ctx.canvas.width; const screenH = ctx.canvas.height; const w = screenW / PIXEL_SCALE; const h = screenH / PIXEL_SCALE;
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, screenW, screenH); ctx.save(); ctx.scale(PIXEL_SCALE, PIXEL_SCALE); const camera = cameraRef.current; const shake = shakeRef.current; ctx.translate(-Math.floor(camera.x + shake.x), -Math.floor(camera.y + shake.y)); const isInvertedWorld = stageRef.current === 'OUTSIDE';

    if (stageRef.current === 'OUTSIDE') { bgLayersRef.current.forEach((layer, i) => { if (layer) { ctx.drawImage(layer, 0, 0); } }); } else if (stageRef.current === 'MINE') { ctx.fillStyle = '#050000'; ctx.fillRect(0, 0, STAGE_CONFIG.MINE.width, STAGE_CONFIG.MINE.height); } else { ctx.fillStyle = '#110505'; ctx.fillRect(0, 0, STAGE_CONFIG.BASE.width, STAGE_CONFIG.BASE.height); ctx.strokeStyle = '#221111'; ctx.lineWidth = 1; ctx.beginPath(); for(let i=0; i<STAGE_CONFIG.BASE.width; i+=40) { ctx.moveTo(i, 0); ctx.lineTo(i, STAGE_CONFIG.BASE.height); } for(let j=0; j<STAGE_CONFIG.BASE.height; j+=40) { ctx.moveTo(0, j); ctx.lineTo(STAGE_CONFIG.BASE.width, j); } ctx.stroke(); }
    
    const tex = assetsRef.current.metal; const blockTextures = assetsRef.current.blockTextures; const crackTextures = assetsRef.current.cracks; const time = Date.now(); 
    
    // RENDER OPTIMIZATION: Populate reusable list
    updateVisibleObjects({ x: camera.x, y: camera.y, width: w, height: h });
    const visibleObjects = visibleObjectsRef.current;
    const len = visibleObjects.length;

    for (let i = 0; i < len; i++) {
        const obj = visibleObjects[i];
        // Integer coordinate forcing | 0
        const objX = obj.x | 0;
        const objY = obj.y | 0;
        const objW = obj.width | 0;
        const objH = obj.height | 0;

        if (obj.type === 'destructible' && obj.resourceType && blockTextures && blockTextures[obj.resourceType]) { 
            const blockTex = blockTextures[obj.resourceType]; 
            ctx.drawImage(blockTex, objX, objY, objW, objH); 
            
            if (obj.resourceType === 'living_metal') { 
                const phase = (objX + objY) * 0.1 + time * 0.002;
                const breath = (Math.sin(phase) + 1) * 0.5; 
                const alpha = 0.1 + (breath * 0.2); 
                
                if (obj.variant === 1) {
                     ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                     ctx.fillRect(objX, objY, objW, objH);
                     ctx.fillStyle = `rgba(100, 20, 20, ${alpha})`; 
                } else {
                     ctx.fillStyle = `rgba(160, 40, 40, ${alpha})`; 
                }

                ctx.fillRect(objX, objY, objW, objH); 
                
                ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
                ctx.fillRect(objX, objY, objW, 1); 
                ctx.fillRect(objX, objY, 1, objH); 
                
                ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                ctx.fillRect(objX, objY + objH - 1, objW, 1); 
                ctx.fillRect(objX + objW - 1, objY, 1, objH); 
            } else if (obj.resourceType === 'infected_living_metal') {
                const pulseSpeed = 0.002; 
                const pulsePhase = (objX * 0.2) + time * pulseSpeed;
                const pulse = (Math.sin(pulsePhase) + 1) * 0.5; 
                
                const alpha = 0.2 + (pulse * 0.25);
                ctx.fillStyle = `rgba(200, 0, 100, ${alpha})`;
                ctx.fillRect(objX, objY, objW, objH);
                
                const throbVal = (Math.sin(time * 0.003 + objY * 0.1) + 1) / 2; 
                const throbAlpha = throbVal * 0.35; 
                
                ctx.fillStyle = `rgba(255, 50, 150, ${throbAlpha})`;
                ctx.fillRect(objX + 1, objY + 1, objW - 2, objH - 2);
            }
            
            if (obj.health !== undefined && obj.maxHealth !== undefined && crackTextures) { 
                const damageRatio = 1 - (obj.health / obj.maxHealth); 
                let crackIndex = -1; 
                if (damageRatio > 0.75) crackIndex = 2; 
                else if (damageRatio > 0.50) crackIndex = 1; 
                else if (damageRatio > 0.25) crackIndex = 0; 
                if (crackIndex >= 0 && crackTextures[crackIndex]) { 
                    ctx.drawImage(crackTextures[crackIndex], objX, objY); 
                } 
            } 
            
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; 
            ctx.fillRect(objX + objW - 1, objY, 1, objH); 
            ctx.fillRect(objX, objY + objH - 1, objW, 1); 

        } else if (obj.type === 'hazard') { 
            ctx.fillStyle = '#150505'; 
            ctx.fillRect(objX, objY, objW, objH); 
            if (statsRef.current.unlockedRooms.includes('radar')) { 
                const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.4; 
                ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`; 
                ctx.fillRect(objX, objY, objW, objH); 
            } else { 
                ctx.fillStyle = 'rgba(30, 0, 0, 0.1)'; 
                ctx.fillRect(objX + 1, objY + 1, objW - 2, objH - 2); 
            } 
        } else if (obj.type === 'solid' || obj.type === 'base_entrance' || obj.type.includes('door')) { 
            if (tex && obj.type === 'solid') { 
                if (obj.width > BLOCK_SIZE || obj.height > BLOCK_SIZE) { 
                    
                    if (stageRef.current === 'MINE' && (obj.id.startsWith('wall') || obj.id === 'mine_ceil')) {
                            
                            if (assetsRef.current.hardenedPattern) {
                                ctx.fillStyle = assetsRef.current.hardenedPattern; 
                                ctx.save(); 
                                ctx.translate(objX, objY); 
                                ctx.fillRect(0, 0, objW, objH); 
                                ctx.restore();
                            } else {
                                ctx.fillStyle = '#220000'; 
                                ctx.fillRect(objX, objY, objW, objH);
                            }

                            const pulse = (Math.sin(time / 400 + (objX * 0.02) + (objY * 0.02)) + 1) / 2;
                            const alpha = 0.1 + (pulse * 0.25);
                            ctx.fillStyle = `rgba(120, 0, 0, ${alpha})`; 
                            ctx.fillRect(objX, objY, objW, objH);

                    } else {
                        const ptrn = ctx.createPattern(tex, 'repeat'); 
                        if(ptrn) { 
                            ctx.fillStyle = ptrn; ctx.save(); ctx.translate(objX, objY); ctx.fillRect(0, 0, objW, objH); ctx.restore(); 
                        } else { 
                            ctx.fillStyle = '#1a0505'; ctx.fillRect(objX, objY, objW, objH); 
                        } 
                        ctx.fillStyle = 'rgba(0,0,0,0.5)'; 
                        ctx.fillRect(objX, objY, objW, objH); 
                    }
                } else { 
                    ctx.drawImage(tex, objX, objY, objW, objH); 
                    ctx.fillStyle = 'rgba(0,0,0,0.5)'; 
                    ctx.fillRect(objX, objY, objW, objH); 
                } 
            } 
            if (obj.id.includes('airlock') || obj.id.includes('mine_door')) { 
                ctx.fillStyle = '#111'; ctx.fillRect(objX + 4, objY + 2, objW - 8, objH - 4); 
                if (obj.id.includes('mine_door')) { ctx.fillStyle = '#aa0'; } else { ctx.fillStyle = (stageRef.current === 'OUTSIDE') ? '#f00' : '#0f0'; } 
                ctx.fillRect(objX + objW/2 - 2, objY + objH/2, 4, 4); 
            } else if (obj.id === 'terminal') { 
                ctx.fillStyle = '#222'; ctx.fillRect(objX, objY, objW, objH); 
                ctx.fillStyle = '#0f0'; ctx.fillRect(objX + 4, objY + 4, objW - 8, objH/2); 
                ctx.fillStyle = '#444'; ctx.fillRect(objX + 2, objY + 12, objW - 4, 6); 
            } else if (obj.id === 'lab_station') {
                const isUnlocked = statsRef.current.unlockedLab;

                if (isUnlocked) {
                    // Lab Station Visuals - ACTIVE
                    ctx.fillStyle = '#0a1a0a'; 
                    ctx.fillRect(objX, objY + 10, objW, objH - 10); 
                    ctx.fillStyle = '#1a2a1a'; 
                    ctx.fillRect(objX - 2, objY + 10, objW + 4, 4);
                    
                    // Flask
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; 
                    ctx.beginPath();
                    ctx.moveTo(objX + 10, objY + 10);
                    ctx.lineTo(objX + 20, objY + 10);
                    ctx.lineTo(objX + 24, objY);
                    ctx.lineTo(objX + 6, objY);
                    ctx.fill();
                    
                    // Bubbling Liquid
                    const bubble = Math.sin(time / 200) * 2;
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(objX + 8, objY + 4 + bubble, 14, 6 - bubble);
                } else {
                    // Lab Station Visuals - LOCKED / BROKEN
                    ctx.fillStyle = '#101010'; // Dark Grey
                    ctx.fillRect(objX, objY + 10, objW, objH - 10); 
                    ctx.fillStyle = '#222'; 
                    ctx.fillRect(objX - 2, objY + 10, objW + 4, 4);
                    
                    // Empty/Dark Flask
                    ctx.fillStyle = 'rgba(100, 100, 100, 0.1)'; 
                    ctx.beginPath();
                    ctx.moveTo(objX + 10, objY + 10);
                    ctx.lineTo(objX + 20, objY + 10);
                    ctx.lineTo(objX + 24, objY);
                    ctx.lineTo(objX + 6, objY);
                    ctx.fill();

                    // No liquid, maybe a red dot
                    ctx.fillStyle = '#300';
                    ctx.fillRect(objX + 14, objY + 14, 4, 4);
                }

            } else if (obj.id === 'decon_machine') {
                ctx.fillStyle = '#1a1a2a'; 
                ctx.fillRect(objX, objY, objW, objH);
                
                const pulse = (Math.sin(time / 200) + 1) / 2;
                ctx.fillStyle = `rgba(0, 255, 100, ${0.4 + (pulse * 0.4)})`;
                ctx.fillRect(objX + 4, objY + 10, objW - 8, objH - 20);
                
                ctx.strokeStyle = '#444';
                ctx.lineWidth = 2;
                ctx.strokeRect(objX, objY, objW, objH);

            } else if (obj.id.startsWith('storage_')) {
                ctx.fillStyle = '#3a2a20'; 
                ctx.fillRect(objX, objY, objW, objH);
                ctx.strokeStyle = '#5a4a40';
                ctx.lineWidth = 1;
                ctx.strokeRect(objX, objY, objW, objH);
                ctx.beginPath();
                ctx.moveTo(objX, objY);
                ctx.lineTo(objX + objW, objY + objH);
                ctx.moveTo(objX + objW, objY);
                ctx.lineTo(objX, objY + objH);
                ctx.stroke();
            }
        } 
    }

    projectilesRef.current.forEach(proj => { 
        if (proj.x > camera.x - 50 && proj.x < camera.x + w + 50) { 
            ctx.save(); 
            ctx.translate(proj.x | 0, proj.y | 0); 
            ctx.rotate(proj.angle); 
            
            ctx.fillStyle = proj.color;
            ctx.shadowColor = proj.color;
            ctx.shadowBlur = 10;
            
            if (proj.type === 'sword') {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(20, -10);
                ctx.lineTo(30, 0);
                ctx.lineTo(20, 10);
                ctx.fill();
            } else if (proj.type === 'laser') {
                ctx.fillRect(0, -1, proj.width, proj.height);
            } else {
                ctx.strokeStyle = proj.color; 
                ctx.lineWidth = 2; 
                ctx.beginPath(); 
                ctx.arc(0, 0, 10, -Math.PI / 4, Math.PI / 4); 
                ctx.stroke(); 
            }
            
            ctx.shadowBlur = 0;
            ctx.restore(); 
        } 
    });

    const p = playerRef.current; if (p.canInteractWith) { if (window.innerWidth > 768) { ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; const promptY = isInvertedWorld ? p.pos.y + p.height + 15 : p.pos.y - 10; const promptText = language === 'es' ? '[ PULSA F ]' : '[ PRESS F ]'; ctx.fillText(promptText, (p.pos.x + p.width/2) | 0, promptY | 0); ctx.restore(); } }

    ctx.save(); const yAnchor = isInvertedWorld ? 0 : p.height; ctx.translate(Math.floor(p.pos.x + p.width/2), Math.floor(p.pos.y + yAnchor)); 
    if (isInvertedWorld) { ctx.scale(p.facingRight ? 1 : -1, -1); } else { ctx.scale(p.facingRight ? 1 : -1, 1); }
    if (assetsRef.current.player) { let sheetIndex = 0; if (p.animFrame === 1) sheetIndex = 1; if (p.animFrame === 3) sheetIndex = 2; const frameOffset = sheetIndex * 16; ctx.drawImage(assetsRef.current.player, frameOffset, 0, 16, 20, -8, -18, 16, 20); } ctx.restore();

    particlesRef.current.forEach(pt => { if (pt.x > camera.x && pt.x < camera.x + w) { ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life; ctx.fillRect(pt.x | 0, pt.y | 0, pt.size, pt.size); } }); ctx.globalAlpha = 1.0;

    if (stageRef.current === 'MINE' || stageRef.current === 'OUTSIDE') { const mx = (mouseRef.current.x / PIXEL_SCALE) + camera.x; const my = (mouseRef.current.y / PIXEL_SCALE) + camera.y; const pCenterX = p.pos.x + p.width/2; const pCenterY = p.pos.y + p.height/2; const dist = Math.sqrt(Math.pow(mx - pCenterX, 2) + Math.pow(my - pCenterY, 2)); const reachLvl = statsRef.current.miningReachLevel || 1; 
    const maxReach = 50 * Math.pow(1.10, reachLvl - 1); 
    const inRange = dist < maxReach; const modeColor = mobileActionMode === 'MINE' ? '#0ff' : '#f00'; ctx.strokeStyle = inRange ? modeColor : '#500'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo((mx - 4)|0, my|0); ctx.lineTo((mx + 4)|0, my|0); ctx.moveTo(mx|0, (my - 4)|0); ctx.lineTo(mx|0, (my + 4)|0); ctx.stroke(); if (mobileActionMode === 'MINE') { const radiusLvl = statsRef.current.miningRadiusLevel || 1; 
    let radius = (BLOCK_SIZE * 1.5) * Math.pow(1.10, radiusLvl - 1); 
    if (inRange) { ctx.beginPath(); ctx.arc(mx|0, my|0, radius, 0, Math.PI * 2); ctx.fillStyle = mouseRef.current.isDown || rightJoystickRef.current.active ? 'rgba(255, 100, 0, 0.2)' : 'rgba(0, 255, 255, 0.1)'; ctx.fill(); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(mx|0, my|0, 2, 0, Math.PI * 2); ctx.strokeStyle = '#f00'; ctx.stroke(); } } }

    if (stageRef.current === 'MINE' && fogCanvasRef.current) { 
        ctx.restore(); 
        const fogCtx = fogCanvasRef.current.getContext('2d');
        // OPTIMIZATION: Render fog on a low-res canvas (half window size) and upscale it
        if (fogCtx) { 
            const fogW = fogCanvasRef.current.width;
            const fogH = fogCanvasRef.current.height;
            fogCtx.clearRect(0, 0, fogW, fogH); 
            
            const ambientOpacity = 0.88 + Math.sin(time / 2000) * 0.04; 
            fogCtx.fillStyle = `rgba(0, 0, 0, ${ambientOpacity})`; 
            fogCtx.fillRect(0, 0, fogW, fogH); 
            
            // Coordinates must be scaled down to the fog canvas space
            // fog canvas is W/2, H/2. Game screen is W, H. PIXEL_SCALE is 2.
            // Game units are W/2, H/2. So 1 game unit = 1 fog canvas pixel.
            // It maps 1:1 with camera view.
            
            const pScreenX = (p.pos.x - (camera.x + shake.x) + p.width/2);
            const pScreenY = (p.pos.y - (camera.y + shake.y) + p.height/2);
            
            const scannerLvl = statsRef.current.oreScannerLevel || 1; 
            let baseRadius = 120;
            if (statsRef.current.unlockedLantern) {
                baseRadius = 220; 
            }
            const radiusPulse = 1.0 + Math.sin(time / 600) * 0.03; 
            const visionRadius = (baseRadius + ((scannerLvl - 1) * 30)) * radiusPulse; 
            
            fogCtx.globalCompositeOperation = 'destination-out'; 
            const grad = fogCtx.createRadialGradient(pScreenX, pScreenY, visionRadius * 0.2, pScreenX, pScreenY, visionRadius); 
            grad.addColorStop(0, 'rgba(0,0,0,1)'); 
            grad.addColorStop(0.4, 'rgba(0,0,0,0.9)'); 
            grad.addColorStop(0.7, 'rgba(0,0,0,0.5)'); 
            grad.addColorStop(1, 'rgba(0,0,0,0)'); 
            fogCtx.fillStyle = grad; 
            fogCtx.beginPath(); 
            fogCtx.arc(pScreenX, pScreenY, visionRadius, 0, Math.PI * 2); 
            fogCtx.fill(); 
            fogCtx.globalCompositeOperation = 'source-over'; 
            
            // Draw low-res fog upscaled to screen
            ctx.drawImage(fogCanvasRef.current, 0, 0, screenW, screenH); 
        } 
        ctx.save(); ctx.scale(PIXEL_SCALE, PIXEL_SCALE); ctx.translate(-Math.floor(camera.x + shake.x), -Math.floor(camera.y + shake.y)); 
    }
    
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; floatingTextsRef.current.forEach(ft => { if (ft.x > camera.x && ft.x < camera.x + w) { ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life; ctx.fillStyle = 'black'; ctx.fillText(ft.text, (ft.x + 1)|0, (ft.y + 1)|0); ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x|0, ft.y|0); } }); ctx.globalAlpha = 1.0;

    ctx.restore(); ctx.save(); ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
    if (isBase) { ctx.fillStyle = 'rgba(50, 20, 0, 0.1)'; ctx.fillRect(0, 0, w, h); }
    const pScreenX = (p.pos.x - (camera.x + shake.x) + p.width/2); const pScreenY = (p.pos.y - (camera.y + shake.y) + (isInvertedWorld ? 0 : p.height));

    if (assetsRef.current.glow) { ctx.globalCompositeOperation = 'screen'; const glowSize = 300; ctx.drawImage(assetsRef.current.glow, (pScreenX - glowSize/2)|0, (pScreenY - glowSize/2)|0, glowSize, glowSize); if (stageRef.current === 'BASE') { 
        // Using visibleObjects for base items instead of creating new array
        updateVisibleObjects({ x: 0, y: 0, width: w * 2, height: h * 2 });
        const baseItems = visibleObjectsRef.current;
        const term = baseItems.find(o => o.id === 'terminal'); if (term && assetsRef.current.terminalGlow) { const tX = (term.x - (camera.x + shake.x) + term.width/2); const tY = (term.y - (camera.y + shake.y) + term.height/2); ctx.drawImage(assetsRef.current.terminalGlow, (tX - 50)|0, (tY - 50)|0, 100, 100); } 
        const lab = baseItems.find(o => o.id === 'lab_station'); if (lab && assetsRef.current.labGlow && statsRef.current.unlockedLab) { const lX = (lab.x - (camera.x + shake.x) + lab.width/2); const lY = (lab.y - (camera.y + shake.y) + lab.height/2); ctx.drawImage(assetsRef.current.labGlow, (lX - 50)|0, (lY - 50)|0, 100, 100); }
    } if (assetsRef.current.shockwaveGlow) { projectilesRef.current.forEach(proj => { const projX = (proj.x - (camera.x + shake.x)); const projY = (proj.y - (camera.y + shake.y) + proj.height/2); ctx.drawImage(assetsRef.current.shockwaveGlow, (projX - 40)|0, (projY - 40)|0, 80, 80); }); } if (statsRef.current.unlockedRooms.includes('radar') && assetsRef.current.redGlow) { 
        // Re-use visible objects again
        updateVisibleObjects({ x: camera.x, y: camera.y, width: w, height: h });
        const visibleHazards = visibleObjectsRef.current; 
        visibleHazards.forEach(obj => { if (obj.type === 'hazard' || obj.resourceType === 'uranium') { const dx = obj.x - p.pos.x; const dy = obj.y - p.pos.y; if (dx*dx + dy*dy < 40000) { const hX = (obj.x - (camera.x + shake.x) + obj.width/2); const hY = (obj.y - (camera.y + shake.y) + obj.height/2); const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8; const size = 30 * pulse; ctx.drawImage(assetsRef.current.redGlow, (hX - size/2)|0, (hY - size/2)|0, size, size); } } }); } ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); 
    
    ctx.save(); if (leftJoystickRef.current.active) { const j = leftJoystickRef.current; ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 2; ctx.arc(j.originX, j.originY, 40, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; let dx = j.currentX - j.originX; let dy = j.currentY - j.originY; const dist = Math.sqrt(dx*dx + dy*dy); if (dist > 40) { dx = (dx / dist) * 40; dy = (dy / dist) * 40; } ctx.arc(j.originX + dx, j.originY + dy, 15, 0, Math.PI*2); ctx.fill(); }
    
    // RENDER RIGHT JOYSTICK (MOBILE)
    // Check for width < 1024 (LG breakpoint) OR active touch points to determine if mobile UI should show
    const isMobileView = window.innerWidth < 1024 || navigator.maxTouchPoints > 0;

    if (isMobileView) { 
        const rjX = screenW - 100; 
        const rjY = screenH - 100; 
        ctx.beginPath(); 
        ctx.strokeStyle = mobileActionMode === 'MINE' ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 50, 50, 0.1)'; 
        ctx.lineWidth = 2; 
        ctx.arc(rjX, rjY, 60, 0, Math.PI*2); 
        ctx.stroke(); 
        ctx.beginPath(); 
        let knobX = rjX; 
        let knobY = rjY; 
        if (rightJoystickRef.current.active) { 
            const j = rightJoystickRef.current; 
            let dx = j.currentX - j.originX; 
            let dy = j.currentY - j.originY; 
            const dist = Math.sqrt(dx*dx + dy*dy); 
            if (dist > 60) { dx = (dx / dist) * 60; dy = (dy / dist) * 60; } 
            knobX += dx; 
            knobY += dy; 
            ctx.fillStyle = mobileActionMode === 'MINE' ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 50, 50, 0.6)'; 
        } else { 
            ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'; 
        } 
        ctx.arc(knobX, knobY, 20, 0, Math.PI*2); 
        ctx.fill(); 
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,10,0.2)'; ctx.fillRect(0,0, screenW, screenH);
    if (gameState === GameState.PAUSED) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, screenW, screenH); }
  };

  const loop = (time: number) => {
    const deltaTime = time - lastTimeRef.current;
    if (deltaTime >= 16) {
        lastTimeRef.current = time - (deltaTime % 16);
        update();
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d', { alpha: false });
            if (ctx) draw(ctx, time / 16);
        }
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const resize = () => { 
        if (canvasRef.current) { 
            canvasRef.current.width = window.innerWidth; 
            canvasRef.current.height = window.innerHeight; 
            mobileCursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }; 
            if (fogCanvasRef.current) { 
                // Optimization: Fog canvas is half resolution
                fogCanvasRef.current.width = window.innerWidth / 2; 
                fogCanvasRef.current.height = window.innerHeight / 2; 
            } 
        } 
    };
    window.addEventListener('resize', resize); resize();
    
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(loop);
    return () => { window.removeEventListener('resize', resize); if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, mobileActionMode]);

  return (
    <canvas ref={canvasRef} className="block w-full h-full cursor-none bg-[#050505]" />
  );
};
