
import React, { useRef, useEffect } from 'react';
import { GameState, Vector2, Particle, LevelObject, PlayerStats, Projectile, Language, FloatingText } from '../types';
import { PIXEL_SCALE, BLOCK_SIZE, CHUNK_SIZE, STAGE_CONFIG } from '../game/constants';
import { 
    createOffscreenCanvas, 
    generateGlowSprite, 
    generateCrackTextures, 
    generateMetalTexture, 
    generateResourceTextures, 
    generatePlayerSprites, 
    generateSpikyBackground 
} from '../game/assets';
import { loadBaseStage, loadMineStage, loadOutsideStage } from '../game/levelGen';

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

type StageType = 'OUTSIDE' | 'BASE' | 'MINE';

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
  const assetsLoadedRef = useRef<boolean>(false);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambienceNodesRef = useRef<{ nodes: AudioNode[], gain: GainNode | null }>({ nodes: [], gain: null });
  
  const statsRef = useRef(stats);
  const volRef = useRef(volumeSettings);
  const isLoadingRef = useRef(isLoading);
  const gameStateRef = useRef(gameState);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => {
      volRef.current = volumeSettings;
      if (ambienceNodesRef.current.gain) {
          try {
            ambienceNodesRef.current.gain.gain.setTargetAtTime(volumeSettings.ambience, (audioCtxRef.current?.currentTime || 0), 0.1);
          } catch(e) {}
      }
  }, [volumeSettings]);

  useEffect(() => {
      isLoadingRef.current = isLoading;
  }, [isLoading]);
  
  useEffect(() => {
      gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
      if (interactionTrigger > 0) {
          handleInteraction();
      }
  }, [interactionTrigger]);

  const stageRef = useRef<StageType>('BASE');

  const playerRef = useRef({
    pos: { x: 500, y: 400 } as Vector2,
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
  
  const chunksRef = useRef<Map<string, LevelObject[]>>(new Map());
  const largeObjectsRef = useRef<LevelObject[]>([]);
  
  const visibleObjectsRef = useRef<LevelObject[]>([]);
  
  const lastTimeRef = useRef<number>(0);
  const bgLayersRef = useRef<HTMLCanvasElement[]>([]);

  const clearObjects = () => {
      chunksRef.current.clear();
      largeObjectsRef.current = [];
  };

  const addObject = (obj: LevelObject) => {
      if (obj.width > CHUNK_SIZE || obj.height > CHUNK_SIZE) {
          largeObjectsRef.current.push(obj);
      } else {
          const cx = obj.x + obj.width / 2;
          const cy = obj.y + obj.height / 2;
          const key = `${Math.floor(cx / CHUNK_SIZE)},${Math.floor(cy / CHUNK_SIZE)}`;
          if (!chunksRef.current.has(key)) chunksRef.current.set(key, []);
          chunksRef.current.get(key)!.push(obj);
      }
  };

  const updateVisibleObjects = (rect: {x: number, y: number, width: number, height: number}) => {
      visibleObjectsRef.current.length = 0;
      
      const startX = Math.floor(rect.x / CHUNK_SIZE);
      const endX = Math.floor((rect.x + rect.width) / CHUNK_SIZE);
      const startY = Math.floor(rect.y / CHUNK_SIZE);
      const endY = Math.floor((rect.y + rect.height) / CHUNK_SIZE);

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

  const playSfx = (type: string) => {
      if (!audioCtxRef.current || volRef.current.sfx <= 0) return;
      try {
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
      } catch(e) {}
  };

  const updateAmbience = (stage: StageType) => {
      if (!audioCtxRef.current) return;
      try {
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
      } catch(e) { console.error("Audio error", e); }
  };

  const triggerShake = (intensity: number, duration: number) => { shakeRef.current.intensity = intensity; shakeRef.current.timer = duration; };

  const loadCurrentStage = () => {
    try {
        clearObjects(); 
        particlesRef.current = []; projectilesRef.current = []; floatingTextsRef.current = []; 
        
        const config = STAGE_CONFIG[stageRef.current];
        if (!config) return;

        const w = config.width; const h = config.height;
        const addObj = (obj: LevelObject) => addObject(obj);

        if (stageRef.current === 'OUTSIDE') loadOutsideStage(w, h, addObj); 
        else if (stageRef.current === 'BASE') loadBaseStage(w, h, statsRef.current, addObj); 
        else if (stageRef.current === 'MINE') loadMineStage(w, h, statsRef.current, addObj);
        
        const p = playerRef.current;
        if (canvasRef.current) {
            const viewportW = canvasRef.current.width / PIXEL_SCALE || 400; 
            const viewportH = canvasRef.current.height / PIXEL_SCALE || 300; 
            cameraRef.current.x = p.pos.x - viewportW / 2 + p.width / 2;
            cameraRef.current.y = p.pos.y - viewportH / 2 + p.height / 2;
        }
    } catch (e) {
        console.error("Error loading stage:", e);
    }
  };

  const switchStage = (newStage: StageType) => {
    stageRef.current = newStage;
    onStageChanged(newStage);
    updateAmbience(newStage); 
    playSfx('teleport'); 
    const p = playerRef.current;
    const config = STAGE_CONFIG[newStage];
    if (!config) return;
    
    const w = config.width; const h = config.height;

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
    try {
        assetsRef.current.metal = generateMetalTexture();
        assetsRef.current.blockTextures = generateResourceTextures();
        assetsRef.current.cracks = generateCrackTextures(); 
        assetsRef.current.player = generatePlayerSprites();
        assetsRef.current.glow = generateGlowSprite(150, 'rgba(200, 255, 255, 0.08)');
        assetsRef.current.redGlow = generateGlowSprite(60, 'rgba(255, 0, 0, 0.15)');
        assetsRef.current.terminalGlow = generateGlowSprite(40, 'rgba(50, 255, 50, 0.1)');
        assetsRef.current.labGlow = generateGlowSprite(40, 'rgba(50, 255, 100, 0.2)'); 
        assetsRef.current.shockwaveGlow = generateGlowSprite(40, 'rgba(0, 255, 255, 0.3)');
        
        if (assetsRef.current.blockTextures && assetsRef.current.blockTextures['hardened_metal']) {
            const pCtx = createOffscreenCanvas(1, 1).ctx;
            assetsRef.current.hardenedPattern = pCtx.createPattern(assetsRef.current.blockTextures['hardened_metal'], 'repeat');
        }

        bgLayersRef.current = [ generateSpikyBackground(STAGE_CONFIG.OUTSIDE.width + 200, STAGE_CONFIG.OUTSIDE.height, '#0a0a10'), generateSpikyBackground(STAGE_CONFIG.OUTSIDE.width + 200, STAGE_CONFIG.OUTSIDE.height, '#111118'), ];
        fogCanvasRef.current = document.createElement('canvas');
        
        assetsLoadedRef.current = true;
        
        loadCurrentStage();
        mobileCursorRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const timeout = setTimeout(() => { initAudio(); playSfx('start'); }, 500);
        return () => { clearTimeout(timeout); if (audioCtxRef.current) { audioCtxRef.current.close(); } };
    } catch (e) {
        console.error("Asset generation failed", e);
    }
  }, []);

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
        else if (interactId === 'lab_station') { onToggleBase(true, 'lab'); }
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
      let cooldown = 500; if (weapon === 'laser') cooldown = 200; if (weapon === 'sword') cooldown = 400;
      if (now - p.lastAttackTime < cooldown) return; 
      p.lastAttackTime = now; 
      const camera = cameraRef.current; const mouse = mouseRef.current; let angle = 0;
      if (rightJoystickRef.current.active) { const j = rightJoystickRef.current; angle = Math.atan2(j.currentY - j.originY, j.currentX - j.originX); } else { const worldMX = (mouse.x / PIXEL_SCALE) + camera.x; const worldMY = (mouse.y / PIXEL_SCALE) + camera.y; angle = Math.atan2(worldMY - (p.pos.y + p.height/2), worldMX - (p.pos.x + p.width/2)); }
      if (weapon === 'force') { playSfx('attack'); triggerShake(2, 4); const speed = 6; projectilesRef.current.push({ id: Math.random(), x: p.pos.x + p.width/2, y: p.pos.y + p.height/2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, type: 'force', angle: angle, life: 1.0, width: 10, height: 10, color: '#0ff' }); } else if (weapon === 'laser') { playSfx('laser'); const speed = 12; projectilesRef.current.push({ id: Math.random(), x: p.pos.x + p.width/2, y: p.pos.y + p.height/2, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, type: 'laser', angle: angle, life: 1.5, width: 20, height: 2, color: '#f00' }); } else if (weapon === 'sword') { playSfx('attack'); projectilesRef.current.push({ id: Math.random(), x: p.pos.x + p.width/2 + (Math.cos(angle) * 15), y: p.pos.y + p.height/2 + (Math.sin(angle) * 15), vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 2, type: 'sword', angle: angle, life: 0.2, width: 30, height: 30, color: '#f50' }); }
  };

  const mineAtPosition = (targetX: number, targetY: number, radius: number) => {
      const p = playerRef.current; const currentStats = statsRef.current; const isInvertedWorld = stageRef.current === 'OUTSIDE'; const now = Date.now(); let hitSomething = false;
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
                      if (now - p.lastClankTime > 200) { playSfx('clank'); p.lastClankTime = now; spawnParticles(targetX, targetY, 1, '#888', 1); } continue; 
                  }
                  const speedLvl = currentStats.miningSpeedLevel || 1; const damage = 1.0 * Math.pow(1.10, speedLvl - 1);
                  if (obj.health !== undefined) {
                      obj.health -= damage;
                      if (Math.random() > 0.7) { spawnParticles(objCenterX, objCenterY, 1, '#ffaa00', isInvertedWorld ? -1 : 1); }
                      if (obj.health <= 0) {
                          if (obj.width > CHUNK_SIZE || obj.height > CHUNK_SIZE) { const idx = largeObjectsRef.current.indexOf(obj); if (idx !== -1) largeObjectsRef.current.splice(idx, 1); } else { const cx = obj.x + obj.width / 2; const cy = obj.y + obj.height / 2; const key = `${Math.floor(cx / CHUNK_SIZE)},${Math.floor(cy / CHUNK_SIZE)}`; const chunk = chunksRef.current.get(key); if (chunk) { const idx = chunk.indexOf(obj); if (idx !== -1) chunk.splice(idx, 1); } }
                          if (obj.resourceType === 'infected_living_metal') { playSfx('damage'); onUpdateStats({ infection: Math.min(100, currentStats.infection + 3) }); spawnFloatingText(objCenterX, objCenterY, `+3% Infection`, '#0f0'); spawnParticles(objCenterX, objCenterY, 5, '#0f0', isInvertedWorld ? -1 : 1); if (Math.random() < 0.30) { const scrapAmount = Math.floor(Math.random() * 3) + 1; onUpdateStats({ scraps: currentStats.scraps + scrapAmount }); spawnFloatingText(objCenterX, objCenterY, `+${scrapAmount} Scrap`, '#aaa'); playSfx('collect'); } } else if (obj.resourceType === 'living_metal') { playSfx('mine_metal'); if (Math.random() < 0.30) { const scrapAmount = Math.floor(Math.random() * 3) + 1; onUpdateStats({ scraps: currentStats.scraps + scrapAmount }); spawnFloatingText(objCenterX, objCenterY, `+${scrapAmount} Scrap`, '#aaa'); playSfx('collect'); } } else { playSfx('mine'); }
                          let shakeInt = 3; let shakeDur = 5; let pColor = '#500'; let resourceName = ""; let gainedAmount = 0; const update: Partial<PlayerStats> = {}; const isSpanish = language === 'es';
                          if (obj.resourceType === 'scrap') { gainedAmount = 2; update.scraps = currentStats.scraps + gainedAmount; pColor = '#aaa'; resourceName = isSpanish ? "Chatarra" : "Scraps"; } else if (obj.resourceType === 'wood') { gainedAmount = 1; update.wood = (currentStats.wood || 0) + gainedAmount; pColor = '#654321'; resourceName = isSpanish ? "Madera" : "Wood"; } else if (obj.resourceType === 'iron') { gainedAmount = 1; update.iron = (currentStats.iron || 0) + gainedAmount; pColor = '#ccc'; resourceName = isSpanish ? "Hierro" : "Iron"; } else if (obj.resourceType === 'ice') { gainedAmount = 1; update.ice = (currentStats.ice || 0) + gainedAmount; pColor = '#0ff'; resourceName = isSpanish ? "Hielo" : "Ice"; } else if (obj.resourceType === 'coal') { gainedAmount = 1; update.coal = (currentStats.coal || 0) + gainedAmount; pColor = '#111'; resourceName = isSpanish ? "Carbón" : "Coal"; } else if (obj.resourceType === 'titanium') { gainedAmount = 1; update.titanium = (currentStats.titanium || 0) + gainedAmount; pColor = '#fff'; resourceName = isSpanish ? "Titanio" : "Titanium"; shakeInt = 6; shakeDur = 10; } else if (obj.resourceType === 'uranium') { gainedAmount = 1; update.uranium = (currentStats.uranium || 0) + gainedAmount; pColor = '#0f0'; resourceName = isSpanish ? "Uranio" : "Uranium"; shakeInt = 6; shakeDur = 10; onUpdateStats({ health: Math.max(0, currentStats.health - 5) }); playSfx('damage'); } else { if (obj.resourceType !== 'living_metal' && obj.resourceType !== 'infected_living_metal' && Math.random() > 0.8) { gainedAmount = 1; update.scraps = currentStats.scraps + 1; resourceName = isSpanish ? "Chatarra" : "Scrap"; } }
                          triggerShake(shakeInt, shakeDur); if (gainedAmount > 0) { onUpdateStats(update); spawnFloatingText(objCenterX, objCenterY, `+${gainedAmount} ${resourceName}`, pColor === '#111' ? '#aaa' : pColor); playSfx('collect'); } spawnParticles(objCenterX, objCenterY, 3, pColor, isInvertedWorld ? -1 : 1);
                      }
                  }
              }
          }
      }
      return hitSomething;
  };

  const update = () => {
    // Prevent update if assets not loaded or loading screen active
    if (isLoadingRef.current || !assetsLoadedRef.current) return;

    const isPaused = gameStateRef.current === GameState.PAUSED || gameStateRef.current === GameState.MENU || gameStateRef.current === GameState.GAME_OVER;
    
    if (rightJoystickRef.current.active && !isPaused) {
        const j = rightJoystickRef.current;
        const dx = j.currentX - j.originX;
        const dy = j.currentY - j.originY;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxStickDist = 60; 
        const camera = cameraRef.current; const p = playerRef.current;
        const pScreenX = (p.pos.x - camera.x + p.width/2) * PIXEL_SCALE;
        const pScreenY = (p.pos.y - camera.y + p.height/2) * PIXEL_SCALE;
        const reachLvl = statsRef.current.miningReachLevel || 1; const maxReachWorld = 50 * Math.pow(1.10, reachLvl - 1); const maxReachScreen = maxReachWorld * PIXEL_SCALE * 0.9; 
        if (dist > 5) { const nx = dx / dist; const ny = dy / dist; const strength = Math.min(1, dist / maxStickDist); mobileCursorRef.current.x = pScreenX + (nx * strength * maxReachScreen); mobileCursorRef.current.y = pScreenY + (ny * strength * maxReachScreen); } else { mobileCursorRef.current.x = pScreenX; mobileCursorRef.current.y = pScreenY; }
        mouseRef.current.x = mobileCursorRef.current.x; mouseRef.current.y = mobileCursorRef.current.y;
    }

    if ((stageRef.current === 'BASE' || stageRef.current === 'MINE') && Math.random() < 0.0005) { playSfx('creak'); }

    const p = playerRef.current; const keys = keysRef.current; const mouse = mouseRef.current; const currentStats = statsRef.current; 
    
    if (!isPaused) {
        if (currentStats.health <= 0) { onGameOver(); return; }
        const isInvertedWorld = stageRef.current === 'OUTSIDE'; const isBase = stageRef.current === 'BASE';
        if (currentStats.infection !== undefined && Math.abs(currentStats.infection - p.infection) > 1) { p.infection = currentStats.infection; }

        if (!isBase) {
            const currentLevel = currentStats.oxygenLevel || 1; const totalDurationSeconds = 50 * Math.pow(1.10, currentLevel - 1); const decayPerFrame = 100 / (totalDurationSeconds * 60);
            p.oxygen = Math.max(0, p.oxygen - decayPerFrame);
            p.noOxygenInfectionTimer++; if (p.noOxygenInfectionTimer >= 180) { p.noOxygenInfectionTimer = 0; p.infection = Math.min(100, p.infection + 1); }
            p.baseHealthRegenTimer = 0;
        } else {
            p.noOxygenInfectionTimer = 0; p.oxygen = Math.min(100, p.oxygen + 2.0);
            p.baseHealTimer++; let healRate = 90; 
            if (currentStats.hasDecontaminationUnit) { updateVisibleObjects({ x: p.pos.x - 200, y: p.pos.y - 200, width: 400, height: 400 }); const deconObj = visibleObjectsRef.current.find(o => o.id === 'decon_machine'); if (deconObj) { const dx = (p.pos.x + p.width/2) - (deconObj.x + deconObj.width/2); const dy = (p.pos.y + p.height/2) - (deconObj.y + deconObj.height/2); const dist = Math.sqrt(dx*dx + dy*dy); if (dist < 100) { healRate = 10; if (Math.random() < 0.1) spawnParticles(p.pos.x + p.width/2, p.pos.y, 1, '#0f0', -1); } } }
            if (p.baseHealTimer > healRate) { p.baseHealTimer = 0; p.infection = Math.max(0, p.infection - 1); }
            if (currentStats.health < currentStats.maxHealth) { p.baseHealthRegenTimer++; if (p.baseHealthRegenTimer > 60) { p.baseHealthRegenTimer = 0; onUpdateStats({ health: Math.min(currentStats.maxHealth, currentStats.health + 1) }); } }
        }

        if (Math.floor(p.oxygen) !== Math.floor(currentStats.oxygen) || Math.floor(p.infection) !== Math.floor(currentStats.infection)) { onUpdateStats({ oxygen: p.oxygen, infection: p.infection }); }
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
            if (isMiningAction) { const worldMX = (mouse.x / PIXEL_SCALE) + cameraRef.current.x; const worldMY = (mouse.y / PIXEL_SCALE) + cameraRef.current.y; const pCenterX = p.pos.x + p.width/2; const pCenterY = p.pos.y + p.height/2; const distToMouse = Math.sqrt(Math.pow(worldMX - pCenterX, 2) + Math.pow(worldMY - pCenterY, 2)); const reachLvl = currentStats.miningReachLevel || 1; const maxReach = 50 * Math.pow(1.10, reachLvl - 1); if (distToMouse < maxReach) { const radiusLvl = currentStats.miningRadiusLevel || 1; let radius = (BLOCK_SIZE * 1.5) * Math.pow(1.10, radiusLvl - 1); mineAtPosition(worldMX, worldMY, radius); } }
            if (isAttackAction) { performAttack(); }
        }

        if (p.isMoving) { p.animTimer++; if (p.animTimer > 5) { p.animFrame = (p.animFrame + 1) % 4; p.animTimer = 0; if (p.isGrounded) { spawnParticles(p.pos.x + p.width/2, p.pos.y + (isInvertedWorld ? 0 : p.height), 1, '#4a0000', isInvertedWorld ? -1 : 1); if (p.animFrame === 1 || p.animFrame === 3) { playSfx('step'); } } } } else { p.animFrame = 0; }
        if (jumpPressed) { if (p.isGrounded) { p.vel.y = isInvertedWorld ? JUMP : -JUMP; p.isGrounded = false; p.jumpCount = 1; playSfx('jump'); spawnParticles(p.pos.x + p.width/2, p.pos.y + (isInvertedWorld ? 0 : p.height), 3, '#fff', isInvertedWorld ? -1 : 1); } else if (currentStats.highJumpBoots && p.jumpCount < 2) { p.vel.y = isInvertedWorld ? JUMP * 0.8 : -JUMP * 0.8; p.jumpCount = 2; playSfx('jump'); spawnParticles(p.pos.x + p.width/2, p.pos.y + (isInvertedWorld ? 0 : p.height), 5, '#0ff', isInvertedWorld ? -1 : 1); } }

        p.vel.y += GRAVITY; p.pos.x += p.vel.x; p.pos.y += p.vel.y;

        const worldConfig = STAGE_CONFIG[stageRef.current]; const worldW = worldConfig.width; const worldH = worldConfig.height;
        if (p.pos.x < 0) { p.pos.x = 0; p.vel.x = 0; } if (p.pos.x + p.width > worldW) { p.pos.x = worldW - p.width; p.vel.x = 0; }
        if (p.pos.y > worldH + 50) { if (stageRef.current === 'MINE') { p.pos.x = 60; p.pos.y = worldH - 80; } else { p.pos.x = 400; p.pos.y = 80; } p.vel.y = 0; onUpdateStats({ health: Math.max(0, currentStats.health - 10) }); triggerShake(10, 20); playSfx('damage'); }
        // NaN check to prevent black screen freeze
        if (Number.isNaN(p.pos.x)) p.pos.x = 100; if (Number.isNaN(p.pos.y)) p.pos.y = 100;

        const prevCanInteract = p.canInteractWith; p.canInteractWith = null; const playerCenterX = p.pos.x + p.width / 2; const playerCenterY = p.pos.y + p.height / 2; let inHazard = false;
        
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
    for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) { const ft = floatingTextsRef.current[i]; ft.y += ft.velocity; ft.life -= 0.02; if (ft.life <= 0) floatingTextsRef.current.splice(i, 1); }
    for (let i = projectilesRef.current.length - 1; i >= 0; i--) { const proj = projectilesRef.current[i]; proj.x += proj.vx; proj.y += proj.vy; proj.life -= 0.05; if (Math.random() > 0.5 && proj.type !== 'sword') { particlesRef.current.push({ id: Math.random(), x: proj.x + (Math.random() * 4 - 2), y: proj.y + Math.random() * proj.height, vx: -proj.vx * 0.2, vy: (Math.random() - 0.5), life: 0.5, color: proj.color, size: 1 }); } if (proj.life <= 0 || proj.x < 0 || proj.x > worldW) { projectilesRef.current.splice(i, 1); } }
    if (shakeRef.current.timer > 0) { shakeRef.current.timer--; shakeRef.current.x = (Math.random() - 0.5) * 2 * shakeRef.current.intensity; shakeRef.current.y = (Math.random() - 0.5) * 2 * shakeRef.current.intensity; } else { shakeRef.current.x = 0; shakeRef.current.y = 0; }
    
    if (canvasRef.current && canvasRef.current.width > 0) { 
        const viewportW = canvasRef.current.width / PIXEL_SCALE; 
        const viewportH = canvasRef.current.height / PIXEL_SCALE; 
        const targetX = p.pos.x - viewportW / 2 + p.width / 2; 
        const targetY = p.pos.y - viewportH / 2 + p.height / 2; 
        const camera = cameraRef.current;
        camera.x += (targetX - camera.x) * 0.1; 
        camera.y += (targetY - camera.y) * 0.1; 
        camera.x = Math.max(0, Math.min(camera.x, worldW - viewportW)); 
        if (worldH < viewportH) { camera.y = -(viewportH - worldH) / 2; } else { camera.y = Math.max(0, Math.min(camera.y, worldH - viewportH)); } 
    }
  };

  const draw = (ctx: CanvasRenderingContext2D, frameCount: number) => {
    // Safety check for critical assets
    if (!assetsLoadedRef.current || !assetsRef.current.metal) return;

    const screenW = ctx.canvas.width; const screenH = ctx.canvas.height; 
    
    // Prevent drawing on 0-size canvas
    if (screenW === 0 || screenH === 0) return;

    const w = screenW / PIXEL_SCALE; const h = screenH / PIXEL_SCALE;
    
    // Safety clear to prevent "streaking" if loop hiccups
    ctx.clearRect(0, 0, screenW, screenH);

    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, screenW, screenH); ctx.save(); ctx.scale(PIXEL_SCALE, PIXEL_SCALE); const camera = cameraRef.current; const shake = shakeRef.current; ctx.translate(-Math.floor(camera.x + shake.x), -Math.floor(camera.y + shake.y)); const isInvertedWorld = stageRef.current === 'OUTSIDE'; const isBase = stageRef.current === 'BASE';

    if (stageRef.current === 'OUTSIDE') { bgLayersRef.current.forEach((layer, i) => { if (layer) { ctx.drawImage(layer, 0, 0); } }); } else if (stageRef.current === 'MINE') { ctx.fillStyle = '#050000'; ctx.fillRect(0, 0, STAGE_CONFIG.MINE.width, STAGE_CONFIG.MINE.height); } else { ctx.fillStyle = '#110505'; ctx.fillRect(0, 0, STAGE_CONFIG.BASE.width, STAGE_CONFIG.BASE.height); ctx.strokeStyle = '#221111'; ctx.lineWidth = 1; ctx.beginPath(); for(let i=0; i<STAGE_CONFIG.BASE.width; i+=40) { ctx.moveTo(i, 0); ctx.lineTo(i, STAGE_CONFIG.BASE.height); } for(let j=0; j<STAGE_CONFIG.BASE.height; j+=40) { ctx.moveTo(0, j); ctx.lineTo(STAGE_CONFIG.BASE.width, j); } ctx.stroke(); }
    
    const tex = assetsRef.current.metal; const blockTextures = assetsRef.current.blockTextures; const crackTextures = assetsRef.current.cracks; const time = Date.now(); 
    
    updateVisibleObjects({ x: camera.x, y: camera.y, width: w, height: h });
    const visibleObjects = visibleObjectsRef.current;
    const len = visibleObjects.length;

    for (let i = 0; i < len; i++) {
        const obj = visibleObjects[i];
        const objX = obj.x | 0; const objY = obj.y | 0; const objW = obj.width | 0; const objH = obj.height | 0;

        if (obj.type === 'destructible' && obj.resourceType && blockTextures && blockTextures[obj.resourceType]) { 
            const blockTex = blockTextures[obj.resourceType]; ctx.drawImage(blockTex, objX, objY, objW, objH); 
            if (obj.resourceType === 'living_metal') { const phase = (objX + objY) * 0.1 + time * 0.002; const breath = (Math.sin(phase) + 1) * 0.5; const alpha = 0.1 + (breath * 0.2); if (obj.variant === 1) { ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; ctx.fillRect(objX, objY, objW, objH); ctx.fillStyle = `rgba(100, 20, 20, ${alpha})`; } else { ctx.fillStyle = `rgba(160, 40, 40, ${alpha})`; } ctx.fillRect(objX, objY, objW, objH); ctx.fillStyle = 'rgba(255, 100, 100, 0.15)'; ctx.fillRect(objX, objY, objW, 1); ctx.fillRect(objX, objY, 1, objH); ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(objX, objY + objH - 1, objW, 1); ctx.fillRect(objX + objW - 1, objY, 1, objH); } else if (obj.resourceType === 'infected_living_metal') { const pulseSpeed = 0.002; const pulsePhase = (objX * 0.2) + time * pulseSpeed; const pulse = (Math.sin(pulsePhase) + 1) * 0.5; const alpha = 0.2 + (pulse * 0.25); ctx.fillStyle = `rgba(200, 0, 100, ${alpha})`; ctx.fillRect(objX, objY, objW, objH); const throbVal = (Math.sin(time * 0.003 + objY * 0.1) + 1) / 2; const throbAlpha = throbVal * 0.35; ctx.fillStyle = `rgba(255, 50, 150, ${throbAlpha})`; ctx.fillRect(objX + 1, objY + 1, objW - 2, objH - 2); }
            if (obj.health !== undefined && obj.maxHealth !== undefined && crackTextures) { const damageRatio = 1 - (obj.health / obj.maxHealth); let crackIndex = -1; if (damageRatio > 0.75) crackIndex = 2; else if (damageRatio > 0.50) crackIndex = 1; else if (damageRatio > 0.25) crackIndex = 0; if (crackIndex >= 0 && crackTextures[crackIndex]) { ctx.drawImage(crackTextures[crackIndex], objX, objY); } } 
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(objX + objW - 1, objY, 1, objH); ctx.fillRect(objX, objY + objH - 1, objW, 1); 
        } else if (obj.type === 'hazard') { 
            ctx.fillStyle = '#150505'; ctx.fillRect(objX, objY, objW, objH); if (statsRef.current.unlockedRooms.includes('radar')) { const pulse = Math.sin(Date.now() / 150) * 0.3 + 0.4; ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`; ctx.fillRect(objX, objY, objW, objH); } else { ctx.fillStyle = 'rgba(30, 0, 0, 0.1)'; ctx.fillRect(objX + 1, objY + 1, objW - 2, objH - 2); } 
        } else if (obj.type === 'solid' || obj.type === 'base_entrance' || obj.type.includes('door')) { 
            if (tex && obj.type === 'solid') { 
                if (obj.width > BLOCK_SIZE || obj.height > BLOCK_SIZE) { 
                    if (stageRef.current === 'MINE' && (obj.id.startsWith('wall') || obj.id === 'mine_ceil')) {
                            if (assetsRef.current.hardenedPattern) { ctx.fillStyle = assetsRef.current.hardenedPattern; ctx.save(); ctx.translate(objX, objY); ctx.fillRect(0, 0, objW, objH); ctx.restore(); } else { ctx.fillStyle = '#220000'; ctx.fillRect(objX, objY, objW, objH); }
                            const pulse = (Math.sin(time / 400 + (objX * 0.02) + (objY * 0.02)) + 1) / 2; const alpha = 0.1 + (pulse * 0.25); ctx.fillStyle = `rgba(120, 0, 0, ${alpha})`; ctx.fillRect(objX, objY, objW, objH);
                    } else { const ptrn = ctx.createPattern(tex, 'repeat'); if(ptrn) { ctx.fillStyle = ptrn; ctx.save(); ctx.translate(objX, objY); ctx.fillRect(0, 0, objW, objH); ctx.restore(); } else { ctx.fillStyle = '#1a0505'; ctx.fillRect(objX, objY, objW, objH); } ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(objX, objY, objW, objH); }
                } else { ctx.drawImage(tex, objX, objY, objW, objH); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(objX, objY, objW, objH); } 
            } 
            if (obj.id.includes('airlock') || obj.id.includes('mine_door')) { ctx.fillStyle = '#111'; ctx.fillRect(objX + 4, objY + 2, objW - 8, objH - 4); if (obj.id.includes('mine_door')) { ctx.fillStyle = '#aa0'; } else { ctx.fillStyle = (stageRef.current === 'OUTSIDE') ? '#f00' : '#0f0'; } ctx.fillRect(objX + objW/2 - 2, objY + objH/2, 4, 4); } else if (obj.id === 'terminal') { ctx.fillStyle = '#222'; ctx.fillRect(objX, objY, objW, objH); ctx.fillStyle = '#0f0'; ctx.fillRect(objX + 4, objY + 4, objW - 8, objH/2); ctx.fillStyle = '#444'; ctx.fillRect(objX + 2, objY + 12, objW - 4, 6); } else if (obj.id === 'lab_station') { const isUnlocked = statsRef.current.unlockedLab; if (isUnlocked) { ctx.fillStyle = '#0a1a0a'; ctx.fillRect(objX, objY + 10, objW, objH - 10); ctx.fillStyle = '#1a2a1a'; ctx.fillRect(objX - 2, objY + 10, objW + 4, 4); ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.beginPath(); ctx.moveTo(objX + 10, objY + 10); ctx.lineTo(objX + 20, objY + 10); ctx.lineTo(objX + 24, objY); ctx.lineTo(objX + 6, objY); ctx.fill(); const bubble = Math.sin(time / 200) * 2; ctx.fillStyle = '#00ff00'; ctx.fillRect(objX + 8, objY + 4 + bubble, 14, 6 - bubble); } else { ctx.fillStyle = '#101010'; ctx.fillRect(objX, objY + 10, objW, objH - 10); ctx.fillStyle = '#222'; ctx.fillRect(objX - 2, objY + 10, objW + 4, 4); ctx.fillStyle = 'rgba(100, 100, 100, 0.1)'; ctx.beginPath(); ctx.moveTo(objX + 10, objY + 10); ctx.lineTo(objX + 20, objY + 10); ctx.lineTo(objX + 24, objY); ctx.lineTo(objX + 6, objY); ctx.fill(); ctx.fillStyle = '#300'; ctx.fillRect(objX + 14, objY + 14, 4, 4); } } else if (obj.id === 'decon_machine') { ctx.fillStyle = '#1a1a2a'; ctx.fillRect(objX, objY, objW, objH); const pulse = (Math.sin(time / 200) + 1) / 2; ctx.fillStyle = `rgba(0, 255, 100, ${0.4 + (pulse * 0.4)})`; ctx.fillRect(objX + 4, objY + 10, objW - 8, objH - 20); ctx.strokeStyle = '#444'; ctx.lineWidth = 2; ctx.strokeRect(objX, objY, objW, objH); } else if (obj.id.startsWith('storage_')) { ctx.fillStyle = '#3a2a20'; ctx.fillRect(objX, objY, objW, objH); ctx.strokeStyle = '#5a4a40'; ctx.lineWidth = 1; ctx.strokeRect(objX, objY, objW, objH); ctx.beginPath(); ctx.moveTo(objX, objY); ctx.lineTo(objX + objW, objY + objH); ctx.moveTo(objX + objW, objY); ctx.lineTo(objX, objY + objH); ctx.stroke(); }
        } 
    }

    projectilesRef.current.forEach(proj => { 
        if (proj.x > camera.x - 50 && proj.x < camera.x + w + 50) { 
            ctx.save(); ctx.translate(proj.x | 0, proj.y | 0); ctx.rotate(proj.angle); 
            ctx.fillStyle = proj.color; ctx.shadowColor = proj.color; ctx.shadowBlur = 10;
            if (proj.type === 'sword') { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, -10); ctx.lineTo(30, 0); ctx.lineTo(20, 10); ctx.fill(); } else if (proj.type === 'laser') { ctx.fillRect(0, -1, proj.width, proj.height); } else { ctx.strokeStyle = proj.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 10, -Math.PI / 4, Math.PI / 4); ctx.stroke(); }
            ctx.shadowBlur = 0; ctx.restore(); 
        } 
    });

    const p = playerRef.current; 
    if (p.canInteractWith) { 
        if (window.innerWidth > 768 || navigator.maxTouchPoints === 0) { ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; const promptY = isInvertedWorld ? p.pos.y + p.height + 15 : p.pos.y - 10; const promptText = language === 'es' ? '[ PULSA F ]' : '[ PRESS F ]'; ctx.fillText(promptText, (p.pos.x + p.width/2) | 0, promptY | 0); ctx.restore(); } else { ctx.save(); ctx.fillStyle = '#fff'; ctx.font = '10px monospace'; ctx.textAlign = 'center'; const promptY = isInvertedWorld ? p.pos.y + p.height + 15 : p.pos.y - 10; const promptText = language === 'es' ? '[ INTERACTUAR ]' : '[ INTERACT ]'; ctx.fillText(promptText, (p.pos.x + p.width/2) | 0, promptY | 0); ctx.restore(); }
    }

    ctx.save(); const yAnchor = isInvertedWorld ? 0 : p.height; ctx.translate(Math.floor(p.pos.x + p.width/2), Math.floor(p.pos.y + yAnchor)); 
    if (isInvertedWorld) { ctx.scale(p.facingRight ? 1 : -1, -1); } else { ctx.scale(p.facingRight ? 1 : -1, 1); }
    if (assetsRef.current.player) { let sheetIndex = 0; if (p.animFrame === 1) sheetIndex = 1; if (p.animFrame === 3) sheetIndex = 2; const frameOffset = sheetIndex * 16; ctx.drawImage(assetsRef.current.player, frameOffset, 0, 16, 20, -8, -18, 16, 20); } ctx.restore();

    particlesRef.current.forEach(pt => { if (pt.x > camera.x && pt.x < camera.x + w) { ctx.fillStyle = pt.color; ctx.globalAlpha = pt.life; ctx.fillRect(pt.x | 0, pt.y | 0, pt.size, pt.size); } }); ctx.globalAlpha = 1.0;

    if (stageRef.current === 'MINE' || stageRef.current === 'OUTSIDE') { const mx = (mouseRef.current.x / PIXEL_SCALE) + camera.x; const my = (mouseRef.current.y / PIXEL_SCALE) + camera.y; const pCenterX = p.pos.x + p.width/2; const pCenterY = p.pos.y + p.height/2; const dist = Math.sqrt(Math.pow(mx - pCenterX, 2) + Math.pow(my - pCenterY, 2)); const reachLvl = statsRef.current.miningReachLevel || 1; 
    const maxReach = 50 * Math.pow(1.10, reachLvl - 1); 
    const inRange = dist < maxReach; const modeColor = mobileActionMode === 'MINE' ? '#0ff' : '#f00'; ctx.strokeStyle = inRange ? modeColor : '#500'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo((mx - 4)|0, my|0); ctx.lineTo((mx + 4)|0, my|0); ctx.moveTo(mx|0, (my - 4)|0); ctx.lineTo(mx|0, (my + 4)|0); ctx.stroke(); if (mobileActionMode === 'MINE') { const radiusLvl = statsRef.current.miningRadiusLevel || 1; 
    let radius = (BLOCK_SIZE * 1.5) * Math.pow(1.10, radiusLvl - 1); 
    if (inRange) { ctx.beginPath(); ctx.arc(mx|0, my|0, radius, 0, Math.PI * 2); ctx.fillStyle = mouseRef.current.isDown || rightJoystickRef.current.active ? 'rgba(255, 100, 0, 0.2)' : 'rgba(0, 255, 255, 0.1)'; ctx.fill(); ctx.stroke(); } else { ctx.beginPath(); ctx.arc(mx|0, my|0, 2, 0, Math.PI * 2); ctx.strokeStyle = '#f00'; ctx.stroke(); } } }

    if (stageRef.current === 'MINE' && fogCanvasRef.current && fogCanvasRef.current.width > 0) { 
        ctx.restore(); 
        const fogCtx = fogCanvasRef.current.getContext('2d');
        if (fogCtx) { 
            const fogW = fogCanvasRef.current.width; const fogH = fogCanvasRef.current.height;
            fogCtx.clearRect(0, 0, fogW, fogH); 
            const ambientOpacity = 0.88 + Math.sin(time / 2000) * 0.04; fogCtx.fillStyle = `rgba(0, 0, 0, ${ambientOpacity})`; fogCtx.fillRect(0, 0, fogW, fogH); 
            const pScreenX = (p.pos.x - (camera.x + shake.x) + p.width/2); const pScreenY = (p.pos.y - (camera.y + shake.y) + p.height/2);
            const scannerLvl = statsRef.current.oreScannerLevel || 1; let baseRadius = 120; if (statsRef.current.unlockedLantern) { baseRadius = 220; }
            const radiusPulse = 1.0 + Math.sin(time / 600) * 0.03; const visionRadius = (baseRadius + ((scannerLvl - 1) * 30)) * radiusPulse; 
            fogCtx.globalCompositeOperation = 'destination-out'; const grad = fogCtx.createRadialGradient(pScreenX, pScreenY, visionRadius * 0.2, pScreenX, pScreenY, visionRadius); grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.4, 'rgba(0,0,0,0.9)'); grad.addColorStop(0.7, 'rgba(0,0,0,0.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); fogCtx.fillStyle = grad; fogCtx.beginPath(); fogCtx.arc(pScreenX, pScreenY, visionRadius, 0, Math.PI * 2); fogCtx.fill(); fogCtx.globalCompositeOperation = 'source-over'; 
            ctx.drawImage(fogCanvasRef.current, 0, 0, screenW, screenH); 
        } 
        ctx.save(); ctx.scale(PIXEL_SCALE, PIXEL_SCALE); ctx.translate(-Math.floor(camera.x + shake.x), -Math.floor(camera.y + shake.y)); 
    }
    
    ctx.font = '10px monospace'; ctx.textAlign = 'center'; floatingTextsRef.current.forEach(ft => { if (ft.x > camera.x && ft.x < camera.x + w) { ctx.fillStyle = ft.color; ctx.globalAlpha = ft.life; ctx.fillStyle = 'black'; ctx.fillText(ft.text, (ft.x + 1)|0, (ft.y + 1)|0); ctx.fillStyle = ft.color; ctx.fillText(ft.text, ft.x|0, ft.y|0); } }); ctx.globalAlpha = 1.0;

    ctx.restore(); ctx.save(); ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
    if (isBase) { ctx.fillStyle = 'rgba(50, 20, 0, 0.1)'; ctx.fillRect(0, 0, w, h); }
    const pScreenX = (p.pos.x - (camera.x + shake.x) + p.width/2); const pScreenY = (p.pos.y - (camera.y + shake.y) + (isInvertedWorld ? 0 : p.height));

    if (assetsRef.current.glow) { ctx.globalCompositeOperation = 'screen'; const glowSize = 300; ctx.drawImage(assetsRef.current.glow, (pScreenX - glowSize/2)|0, (pScreenY - glowSize/2)|0, glowSize, glowSize); if (stageRef.current === 'BASE') { 
        updateVisibleObjects({ x: 0, y: 0, width: w * 2, height: h * 2 });
        const baseItems = visibleObjectsRef.current;
        const term = baseItems.find(o => o.id === 'terminal'); if (term && assetsRef.current.terminalGlow) { const tX = (term.x - (camera.x + shake.x) + term.width/2); const tY = (term.y - (camera.y + shake.y) + term.height/2); ctx.drawImage(assetsRef.current.terminalGlow, (tX - 50)|0, (tY - 50)|0, 100, 100); } 
        const lab = baseItems.find(o => o.id === 'lab_station'); if (lab && assetsRef.current.labGlow && statsRef.current.unlockedLab) { const lX = (lab.x - (camera.x + shake.x) + lab.width/2); const lY = (lab.y - (camera.y + shake.y) + lab.height/2); ctx.drawImage(assetsRef.current.labGlow, (lX - 50)|0, (lY - 50)|0, 100, 100); }
    } if (assetsRef.current.shockwaveGlow) { projectilesRef.current.forEach(proj => { const projX = (proj.x - (camera.x + shake.x)); const projY = (proj.y - (camera.y + shake.y) + proj.height/2); ctx.drawImage(assetsRef.current.shockwaveGlow, (projX - 40)|0, (projY - 40)|0, 80, 80); }); } if (statsRef.current.unlockedRooms.includes('radar') && assetsRef.current.redGlow) { 
        updateVisibleObjects({ x: camera.x, y: camera.y, width: w, height: h });
        const visibleHazards = visibleObjectsRef.current; 
        visibleHazards.forEach(obj => { if (obj.type === 'hazard' || obj.resourceType === 'uranium') { const dx = obj.x - p.pos.x; const dy = obj.y - p.pos.y; if (dx*dx + dy*dy < 40000) { const hX = (obj.x - (camera.x + shake.x) + obj.width/2); const hY = (obj.y - (camera.y + shake.y) + obj.height/2); const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8; const size = 30 * pulse; ctx.drawImage(assetsRef.current.redGlow, (hX - size/2)|0, (hY - size/2)|0, size, size); } } }); } ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore(); 
    
    ctx.save(); if (leftJoystickRef.current.active) { const j = leftJoystickRef.current; ctx.beginPath(); ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 2; ctx.arc(j.originX, j.originY, 40, 0, Math.PI*2); ctx.stroke(); ctx.beginPath(); ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; let dx = j.currentX - j.originX; let dy = j.currentY - j.originY; const dist = Math.sqrt(dx*dx + dy*dy); if (dist > 40) { dx = (dx / dist) * 40; dy = (dy / dist) * 40; } ctx.arc(j.originX + dx, j.originY + dy, 15, 0, Math.PI*2); ctx.fill(); }
    
    const isMobileView = window.innerWidth < 1024 || navigator.maxTouchPoints > 0;
    if (isMobileView) { 
        const rjX = screenW - 100; const rjY = screenH - 100; 
        ctx.beginPath(); ctx.strokeStyle = mobileActionMode === 'MINE' ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 50, 50, 0.1)'; ctx.lineWidth = 2; ctx.arc(rjX, rjY, 60, 0, Math.PI*2); ctx.stroke(); 
        ctx.beginPath(); let knobX = rjX; let knobY = rjY; 
        if (rightJoystickRef.current.active) { const j = rightJoystickRef.current; let dx = j.currentX - j.originX; let dy = j.currentY - j.originY; const dist = Math.sqrt(dx*dx + dy*dy); if (dist > 60) { dx = (dx / dist) * 60; dy = (dy / dist) * 60; } knobX += dx; knobY += dy; ctx.fillStyle = mobileActionMode === 'MINE' ? 'rgba(0, 255, 255, 0.6)' : 'rgba(255, 50, 50, 0.6)'; } else { ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'; } 
        ctx.arc(knobX, knobY, 20, 0, Math.PI*2); ctx.fill(); 
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,10,0.2)'; ctx.fillRect(0,0, screenW, screenH);
    if (gameState === GameState.PAUSED) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, screenW, screenH); }
  };

  const loop = (time: number) => {
    try {
        const deltaTime = time - lastTimeRef.current;
        if (deltaTime >= 16) {
            lastTimeRef.current = time - (deltaTime % 16);
            update();
            if (canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d', { alpha: false });
                if (ctx) draw(ctx, time / 16);
            }
        }
    } catch(e) {
        console.error("Loop error", e);
    }
    requestRef.current = requestAnimationFrame(loop);
  };

  useEffect(() => {
    const resize = () => { 
        if (canvasRef.current) { 
            const w = Math.max(300, window.innerWidth);
            const h = Math.max(300, window.innerHeight);
            canvasRef.current.width = w; 
            canvasRef.current.height = h; 
            mobileCursorRef.current = { x: w / 2, y: h / 2 }; 
            if (fogCanvasRef.current) { 
                fogCanvasRef.current.width = w / 2; 
                fogCanvasRef.current.height = h / 2; 
            } 
        } 
    };
    window.addEventListener('resize', resize); 
    // Force initial resize
    setTimeout(resize, 100);
    
    lastTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(loop);
    return () => { window.removeEventListener('resize', resize); if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, mobileActionMode]);

  return (
    <canvas ref={canvasRef} className="block w-full h-full cursor-none bg-[#050505]" />
  );
};
