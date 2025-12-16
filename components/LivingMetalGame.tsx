
import React, { useEffect, useRef, useState } from 'react';
import { GameState, PlayerStats, Language, LevelObject, Particle, Projectile, Enemy, FloatingText, HotbarSlot } from '../types';
import { PIXEL_SCALE, BLOCK_SIZE, STAGE_CONFIG } from '../game/constants';
import { InputSystem } from '../game/InputSystem';
import { AudioSystem, StageType } from '../game/AudioSystem';
import { 
    generateResourceTextures, generatePlayerSprites, generateSpikyBackground, 
    generateBaseTiles, generateCockroachSprites, generateCrackTextures, 
    generateGlowSprite, generateMetalTexture, generateBaseGrid, generateBuildingAssets, generateMineWallTexture,
    generateMineBackgroundLayers
} from '../game/assets';
import { loadOutsideStage, loadBaseStage } from '../game/levelGen';
import { loadMineStage } from '../game/mineGen';

interface HitMarker {
    x: number;
    y: number;
    life: number;
}

interface LivingMetalGameProps {
    gameState: GameState;
    stats: PlayerStats;
    onUpdateStats: (stats: Partial<PlayerStats>) => void;
    onToggleBase: (isOpen: boolean, type: 'engineering' | 'lab' | 'storage' | 'maintenance') => void;
    interactionTrigger: number;
    cycleTrigger: number;
    onCanInteract: (can: boolean) => void;
    onShowLocationSelect: () => void;
    requestedStage: 'OUTSIDE' | 'MINE' | 'BASE' | null;
    onStageChanged: (stage: 'OUTSIDE' | 'MINE' | 'BASE') => void;
    onTravel: (dest: 'OUTSIDE' | 'MINE' | 'BASE') => void;
    mobileActionMode: 'MINE' | 'ATTACK';
    onGameOver: () => void;
    volumeSettings: { sfx: number; ambience: number };
    language: Language;
    toggleInventory: () => void;
    isLoading: boolean;
    selectedHotbarItem: HotbarSlot | null;
    onUseItem: (itemKey: keyof PlayerStats) => void;
}

export const LivingMetalGame: React.FC<LivingMetalGameProps> = (props) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    
    // Systems
    const inputRef = useRef<InputSystem>(new InputSystem());
    const audioRef = useRef<AudioSystem>(new AudioSystem());
    
    // Refs for props to avoid stale closures in game loop
    const gameStateRef = useRef(props.gameState);
    const isLoadingRef = useRef(props.isLoading);
    const statsRef = useRef(props.stats);
    const mobileModeRef = useRef(props.mobileActionMode);
    const hotbarItemRef = useRef(props.selectedHotbarItem);
    const currentStageRef = useRef<StageType>('BASE');

    // Interaction State Refs
    const interactableTargetsRef = useRef<LevelObject[]>([]);
    const selectedTargetIndexRef = useRef<number>(0);

    // Mining Crosshair State
    const miningTargetRef = useRef<{x: number, y: number} | null>(null);
    const smoothReticleRef = useRef<{x: number, y: number} | null>(null);

    // Hit Markers (Visual Feedback)
    const hitMarkersRef = useRef<HitMarker[]>([]);
    
    // Throttling for error sounds
    const lastErrorSoundTime = useRef<number>(0);
    
    // Teleportation/Spawn Animation Ref
    const spawnTimerRef = useRef<number>(0);
    const hasInitialSpawnedRef = useRef<boolean>(false);

    // Door Animation Ref
    const activeDoorSeqRef = useRef<{ id: string, timer: number, type: 'travel' | 'select' } | null>(null);

    useEffect(() => { gameStateRef.current = props.gameState; }, [props.gameState]);
    useEffect(() => { isLoadingRef.current = props.isLoading; }, [props.isLoading]);
    useEffect(() => { statsRef.current = props.stats; }, [props.stats]);
    useEffect(() => { mobileModeRef.current = props.mobileActionMode; }, [props.mobileActionMode]);
    useEffect(() => { hotbarItemRef.current = props.selectedHotbarItem; }, [props.selectedHotbarItem]);
    
    // Game Entities & State
    const playerRef = useRef({
        x: 0, y: 0, vx: 0, vy: 0, 
        width: 12, height: 20,
        grounded: false,
        facingRight: true,
        animTimer: 0,
        miningTimer: 0,
        buildTimer: 0,
        attackTimer: 0,
        invulnTimer: 0,
        lastConsumableTime: 0,
        isJumping: false 
    });
    
    const cameraRef = useRef({ x: 0, y: 0, shake: 0 }); // Added shake
    const levelObjectsRef = useRef<LevelObject[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const projectilesRef = useRef<Projectile[]>([]);
    const enemiesRef = useRef<Enemy[]>([]);
    const floatingTextsRef = useRef<FloatingText[]>([]);
    
    // Assets Cache
    const assetsRef = useRef<any>({});
    // Pattern Cache to avoid recreating patterns every frame (Performance Fix)
    const patternsRef = useRef<Record<string, CanvasPattern | null>>({});
    
    // Initialize
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Init Assets
        assetsRef.current = {
            resources: generateResourceTextures(),
            playerVariations: generatePlayerSprites(), // Store all variants
            baseTiles: generateBaseTiles(),
            baseBg: generateBaseGrid(),
            buildings: generateBuildingAssets(), 
            cockroach: generateCockroachSprites(),
            cracks: generateCrackTextures(),
            glow: generateGlowSprite(32, 'rgba(255, 200, 100, 0.2)'),
            metal: generateMetalTexture(),
            crimsonWall: generateMineWallTexture(), 
            bg: generateSpikyBackground(1000, 800, '#110505'),
            mineBgLayers: generateMineBackgroundLayers(), // NEW Parallax Layers
            shadowCanvas: document.createElement('canvas') 
        };

        // Init Systems
        inputRef.current.bind(canvas);
        audioRef.current.init();

        // Initial Stage Load
        loadStage('BASE');

        // Game Loop
        const loop = (time: number) => {
            update(time);
            render();
            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            inputRef.current.unbind();
            audioRef.current.close();
        };
    }, []);

    // Audio Volume Sync
    useEffect(() => {
        audioRef.current.updateAmbienceVolume(props.volumeSettings.ambience);
    }, [props.volumeSettings]);

    // Stage Change Handling
    useEffect(() => {
        if (props.requestedStage) {
            loadStage(props.requestedStage);
            props.onStageChanged(props.requestedStage);
        }
    }, [props.requestedStage]);

    // Interaction Trigger Handling (from Mobile/Keyboard F)
    useEffect(() => {
        if (props.interactionTrigger > 0) {
            handleInteraction();
        }
    }, [props.interactionTrigger]);

    // Cycle Trigger Handling
    useEffect(() => {
        if (props.cycleTrigger > 0) {
            const targets = interactableTargetsRef.current;
            if (targets.length > 1) {
                selectedTargetIndexRef.current = (selectedTargetIndexRef.current + 1) % targets.length;
                audioRef.current.playSfx('click', props.volumeSettings.sfx);
            }
        }
    }, [props.cycleTrigger]);

    const loadStage = (stage: StageType) => {
        currentStageRef.current = stage;
        levelObjectsRef.current = [];
        particlesRef.current = [];
        projectilesRef.current = [];
        enemiesRef.current = [];
        floatingTextsRef.current = [];
        interactableTargetsRef.current = [];
        hitMarkersRef.current = [];
        selectedTargetIndexRef.current = 0;
        activeDoorSeqRef.current = null;
        
        // Only trigger spawn animation ONCE per session and ONLY for BASE
        if (stage === 'BASE' && !hasInitialSpawnedRef.current) {
            spawnTimerRef.current = 90; // 1.5 seconds at 60fps
            hasInitialSpawnedRef.current = true;
            // Delay slightly to ensure audio context is ready
            setTimeout(() => {
                 audioRef.current.playSfx('teleport', props.volumeSettings.sfx);
            }, 100);
        } else {
            spawnTimerRef.current = 0;
        }
        
        // Clear Pattern Cache on stage change to ensure context validity if needed
        patternsRef.current = {};

        const w = STAGE_CONFIG[stage].width;
        const h = STAGE_CONFIG[stage].height;

        const addObject = (obj: LevelObject) => levelObjectsRef.current.push(obj);

        if (stage === 'OUTSIDE') {
            loadOutsideStage(w, h, addObject);
            // Player spawns on the floor (bottom) now
            playerRef.current.x = 400; 
            playerRef.current.y = h - 150;
        } else if (stage === 'MINE') {
            loadMineStage(w, h, props.stats, addObject);
            const door = levelObjectsRef.current.find(obj => obj.id === 'mine_door_inside');
            if (door) {
                playerRef.current.x = door.x + door.width + 10;
                playerRef.current.y = door.y + door.height - playerRef.current.height; 
            } else {
                playerRef.current.x = 180; playerRef.current.y = 200; 
            }
        } else {
            loadBaseStage(w, h, props.stats, addObject);
            const spawnPoint = levelObjectsRef.current.find(obj => 
                obj.id.includes('airlock') || obj.type === 'base_entrance'
            );
            if (spawnPoint) {
                playerRef.current.x = spawnPoint.x + (spawnPoint.width / 2) - (playerRef.current.width / 2);
                playerRef.current.y = spawnPoint.y + spawnPoint.height - playerRef.current.height;
            } else {
                playerRef.current.x = w/2; playerRef.current.y = h/2;
            }
        }

        playerRef.current.vx = 0; playerRef.current.vy = 0;
        playerRef.current.isJumping = false;
        audioRef.current.updateAmbience(stage, props.volumeSettings.ambience);

        if (canvasRef.current) {
            const canvasW = canvasRef.current.width / PIXEL_SCALE;
            const canvasH = canvasRef.current.height / PIXEL_SCALE;
            cameraRef.current.x = playerRef.current.x - (canvasW / 2) + (playerRef.current.width / 2);
            cameraRef.current.y = playerRef.current.y - (canvasH / 2) + (playerRef.current.height / 2);
        }
    };

    const updateInteractableList = () => {
        const p = playerRef.current;
        const range = 40;
        const rangeSq = range * range;
        
        // Optimize: Use simple loop instead of filter
        const potentialTargets: LevelObject[] = [];
        const objects = levelObjectsRef.current;
        const len = objects.length;
        
        for (let i = 0; i < len; i++) {
            const obj = objects[i];
            
            // Allow interaction with platforms (furniture) too
            const isInteractableType = obj.type === 'base_entrance' || obj.type === 'solid' || obj.type === 'platform';
            if (!isInteractableType) continue;
            
            // Broad phase distance check (optimization)
            if (Math.abs(obj.x - p.x) > range + 50 || Math.abs(obj.y - p.y) > range + 50) continue;

            const isInteractable = 
                obj.id.startsWith('terminal') || 
                obj.id.startsWith('workbench') || 
                obj.id.startsWith('lab_station') || 
                obj.id.startsWith('storage_crate') || 
                obj.id.startsWith('airlock') || 
                obj.id.startsWith('mine_door') || 
                obj.id === 'base_entrance';
            
            if (!isInteractable) continue;

            const dx = (obj.x + obj.width/2) - (p.x + p.width/2);
            const dy = (obj.y + obj.height/2) - (p.y + p.height/2);
            
            if ((dx*dx + dy*dy) < rangeSq) {
                potentialTargets.push(obj);
            }
        }

        const prevSelected = interactableTargetsRef.current[selectedTargetIndexRef.current];
        interactableTargetsRef.current = potentialTargets;
        
        if (potentialTargets.length === 0) {
            props.onCanInteract(false);
            selectedTargetIndexRef.current = 0;
        } else {
            props.onCanInteract(true);
            if (prevSelected) {
                const newIndex = potentialTargets.findIndex(obj => obj === prevSelected);
                if (newIndex !== -1) {
                    selectedTargetIndexRef.current = newIndex;
                } else {
                    if (selectedTargetIndexRef.current >= potentialTargets.length) {
                        selectedTargetIndexRef.current = 0;
                    }
                }
            } else {
                selectedTargetIndexRef.current = 0;
            }
        }
    };

    const handleInteraction = () => {
        if (activeDoorSeqRef.current) return; // Prevent interaction while door is animating

        const targets = interactableTargetsRef.current;
        if (targets.length === 0) return;
        const target = targets[selectedTargetIndexRef.current];
        if (!target) return;

        if (target.id.startsWith('terminal')) props.onToggleBase(true, 'maintenance');
        else if (target.id.startsWith('workbench')) props.onToggleBase(true, 'engineering');
        else if (target.id.startsWith('lab_station')) props.onToggleBase(true, 'lab');
        else if (target.id.startsWith('storage_crate')) props.onToggleBase(true, 'storage');
        else if (target.id.startsWith('airlock') || target.id === 'base_entrance' || target.id.startsWith('mine_door')) {
            // Door Sequence Trigger
            audioRef.current.playSfx('ui_open', props.volumeSettings.sfx); // Open Sound
            
            // Determine action type
            let actionType: 'select' | 'travel' = 'travel';
            if (currentStageRef.current === 'BASE') {
                actionType = 'select'; // Will open menu
            } else {
                actionType = 'travel'; // Will go to BASE
            }

            activeDoorSeqRef.current = { id: target.id, timer: 60, type: actionType };
        }
    };

    const update = (time: number) => {
        if (gameStateRef.current !== GameState.PLAYING || isLoadingRef.current) return;

        // --- DOOR ANIMATION LOGIC ---
        if (activeDoorSeqRef.current) {
            const seq = activeDoorSeqRef.current;
            seq.timer--;
            
            // Find door object center
            const door = levelObjectsRef.current.find(obj => obj.id === seq.id);
            if (door) {
                const centerX = door.x + door.width / 2;
                const centerY = door.y + door.height / 2;
                
                // Emit Smoke Particles
                if (seq.timer > 10 && seq.timer % 5 === 0) {
                    particlesRef.current.push({
                        id: Date.now() + Math.random(),
                        x: centerX + (Math.random() - 0.5) * 10,
                        y: centerY,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() * -1.5) - 0.5,
                        life: 1.0,
                        color: Math.random() > 0.5 ? '#cccccc' : '#888888',
                        size: Math.random() * 4 + 2
                    });
                }
            }

            // Finish Sequence
            if (seq.timer <= 0) {
                if (seq.type === 'select') {
                    props.onShowLocationSelect();
                } else {
                    props.onTravel('BASE');
                }
                activeDoorSeqRef.current = null;
            }
            // Block normal update while animating door
            return;
        }

        // --- TELEPORT ANIMATION LOGIC (INITIAL SPAWN) ---
        if (spawnTimerRef.current > 0) {
            const p = playerRef.current;
            
            // Generate upward particles during spawn
            if (spawnTimerRef.current % 2 === 0) {
                particlesRef.current.push({
                    id: Date.now() + Math.random(),
                    x: p.x + Math.random() * p.width,
                    y: p.y + p.height,
                    vx: (Math.random() - 0.5) * 1,
                    vy: -(Math.random() * 2 + 1), // Rise up
                    life: 0.8,
                    color: Math.random() > 0.5 ? '#00ffff' : '#ffffff', // Cyan & White
                    size: Math.random() * 2 + 1
                });
            }

            spawnTimerRef.current--;
            
            // Spawn impact on last frame
            if (spawnTimerRef.current === 1) {
                cameraRef.current.shake = 10; // Moderate impact shake
                audioRef.current.playSfx('break_stone', props.volumeSettings.sfx); // Heavy landing sound
                
                // Explosion particles on finish (radial burst)
                for(let i=0; i<15; i++) {
                    particlesRef.current.push({
                        id: Date.now() + Math.random(),
                        x: p.x + p.width/2,
                        y: p.y + p.height - 5,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() * -3) - 1,
                        life: 1.2,
                        color: '#00ffff',
                        size: Math.random() * 3 + 1
                    });
                }
            }
            
            // While spawning, keep player grounded/still
            p.vx = 0; 
            const gravity = 0.25; 
            p.vy += gravity;
            p.y += p.vy;
            handleCollisions(p, false, false);
            
            // Smooth Camera follow during spawn
            cameraRef.current.x += (p.x - canvasRef.current!.width / (2 * PIXEL_SCALE) - cameraRef.current.x) * 0.1;
            cameraRef.current.y += (p.y - canvasRef.current!.height / (2 * PIXEL_SCALE) - cameraRef.current.y) * 0.1;
            
            // Skip player inputs during spawn
            return; 
        }

        const p = playerRef.current;
        const input = inputRef.current;
        const stage = currentStageRef.current;
        const stats = statsRef.current;

        const moveSpeed = 3; 
        const jumpForce = stats.highJumpBoots ? 7 : 5;
        const gravity = 0.25; // Normal gravity for all stages now

        let dx = 0;
        let jumpHeld = false;
        let downHeld = false;

        if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) dx = -1;
        if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) dx = 1;
        if (input.keys.has('Space') || input.keys.has('ArrowUp') || input.keys.has('KeyW')) jumpHeld = true;
        if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) downHeld = true;

        if (input.leftJoystick.active) {
            const j = input.leftJoystick;
            const diffX = j.currentX - j.originX;
            const diffY = j.currentY - j.originY;
            if (Math.abs(diffX) > 10) dx = diffX > 0 ? 1 : -1;
            if (diffY < -30) jumpHeld = true;
            if (diffY > 30) downHeld = true;
        }

        p.vx = dx * moveSpeed;
        if (dx !== 0) p.facingRight = dx > 0;

        p.vy += gravity;

        if (downHeld && !p.grounded) {
            p.vy += 0.5;
        }

        if (!jumpHeld && p.isJumping) {
            if (p.vy < 0) p.vy *= 0.5; 
        }

        if (jumpHeld) {
            if (p.grounded) {
                p.vy = -jumpForce;
                p.grounded = false;
                p.isJumping = true;
                audioRef.current.playSfx('jump', props.volumeSettings.sfx);
            }
        }

        p.x += p.vx;
        handleCollisions(p, true, downHeld); 
        p.y += p.vy;
        handleCollisions(p, false, downHeld); 

        if (p.grounded) {
            p.isJumping = false;
        }

        const w = STAGE_CONFIG[stage].width;
        const h = STAGE_CONFIG[stage].height;
        if (p.y > h + 100 || p.y < -200) {
            props.onUpdateStats({ health: 0 });
            props.onGameOver();
        }

        // Camera Logic with Clamping
        const canvas = canvasRef.current;
        if (canvas) {
            const canvasW = canvas.width / PIXEL_SCALE;
            const canvasH = canvas.height / PIXEL_SCALE;
            
            let targetCamX = p.x - canvasW / 2 + p.width / 2;
            let targetCamY = p.y - canvasH / 2 + p.height / 2;

            // Clamp Camera Logic
            const minX = 0;
            const maxX = w - canvasW;
            targetCamX = Math.max(minX, Math.min(targetCamX, maxX));

            let minY = 0;
            let maxY = h - canvasH;
            
            targetCamY = Math.max(minY, Math.min(targetCamY, maxY));

            cameraRef.current.x += (targetCamX - cameraRef.current.x) * 0.1;
            cameraRef.current.y += (targetCamY - cameraRef.current.y) * 0.1;
        }

        updateInteractableList();

        miningTargetRef.current = null;
        if (input.rightJoystick.active && !hotbarItemRef.current?.itemKey) {
            const j = input.rightJoystick;
            const diffX = j.currentX - j.originX;
            const diffY = j.currentY - j.originY;
            const mag = Math.sqrt(diffX*diffX + diffY*diffY);
            if (mag > 10) { 
                const angle = Math.atan2(diffY, diffX);
                const baseReach = 40;
                const reach = baseReach * (1 + ((stats.miningReachLevel - 1) * 0.15));
                
                const pCx = p.x + p.width/2;
                const pCy = p.y + p.height/2;
                const throwRatio = Math.min(mag / 50, 1.0);
                const currentReach = reach * throwRatio;
                
                const targetX = pCx + Math.cos(angle) * currentReach;
                const targetY = pCy + Math.sin(angle) * currentReach;
                
                if (!smoothReticleRef.current) {
                    smoothReticleRef.current = { x: targetX, y: targetY };
                } else {
                    const lerp = 0.3;
                    smoothReticleRef.current.x += (targetX - smoothReticleRef.current.x) * lerp;
                    smoothReticleRef.current.y += (targetY - smoothReticleRef.current.y) * lerp;
                }
                miningTargetRef.current = { 
                    x: smoothReticleRef.current.x, 
                    y: smoothReticleRef.current.y 
                };
            } else {
                smoothReticleRef.current = null;
            }
        } else {
            smoothReticleRef.current = null;
        }

        if (input.mouse.isDown) {
            if (hotbarItemRef.current?.itemKey && hotbarItemRef.current.type === 'building') {
                handleBuilding();
            } else {
                handleAction();
            }
        } else if (mobileModeRef.current === 'MINE' && input.rightJoystick.active && !hotbarItemRef.current?.itemKey) {
             handleAction();
        }
        
        // Optimize floating text update
        if (floatingTextsRef.current.length > 0) {
            const activeTexts = [];
            for (const ft of floatingTextsRef.current) {
                ft.y -= ft.velocity;
                ft.life -= 0.02;
                if (ft.life > 0) activeTexts.push(ft);
            }
            floatingTextsRef.current = activeTexts;
        }

        // Optimize markers update
        if (hitMarkersRef.current.length > 0) {
            const activeMarkers = [];
            for (const m of hitMarkersRef.current) {
                m.life -= 0.05;
                if (m.life > 0) activeMarkers.push(m);
            }
            hitMarkersRef.current = activeMarkers;
        }

        // Optimize particles update
        if (particlesRef.current.length > 0) {
            const activeParticles = [];
            for(const part of particlesRef.current) {
                part.x += part.vx;
                part.y += part.vy;
                part.life -= 0.05;
                if(part.life > 0) activeParticles.push(part);
            }
            particlesRef.current = activeParticles;
        }
    };

    const handleCollisions = (entity: any, isX: boolean, dropRequested: boolean) => {
        entity.grounded = false;
        const objects = levelObjectsRef.current;
        const len = objects.length;
        
        const CHECK_MARGIN = 60;

        for (let i = 0; i < len; i++) {
            const obj = objects[i];
            
            // Broad phase AABB Check
            const pLeft = entity.x - CHECK_MARGIN;
            const pRight = entity.x + entity.width + CHECK_MARGIN;
            const pTop = entity.y - CHECK_MARGIN;
            const pBottom = entity.y + entity.height + CHECK_MARGIN;

            // Object Bounds
            const objRight = obj.x + obj.width;
            const objBottom = obj.y + obj.height;

            // Check if object is COMPLETELY outside the search area
            if (obj.x > pRight || objRight < pLeft || 
                obj.y > pBottom || objBottom < pTop) {
                continue;
            }

            if (obj.type !== 'solid' && obj.type !== 'destructible' && obj.type !== 'platform' && obj.type !== 'base_entrance') continue;

            if (entity.x < obj.x + obj.width &&
                entity.x + entity.width > obj.x &&
                entity.y < obj.y + obj.height &&
                entity.y + entity.height > obj.y) {
                
                // Identify Platforms and Furniture (which act as platforms)
                const isFurniture = obj.id.startsWith('terminal') || 
                                    obj.id.startsWith('workbench') || 
                                    obj.id.startsWith('lab_station') || 
                                    obj.id.startsWith('storage_crate');

                const isPlatform = obj.type === 'platform' || isFurniture;

                if (isPlatform) {
                    const isMovingUp = entity.vy < 0;
                    if (dropRequested) continue;
                    if (isMovingUp) continue;

                    const prevFeet = (entity.y - entity.vy) + entity.height;
                    const platformTop = obj.y;
                    if (prevFeet <= platformTop + 10) {
                        if (!isX) {
                            entity.y = obj.y - entity.height;
                            entity.grounded = true;
                            entity.vy = 0;
                        }
                    }
                } else if (obj.type !== 'base_entrance') { // Treat others as solid walls (excluding open airlocks)
                    if (isX) {
                        if (entity.vx > 0) entity.x = obj.x - entity.width;
                        else if (entity.vx < 0) entity.x = obj.x + obj.width;
                        entity.vx = 0;
                    } else {
                        if (entity.vy > 0) { 
                            entity.y = obj.y - entity.height;
                            entity.grounded = true;
                        } else if (entity.vy < 0) { 
                            entity.y = obj.y + obj.height;
                        }
                        entity.vy = 0;
                    }
                }
            }
        }
    };

    // Shared logic for building validity to be used in HandleBuilding and Render
    const checkPlacementValidity = (snapX: number, targetY: number, width: number, height: number, itemKey: string) => {
        const p = playerRef.current;
        
        // 1. Player Overlap
        if (snapX < p.x + p.width && snapX + width > p.x && targetY < p.y + p.height && targetY + height > p.y) {
            return false;
        }

        // 2. Object Overlap
        for (const obj of levelObjectsRef.current) {
            if (snapX < obj.x + obj.width && snapX + width > obj.x &&
                targetY < obj.y + obj.height && targetY + height > obj.y) {
                return false;
            }
        }

        // 3. Ground Support Check (Only for Furniture/Heavy items)
        const needsSupport = ['terminal', 'lab_station', 'workbench', 'storage_crate', 'airlock'].includes(itemKey);
        
        if (needsSupport) {
            const checkY = targetY + height;
            let leftSupported = false;
            let rightSupported = false;
            for (const obj of levelObjectsRef.current) {
                // Support can come from solids, platforms, entrances, or other furniture (which are platforms now)
                const isSupportive = obj.type === 'solid' || obj.type === 'platform' || obj.type === 'base_entrance' ||
                                     obj.id.startsWith('terminal') || obj.id.startsWith('workbench') || obj.id.startsWith('block');

                if (isSupportive) {
                    if (Math.abs(obj.y - checkY) < 1) {
                        if (obj.x <= snapX && obj.x + obj.width >= snapX + 1) leftSupported = true;
                        if (obj.x <= snapX + width - 1 && obj.x + obj.width >= snapX + width) rightSupported = true;
                    }
                }
            }
            if (!leftSupported || !rightSupported) return false;
        }

        return true;
    };

    const handleBuilding = () => {
        const slot = hotbarItemRef.current;
        const stats = statsRef.current;
        const p = playerRef.current;
        const input = inputRef.current;
        const now = Date.now();

        if (!slot || !slot.itemKey || slot.type !== 'building' || now - p.buildTimer < 200) return; 
        
        const count = stats.baseItems[slot.itemKey as keyof PlayerStats['baseItems']];
        if (count <= 0) return;

        const worldX = (input.mouse.x / PIXEL_SCALE) + cameraRef.current.x;
        const worldY = (input.mouse.y / PIXEL_SCALE) + cameraRef.current.y;

        const gridSize = 20;
        const snapX = Math.round(worldX / gridSize) * gridSize;
        const snapY = Math.round(worldY / gridSize) * gridSize;

        let width = 40;
        let height = 40;
        let objType: 'solid' | 'base_entrance' | 'platform' = 'solid';
        
        if (slot.itemKey === 'terminal' || slot.itemKey === 'lab_station' || slot.itemKey === 'storage_crate') {
            width = 40; height = 40;
            objType = 'platform'; // Treat furniture as platform
        } else if (slot.itemKey === 'workbench') {
            width = 40; height = 20; 
            objType = 'platform'; // Treat furniture as platform
        } else if (slot.itemKey === 'airlock') {
            width = 40; height = 60;
            objType = 'base_entrance'; 
        } else if (slot.itemKey === 'metal_block') {
            width = 20; height = 20;
        } else if (slot.itemKey === 'platform') {
            width = 20; height = 20; 
            objType = 'platform';
        }

        // Bottom-up placement targetY
        const targetY = snapY - height;

        const valid = checkPlacementValidity(snapX, targetY, width, height, slot.itemKey);

        if (valid) {
            const newObj: LevelObject = {
                x: snapX,
                y: targetY,
                width,
                height,
                type: objType,
                id: slot.itemKey === 'metal_block' ? `block_${Date.now()}` : slot.itemKey === 'platform' ? `platform_${Date.now()}` : `${slot.itemKey}_${Date.now()}`,
                health: 100, 
                maxHealth: 100
            };

            levelObjectsRef.current.push(newObj);
            
            const newLayout = [...(stats.baseLayout || []), newObj];
            const newCount = count - 1;
            
            props.onUpdateStats({
                baseItems: { ...stats.baseItems, [slot.itemKey]: newCount },
                baseLayout: newLayout
            });

            audioRef.current.playSfx('clank', props.volumeSettings.sfx);
            p.buildTimer = now;
        } else {
             // Throttled Error Sound
             if (now - lastErrorSoundTime.current > 500) {
                 audioRef.current.playSfx('error', props.volumeSettings.sfx);
                 lastErrorSoundTime.current = now;
             }
        }
    };

    const handleAction = () => {
        const input = inputRef.current;
        const p = playerRef.current;
        const now = Date.now();
        const stats = statsRef.current;
        const isBase = currentStageRef.current === 'BASE';
        
        if (hotbarItemRef.current && hotbarItemRef.current.type === 'consumable') {
            if (now - p.lastConsumableTime > 500) { 
                props.onUseItem(hotbarItemRef.current.itemKey as keyof PlayerStats);
                p.lastConsumableTime = now;
            }
            return;
        }

        if (now - p.miningTimer > 200) { 
            let tx = 0, ty = 0;
            let active = false;

            if (input.mouse.isDown) {
                 tx = (input.mouse.x / PIXEL_SCALE) + cameraRef.current.x;
                 ty = (input.mouse.y / PIXEL_SCALE) + cameraRef.current.y;
                 active = true;
            } else if (miningTargetRef.current) {
                tx = miningTargetRef.current.x;
                ty = miningTargetRef.current.y;
                active = true;
            }

            if (!active) return;

            const isMine = currentStageRef.current === 'MINE';
            const baseRadius = 8;
            // INCREASED MULTIPLIER: 15% -> 25% per level
            const miningRadius = isMine ? baseRadius * (1 + ((stats.miningRadiusLevel - 1) * 0.25)) : 0;

            const baseReach = 40;
            const reach = baseReach * (1 + ((stats.miningReachLevel - 1) * 0.15));
            const reachSq = reach * reach * 1.5; 

            const pCx = p.x + p.width/2;
            const pCy = p.y + p.height/2;

            const distToCursorSq = (tx - pCx)**2 + (ty - pCy)**2;
            if (distToCursorSq > reachSq) return;

            let hitSomething = false;

            const isBaseStructure = (obj: LevelObject) => {
                // Now allows deconstruction outside the base
                return obj.id.startsWith('terminal') || 
                       obj.id.startsWith('workbench') || 
                       obj.id.startsWith('lab_station') || 
                       obj.id.startsWith('storage_crate') || 
                       obj.id.startsWith('airlock') || 
                       obj.id.startsWith('platform') ||
                       obj.id.startsWith('block'); 
            };

            for (let i = levelObjectsRef.current.length - 1; i >= 0; i--) {
                const obj = levelObjectsRef.current[i];
                if (obj.type !== 'destructible' && !isBaseStructure(obj)) continue;

                // Simple AABB check first
                if (tx < obj.x || tx > obj.x + obj.width || ty < obj.y || ty > obj.y + obj.height) {
                    if (miningRadius === 0) continue; // If point mining, strict bounds
                }

                const closestX = Math.max(obj.x, Math.min(tx, obj.x + obj.width));
                const closestY = Math.max(obj.y, Math.min(ty, obj.y + obj.height));

                const distX = tx - closestX;
                const distY = ty - closestY;
                const distanceSq = (distX * distX) + (distY * distY);

                let inRange = false;
                if (miningRadius === 0) {
                    inRange = (tx >= obj.x && tx <= obj.x + obj.width && ty >= obj.y && ty <= obj.y + obj.height);
                } else {
                    inRange = distanceSq < (miningRadius * miningRadius);
                }

                if (inRange) {
                    hitSomething = true;
                    const hitX = miningRadius === 0 ? tx : Math.min(Math.max(tx, obj.x), obj.x + obj.width);
                    const hitY = miningRadius === 0 ? ty : Math.min(Math.max(ty, obj.y), obj.y + obj.height);
                    
                    hitMarkersRef.current.push({ x: hitX, y: hitY, life: 1.0 });

                    const baseDmg = 20;
                    const dmg = baseDmg * (1 + ((stats.miningSpeedLevel - 1) * 0.15));
                    
                    obj.health = (obj.health || 100) - dmg;
                    
                    if (obj.health <= 0) {
                        levelObjectsRef.current.splice(i, 1);
                        
                        // Break Sound Logic
                        let breakSound = 'break_stone';
                        if (obj.type === 'destructible' && obj.resourceType) {
                            if (obj.resourceType === 'wood') breakSound = 'break_wood';
                            else if (obj.resourceType === 'ice') breakSound = 'break_glass';
                            else if (obj.resourceType === 'infected_living_metal' || obj.resourceType === 'rareSlime') breakSound = 'break_organic';
                            else if (obj.resourceType === 'scrap' || obj.resourceType === 'iron' || obj.resourceType === 'titanium') breakSound = 'break_metal';
                        } else if (isBaseStructure(obj)) {
                            breakSound = 'break_metal';
                        }
                        audioRef.current.playSfx(breakSound, props.volumeSettings.sfx);

                        // Screen Shake on Break
                        cameraRef.current.shake = 5;

                        if (obj.resourceType) {
                            if (obj.resourceType === 'infected_living_metal') {
                                const infectAmount = 2.5;
                                const currentInf = stats.infection;
                                const resistBase = 1;
                                const resistFactor = 1 + ((stats.infectionResistanceLevel - 1) * 0.15);
                                const actualInfect = infectAmount / (resistBase * resistFactor);
                                
                                props.onUpdateStats({ infection: Math.min(100, currentInf + actualInfect) });
                                floatingTextsRef.current.push({
                                    id: Date.now() + i + 100,
                                    x: p.x, y: p.y - 10,
                                    text: `+${actualInfect.toFixed(1)} INF`,
                                    life: 1.0, color: '#00ff00', velocity: 0.3
                                });
                            }

                            if (obj.resourceType === 'living_metal' && Math.random() > 0.3) {
                            } else {
                                const resKey = obj.resourceType === 'living_metal' || obj.resourceType === 'infected_living_metal' ? 'scraps' : obj.resourceType;
                                const amount = (Math.floor(Math.random() * 3) + 1) * 2;
                                props.onUpdateStats({ [resKey]: (stats[resKey as keyof PlayerStats] as number) + amount });
                                const RESOURCE_COLORS: Record<string, string> = {
                                    scraps: '#a3a3a3', wood: '#d97706', iron: '#94a3b8', ice: '#22d3ee', coal: '#9ca3af', titanium: '#ffffff', uranium: '#22c55e', rareSlime: '#a3e635'
                                };
                                const textColor = RESOURCE_COLORS[resKey] || '#ffffff';
                                floatingTextsRef.current.push({
                                    id: Date.now() + i, x: obj.x, y: obj.y, text: `+${amount} ${resKey.toUpperCase()}`, life: 1.0, color: textColor, velocity: 0.5
                                });
                            }
                        } else if (isBaseStructure(obj)) {
                            let key = '';
                            if (obj.id.startsWith('block')) key = 'metal_block';
                            else if (obj.id.startsWith('terminal')) key = 'terminal';
                            else if (obj.id.startsWith('workbench')) key = 'workbench';
                            else if (obj.id.startsWith('lab_station')) key = 'lab_station';
                            else if (obj.id.startsWith('storage_crate')) key = 'storage_crate';
                            else if (obj.id.startsWith('airlock')) key = 'airlock';
                            else if (obj.id.startsWith('platform')) key = 'platform';

                            if (key && stats.baseItems[key as keyof typeof stats.baseItems] !== undefined) {
                                const newCount = stats.baseItems[key as keyof typeof stats.baseItems] + 1;
                                const newLayout = (stats.baseLayout || []).filter(o => o.id !== obj.id);
                                props.onUpdateStats({
                                    baseItems: { ...stats.baseItems, [key]: newCount },
                                    baseLayout: newLayout
                                });
                                floatingTextsRef.current.push({
                                    id: Date.now() + i, x: obj.x, y: obj.y, text: `RECOVERED`, life: 1.0, color: '#ffff00', velocity: 0.5
                                });
                            }
                        }
                    }
                }
            }

            if (hitSomething) {
                audioRef.current.playSfx('mine', props.volumeSettings.sfx);
                // Reduced frequency of 'clank' sound while mining
                if (Math.random() > 0.85) audioRef.current.playSfx('clank', props.volumeSettings.sfx * 0.5);
            }
            
            p.miningTimer = now;
        }
    };

    const getPattern = (ctx: CanvasRenderingContext2D, image: HTMLCanvasElement | undefined, key: string) => {
        if (!image) return null;
        if (!patternsRef.current[key]) {
            patternsRef.current[key] = ctx.createPattern(image, 'repeat');
        }
        return patternsRef.current[key];
    };

    const render = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width || canvas.height !== rect.height) {
            canvas.width = rect.width;
            canvas.height = rect.height;
            // Invalidate patterns if canvas context might change (though rarely happens just by resize)
            // But good to keep in mind. For now we trust the ref.
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.imageSmoothingEnabled = false;

        const w = canvas.width / PIXEL_SCALE;
        const h = canvas.height / PIXEL_SCALE;
        const camera = cameraRef.current;
        const input = inputRef.current;
        const isBase = currentStageRef.current === 'BASE';
        const p = playerRef.current; 
        const stats = statsRef.current;

        // Apply Screen Shake Decay
        if (camera.shake > 0) {
            camera.shake *= 0.9;
            if (camera.shake < 0.5) camera.shake = 0;
        }

        // --- Render Background (With Parallax if Mine) ---
        if (isBase && assetsRef.current.baseBg) {
            const bgPattern = getPattern(ctx, assetsRef.current.baseBg, 'baseBg');
            ctx.fillStyle = bgPattern || '#101015';
            ctx.save();
            ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
            // Apply shake to camera translation
            const shakeX = (Math.random() - 0.5) * camera.shake;
            const shakeY = (Math.random() - 0.5) * camera.shake;
            ctx.translate(-camera.x + shakeX, -camera.y + shakeY);
            // Draw slightly larger to cover shake
            ctx.fillRect(camera.x - 20, camera.y - 20, w + 40, h + 40);
            ctx.restore();
        } else if (currentStageRef.current === 'MINE' && assetsRef.current.mineBgLayers) {
            // NEW 2.5D Mine Background
            const { far, mid } = assetsRef.current.mineBgLayers;
            const farPattern = getPattern(ctx, far, 'mineBgFar');
            const midPattern = getPattern(ctx, mid, 'mineBgMid');
            
            // Apply Shake to Camera
            const shakeX = (Math.random() - 0.5) * camera.shake;
            const shakeY = (Math.random() - 0.5) * camera.shake;

            ctx.save();
            ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
            
            // Layer 1: Far (Slowest - Depth)
            if (farPattern) {
                ctx.fillStyle = farPattern;
                ctx.save();
                // Parallax 0.2
                ctx.translate(-camera.x * 0.2 + shakeX * 0.1, -camera.y * 0.2 + shakeY * 0.1);
                ctx.fillRect(camera.x * 0.2 - 20, camera.y * 0.2 - 20, w + 40, h + 40);
                ctx.restore();
            } else {
                ctx.fillStyle = '#0a0000';
                ctx.fillRect(0, 0, w, h);
            }

            // Layer 2: Mid (Medium - Midground)
            if (midPattern) {
                ctx.fillStyle = midPattern;
                ctx.save();
                // Parallax 0.5
                ctx.translate(-camera.x * 0.5 + shakeX * 0.5, -camera.y * 0.5 + shakeY * 0.5);
                ctx.fillRect(camera.x * 0.5 - 20, camera.y * 0.5 - 20, w + 40, h + 40);
                ctx.restore();
            }

            // Gradient Overlay for "Atmosphere"
            const grad = ctx.createLinearGradient(0, 0, 0, h);
            grad.addColorStop(0, 'rgba(0,0,0,0.5)');
            grad.addColorStop(1, 'rgba(20,5,5,0.2)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            ctx.restore();

        } else {
            ctx.fillStyle = '#110505';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        ctx.save();
        ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
        // Apply Shake here as well for world objects
        const shakeX = (Math.random() - 0.5) * camera.shake;
        const shakeY = (Math.random() - 0.5) * camera.shake;
        ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

        const activeTarget = interactableTargetsRef.current[selectedTargetIndexRef.current];

        // --- Render Objects (Optimized Loop) ---
        const objects = levelObjectsRef.current;
        const len = objects.length;
        
        const techWallPattern = isBase ? getPattern(ctx, assetsRef.current.baseTiles?.tech_wall, 'tech_wall') : null;
        const techFloorPattern = isBase ? getPattern(ctx, assetsRef.current.baseTiles?.tech_floor, 'tech_floor') : null;
        const foundationPattern = isBase ? getPattern(ctx, assetsRef.current.baseTiles?.foundation, 'foundation') : null;
        const crimsonPattern = !isBase ? getPattern(ctx, assetsRef.current.crimsonWall, 'crimson') : null;

        for (let i = 0; i < len; i++) {
            const obj = objects[i];
            
            // Viewport Culling - Critical for Performance
            if (obj.x + obj.width < camera.x || obj.x > camera.x + w || obj.y + obj.height < camera.y || obj.y > camera.y + h) continue;

            if (obj.type === 'destructible' && assetsRef.current.resources) {
                const tex = assetsRef.current.resources[obj.resourceType || 'living_metal'];
                if (tex) {
                    ctx.drawImage(tex, obj.x, obj.y, obj.width, obj.height);
                    if (obj.health && obj.maxHealth && obj.health < obj.maxHealth) {
                        const crackStage = Math.floor((1 - (obj.health / obj.maxHealth)) * 3); 
                        if (crackStage > 0 && assetsRef.current.cracks && assetsRef.current.cracks[crackStage-1]) {
                             ctx.drawImage(assetsRef.current.cracks[crackStage-1], obj.x, obj.y, obj.width, obj.height);
                        }
                    }
                } else {
                    ctx.fillStyle = '#552222';
                    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                }
            } else if (obj.type === 'solid' || obj.type === 'base_entrance' || obj.type === 'platform') {
                let drawn = false;
                let buildingImg = null;
                const b = assetsRef.current.buildings;

                if (b) {
                    if (obj.id.includes('terminal')) buildingImg = b['terminal'];
                    else if (obj.id.includes('workbench')) buildingImg = b['workbench'];
                    else if (obj.id.includes('airlock')) buildingImg = b['airlock'];
                    else if (obj.id.includes('lab_station')) buildingImg = b['lab_station'];
                    else if (obj.id.includes('storage_crate')) buildingImg = b['storage_crate'];
                    else if (obj.id.includes('block')) buildingImg = b['metal_block'];
                    else if (obj.id.includes('platform')) buildingImg = b['platform'];
                }

                if (buildingImg) {
                    ctx.drawImage(buildingImg, obj.x, obj.y, obj.width, obj.height);
                    
                    if (activeDoorSeqRef.current && activeDoorSeqRef.current.id === obj.id && obj.id.includes('airlock')) {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(obj.x + 10, obj.y + 10, obj.width - 20, obj.height - 10);
                    }

                    if (obj.health && obj.maxHealth && obj.health < obj.maxHealth) {
                        const crackStage = Math.floor((1 - (obj.health / obj.maxHealth)) * 3);
                        if (crackStage > 0 && assetsRef.current.cracks && assetsRef.current.cracks[crackStage-1]) {
                             ctx.drawImage(assetsRef.current.cracks[crackStage-1], obj.x, obj.y, obj.width, obj.height);
                        }
                    }
                    drawn = true;
                }
                
                if (!drawn) {
                    if (isBase) {
                        let pattern = techWallPattern;
                        if (obj.id.includes('floor') || obj.id.includes('ceil')) pattern = techFloorPattern;
                        if (obj.id === 'floor_foundation') pattern = foundationPattern;
                        
                        if (obj.id.startsWith('wall_') || obj.id.includes('floor') || obj.id.includes('ceil')) {
                            if (pattern) {
                                ctx.fillStyle = pattern;
                                ctx.save();
                                ctx.translate(obj.x, obj.y);
                                ctx.fillRect(0, 0, obj.width, obj.height);
                                ctx.restore();
                                drawn = true;
                            }
                        }
                    } else {
                        if (obj.id.startsWith('mine_wall') || obj.id === 'mine_floor' || obj.id === 'mine_ceil' || obj.id.startsWith('wall_') || obj.id === 'floor_main') {
                             if (crimsonPattern) {
                                ctx.fillStyle = crimsonPattern;
                                ctx.save();
                                ctx.translate(obj.x, obj.y);
                                ctx.fillRect(0, 0, obj.width, obj.height);
                                ctx.restore();
                                drawn = true;
                             }
                        }
                    }
                }

                if (!drawn) {
                    ctx.fillStyle = '#1a1a1a';
                    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
                    ctx.strokeStyle = '#333';
                    ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
                }
            }
        }

        if (activeTarget && !activeDoorSeqRef.current) {
            if (activeTarget.x + activeTarget.width >= camera.x && activeTarget.x <= camera.x + w && 
                activeTarget.y + activeTarget.height >= camera.y && activeTarget.y <= camera.y + h) {
                
                const alpha = 0.6 + 0.4 * Math.sin(Date.now() / 150);
                ctx.strokeStyle = `rgba(0, 255, 0, ${alpha})`;
                ctx.lineWidth = 2;
                ctx.strokeRect(activeTarget.x - 2, activeTarget.y - 2, activeTarget.width + 4, activeTarget.height + 4);
                
                ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(activeTarget.x + activeTarget.width/2, activeTarget.y - 10);
                ctx.lineTo(activeTarget.x + activeTarget.width/2 - 5, activeTarget.y - 16);
                ctx.lineTo(activeTarget.x + activeTarget.width/2 + 5, activeTarget.y - 16);
                ctx.fill();
            }
        }
        
        if (hotbarItemRef.current && hotbarItemRef.current.type === 'building' && hotbarItemRef.current.itemKey) {
            const gridSize = 20;
            const worldX = (input.mouse.x / PIXEL_SCALE) + camera.x;
            const worldY = (input.mouse.y / PIXEL_SCALE) + camera.y;
            const snapX = Math.round(worldX / gridSize) * gridSize;
            const snapY = Math.round(worldY / gridSize) * gridSize;
            
            let w = 40; let h = 40;
            if (hotbarItemRef.current.itemKey === 'airlock') h = 60;
            if (hotbarItemRef.current.itemKey === 'workbench') { w = 40; h = 20; }
            if (hotbarItemRef.current.itemKey === 'metal_block') { w = 20; h = 20; }
            if (hotbarItemRef.current.itemKey === 'platform') { w = 20; h = 20; }

            // Bottom-up placement targetY
            const targetY = snapY - h;

            // Re-use logic for consistent Ghost Color
            const valid = checkPlacementValidity(snapX, targetY, w, h, hotbarItemRef.current.itemKey);
            
            if (valid) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
                ctx.strokeStyle = '#00ff00';
            } else {
                ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                ctx.strokeStyle = '#ff0000';
            }
            
            ctx.lineWidth = 1;
            ctx.fillRect(snapX, targetY, w, h);
            ctx.strokeRect(snapX, targetY, w, h);
        }

        // Draw Particles (Smoke, etc)
        particlesRef.current.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1.0;

        // Draw Player (Selected Character)
        if (spawnTimerRef.current <= 0 || spawnTimerRef.current % 4 < 2) { // Flicker effect during spawn if desired, or just always draw
            if (assetsRef.current.playerVariations) {
                const frame = Math.abs(p.vx) > 0.1 ? Math.floor(Date.now() / 100) % 3 : 0;
                const spriteX = frame * 16;
                
                // Get selected character sprite or default to crimson
                const charId = stats.characterId || 'crimson';
                const spriteSheet = assetsRef.current.playerVariations[charId] || assetsRef.current.playerVariations['crimson'];

                if (spriteSheet) {
                    ctx.save();
                    ctx.translate(Math.floor(p.x + p.width/2), Math.floor(p.y + p.height/2));
                    
                    // SPAWN EFFECT: If spawning, add some vertical scaling/distortion
                    if (spawnTimerRef.current > 0) {
                        ctx.scale(0.8 + Math.random() * 0.4, 1.2 + Math.random() * 0.4);
                        ctx.globalAlpha = 0.8;
                    }

                    if (!p.facingRight) ctx.scale(-1, 1);
                    // Lowered Y offset from -10 to -9 to fix floating issue
                    ctx.drawImage(spriteSheet, spriteX, 0, 16, 20, -8, -9, 16, 20);
                    ctx.restore();
                } else {
                    ctx.fillStyle = '#ff0000';
                    ctx.fillRect(p.x, p.y, p.width, p.height);
                }
            } else {
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(p.x, p.y, p.width, p.height);
            }
        }
        
        // --- TELEPORT BEAM VISUALS ---
        if (spawnTimerRef.current > 0) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter'; // Additive blending
            const beamWidth = 20;
            const centerX = p.x + p.width / 2;
            const groundY = p.y + p.height; // Exact foot level
            
            // Core Beam with Fade
            const grad = ctx.createLinearGradient(centerX - beamWidth, 0, centerX + beamWidth, 0);
            grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
            grad.addColorStop(0.2, 'rgba(0, 255, 255, 0.1)');
            grad.addColorStop(0.5, 'rgba(200, 255, 255, 0.6)');
            grad.addColorStop(0.8, 'rgba(0, 255, 255, 0.1)');
            grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = grad;
            // Draw from way up high to exactly the feet
            ctx.fillRect(centerX - beamWidth, -500, beamWidth * 2, groundY + 500); 

            // Ground Splash / Impact Ring
            const ringGrad = ctx.createRadialGradient(centerX, groundY, 1, centerX, groundY, 25);
            ringGrad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
            ringGrad.addColorStop(0.5, 'rgba(0, 255, 255, 0.3)');
            ringGrad.addColorStop(1, 'rgba(0, 255, 255, 0)');
            
            ctx.fillStyle = ringGrad;
            // Ellipse for perspective
            ctx.beginPath();
            ctx.ellipse(centerX, groundY, 25, 6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Additional shimmer effect
            if (Math.random() > 0.5) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fillRect(centerX - 10 + Math.random() * 20, p.y, 2, p.height);
            }
            
            ctx.restore();
        }

        const showCrosshair = miningTargetRef.current || input.mouse.isDown;
        
        if (showCrosshair && !hotbarItemRef.current?.itemKey && spawnTimerRef.current <= 0) {
             let tx = 0, ty = 0;
             if (miningTargetRef.current) {
                 tx = miningTargetRef.current.x;
                 ty = miningTargetRef.current.y;
             } else {
                 tx = (input.mouse.x / PIXEL_SCALE) + camera.x;
                 ty = (input.mouse.y / PIXEL_SCALE) + camera.y;
             }

             const baseReach = 40;
             const maxReach = baseReach * (1 + ((stats.miningReachLevel - 1) * 0.15));
             
             ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'; 
             ctx.lineWidth = 1;
             ctx.setLineDash([2, 4]); 
             ctx.beginPath();
             ctx.arc(p.x + p.width/2, p.y + p.height/2, maxReach, 0, Math.PI * 2);
             ctx.stroke();
             ctx.setLineDash([]); 

             if (currentStageRef.current === 'MINE') {
                 const effectiveRadiusLevel = stats.miningRadiusLevel;
                 const baseRadius = 8;
                 const radius = baseRadius * (1 + ((effectiveRadiusLevel - 1) * 0.15));
                 
                 ctx.strokeStyle = 'rgba(255, 100, 100, 0.3)';
                 ctx.lineWidth = 1;
                 ctx.setLineDash([4, 2]); 
                 ctx.beginPath();
                 ctx.arc(tx, ty, radius, 0, Math.PI * 2);
                 ctx.stroke();
                 ctx.setLineDash([]);
             }

             ctx.strokeStyle = 'rgba(255, 50, 50, 0.9)';
             ctx.lineWidth = 2;
             ctx.beginPath();
             const size = 4;
             ctx.moveTo(tx - size, ty); ctx.lineTo(tx + size, ty);
             ctx.moveTo(tx, ty - size); ctx.lineTo(tx, ty + size);
             ctx.stroke();
             ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
             ctx.beginPath();
             ctx.arc(tx, ty, 1.5, 0, Math.PI * 2);
             ctx.fill();
             
             if (miningTargetRef.current) {
                 ctx.strokeStyle = 'rgba(255, 50, 50, 0.2)';
                 ctx.lineWidth = 1;
                 ctx.beginPath();
                 ctx.moveTo(p.x + p.width/2, p.y + p.height/2);
                 ctx.lineTo(tx, ty);
                 ctx.stroke();
             }
        }

        if (isBase) {
            hitMarkersRef.current.forEach(m => {
                ctx.strokeStyle = `rgba(255, 255, 255, ${m.life})`;
                ctx.lineWidth = 2;
                const size = 6;
                ctx.beginPath();
                ctx.moveTo(m.x - size, m.y); ctx.lineTo(m.x + size, m.y);
                ctx.moveTo(m.x, m.y - size); ctx.lineTo(m.x, m.y + size);
                ctx.stroke();
            });
        }

        ctx.restore(); 
        
        const lightsIntegrity = stats.integrityLights !== undefined ? stats.integrityLights : 100;
        const lightsFailed = isBase && (stats.baseIntegrity < 50 || lightsIntegrity < 20);
        
        if (currentStageRef.current === 'MINE' || currentStageRef.current === 'OUTSIDE' || lightsFailed) {
            const shadowCanvas = assetsRef.current.shadowCanvas;
            
            // Performance Optimization: Downscale Shadow Map
            // Using 1/4 resolution for shadows significantly improves performance with minimal visual impact
            const SHADOW_DIVISOR = 4;
            const targetW = Math.ceil(canvas.width / SHADOW_DIVISOR);
            const targetH = Math.ceil(canvas.height / SHADOW_DIVISOR);

            if (shadowCanvas) {
                if (shadowCanvas.width !== targetW || shadowCanvas.height !== targetH) {
                    shadowCanvas.width = targetW;
                    shadowCanvas.height = targetH;
                }
                const sCtx = shadowCanvas.getContext('2d');
                if (sCtx) {
                    // Reset transform before clear
                    sCtx.setTransform(1, 0, 0, 1, 0, 0);
                    
                    sCtx.globalCompositeOperation = 'source-over';
                    sCtx.fillStyle = isBase ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.95)';
                    sCtx.fillRect(0, 0, targetW, targetH);

                    sCtx.globalCompositeOperation = 'destination-out';
                    
                    // We need to scale the coordinates down to the shadow canvas size
                    const scaleFactor = 1 / SHADOW_DIVISOR;
                    
                    const screenX = (p.x + p.width/2 - camera.x + shakeX) * PIXEL_SCALE * scaleFactor;
                    const screenY = (p.y + p.height/2 - camera.y + shakeY) * PIXEL_SCALE * scaleFactor;
                    
                    const baseRadius = 60 * PIXEL_SCALE * scaleFactor;
                    const lanternRadius = (stats.lanternTimeLeft > 0 ? 200 : 0) * PIXEL_SCALE * scaleFactor;
                    const totalRadius = Math.max(baseRadius, lanternRadius);

                    const g = sCtx.createRadialGradient(screenX, screenY, totalRadius * 0.4, screenX, screenY, totalRadius);
                    g.addColorStop(0, 'rgba(0,0,0,1)'); 
                    g.addColorStop(1, 'rgba(0,0,0,0)'); 
                    sCtx.fillStyle = g;
                    sCtx.beginPath(); 
                    sCtx.arc(screenX, screenY, totalRadius, 0, Math.PI*2); 
                    sCtx.fill();

                    // Draw the downscaled shadow canvas scaled up to the main canvas
                    ctx.save();
                    ctx.setTransform(1, 0, 0, 1, 0, 0); 
                    // imageSmoothingEnabled is false globally for pixel art, but for shadows we might want it true?
                    // actually keeping it false usually looks fine for "retro" lighting, or enable for softer shadows
                    // ctx.imageSmoothingEnabled = true; 
                    ctx.drawImage(shadowCanvas, 0, 0, canvas.width, canvas.height);
                    // ctx.imageSmoothingEnabled = false;
                    ctx.restore();
                }
            }
        }

        ctx.save();
        ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
        ctx.translate(-camera.x + shakeX, -camera.y + shakeY);
        
        ctx.font = '10px monospace'; 
        ctx.textAlign = 'center'; 
        
        // Use for loop for floating text
        const texts = floatingTextsRef.current;
        const tLen = texts.length;
        for(let i=0; i<tLen; i++) {
            const ft = texts[i];
            if (ft.x > camera.x && ft.x < camera.x + w && ft.y > camera.y && ft.y < camera.y + h) { 
                ctx.fillStyle = ft.color; 
                ctx.globalAlpha = ft.life; 
                ctx.fillStyle = 'black'; 
                ctx.fillText(ft.text, (ft.x + 1)|0, (ft.y + 1)|0); 
                ctx.fillStyle = ft.color; 
                ctx.fillText(ft.text, ft.x|0, ft.y|0); 
            } 
        }
        ctx.globalAlpha = 1.0;
        ctx.restore();

        if (input.leftJoystick.active && spawnTimerRef.current <= 0) {
            const j = input.leftJoystick;
            ctx.beginPath(); ctx.arc(j.originX, j.originY, 30, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)'; ctx.fill(); 
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(j.currentX, j.currentY, 15, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(0, 255, 255, 0.4)'; ctx.fill();
        }

        if (input.rightJoystick.active && spawnTimerRef.current <= 0) {
            const j = input.rightJoystick;
            ctx.beginPath(); ctx.arc(j.originX, j.originY, 30, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(255, 50, 50, 0.1)'; ctx.fill(); 
            ctx.strokeStyle = 'rgba(255, 50, 50, 0.3)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(j.currentX, j.currentY, 15, 0, Math.PI * 2); 
            ctx.fillStyle = 'rgba(255, 50, 50, 0.4)'; ctx.fill();
        }

        if (isBase && !lightsFailed) { 
            ctx.save();
            ctx.scale(PIXEL_SCALE, PIXEL_SCALE);
            ctx.fillStyle = 'rgba(50, 20, 0, 0.1)'; 
            ctx.fillRect(0, 0, w, h); 
            ctx.restore();
        }
    };

    return <canvas ref={canvasRef} className="block w-full h-full touch-none" />;
};
