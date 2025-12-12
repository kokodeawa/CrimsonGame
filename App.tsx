
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LivingMetalGame } from './components/LivingMetalGame';
import { GameState, PlayerStats, Language } from './types';
import { Play, Database, Shield, Lock, Hammer, Zap, Wind, Pickaxe, Droplet, Triangle, Scan, CircleDashed, Move, Flame, Eye, Pause, Hand, Hexagon, Radiation, Swords, Crosshair, AlertCircle, X, Skull, ArrowUpFromLine, Volume2, VolumeX, Volume1, Globe, Biohazard, RefreshCw, Briefcase, Wrench, HeartPulse, Box, Sword, Lightbulb, Cylinder, Syringe, Info, HelpCircle, Backpack, Home, ArrowRight, Loader2, Container, ChevronsRight, FlaskConical, TestTube, Cpu, Save } from 'lucide-react';

const INITIAL_STATS: PlayerStats = {
  health: 100,
  maxHealth: 100,
  oxygen: 100,
  oxygenLevel: 1,
  infection: 0,
  infectionResistanceLevel: 1,
  miningRadiusLevel: 1,
  miningReachLevel: 1,
  miningSpeedLevel: 1,
  oreScannerLevel: 1,
  highJumpBoots: false,
  inventoryLevel: 0, 
  unlockedLantern: false,
  unlockedLab: false, // Starts locked
  baseExpansionLevel: 0,
  loadingSpeedLevel: 1,
  hasDecontaminationUnit: false,
  storageLevel: 0,
  labLevel: 1, 
  scraps: 0,
  wood: 0,
  iron: 0,
  ice: 0,
  coal: 0,
  titanium: 0,
  uranium: 0,
  repairKits: 0,
  oxygenTanks: 0,
  healthInjections: 0,
  immunityBoosters: 0,
  purifiers: 0,
  unlockedWeapons: [],
  equippedWeapon: 'none',
  baseLevel: 1,
  unlockedRooms: ['shelter'],
};

// Define Upgrade Costs
type ResourceCost = { scraps?: number; iron?: number; wood?: number; ice?: number; coal?: number; titanium?: number; uranium?: number };

const BASE_UPGRADE_COSTS: Record<string, ResourceCost> = {
    // Increased costs (~20-30%)
    oxygen: { scraps: 200, ice: 25 },
    drill_radius: { scraps: 400, coal: 35 },
    drill_reach: { scraps: 250, wood: 25 },
    drill_speed: { scraps: 350, iron: 30, coal: 25 },
    scanner_luck: { scraps: 500, iron: 45 },
    radar: { scraps: 450, iron: 60, ice: 40 },
    jump_boots: { scraps: 800, iron: 80, ice: 50 },
    resistance: { scraps: 600, iron: 70, titanium: 10 },
    fabricator: { scraps: 700, iron: 80, wood: 40 }, 
    
    // New Upgrades
    base_expand: { scraps: 1000, iron: 150, titanium: 30 },
    decon_unit: { scraps: 800, iron: 80, uranium: 15 },
    hyperloop: { scraps: 600, iron: 80, coal: 80 }, 
    
    // CHEAPER STORAGE (Requested)
    storage_bay: { scraps: 80, wood: 20 },

    // Lab Research
    lab_research: { scraps: 300, ice: 50, coal: 20 },
    
    // Lab Key
    lab_key: { scraps: 150, iron: 40, coal: 10 }
};

// Crafting Recipe Types
interface BaseRecipe {
    id: string;
    cost: ResourceCost;
    output: number;
    reqLevel: number; // For Fabricator: Inventory Level. For Lab: Lab Level.
}

interface ItemRecipe extends BaseRecipe {
    type: 'consumable' | 'upgrade';
    statKey: keyof PlayerStats;
    weaponId?: never;
}

interface WeaponRecipe extends BaseRecipe {
    type: 'weapon';
    weaponId: string;
    statKey?: never;
}

type CraftingRecipe = ItemRecipe | WeaponRecipe;

// Crafting Recipes
const CRAFTING_RECIPES: CraftingRecipe[] = [
    // Consumables (Moved to Lab)
    {
        id: 'repair_kit',
        type: 'consumable',
        cost: { scraps: 15, iron: 5 },
        output: 1,
        statKey: 'repairKits',
        reqLevel: 1 // Basic
    },
    {
        id: 'oxygen_tank',
        type: 'consumable',
        cost: { ice: 3, scraps: 6 }, // Reduced cost by ~40% (was 5 ice, 10 scraps)
        output: 1,
        statKey: 'oxygenTanks',
        reqLevel: 1 // Basic
    },
    {
        id: 'health_injection',
        type: 'consumable',
        cost: { iron: 10, ice: 20 },
        output: 1,
        statKey: 'healthInjections',
        reqLevel: 2 // Requires Research
    },
    {
        id: 'purifier',
        type: 'consumable',
        cost: { coal: 15, ice: 10 },
        output: 1,
        statKey: 'purifiers',
        reqLevel: 2 // Requires Research
    },
    {
        id: 'immunity_booster',
        type: 'consumable',
        cost: { scraps: 10, coal: 5, ice: 5 },
        output: 1,
        statKey: 'immunityBoosters',
        reqLevel: 3 // Advanced Research
    },

    // Fabricator Items (Engineering)
    {
        id: 'lantern',
        type: 'upgrade',
        cost: { wood: 20, coal: 10, iron: 10 },
        output: 1,
        statKey: 'unlockedLantern',
        reqLevel: 0
    },
    {
        id: 'lab_key',
        type: 'upgrade',
        cost: { scraps: 150, iron: 40, coal: 10 },
        output: 1,
        statKey: 'unlockedLab',
        reqLevel: 0
    },
    // Weapons
    {
        id: 'weapon_sword',
        type: 'weapon',
        weaponId: 'sword',
        cost: { scraps: 100, iron: 40, wood: 20 },
        output: 1,
        reqLevel: 1
    },
    {
        id: 'weapon_force',
        type: 'weapon',
        weaponId: 'force',
        cost: { scraps: 200, titanium: 10 },
        output: 1,
        reqLevel: 1
    },
    {
        id: 'weapon_laser',
        type: 'weapon',
        weaponId: 'laser',
        cost: { scraps: 400, iron: 50, uranium: 10, titanium: 10 },
        output: 1,
        reqLevel: 1
    }
];

// Translations
const TRANSLATIONS = {
    en: {
        title: "Crimson Inversion",
        subtitle: "Survive the Living Metal. Walk the Ceiling.",
        init_suit: "Initialize Suit",
        resume_signal: "Resume Signal",
        game_saved: "Progress Saved",
        system_paused: "SYSTEM PAUSED",
        audio_systems: "SYSTEM SETTINGS",
        sfx: "SFX MODULE",
        ambience: "AMBIENCE",
        language: "LANGUAGE",
        resume_mission: "RESUME MISSION",
        you_died: "YOU DIED",
        integrity_failed: "SUIT INTEGRITY FAILED. RESOURCES LOST.",
        respawn: "RESPAWN AT BASE",
        deployment: "TRAVEL",
        surface: "SURFACE",
        inverted: "Inverted",
        mine: "MINE",
        base: "BASE",
        safe_zone: "Safe Zone",
        standard: "Standard",
        base_ops: "Base Ops",
        sector: "Sector 7",
        controls: "CONTROLS",
        controls_move: "WASD : MOVE",
        controls_mine: "HOLD CLICK : MINE",
        controls_inv: "E : INVENTORY",
        controls_interact: "F : INTERACT",
        controls_close: "ESC : CLOSE",
        close_terminal: "[ CLOSE TERMINAL (F) ]",
        storage_inv: "STORAGE INVENTORY",
        cap_unltd: "CAP: UNLTD",
        no_resources: "NO RESOURCES COLLECTED",
        inv_empty: "INVENTORY EMPTY",
        collected_res: "COLLECTED RESOURCES",
        suit_diag: "SUIT DIAGNOSTICS",
        integrity: "Integrity",
        oxygen: "Oxygen Supply",
        corrosion: "Red Corrosion",
        engineering: "ENGINEERING BAY",
        laboratory: "BIO-LABORATORY",
        status_operational: "Status: Operational",
        active: "[ACTIVE]",
        build: "BUILD",
        upgrade: "UPGRADE",
        buy: "BUY",
        need: "Need",
        inventory: "INVENTORY",
        crafting: "FABRICATION",
        brewing: "SYNTHESIS",
        research: "RESEARCH",
        resources: "RESOURCES",
        items: "CONSUMABLES",
        weapons: "WEAPONS",
        craft: "CRAFT",
        use: "USE",
        equip: "EQUIP",
        equipped: "EQUIPPED",
        crafted: "OWNED",
        locked: "LOCKED",
        locked_fab: "REQ: ADV. FABRICATOR",
        locked_lab: "REQ: LAB LEVEL",
        req_lab_panel: "REQ: CONTROL PANEL",
        info: "INFO",
        item_info: "ITEM INFO",
        missing_resources: "MISSING RESOURCES",
        interact: "INTERACT",
        travel_base: "RETURN TO BASE",
        loading: "INITIALIZING TRAVEL SEQUENCE...",
        pressurizing: "PRESSURIZING...",
        sanitizing: "SANITIZING...",
        arriving: "ARRIVING...",
        // Items
        item_lantern: "Cave Lantern",
        item_lantern_desc: "Increases visibility in dark zones.",
        item_lab_key: "Control Panel",
        item_lab_key_desc: "Fixes the Bio-Lab Table.",
        item_repair: "Repair Kit",
        item_repair_desc: "Restores 25% Integrity.",
        item_tank: "Oxygen Tank",
        item_tank_desc: "Restores ~25% Oxygen (+7s).",
        item_booster: "Immunity Booster",
        item_booster_desc: "Reduces Infection by 15.",
        item_injection: "Cure Injection",
        item_injection_desc: "Restores 30% Health.",
        item_purifier: "Purifier",
        item_purifier_desc: "Removes 30% Infection.",
        // Weapons
        wpn_sword: "Plasma Sword",
        wpn_sword_desc: "Melee. High Damage.",
        wpn_force: "Force Gauntlet",
        wpn_force_desc: "Short range shockwave.",
        wpn_laser: "Laser Pistol",
        wpn_laser_desc: "High fire rate. Low dmg.",
        // Upgrades
        upg_fabricator: "Adv. Fabricator",
        upg_fabricator_desc: "Unlocks advanced blueprints.",
        upg_oxygen: "O2 Recirculator",
        upg_oxygen_desc: "Extends duration (+10% / lvl).",
        upg_scanner: "Mineral Scanner",
        upg_scanner_desc: "Increases vision and rare find chance.",
        upg_boots: "Hydraulic Boots",
        upg_boots_desc: "Increases jump height significantly.",
        upg_radius: "Seismic Resonator",
        upg_radius_desc: "Increases blast radius (+10% / lvl).",
        upg_speed: "Laser Overclock",
        upg_speed_desc: "Increases mining speed (+10% / lvl).",
        upg_reach: "Plasma Tether",
        upg_reach_desc: "Extends mining range (+10% / lvl).",
        upg_radar: "Deep Scan Radar",
        upg_radar_desc: "Reveal hazard locations.",
        upg_resistance: "Lead Plating",
        upg_resistance_desc: "Slows infection rate (+10% / lvl).",
        // New Upgrades Translations
        upg_expand: "Base Expansion",
        upg_expand_desc: "Increases internal base size.",
        upg_decon: "Decontamination Unit",
        upg_decon_desc: "Heals infection automatically when nearby.",
        upg_hyperloop: "Hyperloop Access",
        upg_hyperloop_desc: "Reduces travel time between sectors.",
        upg_storage: "Storage Bay",
        upg_storage_desc: "Adds visual storage units to base.",
        upg_lab: "Lab Research",
        upg_lab_desc: "Unlocks advanced potion recipes.",
        // Resources
        res_scraps: "Scraps",
        res_coal: "Coal",
        res_iron: "Iron Ore",
        res_wood: "Fossil Wood",
        res_ice: "Ice Crystals",
        res_titanium: "Titanium",
        res_uranium: "Uranium",
        superuser: "SUPER USER (DEV)"
    },
    es: {
        title: "Inversión Carmesí",
        subtitle: "Sobrevive al Metal Viviente. Camina por el Techo.",
        init_suit: "Iniciar Traje",
        resume_signal: "Reanudar Señal",
        game_saved: "Progreso Guardado",
        system_paused: "SISTEMA PAUSADO",
        audio_systems: "CONFIGURACIÓN",
        sfx: "EFECTOS",
        ambience: "AMBIENTE",
        language: "IDIOMA",
        resume_mission: "REANUDAR MISIÓN",
        you_died: "HAS MUERTO",
        integrity_failed: "FALLO DE INTEGRIDAD. RECURSOS PERDIDOS.",
        respawn: "REAPARECER EN BASE",
        deployment: "VIAJE",
        surface: "SUPERFICIE",
        inverted: "Invertido",
        mine: "MINA",
        base: "BASE",
        safe_zone: "Zona Segura",
        standard: "Estándar",
        base_ops: "Ops Base",
        sector: "Sector 7",
        controls: "CONTROLES",
        controls_move: "WASD : MOVER",
        controls_mine: "CLICK : PICAR",
        controls_inv: "E : INVENTARIO",
        controls_interact: "F : INTERACTUAR",
        controls_close: "ESC : CERRAR",
        close_terminal: "[ CERRAR TERMINAL (F) ]",
        storage_inv: "INVENTARIO ALMACÉN",
        cap_unltd: "CAP: ILIM",
        no_resources: "SIN RECURSOS RECOLECTADOS",
        inv_empty: "INVENTARIO VACÍO",
        collected_res: "RECURSOS OBTENIDOS",
        suit_diag: "DIAGNÓSTICO DEL TRAJE",
        integrity: "Integridad",
        oxygen: "Oxígeno",
        corrosion: "Corrosión Roja",
        engineering: "BAHÍA DE INGENIERÍA",
        laboratory: "BIO-LABORATORIO",
        status_operational: "Estado: Operativo",
        active: "[ACTIVO]",
        build: "CONSTRUIR",
        upgrade: "MEJORAR",
        buy: "COMPRAR",
        need: "Necesitas",
        inventory: "INVENTARIO",
        crafting: "FABRICATION",
        brewing: "SÍNTESIS",
        research: "INVESTIGACIÓN",
        resources: "RECURSOS",
        items: "CONSUMIBLES",
        weapons: "ARMAS",
        craft: "CREAR",
        use: "USAR",
        equip: "EQUIPAR",
        equipped: "EQUIPADO",
        crafted: "POSEÍDO",
        locked: "BLOQUEADO",
        locked_fab: "REQ: FABRICADOR AV.",
        locked_lab: "REQ: NIVEL LAB",
        req_lab_panel: "REQ: PANEL DE CONTROL",
        info: "INFO",
        item_info: "INFO DEL OBJETO",
        missing_resources: "RECURSOS FALTANTES",
        interact: "INTERACTUAR",
        travel_base: "VOLVER A BASE",
        loading: "INICIANDO SECUENCIA DE VIAJE...",
        pressurizing: "PRESURIZANDO...",
        sanitizing: "DESINFECTANDO...",
        arriving: "LLEGANDO...",
        // Items
        item_lantern: "Linterna Minera",
        item_lantern_desc: "Aumenta la visibilidad en zonas oscuras.",
        item_lab_key: "Panel de Control",
        item_lab_key_desc: "Repara la mesa de laboratorio.",
        item_repair: "Kit Reparación",
        item_repair_desc: "Restaura 25% Integridad.",
        item_tank: "Tanque O2",
        item_tank_desc: "Restaura ~25% Oxígeno (+7s).",
        item_booster: "Inmunizador",
        item_booster_desc: "Reduce Infección en 15.",
        item_injection: "Inyección Cura",
        item_injection_desc: "Restaura 30% Salud.",
        item_purifier: "Purificador",
        item_purifier_desc: "Elimina 30% de Corrosión.",
        // Weapons
        wpn_sword: "Espada Plasma",
        wpn_sword_desc: "Melee. Daño Alto.",
        wpn_force: "Guante Fuerza",
        wpn_force_desc: "Onda de choque corta.",
        wpn_laser: "Pistola Láser",
        wpn_laser_desc: "Alta cadencia. Daño bajo.",
        // Upgrades
        upg_fabricator: "Fabricador Av.",
        upg_fabricator_desc: "Desbloquea planos avanzados.",
        upg_oxygen: "Recirculador O2",
        upg_oxygen_desc: "Extiende duración (+10% / lvl).",
        upg_scanner: "Escáner Mineral",
        upg_scanner_desc: "Aumenta visión y probabilidad rara.",
        upg_boots: "Botas Hidráulicas",
        upg_boots_desc: "Aumenta salto significativamente.",
        upg_radius: "Resonador Sísmico",
        upg_radius_desc: "Aumenta radio de explosión (+10%).",
        upg_speed: "Láser Overclock",
        upg_speed_desc: "Aumenta velocidad de minado (+10%).",
        upg_reach: "Amarre de Plasma",
        upg_reach_desc: "Extiende alcance de minado (+10%).",
        upg_radar: "Radar Profundo",
        upg_radar_desc: "Revela ubicaciones peligrosas.",
        upg_resistance: "Blindaje de Plomo",
        upg_resistance_desc: "Frena la infección (+10% / lvl).",
        // New Upgrades Translations
        upg_expand: "Expansión de Base",
        upg_expand_desc: "Aumenta el tamaño interno de la base.",
        upg_decon: "Unidad Descontaminación",
        upg_decon_desc: "Cura la infección automáticamente cerca.",
        upg_hyperloop: "Acceso Hyperloop",
        upg_hyperloop_desc: "Reduce el tiempo de viaje.",
        upg_storage: "Bahía de Carga",
        upg_storage_desc: "Añade unidades visuales de almacenamiento.",
        upg_lab: "Nivel de Laboratorio",
        upg_lab_desc: "Desbloquea recetas avanzadas de pociones.",
        // Resources
        res_scraps: "Chatarra",
        res_coal: "Carbón",
        res_iron: "Hierro",
        res_wood: "Madera Fósil",
        res_ice: "Cristal Hielo",
        res_titanium: "Titanio",
        res_uranium: "Uranio",
        superuser: "SUPER USUARIO (DEV)"
    }
};

const RESOURCE_CONFIG: Record<string, { icon: any, color: string }> = {
    scraps: { icon: RefreshCw, color: "text-gray-400" },
    wood: { icon: Triangle, color: "text-amber-700" },
    iron: { icon: Box, color: "text-slate-400" },
    ice: { icon: Droplet, color: "text-cyan-300" },
    coal: { icon: Lightbulb, color: "text-gray-600" },
    titanium: { icon: Hexagon, color: "text-white" },
    uranium: { icon: Radiation, color: "text-green-500" }
};

const SAVE_KEY = 'crimson_save';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  const [canInteract, setCanInteract] = useState(false);
  const [interactionTrigger, setInteractionTrigger] = useState(0);
  const [language, setLanguage] = useState<Language>('es'); 
  const [hasSave, setHasSave] = useState(false);
  
  // New state for intermittent save notification
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const lastSaveNotificationTime = useRef<number>(0);

  // Volume increased to 90%
  const [volume, setVolume] = useState({ sfx: 0.90, ambience: 0.90 });
  const [mobileActionMode, setMobileActionMode] = useState<'MINE' | 'ATTACK'>('MINE');

  // Stage Management
  const [currentStage, setCurrentStage] = useState<'OUTSIDE' | 'MINE' | 'BASE'>('BASE');
  const [requestedStage, setRequestedStage] = useState<'OUTSIDE' | 'MINE' | 'BASE' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [infoModal, setInfoModal] = useState<{ title: string; desc: string; cost: ResourceCost; missing?: string[] } | null>(null);
  
  // Base UI Tab State
  const [baseTab, setBaseTab] = useState<'upgrades' | 'fabrication'>('upgrades');
  const [labTab, setLabTab] = useState<'brewing' | 'research'>('brewing');

  const uiAudioCtxRef = useRef<AudioContext | null>(null);
  const statsUpdateThrottleRef = useRef<number>(0);

  const t = TRANSLATIONS[language];

  // Check for save on load
  useEffect(() => {
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) setHasSave(true);
    } catch (e) {
        console.error("Failed to read save", e);
    }
  }, []);

  // Auto-Save Effect
  useEffect(() => {
      if (gameState === GameState.PLAYING || gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU || gameState === GameState.INVENTORY) {
          const timeout = setTimeout(() => {
              const data = { stats, stage: currentStage, timestamp: Date.now() };
              localStorage.setItem(SAVE_KEY, JSON.stringify(data));
              setHasSave(true);
              
              // Only show save notification every 60 seconds to avoid annoyance
              const now = Date.now();
              if (now - lastSaveNotificationTime.current > 60000) { 
                  setShowSaveIndicator(true);
                  lastSaveNotificationTime.current = now;
                  setTimeout(() => setShowSaveIndicator(false), 2000);
              }

          }, 2000); // Debounce save every 2 seconds
          return () => clearTimeout(timeout);
      }
  }, [stats, currentStage, gameState]);

  // Helper to calculate dynamic cost based on current level
  const getDynamicCost = (upgradeId: string): ResourceCost => {
      const baseCost = BASE_UPGRADE_COSTS[upgradeId];
      if (!baseCost) return {};

      let currentLevel = 1;
      // Map upgrade ID to stat key
      if (upgradeId === 'oxygen') currentLevel = stats.oxygenLevel;
      else if (upgradeId === 'drill_radius') currentLevel = stats.miningRadiusLevel;
      else if (upgradeId === 'drill_reach') currentLevel = stats.miningReachLevel;
      else if (upgradeId === 'drill_speed') currentLevel = stats.miningSpeedLevel;
      else if (upgradeId === 'scanner_luck') currentLevel = stats.oreScannerLevel;
      else if (upgradeId === 'resistance') currentLevel = stats.infectionResistanceLevel;
      else if (upgradeId === 'radar') currentLevel = stats.unlockedRooms.includes('radar') ? 1 : 0;
      else if (upgradeId === 'jump_boots') currentLevel = stats.highJumpBoots ? 1 : 0;
      else if (upgradeId === 'fabricator') currentLevel = stats.inventoryLevel;
      else if (upgradeId === 'base_expand') currentLevel = stats.baseExpansionLevel + 1;
      else if (upgradeId === 'decon_unit') currentLevel = stats.hasDecontaminationUnit ? 1 : 0;
      else if (upgradeId === 'hyperloop') currentLevel = stats.loadingSpeedLevel;
      else if (upgradeId === 'storage_bay') currentLevel = stats.storageLevel + 1;
      else if (upgradeId === 'lab_research') currentLevel = stats.labLevel;
      else if (upgradeId === 'lab_key') currentLevel = stats.unlockedLab ? 1 : 0;

      const multiplier = 1 + ((currentLevel - 1) * 0.5);

      const scaledCost: ResourceCost = {};
      Object.keys(baseCost).forEach(key => {
         const k = key as keyof ResourceCost;
         if (baseCost[k]) scaledCost[k] = Math.floor(baseCost[k]! * multiplier);
      });

      return scaledCost;
  };

  const initUiAudio = () => {
    if (!uiAudioCtxRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            uiAudioCtxRef.current = new AudioContext();
        }
    } else if (uiAudioCtxRef.current.state === 'suspended') {
        uiAudioCtxRef.current.resume();
    }
  };

  const playUiSound = (type: 'upgrade' | 'install' | 'click' | 'craft' | 'ui_open' | 'ui_close' | 'error') => {
      initUiAudio();
      if (!uiAudioCtxRef.current || volume.sfx <= 0) return;
      const ctx = uiAudioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const now = ctx.currentTime;
      const vol = volume.sfx;

      if (type === 'upgrade') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(800, now + 0.15);
          gain.gain.setValueAtTime(0.15 * vol, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
      } else if (type === 'install') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(100, now);
          osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
          gain.gain.setValueAtTime(0.30 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.25);
      } else if (type === 'craft') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.linearRampToValueAtTime(400, now + 0.1);
          gain.gain.setValueAtTime(0.30 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      } else if (type === 'click') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(600, now);
          gain.gain.setValueAtTime(0.08 * vol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.1);
      } else if (type === 'ui_open') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(600, now + 0.1);
          gain.gain.setValueAtTime(0.15 * vol, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      } else if (type === 'ui_close') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.linearRampToValueAtTime(400, now + 0.1);
          gain.gain.setValueAtTime(0.15 * vol, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
      } else if (type === 'error') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.1);
          gain.gain.setValueAtTime(0.3 * vol, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.2);
          osc.start(now);
          osc.stop(now + 0.2);
      }
  };

  const toggleSfx = () => {
      setVolume(prev => ({ ...prev, sfx: prev.sfx > 0 ? 0 : 0.90 }));
  };

  const toggleAmbience = () => {
      setVolume(prev => ({ ...prev, ambience: prev.ambience > 0 ? 0 : 0.90 }));
  };

  const toggleLanguage = () => {
      playUiSound('click');
      setLanguage(prev => prev === 'en' ? 'es' : 'en');
  };

  // Global Key Handler for Escape/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isLoading) return; // Block input during load
        if (e.code === 'Escape') {
            setInfoModal(null); // Fix dark screen bug if modal is stuck
            if (gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU) {
                toggleBaseUI(false);
            } else if (gameState === GameState.LOCATION_SELECT || gameState === GameState.INVENTORY) {
                playUiSound('click');
                setGameState(GameState.PLAYING);
            } else if (gameState === GameState.PLAYING) {
                setGameState(GameState.PAUSED);
            } else if (gameState === GameState.PAUSED) {
                setGameState(GameState.PLAYING);
            }
        }
        
        // E key -> Inventory
        if (e.code === 'KeyE') {
             if (gameState === GameState.PLAYING || gameState === GameState.INVENTORY) {
                toggleInventory();
            }
        }
        
        // F key -> Interact (Close menu if open)
        if (e.code === 'KeyF') {
             if (gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU) {
                toggleBaseUI(false);
            }
             else if (gameState === GameState.LOCATION_SELECT || gameState === GameState.INVENTORY) {
                playUiSound('click');
                setGameState(GameState.PLAYING);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isLoading]);

  const handleStart = () => {
    initUiAudio();
    playUiSound('click');
    setStats(INITIAL_STATS); // Reset stats for new game
    setRequestedStage('BASE'); // Reset position
    setGameState(GameState.PLAYING);
  };

  const handleContinue = () => {
    initUiAudio();
    const save = localStorage.getItem(SAVE_KEY);
    if (save) {
        try {
            const data = JSON.parse(save);
            if (data.stats) setStats(data.stats);
            if (data.stage) {
                setCurrentStage(data.stage);
                setRequestedStage(data.stage);
            }
            playUiSound('click');
            setGameState(GameState.PLAYING);
        } catch (e) {
            console.error("Save file corrupted");
            setToast({ message: "Save Corrupted", visible: true });
            setTimeout(() => setToast(null), 2000);
        }
    }
  };

  // Throttled stats update to prevent React churn
  const handleUpdateStats = useCallback((newStats: Partial<PlayerStats>) => {
    const now = Date.now();
    // Immediate update for critical non-numeric or small changes, throttle rapid numeric updates like oxygen/health
    if (now - statsUpdateThrottleRef.current > 100 || 
        newStats.equippedWeapon || 
        newStats.unlockedWeapons || 
        (newStats.scraps !== undefined) || 
        (newStats.wood !== undefined) || 
        (newStats.iron !== undefined) ||
        (newStats.oxygen === 100) // Force immediate full oxygen reset
       ) {
        setStats((prev) => ({ ...prev, ...newStats }));
        statsUpdateThrottleRef.current = now;
    }
  }, []);

  const toggleBaseUI = (isOpen: boolean, type: 'engineering' | 'lab' = 'engineering') => {
    if (isOpen) {
        if (type === 'engineering') {
            playUiSound('ui_open');
            handleUpdateStats({ oxygen: 100 });
            setGameState(GameState.BASE_MENU);
            setBaseTab('upgrades');
        } else {
            // Lab Check
            if (stats.unlockedLab) {
                playUiSound('ui_open');
                handleUpdateStats({ oxygen: 100 });
                setGameState(GameState.LAB_MENU);
                setLabTab('brewing');
            } else {
                playUiSound('error');
                setToast({ message: t.req_lab_panel, visible: true });
                if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
                toastTimeoutRef.current = window.setTimeout(() => {
                    setToast(prev => prev ? { ...prev, visible: false } : null);
                }, 2500);
            }
        }
    } else {
        playUiSound('ui_close');
        setInfoModal(null);
        setGameState(GameState.PLAYING);
    }
  };

  const toggleInventory = () => {
      initUiAudio(); // Ensure context is ready on mobile tap
      if (gameState === GameState.INVENTORY) {
          playUiSound('ui_close');
          setGameState(GameState.PLAYING);
      } else {
          playUiSound('ui_open');
          setGameState(GameState.INVENTORY);
      }
  };

  const togglePause = () => {
    playUiSound('click');
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  };

  const handleGameOver = () => {
    setGameState(GameState.GAME_OVER);
  };

  const handleRespawn = () => {
      setStats(prev => ({
          ...prev,
          health: prev.maxHealth,
          oxygen: 100,
          infection: 0,
          scraps: 0, 
          wood: 0, 
          iron: 0, 
          ice: 0, 
          coal: 0, 
          titanium: 0, 
          uranium: 0,
          repairKits: 0,
          oxygenTanks: 0,
          healthInjections: 0,
          immunityBoosters: 0,
          purifiers: 0
      }));
      setRequestedStage('BASE'); 
      setGameState(GameState.PLAYING);
  };

  const activateSuperUser = () => {
      playUiSound('upgrade');
      setStats(prev => ({
          ...prev,
          // Max Stats
          health: 100,
          maxHealth: 1000,
          oxygen: 100,
          infection: 0,
          
          // Infinite Resources
          scraps: 9999,
          wood: 9999,
          iron: 9999,
          ice: 9999,
          coal: 9999,
          titanium: 9999,
          uranium: 9999,
          
          // Max Consumables
          repairKits: 100,
          oxygenTanks: 100,
          healthInjections: 100,
          immunityBoosters: 100,
          purifiers: 100,
          
          // Max Upgrades
          miningRadiusLevel: 5,
          miningReachLevel: 5,
          miningSpeedLevel: 5,
          oreScannerLevel: 5,
          infectionResistanceLevel: 5,
          baseExpansionLevel: 5,
          loadingSpeedLevel: 5,
          storageLevel: 5,
          labLevel: 5,
          inventoryLevel: 1, // Max for fabricator

          // Unlocks
          highJumpBoots: true,
          unlockedLantern: true,
          unlockedLab: true,
          hasDecontaminationUnit: true,
          unlockedWeapons: ['sword', 'force', 'laser'],
          equippedWeapon: 'laser',
          unlockedRooms: ['shelter', 'radar']
      }));
      
      setToast({ message: "SUPER USER ACTIVATED", visible: true });
      setTimeout(() => setToast(null), 2000);
      setGameState(GameState.PLAYING);
  };

  const handleMobileInteract = () => {
    setInteractionTrigger(prev => prev + 1);
  };

  const handleLocationSelect = () => {
      setGameState(GameState.LOCATION_SELECT);
  };

  const confirmTravel = (destination: 'OUTSIDE' | 'MINE' | 'BASE') => {
      playUiSound('click');
      setGameState(GameState.PLAYING);
      setIsLoading(true);
      setLoadingProgress(0);

      const speedLvl = stats.loadingSpeedLevel || 1;
      // Faster levels = less delay. Level 1 = 5s, Level 5 = 1s
      const delay = Math.max(1000, 5000 - ((speedLvl - 1) * 1000));
      const interval = 50;
      const steps = delay / interval;
      let step = 0;

      const timer = setInterval(() => {
          step++;
          setLoadingProgress(Math.min(100, (step / steps) * 100));
          if (step >= steps) {
              clearInterval(timer);
              setIsLoading(false);
              setRequestedStage(destination);
          }
      }, interval);
  };

  const canAfford = (cost: ResourceCost) => {
      if (cost.scraps && stats.scraps < cost.scraps) return false;
      if (cost.iron && stats.iron < (cost.iron || 0)) return false;
      if (cost.wood && stats.wood < (cost.wood || 0)) return false;
      if (cost.ice && stats.ice < (cost.ice || 0)) return false;
      if (cost.coal && stats.coal < (cost.coal || 0)) return false;
      if (cost.titanium && stats.titanium < (cost.titanium || 0)) return false;
      if (cost.uranium && stats.uranium < (cost.uranium || 0)) return false;
      return true;
  };

  const getMissingResources = (cost: ResourceCost) => {
      const missing = [];
      if (cost.scraps && stats.scraps < cost.scraps) missing.push(`${cost.scraps - stats.scraps} ${t.res_scraps}`);
      if (cost.iron && stats.iron < (cost.iron || 0)) missing.push(`${(cost.iron || 0) - stats.iron} ${t.res_iron}`);
      if (cost.wood && stats.wood < (cost.wood || 0)) missing.push(`${(cost.wood || 0) - stats.wood} ${t.res_wood}`);
      if (cost.ice && stats.ice < (cost.ice || 0)) missing.push(`${(cost.ice || 0) - stats.ice} ${t.res_ice}`);
      if (cost.coal && stats.coal < (cost.coal || 0)) missing.push(`${(cost.coal || 0) - stats.coal} ${t.res_coal}`);
      if (cost.titanium && stats.titanium < (cost.titanium || 0)) missing.push(`${(cost.titanium || 0) - stats.titanium} ${t.res_titanium}`);
      if (cost.uranium && stats.uranium < (cost.uranium || 0)) missing.push(`${(cost.uranium || 0) - stats.uranium} ${t.res_uranium}`);
      return missing;
  };

  const openInfoModal = (title: string, desc: string, cost: ResourceCost) => {
      playUiSound('click');
      const missing = getMissingResources(cost);
      setInfoModal({ title, desc, cost, missing });
  };

  const showMissingReqs = (cost: ResourceCost) => {
      if (toast?.visible) return; 
      const missing = getMissingResources(cost);
      if (missing.length === 0) return;

      setToast({ message: `${t.need}: ${missing.join(', ')}`, visible: true });
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => {
          setToast(prev => prev ? { ...prev, visible: false } : null);
      }, 2500); 
  };

  const payCost = (cost: ResourceCost) => {
      setStats(prev => ({
          ...prev,
          scraps: prev.scraps - (cost.scraps || 0),
          iron: prev.iron - (cost.iron || 0),
          wood: prev.wood - (cost.wood || 0),
          ice: prev.ice - (cost.ice || 0),
          coal: prev.coal - (cost.coal || 0),
          titanium: prev.titanium - (cost.titanium || 0),
          uranium: prev.uranium - (cost.uranium || 0),
      }));
  };

  const craftItem = (recipeId: string) => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
      if (!recipe) return;
      if (!canAfford(recipe.cost)) {
          showMissingReqs(recipe.cost);
          return;
      }
      
      payCost(recipe.cost);
      playUiSound('craft');

      if (recipe.type === 'weapon') {
          const wId = recipe.weaponId;
          if (wId) {
             setStats(prev => ({
                 ...prev,
                 unlockedWeapons: [...prev.unlockedWeapons, wId],
                 equippedWeapon: wId 
             }));
          }
      } else if (recipe.type === 'upgrade') {
          const statKey = recipe.statKey;
          if (statKey) {
             setStats(prev => ({
                 ...prev,
                 [statKey]: true
             }));
          }
      } else {
          const statKey = recipe.statKey;
          if (statKey) {
             setStats(prev => ({
                 ...prev,
                 [statKey]: (prev[statKey as keyof PlayerStats] as number) + recipe.output
             }));
          }
      }
  };

  const equipWeapon = (wId: string) => {
      playUiSound('install');
      setStats(prev => ({
          ...prev,
          equippedWeapon: wId
      }));
  };

  const useItem = (type: 'repair' | 'booster' | 'oxygen_tank' | 'injection' | 'purifier') => {
      if (type === 'repair') {
          if (stats.repairKits > 0 && stats.health < stats.maxHealth) {
              playUiSound('install');
              setStats(prev => ({
                  ...prev,
                  repairKits: prev.repairKits - 1,
                  health: Math.min(prev.maxHealth, prev.health + 25)
              }));
          }
      } else if (type === 'booster') {
           if (stats.immunityBoosters > 0 && stats.infection > 0) {
              playUiSound('install');
              setStats(prev => ({
                  ...prev,
                  immunityBoosters: prev.immunityBoosters - 1,
                  infection: Math.max(0, prev.infection - 15)
              }));
          }
      } else if (type === 'oxygen_tank') {
           if (stats.oxygenTanks > 0 && stats.oxygen < 100) {
              playUiSound('install');
              setStats(prev => ({
                  ...prev,
                  oxygenTanks: prev.oxygenTanks - 1,
                  oxygen: Math.min(100, prev.oxygen + 25)
              }));
          }
      } else if (type === 'injection') {
           if (stats.healthInjections > 0 && stats.health < stats.maxHealth) {
              playUiSound('install');
              setStats(prev => ({
                  ...prev,
                  healthInjections: prev.healthInjections - 1,
                  health: Math.min(prev.maxHealth, prev.health + 30)
              }));
          }
      } else if (type === 'purifier') {
           if (stats.purifiers > 0 && stats.infection > 0) {
              playUiSound('install');
              setStats(prev => ({
                  ...prev,
                  purifiers: prev.purifiers - 1,
                  infection: Math.max(0, prev.infection - 30)
              }));
          }
      }
  };

  const upgradeBase = (type: string) => {
    const cost = getDynamicCost(type);
    if (!cost) return;
    
    if (!canAfford(cost)) {
        showMissingReqs(cost);
        return;
    }

    payCost(cost);

    let isInstall = false;

    if (type === 'oxygen') {
        setStats(prev => ({ ...prev, oxygenLevel: prev.oxygenLevel + 1 }));
    } else if (type === 'drill_radius') {
        setStats(prev => ({ ...prev, miningRadiusLevel: prev.miningRadiusLevel + 1 }));
    } else if (type === 'drill_reach') {
        setStats(prev => ({ ...prev, miningReachLevel: prev.miningReachLevel + 1 }));
    } else if (type === 'drill_speed') {
        setStats(prev => ({ ...prev, miningSpeedLevel: prev.miningSpeedLevel + 1 }));
    } else if (type === 'scanner_luck') {
        setStats(prev => ({ ...prev, oreScannerLevel: prev.oreScannerLevel + 1 }));
    } else if (type === 'radar') {
        if (!stats.unlockedRooms.includes('radar')) {
             setStats(prev => ({ ...prev, unlockedRooms: [...prev.unlockedRooms, 'radar'] }));
             isInstall = true;
        }
    } else if (type === 'jump_boots') {
        setStats(prev => ({ ...prev, highJumpBoots: true }));
        isInstall = true;
    } else if (type === 'fabricator') {
        setStats(prev => ({ ...prev, inventoryLevel: 1 }));
        isInstall = true;
    } else if (type === 'resistance') {
        setStats(prev => ({ ...prev, infectionResistanceLevel: (prev.infectionResistanceLevel || 1) + 1 }));
    } else if (type === 'base_expand') {
        setStats(prev => ({ ...prev, baseExpansionLevel: prev.baseExpansionLevel + 1 }));
        isInstall = true;
    } else if (type === 'decon_unit') {
        setStats(prev => ({ ...prev, hasDecontaminationUnit: true }));
        isInstall = true;
    } else if (type === 'hyperloop') {
        setStats(prev => ({ ...prev, loadingSpeedLevel: prev.loadingSpeedLevel + 1 }));
    } else if (type === 'storage_bay') {
        setStats(prev => ({ ...prev, storageLevel: prev.storageLevel + 1 }));
        isInstall = true;
    } else if (type === 'lab_research') {
        setStats(prev => ({ ...prev, labLevel: prev.labLevel + 1 }));
    }
    
    if (isInstall) playUiSound('install');
    else playUiSound('upgrade');
  };

  const ResourceItem = ({ icon: Icon, count, label, color = "text-gray-400" }: any) => (
      <div className="flex items-center gap-2 bg-gray-900/90 p-2 rounded border border-gray-700 shadow-sm">
          <Icon size={16} className={color} />
          <span className="font-bold">{count}</span>
          <span className="text-xs text-gray-500 hidden sm:inline">{label}</span>
      </div>
  );

  const renderCost = (cost: ResourceCost) => {
    return (
        <div className="flex flex-wrap gap-2">
            {Object.entries(cost).map(([k, v]) => {
                const config = RESOURCE_CONFIG[k] || { icon: Box, color: 'text-gray-400' };
                const Icon = config.icon;
                const hasEnough = (stats[k as keyof PlayerStats] as number) >= v;
                
                return (
                    <div key={k} className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${hasEnough ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-red-950/30 border-red-800 text-red-400'}`}>
                        <Icon size={12} className={hasEnough ? config.color : 'text-red-500'} />
                        <span>{v}</span>
                    </div>
                );
            })}
        </div>
    );
  };

  const isBaseOpen = gameState === GameState.BASE_MENU;
  const isLabOpen = gameState === GameState.LAB_MENU;
  const showBaseOrLab = isBaseOpen || isLabOpen;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none text-white font-mono" onContextMenu={e => e.preventDefault()}>
        <LivingMetalGame
            gameState={gameState}
            stats={stats}
            onUpdateStats={handleUpdateStats}
            onToggleBase={toggleBaseUI}
            interactionTrigger={interactionTrigger}
            onCanInteract={setCanInteract}
            onShowLocationSelect={handleLocationSelect}
            requestedStage={requestedStage}
            onStageChanged={(newStage) => {
                setCurrentStage(newStage);
                setRequestedStage(null);
            }}
            onTravel={confirmTravel}
            mobileActionMode={mobileActionMode}
            onGameOver={handleGameOver}
            volumeSettings={volume}
            language={language}
            toggleInventory={toggleInventory}
            isLoading={isLoading}
        />

        {/* LOADING SCREEN OVERLAY */}
        {isLoading && (
            <div className="absolute inset-0 bg-black z-[100] flex flex-col items-center justify-center p-8">
                <div className="w-full max-w-md border-2 border-red-900 bg-gray-950 p-6 rounded-xl shadow-[0_0_50px_rgba(255,0,0,0.2)] animate-pulse">
                     <div className="flex items-center gap-3 mb-4 text-red-500">
                        <Loader2 className="animate-spin" size={32} />
                        <h2 className="text-2xl font-bold tracking-widest">{t.loading}</h2>
                     </div>
                     <div className="space-y-2 mb-6 text-sm text-gray-500 font-mono">
                         <div className="flex justify-between"><span>{t.pressurizing}</span><span>100%</span></div>
                         <div className="flex justify-between"><span>{t.sanitizing}</span><span>{Math.floor(loadingProgress)}%</span></div>
                         <div className="flex justify-between"><span>{t.arriving}</span><span>...</span></div>
                     </div>
                     <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                         <div 
                            className="h-full bg-red-600 transition-all duration-100 ease-linear" 
                            style={{ width: `${loadingProgress}%` }}
                         />
                     </div>
                     <div className="mt-2 text-center text-xs text-red-900 font-bold uppercase tracking-[0.5em]">Hyperloop Active</div>
                </div>
            </div>
        )}

        {/* TOAST */}
        {toast?.visible && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <div className="bg-red-900/90 text-red-100 px-6 py-2 border border-red-500 rounded shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-bounce flex items-center gap-2">
                    <AlertCircle size={20} />
                    {toast.message}
                </div>
            </div>
        )}

        {/* INFO MODAL */}
        {infoModal && (
            <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-gray-900 border-2 border-red-700 p-6 max-w-sm w-[90%] shadow-[0_0_30px_rgba(255,0,0,0.4)] relative rounded-2xl animate-border-pulse">
                    <button onClick={() => setInfoModal(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white"><X size={20} /></button>
                    <h3 className="text-lg font-bold text-red-400 mb-1 border-b border-red-800/50 pb-2">{infoModal.title}</h3>
                    <p className="text-sm text-gray-300 mb-4">{infoModal.desc}</p>
                    
                    <div className="mb-4">
                        <div className="text-xs font-bold text-gray-500 mb-1 uppercase">{t.need}</div>
                        {renderCost(infoModal.cost)}
                    </div>

                    {infoModal.missing && infoModal.missing.length > 0 && (
                        <div className="bg-red-950/40 p-2 border border-red-800/50 rounded mb-4">
                            <div className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1"><AlertCircle size={12}/> {t.missing_resources}</div>
                            <ul className="text-xs text-red-200 list-disc list-inside">
                                {infoModal.missing.map((m, i) => <li key={i}>{m}</li>)}
                            </ul>
                        </div>
                    )}

                    <button onClick={() => setInfoModal(null)} className="w-full bg-red-900/40 hover:bg-red-900/60 border border-red-600 text-red-100 py-2 text-xs font-bold transition-all rounded-lg">
                        CLOSE
                    </button>
                </div>
            </div>
        )}

        {/* HUD - Always visible in PLAYING/BASE */}
        {(gameState === GameState.PLAYING || gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU || gameState === GameState.INVENTORY || gameState === GameState.LOCATION_SELECT) && (
            <div className="absolute inset-0 pointer-events-none">
                {/* Top Left - Vitals & Mobile Inventory */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-auto">
                    {/* Compact vital bars for mobile (w-16) */}
                    <div className="flex items-center gap-2 bg-black/60 p-2 border border-gray-800 backdrop-blur-sm rounded-lg">
                        <HeartPulse className="text-red-500" size={20} />
                        <div className="w-16 sm:w-32 h-3 bg-gray-800 rounded overflow-hidden">
                            <div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold">{Math.floor(stats.health)}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-black/60 p-2 border border-gray-800 backdrop-blur-sm rounded-lg">
                        <Wind className="text-cyan-400" size={20} />
                        <div className="w-16 sm:w-32 h-3 bg-gray-800 rounded overflow-hidden">
                            <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${stats.oxygen}%` }} />
                        </div>
                        <span className="text-xs font-bold">{Math.floor(stats.oxygen)}%</span>
                    </div>

                    <div className="flex items-center gap-2 bg-black/60 p-2 border border-gray-800 backdrop-blur-sm rounded-lg">
                        <Biohazard className="text-green-500" size={20} />
                        <div className="w-16 sm:w-32 h-3 bg-gray-800 rounded overflow-hidden relative">
                             <div className="absolute inset-0 bg-green-900/30" />
                            <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${stats.infection}%` }} />
                        </div>
                        <span className="text-xs font-bold">{Math.floor(stats.infection)}%</span>
                    </div>

                    {/* Mobile Inventory Button - Left Side */}
                    <button onClick={toggleInventory} className="lg:hidden self-start mt-2 bg-gray-900/90 p-3 border border-gray-600 text-white shadow-lg active:scale-95 transition-transform rounded-lg">
                         <Briefcase size={24} />
                    </button>
                </div>

                {/* Top Right - Resources Summary & Mobile Pause */}
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2 pointer-events-auto">
                     <div className="flex items-center gap-2">
                        {/* Resources */}
                         <div className="flex gap-2">
                            <ResourceItem icon={RefreshCw} count={stats.scraps} label={t.res_scraps} />
                         </div>
                         
                         {/* Mobile Pause Button - Right Side */}
                         <button onClick={togglePause} className="lg:hidden bg-gray-900/90 p-2 border border-gray-600 text-white shadow-lg active:scale-95 transition-transform rounded-lg h-full flex items-center justify-center">
                             <Pause size={20} />
                        </button>
                     </div>
                     <div className="text-[10px] text-gray-500 uppercase tracking-widest bg-black/50 px-2 py-1 rounded-full">{t.sector}</div>
                     {/* Save Indicator */}
                     {showSaveIndicator && (
                        <div className="text-[10px] text-green-500 uppercase tracking-widest flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full animate-pulse">
                            <Save size={10} /> {t.game_saved}
                        </div>
                     )}
                </div>

                {/* Mobile Action Controls (Right Side) */}
                <div className="absolute top-1/2 -translate-y-1/2 right-4 pointer-events-auto lg:hidden z-10 flex flex-row items-end gap-4">
                    {/* Interact Button - Smaller, next to action */}
                    {canInteract && !showBaseOrLab && (
                        <button 
                            onClick={handleMobileInteract} 
                            className="w-10 h-10 mb-2 rounded-full border-2 bg-orange-900/90 border-orange-500 text-orange-100 flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-pulse"
                        >
                            <Hand size={16} />
                        </button>
                    )}

                     {/* Action Toggle (Pickaxe/Sword) */}
                    <button 
                        onClick={() => setMobileActionMode(prev => prev === 'MINE' ? 'ATTACK' : 'MINE')}
                        className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shadow-xl transition-all ${mobileActionMode === 'MINE' ? 'bg-cyan-900/80 border-cyan-400 shadow-[0_0_15px_rgba(0,255,255,0.4)]' : 'bg-red-900/80 border-red-500 shadow-[0_0_15px_rgba(255,0,0,0.4)]'}`}
                    >
                        {mobileActionMode === 'MINE' ? <Pickaxe size={24} /> : <Sword size={24} />}
                        <span className="text-[10px] font-bold uppercase mt-1">{mobileActionMode === 'MINE' ? 'MINE' : 'FIGHT'}</span>
                    </button>
                </div>
            </div>
        )}

        {/* MAIN MENU */}
        {gameState === GameState.MENU && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50">
                <div className="max-w-md w-[90%] p-6 border-2 border-red-900 bg-gray-900/80 backdrop-blur text-center relative overflow-hidden shadow-[0_0_50px_rgba(100,0,0,0.5)] rounded-2xl animate-border-pulse">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />
                    <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter text-red-600 uppercase glitch-text drop-shadow-lg">{t.title}</h1>
                    <p className="text-gray-400 text-xs md:text-sm mb-8 tracking-widest uppercase">{t.subtitle}</p>
                    
                    {hasSave && (
                        <button 
                            onClick={handleContinue}
                            className="w-full bg-green-900/80 hover:bg-green-800 border border-green-600 text-green-100 font-bold py-4 px-6 mb-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:tracking-widest shadow-lg"
                        >
                            <Save size={20} /> {t.resume_signal}
                        </button>
                    )}

                    <button 
                        onClick={handleStart}
                        className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-4 px-6 mb-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:tracking-widest shadow-lg"
                    >
                        <Play size={20} /> {t.init_suit}
                    </button>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <button onClick={toggleLanguage} className="p-2 border border-gray-700 hover:bg-gray-800 flex items-center justify-center gap-2 text-xs text-gray-300 rounded-lg">
                            <Globe size={14} /> {language.toUpperCase()}
                        </button>
                        <div className="flex gap-1">
                             <button onClick={toggleSfx} className={`flex-1 p-2 border border-gray-700 flex items-center justify-center rounded-l-lg ${volume.sfx === 0 ? 'text-gray-600' : 'text-white'}`}>
                                {volume.sfx === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                             </button>
                             <button onClick={toggleAmbience} className={`flex-1 p-2 border border-gray-700 flex items-center justify-center rounded-r-lg ${volume.ambience === 0 ? 'text-gray-600' : 'text-white'}`}>
                                {volume.ambience === 0 ? <VolumeX size={14} /> : <Volume1 size={14} />}
                             </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* LOCATION SELECT - NARROW VERSION */}
        {gameState === GameState.LOCATION_SELECT && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-4">
                <div className="max-w-sm w-[85%] border-2 border-cyan-900 bg-gray-950 relative shadow-[0_0_60px_rgba(0,200,255,0.15)] rounded-xl animate-border-pulse">
                    <button onClick={() => setGameState(GameState.PLAYING)} className="absolute top-2 right-2 text-gray-500 hover:text-white"><X size={24} /></button>
                    <div className="p-4 border-b border-cyan-900/50 flex items-center gap-2">
                        <Move className="text-cyan-400" />
                        <h2 className="text-xl font-bold text-cyan-500 tracking-widest uppercase">{t.deployment}</h2>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                        {currentStage !== 'OUTSIDE' && (
                        <button 
                            onClick={() => confirmTravel('OUTSIDE')}
                            className="group relative h-28 bg-gradient-to-b from-gray-900 to-black border border-gray-700 hover:border-cyan-500 transition-all rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2"
                        >
                            <ArrowUpFromLine size={32} className="text-cyan-500 group-hover:-translate-y-1 transition-transform" />
                            <div className="text-center">
                                <div className="font-bold text-white tracking-widest">{t.surface}</div>
                                <div className="text-[10px] text-cyan-500 font-mono mt-1 uppercase">{t.inverted}</div>
                            </div>
                        </button>
                        )}
                        
                        {currentStage !== 'MINE' && (
                        <button 
                            onClick={() => confirmTravel('MINE')}
                            className="group relative h-28 bg-gradient-to-b from-gray-900 to-black border border-gray-700 hover:border-orange-500 transition-all rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2"
                        >
                            <Pickaxe size={32} className="text-orange-500 group-hover:rotate-12 transition-transform" />
                            <div className="text-center">
                                <div className="font-bold text-white tracking-widest">{t.mine}</div>
                                <div className="text-[10px] text-orange-500 font-mono mt-1 uppercase">{t.standard}</div>
                            </div>
                        </button>
                        )}

                        {currentStage !== 'BASE' && (
                         <button 
                            onClick={() => confirmTravel('BASE')}
                            className="group relative h-28 bg-gradient-to-b from-gray-900 to-black border border-gray-700 hover:border-red-500 transition-all rounded-lg overflow-hidden flex flex-col items-center justify-center gap-2"
                        >
                            <Home size={32} className="text-red-500 group-hover:scale-110 transition-transform" />
                            <div className="text-center">
                                <span className="font-bold text-white tracking-widest">{t.base}</span>
                                <div className="text-[10px] text-red-500 font-mono mt-1 uppercase">{t.safe_zone}</div>
                            </div>
                        </button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* BASE MENU - Updated for Mobile sizing */}
        {gameState === GameState.BASE_MENU && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-40 p-2 md:p-8">
                <div className="w-[98%] md:w-[95%] max-w-5xl h-auto max-h-[85vh] flex flex-col bg-gray-950 border-2 border-red-900 rounded-xl overflow-hidden shadow-2xl animate-border-pulse relative">
                    <button onClick={() => toggleBaseUI(false)} className="absolute top-2 right-2 md:top-4 md:right-4 text-gray-500 hover:text-white z-10 bg-black/50 rounded-full p-1"><X size={20} /></button>
                    
                    {/* Header */}
                    <div className="bg-gray-900 p-2 md:p-6 border-b border-red-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 text-red-500 mb-1">
                                <Wrench size={20} className="md:w-6 md:h-6" />
                                <h2 className="text-xl md:text-3xl font-black tracking-tighter">{t.engineering}</h2>
                            </div>
                            <div className="text-[10px] md:text-xs text-green-500 font-mono tracking-widest uppercase">{t.status_operational}</div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-sm bg-black/40 p-2 rounded-lg border border-gray-800 overflow-x-auto whitespace-nowrap">
                             <div className="flex items-center gap-1 md:gap-2"><RefreshCw size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/> {stats.scraps} <span className="hidden sm:inline text-gray-600">{t.res_scraps}</span></div>
                             <div className="flex items-center gap-1 md:gap-2"><Box size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/> {stats.iron} <span className="hidden sm:inline text-gray-600">{t.res_iron}</span></div>
                             <div className="flex items-center gap-1 md:gap-2"><Triangle size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/> {stats.wood} <span className="hidden sm:inline text-gray-600">{t.res_wood}</span></div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-800 shrink-0">
                        <button 
                            onClick={() => setBaseTab('upgrades')}
                            className={`flex-1 py-3 md:py-4 text-center font-bold tracking-widest text-xs md:text-base transition-colors ${baseTab === 'upgrades' ? 'bg-red-900/20 text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:bg-gray-900'}`}
                        >
                            {t.upgrade}
                        </button>
                        <button 
                            onClick={() => setBaseTab('fabrication')}
                            className={`flex-1 py-3 md:py-4 text-center font-bold tracking-widest text-xs md:text-base transition-colors ${baseTab === 'fabrication' ? 'bg-red-900/20 text-red-500 border-b-2 border-red-500' : 'text-gray-500 hover:bg-gray-900'}`}
                        >
                            {t.crafting}
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-black/50 lab-scroll min-h-0">
                        {baseTab === 'upgrades' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
                                {/* Suit Upgrades */}
                                {[
                                    { id: 'oxygen', icon: Wind, title: t.upg_oxygen, desc: t.upg_oxygen_desc, lvl: stats.oxygenLevel, max: 10 },
                                    { id: 'resistance', icon: Shield, title: t.upg_resistance, desc: t.upg_resistance_desc, lvl: stats.infectionResistanceLevel, max: 5 },
                                    { id: 'jump_boots', icon: ArrowUpFromLine, title: t.upg_boots, desc: t.upg_boots_desc, lvl: stats.highJumpBoots ? 1 : 0, max: 1 },
                                    { id: 'drill_speed', icon: Zap, title: t.upg_speed, desc: t.upg_speed_desc, lvl: stats.miningSpeedLevel, max: 5 },
                                    { id: 'drill_radius', icon: CircleDashed, title: t.upg_radius, desc: t.upg_radius_desc, lvl: stats.miningRadiusLevel, max: 5 },
                                    { id: 'drill_reach', icon: Move, title: t.upg_reach, desc: t.upg_reach_desc, lvl: stats.miningReachLevel, max: 5 },
                                    { id: 'scanner_luck', icon: Scan, title: t.upg_scanner, desc: t.upg_scanner_desc, lvl: stats.oreScannerLevel, max: 5 },
                                    { id: 'radar', icon: Crosshair, title: t.upg_radar, desc: t.upg_radar_desc, lvl: stats.unlockedRooms.includes('radar') ? 1 : 0, max: 1 },
                                    { id: 'fabricator', icon: Hammer, title: t.upg_fabricator, desc: t.upg_fabricator_desc, lvl: stats.inventoryLevel, max: 1 },
                                    // Base Upgrades
                                    { id: 'base_expand', icon: Home, title: t.upg_expand, desc: t.upg_expand_desc, lvl: stats.baseExpansionLevel + 1, max: 5 },
                                    { id: 'storage_bay', icon: Container, title: t.upg_storage, desc: t.upg_storage_desc, lvl: stats.storageLevel + 1, max: 5 },
                                    { id: 'decon_unit', icon: Biohazard, title: t.upg_decon, desc: t.upg_decon_desc, lvl: stats.hasDecontaminationUnit ? 1 : 0, max: 1 },
                                    { id: 'hyperloop', icon: ChevronsRight, title: t.upg_hyperloop, desc: t.upg_hyperloop_desc, lvl: stats.loadingSpeedLevel, max: 5 },
                                    // Lab Key
                                    { id: 'lab_key', icon: Cpu, title: t.item_lab_key, desc: t.item_lab_key_desc, lvl: stats.unlockedLab ? 1 : 0, max: 1 },
                                ].map((u) => {
                                    const cost = getDynamicCost(u.id);
                                    const isMaxed = u.lvl >= u.max;
                                    const canBuy = !isMaxed && cost && canAfford(cost);

                                    return (
                                        <div key={u.id} className={`bg-gray-900 border ${isMaxed ? 'border-green-900/50 opacity-75' : 'border-gray-800'} p-3 md:p-4 rounded-xl flex flex-col gap-2 md:gap-3 group hover:border-red-900/50 transition-all`}>
                                            <div className="flex justify-between items-start">
                                                <div className="p-2 md:p-3 bg-black rounded-lg border border-gray-800 text-red-500">
                                                    <u.icon size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div className="text-[10px] md:text-xs font-bold text-gray-600 bg-black px-2 py-1 rounded">LVL {u.lvl}</div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-sm md:text-base text-gray-200">{u.title}</h3>
                                                <p className="text-[10px] md:text-xs text-gray-500 mt-1 h-8 leading-tight">{u.desc}</p>
                                            </div>
                                            <div className="mt-auto pt-2 md:pt-4 border-t border-gray-800">
                                                {isMaxed ? (
                                                     <div className="w-full py-2 text-center text-green-700 font-bold text-[10px] md:text-xs bg-green-950/20 rounded border border-green-900/30">MAX LEVEL</div>
                                                ) : (
                                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                                        {renderCost(cost)}
                                                        <button 
                                                            onClick={() => upgradeBase(u.id)}
                                                            className={`px-3 py-1.5 md:px-4 md:py-2 rounded font-bold text-[10px] md:text-xs transition-colors ml-auto ${canBuy ? 'bg-red-900 hover:bg-red-800 text-white' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                                                        >
                                                            {canBuy ? t.buy : t.need}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="space-y-3 md:space-y-4">
                                {CRAFTING_RECIPES.filter(r => r.type !== 'consumable').map(recipe => {
                                    // Safety checks for fabrication rendering to prevent black screen
                                    const recipeId = recipe?.id;
                                    if (!recipeId) return null;

                                    const isWeapon = recipe.type === 'weapon';
                                    const isUpgrade = recipe.type === 'upgrade';
                                    
                                    let isOwned = false;
                                    try {
                                        if (isWeapon && recipe.weaponId) {
                                            isOwned = stats.unlockedWeapons.includes(recipe.weaponId);
                                        } else if (isUpgrade && recipe.statKey) {
                                            // Handle boolean vs number stats safely
                                            const val = stats[recipe.statKey];
                                            isOwned = !!val;
                                        }
                                    } catch (e) {
                                        console.error("Error checking ownership", e);
                                    }

                                    const isLocked = recipe.reqLevel > stats.inventoryLevel;
                                    const canCraft = !isLocked && !isOwned && canAfford(recipe.cost);

                                    let title = recipe.id;
                                    let desc = "";
                                    let Icon = Box;
                                    if (recipe.id === 'lantern') { title = t.item_lantern; desc = t.item_lantern_desc; Icon = Lightbulb; }
                                    else if (recipe.id === 'lab_key') { title = t.item_lab_key; desc = t.item_lab_key_desc; Icon = Cpu; }
                                    else if (recipe.id === 'weapon_sword') { title = t.wpn_sword; desc = t.wpn_sword_desc; Icon = Sword; }
                                    else if (recipe.id === 'weapon_force') { title = t.wpn_force; desc = t.wpn_force_desc; Icon = Hand; }
                                    else if (recipe.id === 'weapon_laser') { title = t.wpn_laser; desc = t.wpn_laser_desc; Icon = Zap; }

                                    return (
                                        <div key={recipe.id} className="bg-gray-900 border border-gray-800 p-3 md:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 md:gap-4">
                                                <div className={`p-2 md:p-3 rounded-lg border ${isOwned ? 'bg-green-950/20 border-green-900/50 text-green-500' : 'bg-black border-gray-800 text-gray-400'}`}>
                                                    <Icon size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-sm md:text-base text-gray-200">{title}</h3>
                                                    <p className="text-[10px] md:text-xs text-gray-500">{desc}</p>
                                                    {isLocked && <div className="text-[10px] text-red-500 mt-1 font-bold">{t.locked_fab}</div>}
                                                </div>
                                            </div>
                                            
                                            {isOwned ? (
                                                <div className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-800 rounded text-[10px] md:text-xs text-gray-400 font-bold border border-gray-700 text-center">{t.crafted}</div>
                                            ) : (
                                                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 w-full sm:w-auto">
                                                    {renderCost(recipe.cost)}
                                                    <button 
                                                        onClick={() => craftItem(recipe.id)}
                                                        disabled={!canCraft}
                                                        className={`px-4 py-1.5 md:px-6 md:py-2 rounded font-bold text-[10px] md:text-xs ${canCraft ? 'bg-red-900 hover:bg-red-800 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                                                    >
                                                        {isLocked ? t.locked : t.craft}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* LAB MENU (Bio-Laboratory) - Updated for Mobile sizing */}
        {gameState === GameState.LAB_MENU && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-40 p-2 md:p-8">
                <div className="w-[98%] md:w-[95%] max-w-5xl h-auto max-h-[85vh] flex flex-col bg-gray-950 border-2 border-green-900 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,100,0,0.2)] animate-border-pulse-green relative">
                    <button onClick={() => toggleBaseUI(false)} className="absolute top-2 right-2 md:top-4 md:right-4 text-gray-500 hover:text-white z-10 bg-black/50 rounded-full p-1"><X size={20} /></button>
                    
                    {/* Header */}
                    <div className="bg-gray-900 p-2 md:p-6 border-b border-green-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 text-green-500 mb-1">
                                <FlaskConical size={20} className="md:w-6 md:h-6" />
                                <h2 className="text-xl md:text-3xl font-black tracking-tighter">{t.laboratory}</h2>
                            </div>
                            <div className="text-[10px] md:text-xs text-green-700 font-mono tracking-widest uppercase">{t.status_operational}</div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-4 text-[10px] md:text-sm bg-black/40 p-2 rounded-lg border border-gray-800 overflow-x-auto whitespace-nowrap">
                             <div className="flex items-center gap-1 md:gap-2"><RefreshCw size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/> {stats.scraps} <span className="hidden sm:inline text-gray-600">{t.res_scraps}</span></div>
                             <div className="flex items-center gap-1 md:gap-2"><Lightbulb size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/> {stats.coal} <span className="hidden sm:inline text-gray-600">{t.res_coal}</span></div>
                             <div className="flex items-center gap-1 md:gap-2"><Droplet size={12} className="text-gray-400 md:w-3.5 md:h-3.5"/> {stats.ice} <span className="hidden sm:inline text-gray-600">{t.res_ice}</span></div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-gray-800 shrink-0">
                        <button 
                            onClick={() => setLabTab('brewing')}
                            className={`flex-1 py-3 md:py-4 text-center font-bold tracking-widest text-xs md:text-base transition-colors ${labTab === 'brewing' ? 'bg-green-900/20 text-green-500 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-900'}`}
                        >
                            <FlaskConical className="inline mr-2 w-3 h-3 md:w-4 md:h-4" /> {t.brewing}
                        </button>
                        <button 
                            onClick={() => setLabTab('research')}
                            className={`flex-1 py-3 md:py-4 text-center font-bold tracking-widest text-xs md:text-base transition-colors ${labTab === 'research' ? 'bg-green-900/20 text-green-500 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-900'}`}
                        >
                            <TestTube className="inline mr-2 w-3 h-3 md:w-4 md:h-4" /> {t.research}
                        </button>
                    </div>

                    {/* Content - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-2 md:p-6 bg-black/50 lab-scroll min-h-0">
                        {labTab === 'brewing' ? (
                             <div className="space-y-3 md:space-y-4">
                                {CRAFTING_RECIPES.filter(r => r.type === 'consumable').map(recipe => {
                                    // Safety check
                                    if (!recipe?.id) return null;

                                    const isLocked = recipe.reqLevel > stats.labLevel;
                                    const canCraft = !isLocked && canAfford(recipe.cost);
                                    
                                    let title = recipe.id;
                                    let desc = "";
                                    let Icon = Box;

                                    if (recipe.id === 'repair_kit') { title = t.item_repair; desc = t.item_repair_desc; Icon = Wrench; }
                                    else if (recipe.id === 'oxygen_tank') { title = t.item_tank; desc = t.item_tank_desc; Icon = Wind; }
                                    else if (recipe.id === 'health_injection') { title = t.item_injection; desc = t.item_injection_desc; Icon = Syringe; }
                                    else if (recipe.id === 'purifier') { title = t.item_purifier; desc = t.item_purifier_desc; Icon = Droplet; }
                                    else if (recipe.id === 'immunity_booster') { title = t.item_booster; desc = t.item_booster_desc; Icon = Shield; }

                                    return (
                                        <div key={recipe.id} className="bg-gray-900 border border-gray-800 p-3 md:p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between group hover:border-green-900/30 transition-all gap-3">
                                            <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
                                                <div className={`p-2 md:p-3 rounded-lg border ${isLocked ? 'bg-black border-gray-800 text-gray-600' : 'bg-green-950/20 border-green-900/30 text-green-500'}`}>
                                                    <Icon size={20} className="md:w-6 md:h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-sm md:text-base text-gray-200">{title}</h3>
                                                        {stats[recipe.statKey!] ? (
                                                            <span className="text-[10px] bg-black px-1 rounded text-gray-500 border border-gray-800">x{stats[recipe.statKey!]}</span>
                                                        ) : null}
                                                    </div>
                                                    <p className="text-[10px] md:text-xs text-gray-500">{desc}</p>
                                                    {isLocked && <div className="text-[10px] text-red-500 mt-1 font-bold">{t.locked_lab} {recipe.reqLevel}</div>}
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-center">
                                                {!isLocked && (
                                                    <button onClick={() => openInfoModal(title, desc, recipe.cost)} className="p-1 text-gray-600 hover:text-white hidden sm:block">
                                                        <Info size={16} />
                                                    </button>
                                                )}
                                                {renderCost(recipe.cost)}
                                                <button 
                                                    onClick={() => craftItem(recipe.id)}
                                                    disabled={!canCraft}
                                                    className={`px-4 py-1.5 md:px-6 md:py-2 rounded font-bold text-[10px] md:text-xs ml-2 sm:ml-0 ${canCraft ? 'bg-blue-900 hover:bg-blue-800 text-blue-100' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                                                >
                                                    {isLocked ? t.locked : t.craft}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                             </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { id: 'lab_research', icon: TestTube, title: t.upg_lab, desc: t.upg_lab_desc, lvl: stats.labLevel, max: 5 },
                                ].map((u) => {
                                     const cost = getDynamicCost(u.id);
                                     const isMaxed = u.lvl >= u.max;
                                     const canBuy = !isMaxed && cost && canAfford(cost);

                                     return (
                                        <div key={u.id} className={`bg-gray-900 border ${isMaxed ? 'border-green-900/50 opacity-75' : 'border-gray-800'} p-4 md:p-6 rounded-xl flex flex-col gap-4 group hover:border-green-500/30 transition-all`}>
                                            <div className="flex justify-between items-start">
                                                <div className="p-3 md:p-4 bg-black rounded-lg border border-gray-800 text-green-500">
                                                    <u.icon size={24} className="md:w-8 md:h-8" />
                                                </div>
                                                <div className="text-[10px] md:text-xs font-bold text-green-500 bg-green-950/30 px-3 py-1 rounded border border-green-900/50">LEVEL {u.lvl}</div>
                                            </div>
                                            <div>
                                                <h3 className="text-lg md:text-xl font-bold text-gray-200">{u.title}</h3>
                                                <p className="text-xs md:text-sm text-gray-500 mt-2">{u.desc}</p>
                                            </div>
                                            <div className="mt-auto pt-4 md:pt-6 border-t border-gray-800">
                                                {isMaxed ? (
                                                     <div className="w-full py-3 text-center text-green-400 font-bold text-xs bg-green-950/40 rounded border border-green-900">MAXIMUM RESEARCH</div>
                                                ) : (
                                                    <div className="flex flex-col gap-3">
                                                        {renderCost(cost)}
                                                        <button 
                                                            onClick={() => upgradeBase(u.id)}
                                                            className={`w-full py-2 md:py-3 rounded font-bold text-xs md:text-sm transition-colors ${canBuy ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                                                        >
                                                            {canBuy ? t.research : t.need}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                     );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* INVENTORY - Updated for Mobile Sizing */}
        {gameState === GameState.INVENTORY && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50 p-2 md:p-8">
                <div className="w-[98%] md:w-[95%] max-w-4xl h-auto max-h-[85vh] bg-gray-950 border-2 border-gray-800 rounded-xl overflow-hidden flex flex-col shadow-2xl relative">
                     <button onClick={toggleInventory} className="absolute top-2 right-2 md:top-4 md:right-4 text-gray-500 hover:text-white z-10 bg-black/50 rounded-full p-1"><X size={20} /></button>
                     <div className="p-4 md:p-6 border-b border-gray-800 flex items-center gap-3 shrink-0">
                         <Briefcase className="text-gray-400" />
                         <h2 className="text-xl md:text-2xl font-black tracking-tighter text-gray-200">{t.inventory}</h2>
                     </div>
                     
                     <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 overflow-y-auto">
                         {/* Equipment */}
                         <div>
                             <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-4 border-b border-gray-800 pb-2">{t.weapons}</h3>
                             <div className="space-y-2 md:space-y-3">
                                 {stats.unlockedWeapons.length === 0 && <div className="text-gray-600 italic text-xs md:text-sm">{t.inv_empty}</div>}
                                 {stats.unlockedWeapons.map(wId => {
                                     let name = "";
                                     let Icon = Sword;
                                     if (wId === 'sword') { name = t.wpn_sword; Icon = Sword; }
                                     else if (wId === 'force') { name = t.wpn_force; Icon = Hand; }
                                     else if (wId === 'laser') { name = t.wpn_laser; Icon = Zap; }
                                     
                                     const isEquipped = stats.equippedWeapon === wId;
                                     
                                     return (
                                         <div key={wId} className={`flex items-center justify-between p-2 md:p-3 rounded-lg border ${isEquipped ? 'bg-red-950/20 border-red-900/50' : 'bg-gray-900 border-gray-800'}`}>
                                             <div className="flex items-center gap-2 md:gap-3">
                                                 <Icon size={18} className={`md:w-5 md:h-5 ${isEquipped ? 'text-red-500' : 'text-gray-400'}`} />
                                                 <span className={`text-xs md:text-sm ${isEquipped ? 'text-red-100 font-bold' : 'text-gray-300'}`}>{name}</span>
                                             </div>
                                             {isEquipped ? (
                                                 <span className="text-[10px] bg-red-900 px-2 py-1 rounded text-white font-bold">{t.equipped}</span>
                                             ) : (
                                                 <button onClick={() => equipWeapon(wId)} className="text-[10px] md:text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-gray-300">{t.equip}</button>
                                             )}
                                         </div>
                                     );
                                 })}
                             </div>

                             <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-4 mt-6 md:mt-8 border-b border-gray-800 pb-2">{t.items}</h3>
                             <div className="grid grid-cols-2 gap-2 md:gap-3">
                                 {[
                                     { id: 'repair', count: stats.repairKits, name: t.item_repair, icon: Wrench, action: () => useItem('repair') },
                                     { id: 'tank', count: stats.oxygenTanks, name: t.item_tank, icon: Wind, action: () => useItem('oxygen_tank') },
                                     { id: 'injection', count: stats.healthInjections, name: t.item_injection, icon: Syringe, action: () => useItem('injection') },
                                     { id: 'booster', count: stats.immunityBoosters, name: t.item_booster, icon: Shield, action: () => useItem('booster') },
                                     { id: 'purifier', count: stats.purifiers, name: t.item_purifier, icon: Droplet, action: () => useItem('purifier') },
                                 ].map(item => (
                                     <div key={item.id} className="bg-gray-900 border border-gray-800 p-2 md:p-3 rounded-lg flex flex-col gap-1 md:gap-2">
                                         <div className="flex justify-between items-start">
                                             <item.icon size={18} className="text-gray-400 md:w-5 md:h-5" />
                                             <span className="text-xs md:text-sm font-bold text-gray-200">x{item.count}</span>
                                         </div>
                                         <div className="text-[10px] md:text-xs text-gray-400">{item.name}</div>
                                         <button 
                                            onClick={item.action} 
                                            disabled={item.count <= 0}
                                            className="mt-1 w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-[10px] md:text-xs py-1 rounded text-gray-300"
                                         >
                                             {t.use}
                                         </button>
                                     </div>
                                 ))}
                             </div>
                         </div>
                         
                         {/* Resources */}
                         <div>
                             <h3 className="text-xs md:text-sm font-bold text-gray-500 uppercase tracking-widest mb-2 md:mb-4 border-b border-gray-800 pb-2">{t.collected_res}</h3>
                             <div className="grid grid-cols-2 gap-2 md:gap-3">
                                 <ResourceItem icon={RefreshCw} count={stats.scraps} label={t.res_scraps} color="text-gray-400" />
                                 <ResourceItem icon={Box} count={stats.iron} label={t.res_iron} color="text-slate-400" />
                                 <ResourceItem icon={Triangle} count={stats.wood} label={t.res_wood} color="text-amber-800" />
                                 <ResourceItem icon={Lightbulb} count={stats.coal} label={t.res_coal} color="text-gray-600" />
                                 <ResourceItem icon={Droplet} count={stats.ice} label={t.res_ice} color="text-cyan-300" />
                                 <ResourceItem icon={Hexagon} count={stats.titanium} label={t.res_titanium} color="text-white" />
                                 <ResourceItem icon={Radiation} count={stats.uranium} label={t.res_uranium} color="text-green-500" />
                             </div>
                             
                             <div className="mt-6 md:mt-8 bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800">
                                 <h4 className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-300 mb-2"><HelpCircle size={14}/> {t.suit_diag}</h4>
                                 <div className="space-y-1 md:space-y-2 text-[10px] md:text-xs text-gray-500">
                                     <div className="flex justify-between"><span>{t.integrity}:</span> <span className="text-red-400">{Math.floor(stats.health)}/100</span></div>
                                     <div className="flex justify-between"><span>{t.oxygen}:</span> <span className="text-cyan-400">{Math.floor(stats.oxygen)}%</span></div>
                                     <div className="flex justify-between"><span>{t.corrosion}:</span> <span className="text-green-500">{Math.floor(stats.infection)}%</span></div>
                                 </div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        )}
        
        {/* PAUSE MENU */}
        {gameState === GameState.PAUSED && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-gray-900 border-2 border-red-900 p-8 rounded-xl text-center shadow-[0_0_30px_rgba(255,0,0,0.15)] max-w-sm w-full animate-border-pulse">
                    <h2 className="text-3xl font-black text-white mb-8 tracking-widest">{t.system_paused}</h2>
                    <div className="space-y-4">
                        <button onClick={togglePause} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                            <Play size={20} /> {t.resume_mission}
                        </button>
                        <button onClick={toggleLanguage} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold border border-gray-700">
                            <Globe size={16} /> {language.toUpperCase()}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={toggleSfx} className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg flex flex-col items-center gap-1 border border-gray-700">
                                {volume.sfx === 0 ? <VolumeX className="text-gray-500"/> : <Volume2 className="text-white"/>}
                                <span className="text-[10px] text-gray-400">{t.sfx}</span>
                             </button>
                             <button onClick={toggleAmbience} className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg flex flex-col items-center gap-1 border border-gray-700">
                                {volume.ambience === 0 ? <VolumeX className="text-gray-500"/> : <Volume1 className="text-white"/>}
                                <span className="text-[10px] text-gray-400">{t.ambience}</span>
                             </button>
                        </div>
                        {/* SUPER USER BUTTON */}
                        <button onClick={activateSuperUser} className="w-full bg-purple-900/50 hover:bg-purple-800 border border-purple-500 text-purple-100 font-bold py-3 rounded-lg flex items-center justify-center gap-2 mt-4 transition-all hover:scale-105 shadow-[0_0_15px_rgba(147,51,234,0.3)]">
                            <Zap size={20} /> {t.superuser}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* GAME OVER */}
        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-red-950/90 flex items-center justify-center z-50">
                <div className="text-center p-8 border-4 border-red-600 bg-black rounded-xl shadow-[0_0_100px_rgba(255,0,0,0.5)] max-w-md w-[90%]">
                    <Skull size={64} className="text-red-600 mx-auto mb-6 animate-bounce" />
                    <h1 className="text-5xl font-black text-red-600 mb-2 glitch-text">{t.you_died}</h1>
                    <p className="text-red-800 mb-8 font-mono">{t.integrity_failed}</p>
                    <button 
                        onClick={handleRespawn}
                        className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform w-full"
                    >
                        {t.respawn}
                    </button>
                </div>
            </div>
        )}

    </div>
  );
};

export default App;
