
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LivingMetalGame } from './components/LivingMetalGame';
import { GameState, PlayerStats, Language, HudLayout, HotbarSlot } from './types';
import { Play, Database, Shield, Lock, Hammer, Zap, Wind, Pickaxe, Droplet, Triangle, Scan, CircleDashed, Move, Flame, Eye, Pause, Hand, Hexagon, Radiation, Swords, Crosshair, AlertCircle, X, Skull, ArrowUpFromLine, Volume2, VolumeX, Volume1, Globe, Biohazard, RefreshCw, Briefcase, Wrench, HeartPulse, Box, Sword, Lightbulb, Cylinder, Syringe, Info, HelpCircle, Backpack, Home, ArrowRight, Loader2, Container, ChevronsRight, FlaskConical, TestTube, Cpu, Save, Terminal, ArrowRightLeft, ArrowLeft, Download, Upload, FastForward, Square, DoorOpen, Layout, RotateCw, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Package, Settings, GripHorizontal, Radar, User, Check, Rocket } from 'lucide-react';
import { BaseMenu } from './components/menus/BaseMenu';
import { LabMenu } from './components/menus/LabMenu';
import { StorageMenu } from './components/menus/StorageMenu';
import { InventoryMenu } from './components/menus/InventoryMenu';
import { LocationSelectMenu } from './components/menus/LocationSelectMenu';
import { MaintenanceMenu } from './components/menus/MaintenanceMenu';
import { generatePlayerSprites } from './game/assets';

// Default HUD Layout (Percentages)
const DEFAULT_HUD: HudLayout = {
    vitals: { x: 2, y: 2 },
    resources: { x: 98, y: 2 }, // Right aligned
    controls_left: { x: 4, y: 35 }, // Moved Higher
    controls_right: { x: 92, y: 35 }, // Moved Higher (Vertically Centered-ish)
};

const DEFAULT_HOTBAR: HotbarSlot[] = [
    { index: 0, itemKey: 'workbench', type: 'building' },
    { index: 1, itemKey: 'terminal', type: 'building' },
    { index: 2, itemKey: 'airlock', type: 'building' },
    { index: 3, itemKey: 'metal_block', type: 'building' },
    { index: 4, itemKey: 'lanterns', type: 'consumable' }
];

const INITIAL_STATS: PlayerStats = {
  characterId: 'crimson',
  health: 100,
  maxHealth: 100,
  oxygen: 100,
  oxygenLevel: 1,
  infection: 0,
  infectionResistanceLevel: 1,
  miningRadiusLevel: 1,
  miningReachLevel: 1,
  miningSpeedLevel: 1,
  highJumpBoots: false,
  inventoryLevel: 1,
  fabricationEfficiencyLevel: 1, 
  lanterns: 0,
  lanternTimeLeft: 0,
  teleporters: 0, 
  oreScanners: 0,
  unlockedLab: false, 
  baseExpansionLevel: 0, // Max 4
  loadingSpeedLevel: 1,
  deconLevel: 0, // Max 5, 0 = none
  storageLevel: 0, // Max 3
  labLevel: 1, 
  scraps: 0,
  wood: 0,
  iron: 0,
  ice: 0,
  coal: 0,
  titanium: 0,
  uranium: 0,
  rareSlime: 0, 
  storedResources: {
      scraps: 0, wood: 0, iron: 0, ice: 0, coal: 0, titanium: 0, uranium: 0, rareSlime: 0
  },
  storedItems: {
      lanterns: 0, teleporters: 0, oreScanners: 0, repairKits: 0, oxygenTanks: 0, healthInjections: 0, immunityBoosters: 0, purifiers: 0
  },
  repairKits: 0,
  oxygenTanks: 0,
  healthInjections: 0,
  immunityBoosters: 0,
  purifiers: 0,
  unlockedWeapons: [],
  equippedWeapon: 'none',
  baseLevel: 1,
  unlockedRooms: ['shelter'],
  
  // Base Systems
  baseIntegrity: 100,
  integrityLights: 100,
  integrityOxygen: 100,
  integritySystem: 100,
  decayRates: { hull: 1.0, lights: 1.0, oxygen: 1.0, system: 1.0 },

  scanResult: null,

  baseItems: {
      terminal: 1,
      workbench: 1, 
      airlock: 1,
      lab_station: 0,
      decon_machine: 0,
      storage_crate: 0,
      metal_block: 20,
      platform: 20 
  },
  baseLayout: [],
  hudLayout: DEFAULT_HUD,
  hotbarSlots: DEFAULT_HOTBAR
};

// ... (Rest of Recipe and Upgrade Constants - Unchanged)
type ResourceCost = { scraps?: number; iron?: number; wood?: number; ice?: number; coal?: number; titanium?: number; uranium?: number; rareSlime?: number };

const MAX_LEVEL = 10;

// SIGNIFICANTLY REDUCED PRICES (Approx ~45% of original)
const LEVELED_UPGRADES: Record<string, ResourceCost> = {
    oxygen: { scraps: 90, ice: 12 },
    drill_radius: { scraps: 180, coal: 15 },
    drill_reach: { scraps: 110, wood: 12 },
    drill_speed: { scraps: 150, iron: 15, coal: 12 },
    decon_unit: { scraps: 350, iron: 35, uranium: 7 }, 
    resistance: { scraps: 250, iron: 30, titanium: 5 },
    hyperloop: { scraps: 250, iron: 35, coal: 35 }, 
    fabricator: { scraps: 300, iron: 35, wood: 18 }, 
    fabrication_efficiency: { scraps: 220, iron: 22, coal: 14 }, 
    base_expand: { scraps: 450, iron: 70, titanium: 14 }, 
    storage_bay: { scraps: 130, wood: 45, iron: 22 }, 
};

const SINGLE_UPGRADES: Record<string, ResourceCost> = {
    jump_boots: { scraps: 350, iron: 35, ice: 22 },
    radar: { scraps: 200, iron: 25, ice: 18 },
};

interface BaseRecipe { id: string; cost: ResourceCost; output: number; reqLevel: number; }
interface ItemRecipe extends BaseRecipe { type: 'consumable' | 'upgrade' | 'building'; statKey: keyof PlayerStats | keyof PlayerStats['baseItems']; weaponId?: never; }
interface WeaponRecipe extends BaseRecipe { type: 'weapon'; weaponId: string; statKey?: never; }
type CraftingRecipe = ItemRecipe | WeaponRecipe;

const CRAFTING_RECIPES: CraftingRecipe[] = [
    { id: 'repair_kit', type: 'consumable', cost: { scraps: 15, iron: 5 }, output: 1, statKey: 'repairKits', reqLevel: 1 },
    { id: 'oxygen_tank', type: 'consumable', cost: { ice: 3, scraps: 6 }, output: 1, statKey: 'oxygenTanks', reqLevel: 1 },
    { id: 'ore_scanner', type: 'consumable', cost: { scraps: 25, iron: 5 }, output: 1, statKey: 'oreScanners', reqLevel: 1 },
    { id: 'health_injection', type: 'consumable', cost: { iron: 10, ice: 20 }, output: 1, statKey: 'healthInjections', reqLevel: 2 },
    { id: 'purifier', type: 'consumable', cost: { coal: 15, ice: 10 }, output: 1, statKey: 'purifiers', reqLevel: 2 },
    { id: 'immunity_booster', type: 'consumable', cost: { scraps: 10, coal: 5, ice: 5 }, output: 1, statKey: 'immunityBoosters', reqLevel: 3 },
    { id: 'lantern', type: 'consumable', cost: { scraps: 5, coal: 2 }, output: 1, statKey: 'lanterns', reqLevel: 0 },
    { id: 'weapon_sword', type: 'weapon', weaponId: 'sword', cost: { scraps: 100, iron: 40, wood: 20 }, output: 1, reqLevel: 1 },
    { id: 'weapon_force', type: 'weapon', weaponId: 'force', cost: { scraps: 200, titanium: 10 }, output: 1, reqLevel: 1 },
    { id: 'weapon_laser', type: 'weapon', weaponId: 'laser', cost: { scraps: 400, iron: 50, uranium: 10, titanium: 10 }, output: 1, reqLevel: 1 },
    { id: 'metal_block', type: 'building', cost: { scraps: 2 }, output: 1, statKey: 'metal_block', reqLevel: 1 },
    { id: 'platform_kit', type: 'building', cost: { iron: 1 }, output: 2, statKey: 'platform', reqLevel: 1 },
    { id: 'airlock_kit', type: 'building', cost: { iron: 50, scraps: 50 }, output: 1, statKey: 'airlock', reqLevel: 1 },
    { id: 'terminal_kit', type: 'building', cost: { iron: 50, titanium: 10 }, output: 1, statKey: 'terminal', reqLevel: 2 },
    { id: 'workbench_kit', type: 'building', cost: { iron: 30, wood: 10 }, output: 1, statKey: 'workbench', reqLevel: 1 },
    { id: 'lab_kit', type: 'building', cost: { iron: 100, ice: 50, coal: 50 }, output: 1, statKey: 'lab_station', reqLevel: 3 },
    { id: 'storage_kit', type: 'building', cost: { wood: 20, iron: 10 }, output: 1, statKey: 'storage_crate', reqLevel: 1 },
];

const TRANSLATIONS = {
    en: {
        title: "Crimson Inversion",
        subtitle: "Survive the Living Metal. Walk the Ceiling.",
        init_suit: "Initialize Suit",
        resume_signal: "Resume Signal",
        game_saved: "Progress Saved",
        system_paused: "SYSTEM PAUSED",
        req_lab_panel: "LABORATORY ACCESS REQUIRED",
        loading: "INITIALIZING TRAVEL SEQUENCE...",
        pressurizing: "PRESSURIZING...",
        sanitizing: "SANITIZING...",
        arriving: "ARRIVING...",
        item_repair: "Repair Kit",
        item_tank: "Oxygen Tank",
        item_scanner: "Ore Scanner",
        item_lantern: "Lantern",
        item_injection: "Health Injection",
        item_booster: "Immunity Booster",
        item_purifier: "Purifier",
        item_teleporter: "Teleporter",
        wpn_sword: "Plasma Sword",
        wpn_force: "Force Cannon",
        wpn_laser: "Mining Laser",
        upg_oxygen: "Oxygen Capacity",
        upg_radius: "Mining Radius",
        upg_reach: "Mining Reach",
        upg_speed: "Mining Speed",
        upg_resistance: "Infection Resist",
        upg_fabricator: "Inventory Space",
        upg_fab_eff: "Fabrication Eff.",
        upg_expand: "Base Expansion",
        upg_hyperloop: "Hyperloop Speed",
        upg_storage: "Storage Capacity",
        upg_radar: "Radar System",
        upg_boots: "High Jump Boots",
        upg_decon: "Decon. Unit",
        desc_decon: "Reduces infection rate in hostile zones.",
        desc_fab_eff: "Reduces resource cost for crafting and upgrades.",
        desc_expand: "Unlocks new rooms in the base (Left, Right, Up).",
        desc_storage: "Increases base storage by 300 slots.",
        desc_scanner: "Detects minerals in the current sector.",
        active: "ACTIVE",
        max_level: "MAX LEVEL",
        upgrade: "UPGRADE",
        craft: "CRAFT",
        use: "USE",
        inv_empty: "INVENTORY EMPTY",
        resources: "RESOURCES",
        items: "ITEMS",
        inventory: "INVENTORY",
        engineering: "ENGINEERING",
        laboratory: "LABORATORIO",
        storage: "STORAGE",
        deposit: "DEPOSIT",
        withdraw: "WITHDRAW",
        deployment: "DEPLOYMENT",
        surface: "SURFACE",
        inverted: "STANDARD GRAVITY",
        mine: "DEEP MINE",
        base: "BASE CAMP",
        safe_zone: "SAFE ZONE",
        crafting: "CRAFTING",
        build_terminal: "Maintenance St.",
        build_workbench: "Workbench",
        build_airlock: "Airlock Kit",
        build_lab: "Lab Station Kit",
        build_storage: "Storage Crate",
        build_block: "Metal Block",
        build_platform: "Platform",
        hotbar: "HOTBAR",
        hud_editor: "CUSTOMIZE HUD",
        reset_hud: "RESET LAYOUT",
        save_hud: "SAVE LAYOUT",
        need: "Need",
        missing_resources: "MISSING RESOURCES",
        res_scraps: "Scraps",
        res_iron: "Iron",
        res_wood: "Wood",
        res_ice: "Ice",
        res_coal: "Coal",
        res_titanium: "Titanium",
        res_uranium: "Uranium",
        res_rareSlime: "Rare Slime",
        sector: "Sector 7",
        you_died: "YOU DIED",
        integrity_failed: "SUIT INTEGRITY FAILED",
        respawn: "RESPAWN AT BASE",
        cheat_code: "ACCESS CODE",
        resume_mission: "RESUME MISSION",
        select_character: "SELECT OPERATIVE",
        char_crimson: "CRIMSON OPS",
        char_hazard: "BIO-HAZARD",
        char_cobalt: "COBALT HEAVY",
        char_stealth: "STEALTH RECON",
        deploy: "DEPLOY OPERATIVE",
        
        // New Translations
        loadout_config: "LOADOUT CONFIG",
        sys_ver: "SYS.VER.4.1.2 // SECURE",
        eng_online: "ENGINEERING // ONLINE",
        chem_synth: "CHEMISTRY SYNTHESIS // RESEARCH",
        vault_access: "SECURE VAULT ACCESS // CARGO",
        diagnostics: "Diagnostics",
        sys_monitor: "SYSTEM MONITOR // ONLINE",
        avail_resources: "Available Resources",
        fix: "Fix",
        crit_warning: "CRITICAL WARNING",
        crit_desc: "Structural failure imminent. Oxygen leaks detected.",
        travel_protocol: "SELECT DESTINATION // TRAVEL PROTOCOL",
        select_suit_config: "Select suit configuration for deployment",
        
        // Tabs
        tab_items: "Items",
        tab_build: "Build",
        tab_weapons: "Weapons",
        tab_resources: "Resources",
        
        // Inventory actions
        assign: "ASSIGN",
        select_slot_first: "SELECT SLOT FIRST",
        no_items_detected: "NO ITEMS DETECTED",
        select_assign_prompt: "SELECT ITEM TO ASSIGN TO SLOT",
        
        // Systems
        sys_hull: "Hull",
        sys_lights: "Lights",
        sys_oxygen: "Oxygen",
        sys_system: "System",
    },
    es: {
        title: "Inversión Carmesí",
        subtitle: "Sobrevive al Metal Viviente. Camina por el Techo.",
        init_suit: "Iniciar Traje",
        resume_signal: "Reanudar Señal",
        game_saved: "Progreso Guardado",
        system_paused: "SISTEMA PAUSADO",
        req_lab_panel: "ACCESO AL LABORATORIO REQUERIDO",
        loading: "INICIANDO SECUENCIA DE VIAJE...",
        pressurizing: "PRESURIZANDO...",
        sanitizing: "DESINFECTANDO...",
        arriving: "LLEGANDO...",
        item_repair: "Kit de Reparación",
        item_tank: "Tanque de Oxígeno",
        item_scanner: "Escáner Mineral",
        item_lantern: "Linterna",
        item_injection: "Inyección Salud",
        item_booster: "Potenciador Inm.",
        item_purifier: "Purificador",
        item_teleporter: "Teletransportador",
        wpn_sword: "Espada de Plasma",
        wpn_force: "Cañón de Fuerza",
        wpn_laser: "Láser Minero",
        upg_oxygen: "Capacidad Oxígeno",
        upg_radius: "Radio de Minería",
        upg_reach: "Alcance Minería",
        upg_speed: "Velocidad Minería",
        upg_resistance: "Resistencia Inf.",
        upg_fabricator: "Espacio Inventario",
        upg_fab_eff: "Eficiencia Fab.",
        upg_expand: "Expansión Base",
        upg_hyperloop: "Velocidad Hip.",
        upg_storage: "Capacidad Alm.",
        upg_radar: "Sistema Radar",
        upg_boots: "Botas Salto Alto",
        upg_decon: "Unidad Decon.",
        desc_decon: "Reduce la tasa de infección en zonas hostiles.",
        desc_fab_eff: "Reduce el coste de recursos para fabricar y mejorar.",
        desc_expand: "Desbloquea nuevas habitaciones en la base.",
        desc_storage: "Aumenta el almacenamiento base en 300.",
        desc_scanner: "Detecta minerales en el sector actual.",
        active: "ACTIVO",
        max_level: "NIVEL MÁXIMO",
        upgrade: "MEJORAR",
        craft: "FABRICAR",
        use: "USAR",
        inv_empty: "INVENTARIO VACÍO",
        resources: "RECURSOS",
        items: "OBJETOS",
        inventory: "INVENTARIO",
        engineering: "INGENIERÍA",
        laboratory: "LABORATORIO",
        storage: "ALMACÉN",
        deposit: "DEPOSITAR",
        withdraw: "RETIRAR",
        deployment: "DESPLIEGUE",
        surface: "SUPERFICIE",
        inverted: "GRAVEDAD ESTÁNDAR",
        mine: "MINA PROFUNDA",
        base: "BASE CAMP",
        safe_zone: "ZONA SEGURA",
        crafting: "FABRICACIÓN",
        build_terminal: "Est. Mantenimiento",
        build_workbench: "Mesa Trabajo",
        build_airlock: "Kit Esclusa",
        build_lab: "Kit Lab",
        build_storage: "Caja Alma.",
        build_block: "Bloque Metal",
        build_platform: "Plataforma",
        hotbar: "BARRA RÁPIDA",
        hud_editor: "PERSONALIZAR HUD",
        reset_hud: "REINICIAR DISEÑO",
        save_hud: "GUARDAR DISEÑO",
        need: "Necesitas",
        missing_resources: "RECURSOS FALTANTES",
        res_scraps: "Chatarra",
        res_iron: "Hierro",
        res_wood: "Madera Fósil",
        res_ice: "Cristal Hielo",
        res_coal: "Carbón",
        res_titanium: "Titanio",
        res_uranium: "Uranio",
        res_rareSlime: "Moco Raro",
        sector: "Sector 7",
        you_died: "HAS MUERTO",
        integrity_failed: "FALLO DE INTEGRIDAD",
        respawn: "REAPARECER EN BASE",
        cheat_code: "CÓDIGO DE ACCESO",
        resume_mission: "REANUDAR MISIÓN",
        select_character: "SELECCIONAR OPERATIVO",
        char_crimson: "CRIMSON OPS",
        char_hazard: "BIO-HAZARD",
        char_cobalt: "COBALT HEAVY",
        char_stealth: "STEALTH RECON",
        deploy: "DESPLEGAR OPERATIVO",

        // New Translations
        loadout_config: "CONFIGURACIÓN DE EQUIPO",
        sys_ver: "SIS.VER.4.1.2 // SEGURO",
        eng_online: "INGENIERÍA // EN LÍNEA",
        chem_synth: "SÍNTESIS QUÍMICA // INVESTIGACIÓN",
        vault_access: "ACCESO BÓVEDA // CARGA",
        diagnostics: "Diagnóstico",
        sys_monitor: "MONITOR SISTEMA // EN LÍNEA",
        avail_resources: "Recursos Disponibles",
        fix: "Reparar",
        crit_warning: "ADVERTENCIA CRÍTICA",
        crit_desc: "Fallo estructural inminente. Fugas de oxígeno detectadas.",
        travel_protocol: "SELECCIONAR DESTINO // PROTOCOLO DE VIAJE",
        select_suit_config: "Seleccionar configuración de traje para despliegue",

        // Tabs
        tab_items: "Objetos",
        tab_build: "Construir",
        tab_weapons: "Armas",
        tab_resources: "Recursos",
        
        // Inventory actions
        assign: "ASIGNAR",
        select_slot_first: "SELECCIONA RANURA",
        no_items_detected: "NO SE DETECTAN OBJETOS",
        select_assign_prompt: "SELECCIONA OBJETO PARA ASIGNAR A RANURA",
        
        // Systems
        sys_hull: "Casco",
        sys_lights: "Luces",
        sys_oxygen: "Oxígeno",
        sys_system: "Sistema",
    }
};

const RESOURCE_CONFIG: Record<string, { icon: any, color: string }> = {
    scraps: { icon: RefreshCw, color: "text-gray-400" },
    wood: { icon: Triangle, color: "text-amber-700" },
    iron: { icon: Box, color: "text-slate-400" },
    ice: { icon: Droplet, color: "text-cyan-300" },
    coal: { icon: Lightbulb, color: "text-gray-600" },
    titanium: { icon: Hexagon, color: "text-white" },
    uranium: { icon: Radiation, color: "text-green-500" },
    rareSlime: { icon: FlaskConical, color: "text-lime-400" }
};

const SAVE_KEY = 'crimson_save';

// Pre-generate previews for UI
const PLAYER_PREVIEWS: Record<string, string> = {};
const variations = generatePlayerSprites();
Object.keys(variations).forEach(key => {
    PLAYER_PREVIEWS[key] = variations[key].toDataURL();
});

// ANIMATED BACKGROUND COMPONENT
const MenuBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        const stars = Array.from({ length: 150 }, () => ({
            x: Math.random() * width,
            y: Math.random() * height,
            size: Math.random() * 2,
            alpha: Math.random()
        }));

        let lightningTimer = 0;
        let lightning: { points: {x: number, y: number}[], alpha: number } | null = null;

        const animate = () => {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);

            // Stars
            ctx.fillStyle = '#ffffff';
            stars.forEach(s => {
                s.alpha += (Math.random() - 0.5) * 0.05;
                s.alpha = Math.max(0.1, Math.min(1, s.alpha));
                ctx.globalAlpha = s.alpha;
                ctx.fillRect(s.x, s.y, s.size, s.size);
            });
            ctx.globalAlpha = 1.0;

            // Lightning / Laser Thunder
            if (lightning) {
                ctx.strokeStyle = `rgba(0, 255, 255, ${lightning.alpha})`;
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00ffff';
                ctx.beginPath();
                ctx.moveTo(lightning.points[0].x, lightning.points[0].y);
                for(let i=1; i<lightning.points.length; i++) {
                    ctx.lineTo(lightning.points[i].x, lightning.points[i].y);
                }
                ctx.stroke();
                ctx.shadowBlur = 0;
                
                lightning.alpha -= 0.1;
                if (lightning.alpha <= 0) lightning = null;
            } else {
                lightningTimer--;
                if (lightningTimer <= 0) {
                    if (Math.random() > 0.98) {
                        lightningTimer = Math.random() * 100 + 50;
                        const startX = Math.random() * width;
                        const points = [{x: startX, y: 0}];
                        let curX = startX;
                        let curY = 0;
                        while(curY < height) {
                            curX += (Math.random() - 0.5) * 100;
                            curY += Math.random() * 50 + 20;
                            points.push({x: curX, y: curY});
                        }
                        lightning = { points, alpha: 1.0 };
                    }
                }
            }

            requestAnimationFrame(animate);
        };

        const animationId = requestAnimationFrame(animate);
        
        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />;
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [stats, setStats] = useState<PlayerStats>(INITIAL_STATS);
  // ... (Other State Variables - Unchanged)
  const [canInteract, setCanInteract] = useState(false);
  const [interactionTrigger, setInteractionTrigger] = useState(0);
  const [cycleTrigger, setCycleTrigger] = useState(0); 
  const [language, setLanguage] = useState<Language>('es'); 
  const [hasSave, setHasSave] = useState(false);
  const [hudLayout, setHudLayout] = useState<HudLayout>(DEFAULT_HUD);
  
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const lastSaveNotificationTime = useRef<number>(0);
  // Timer for base infection reduction and oxygen damage
  const baseTickRef = useRef<number>(0);

  const [volume, setVolume] = useState({ sfx: 0.90, ambience: 0.90 });
  const [mobileActionMode, setMobileActionMode] = useState<'MINE' | 'ATTACK'>('MINE');

  const [currentStage, setCurrentStage] = useState<'OUTSIDE' | 'MINE' | 'BASE'>('BASE');
  const [requestedStage, setRequestedStage] = useState<'OUTSIDE' | 'MINE' | 'BASE' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [toast, setToast] = useState<{ message: string; visible: boolean } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [missingReqsModal, setMissingReqsModal] = useState<{ cost: ResourceCost; missing: string[] } | null>(null);
  const [infoModal, setInfoModal] = useState<{ title: string; desc: string; cost?: ResourceCost; missing?: string[] } | null>(null);
  
  const [baseTab, setBaseTab] = useState<'upgrades' | 'fabrication'>('upgrades');
  const [labTab, setLabTab] = useState<'brewing' | 'research'>('brewing');
  
  const [cheatCode, setCheatCode] = useState("");
  const [selectedHotbarIndex, setSelectedHotbarIndex] = useState<number | null>(null);
  const [hotbarExpanded, setHotbarExpanded] = useState(false); 
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);

  const uiAudioCtxRef = useRef<AudioContext | null>(null);
  const statsUpdateThrottleRef = useRef<number>(0);

  const t = TRANSLATIONS[language];

  const ITEM_ICONS: Record<string, any> = {
      terminal: Terminal,
      workbench: Hammer,
      airlock: DoorOpen,
      lab_station: FlaskConical,
      storage_crate: Container,
      metal_block: Square,
      platform: GripHorizontal,
      lanterns: Lightbulb,
      repairKits: Wrench,
      oxygenTanks: Wind,
      teleporters: Zap,
      oreScanners: Radar,
      healthInjections: Syringe,
      immunityBoosters: Shield,
      purifiers: Droplet,
  };

  useEffect(() => {
    try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) setHasSave(true);
    } catch (e) {
        console.error("Failed to read save", e);
    }
  }, []);

  // HOTBAR CLEANUP LOGIC
  useEffect(() => {
      let slotsChanged = false;
      const newSlots = stats.hotbarSlots.map(slot => {
          if (!slot.itemKey) return slot;
          
          let count = 0;
          if (slot.type === 'building') count = stats.baseItems[slot.itemKey as keyof typeof stats.baseItems] || 0;
          else if (slot.type === 'consumable') count = stats[slot.itemKey as keyof PlayerStats] as number || 0;
          else if (slot.type === 'weapon') return slot; 

          if (count <= 0) {
              slotsChanged = true;
              if (selectedHotbarIndex === slot.index) setSelectedHotbarIndex(null);
              return { ...slot, itemKey: null, type: 'building' as const };
          }
          return slot;
      });

      if (slotsChanged) {
          setStats(prev => ({ ...prev, hotbarSlots: newSlots }));
      }
  }, [stats.baseItems, stats.repairKits, stats.oxygenTanks, stats.lanterns, stats.healthInjections, stats.immunityBoosters, stats.purifiers, stats.teleporters, stats.oreScanners]);

  // LANTERN TIMER
  useEffect(() => {
    let timer: number | null = null;
    if (gameState === GameState.PLAYING && stats.lanternTimeLeft > 0) {
        timer = window.setInterval(() => {
            setStats(prev => ({
                ...prev,
                lanternTimeLeft: Math.max(0, prev.lanternTimeLeft - 1)
            }));
        }, 1000);
    }
    return () => {
        if (timer) clearInterval(timer);
    };
  }, [stats.lanternTimeLeft, gameState]);

  // STATS LOOP (BASE INTEGRITY, OXYGEN, INFECTION) - UPDATED FOR DIFFICULTY
  useEffect(() => {
      let loopTimer: number | null = null;
      if (gameState === GameState.PLAYING) {
          loopTimer = window.setInterval(() => {
              
              setStats(prev => {
                  let newIntegrity = prev.baseIntegrity;
                  const rates = prev.decayRates || { hull: 1.0, lights: 1.0, oxygen: 1.0, system: 1.0 };
                  let newLights = prev.integrityLights !== undefined ? prev.integrityLights : 100;
                  let newOxySys = prev.integrityOxygen !== undefined ? prev.integrityOxygen : 100;
                  let newMenuSys = prev.integritySystem !== undefined ? prev.integritySystem : 100;
                  let newOxygen = prev.oxygen;
                  let newInfection = prev.infection;
                  let newHealth = prev.health;

                  // Update Tick
                  baseTickRef.current = (baseTickRef.current + 1);

                  // BASE LOGIC
                  if (currentStage === 'BASE') {
                      const baseDecay = 0.03;
                      newIntegrity = Math.max(0, prev.baseIntegrity - (baseDecay * rates.hull));
                      if (Math.random() > 0.7) newLights = Math.max(0, newLights - (0.05 * rates.lights));
                      if (Math.random() > 0.7) newOxySys = Math.max(0, newOxySys - (0.05 * rates.oxygen));
                      if (Math.random() > 0.7) newMenuSys = Math.max(0, newMenuSys - (0.05 * rates.system));

                      if (newOxySys < 20) newOxygen = Math.max(0, newOxygen - 0.5);
                      if (newIntegrity < 10) newInfection = Math.min(100, newInfection + 0.1);

                      if (newOxySys >= 20) {
                          newOxygen = Math.min(100, newOxygen + 10);
                      }

                      if (baseTickRef.current % 3 === 0 && newInfection > 0 && newIntegrity >= 10) {
                          newInfection = Math.max(0, newInfection - 1);
                      }
                  } 
                  else {
                      // OUTSIDE / MINE LOGIC
                      // OXYGEN: 50% Faster drain (0.6 -> 0.9)
                      const baseDrain = 0.9;
                      const levelFactor = 1 + ((prev.oxygenLevel - 1) * 0.15);
                      const drainRate = baseDrain / levelFactor;
                      
                      newOxygen = Math.max(0, newOxygen - drainRate);

                      // OXYGEN DAMAGE: 10 HP every 2 seconds if Oxygen is 0
                      if (newOxygen <= 0) {
                          if (baseTickRef.current % 2 === 0) {
                              newHealth = Math.max(0, newHealth - 10);
                          }
                      }

                      // MINE LOGIC: Infection
                      if (currentStage === 'MINE') {
                          // INFECTION: Doubled rate (0.12 -> 0.24)
                          const resistBase = 1;
                          const deconBonus = (prev.deconLevel || 0) * 0.20; 
                          const upgradeBonus = (prev.infectionResistanceLevel - 1) * 0.15;
                          
                          const totalResist = resistBase + upgradeBonus + deconBonus;
                          const infectGain = 0.24 / totalResist;
                          
                          newInfection = Math.min(100, newInfection + infectGain);
                      }
                  }

                  // INFECTION DAMAGE: 5 HP every 1 second if Infection is 100
                  if (newInfection >= 100) {
                      newHealth = Math.max(0, newHealth - 5);
                  }

                  return {
                      ...prev,
                      baseIntegrity: newIntegrity,
                      integrityLights: newLights,
                      integrityOxygen: newOxySys,
                      integritySystem: newMenuSys,
                      oxygen: newOxygen,
                      infection: newInfection,
                      health: newHealth
                  };
              });

          }, 1000);
      }
      return () => { if (loopTimer) clearInterval(loopTimer); };
  }, [gameState, currentStage]);

  // ... (Save logic, Costs, Audio - Unchanged)

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

  const playUiSound = (type: 'upgrade' | 'install' | 'click' | 'craft' | 'ui_open' | 'ui_close' | 'error' | 'teleport' | 'consume') => {
      initUiAudio();
      if (!uiAudioCtxRef.current || volume.sfx <= 0) return;
      const ctx = uiAudioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      const vol = volume.sfx;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(type === 'click' ? 600 : 400, now);
      gain.gain.setValueAtTime(0.1 * vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
  };

  const toggleSfx = () => setVolume(prev => ({ ...prev, sfx: prev.sfx > 0 ? 0 : 0.90 }));
  const toggleAmbience = () => setVolume(prev => ({ ...prev, ambience: prev.ambience > 0 ? 0 : 0.90 }));
  const toggleLanguage = () => { playUiSound('click'); setLanguage(prev => prev === 'en' ? 'es' : 'en'); };
  const handleHotbarSelect = (index: number) => { playUiSound('click'); setSelectedHotbarIndex(prev => prev === index ? null : index); };

  const handleMobileInteract = () => setInteractionTrigger(prev => prev + 1);

  // ... (Keyboard handling - Unchanged)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (isLoading) return; 
        if (e.code === 'Escape') {
            setInfoModal(null); 
            setMissingReqsModal(null);
            if (gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU || gameState === GameState.STORAGE_MENU || gameState === GameState.MAINTENANCE_MENU) {
                toggleBaseUI(false);
            } else if (gameState === GameState.LOCATION_SELECT || gameState === GameState.INVENTORY) {
                playUiSound('click');
                setGameState(GameState.PLAYING);
            } else if (gameState === GameState.PLAYING) {
                setGameState(GameState.PAUSED);
            } else if (gameState === GameState.PAUSED) {
                setGameState(GameState.PLAYING);
            } else if (gameState === GameState.HUD_EDITOR) {
                setGameState(GameState.PAUSED);
            }
        }
        
        if (e.code === 'KeyE') {
             if (gameState === GameState.PLAYING || gameState === GameState.INVENTORY) {
                toggleInventory();
            }
        }
        
        if (e.code === 'KeyF') {
             if (gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU || gameState === GameState.STORAGE_MENU || gameState === GameState.MAINTENANCE_MENU) {
                toggleBaseUI(false);
            }
             else if (gameState === GameState.LOCATION_SELECT || gameState === GameState.INVENTORY) {
                playUiSound('click');
                setGameState(GameState.PLAYING);
            }
            else if (gameState === GameState.PLAYING) {
                handleMobileInteract();
            }
        }

        if (gameState === GameState.PLAYING) {
            if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) {
                const idx = parseInt(e.code.replace('Digit', '')) - 1;
                handleHotbarSelect(idx);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, isLoading]);

  const handleStart = () => {
    initUiAudio();
    playUiSound('click');
    setStats(INITIAL_STATS); 
    setHudLayout(DEFAULT_HUD);
    setRequestedStage('BASE'); 
    setGameState(GameState.CHARACTER_SELECT);
    setSelectedCharacter('crimson'); // Default selection
  };

  const handleCharacterClick = (id: string) => {
      playUiSound('click');
      setSelectedCharacter(id);
  };

  const handleDeploy = () => {
      if (selectedCharacter) {
          // Removed duplicate sound call here
          setStats(prev => ({ ...prev, characterId: selectedCharacter }));
          setGameState(GameState.PLAYING);
      }
  };

  // ... (Handle Continue, UpdateStats, UI Toggles - Unchanged)
  const handleContinue = () => {
    initUiAudio();
    const save = localStorage.getItem(SAVE_KEY);
    if (save) {
        try {
            const data = JSON.parse(save);
            if (data.stats) {
                const loadedStats = { ...INITIAL_STATS, ...data.stats };
                if (!loadedStats.hotbarSlots) loadedStats.hotbarSlots = DEFAULT_HOTBAR;
                if (!loadedStats.baseItems.workbench) loadedStats.baseItems.workbench = 0;
                if (loadedStats.baseIntegrity === undefined) loadedStats.baseIntegrity = 100;
                if (loadedStats.integrityLights === undefined) loadedStats.integrityLights = 100;
                if (loadedStats.integrityOxygen === undefined) loadedStats.integrityOxygen = 100;
                if (loadedStats.integritySystem === undefined) loadedStats.integritySystem = 100;
                if (loadedStats.decayRates === undefined) loadedStats.decayRates = { hull: 1.0, lights: 1.0, oxygen: 1.0, system: 1.0 };
                // Default character ID for old saves
                if (!loadedStats.characterId) loadedStats.characterId = 'crimson';
                
                setStats(loadedStats);
                if (data.stats.hudLayout) setHudLayout(data.stats.hudLayout);
            }
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

  const handleUpdateStats = useCallback((newStats: Partial<PlayerStats>) => {
    const now = Date.now();
    if (newStats.baseLayout || newStats.baseItems || newStats.hotbarSlots) {
         setStats((prev) => ({ ...prev, ...newStats }));
         return;
    }
    if (now - statsUpdateThrottleRef.current > 100 || newStats.equippedWeapon || newStats.unlockedWeapons || (newStats.scraps !== undefined) || newStats.infection !== undefined) {
        setStats((prev) => ({ ...prev, ...newStats }));
        statsUpdateThrottleRef.current = now;
    }
  }, []);

  const toggleBaseUI = (isOpen: boolean, type: 'engineering' | 'lab' | 'storage' | 'maintenance' = 'engineering') => {
    const systemOffline = stats.integritySystem <= 0;
    
    if (isOpen && systemOffline && type !== 'maintenance') {
        playUiSound('error');
        setToast({ message: "SYSTEM ERROR: MENU OFFLINE", visible: true });
        setTimeout(() => setToast(null), 2000);
        return;
    }

    if (isOpen) {
        playUiSound('ui_open');
        if (stats.baseIntegrity > 20 && stats.integrityOxygen > 20) {
            handleUpdateStats({ oxygen: 100 }); 
        }
        if (type === 'engineering') {
            setGameState(GameState.BASE_MENU);
            setBaseTab('upgrades');
        } else if (type === 'storage') {
            setGameState(GameState.STORAGE_MENU);
        } else if (type === 'maintenance') {
            setGameState(GameState.MAINTENANCE_MENU);
        } else {
            // Lab is now always accessible if system is online
            setGameState(GameState.LAB_MENU);
            setLabTab('brewing');
        }
    } else {
        playUiSound('ui_close');
        setInfoModal(null);
        setMissingReqsModal(null);
        setGameState(GameState.PLAYING);
        setSelectedHotbarIndex(null);
    }
  };

  const toggleInventory = () => {
      initUiAudio(); 
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
    setCheatCode(""); 
    if (gameState === GameState.PLAYING) {
      setGameState(GameState.PAUSED);
    } else if (gameState === GameState.PAUSED) {
      setGameState(GameState.PLAYING);
    }
  };
  
  const toggleHudEditor = () => {
      playUiSound('click');
      if (gameState === GameState.HUD_EDITOR) {
          setGameState(GameState.PAUSED);
      } else {
          setGameState(GameState.HUD_EDITOR);
      }
  };

  const resetHud = () => setHudLayout(DEFAULT_HUD);

  const handleHudDrag = (key: keyof HudLayout, e: React.TouchEvent) => {
      const touch = e.touches[0];
      const w = window.innerWidth;
      const h = window.innerHeight;
      let x = (touch.clientX / w) * 100;
      let y = (touch.clientY / h) * 100;
      x = Math.round(x / 5) * 5;
      y = Math.round(y / 5) * 5;
      x = Math.max(0, Math.min(100, x));
      y = Math.max(0, Math.min(100, y));
      setHudLayout(prev => ({ ...prev, [key]: { x, y } }));
  };
  
  const redeemCheatCode = () => {
      if (cheatCode === "3213321456") {
          playUiSound('upgrade');
          setStats(prev => ({ ...prev, scraps: 99999, iron: 99999, wood: 99999, ice: 99999, coal: 99999, titanium: 99999, uranium: 99999, rareSlime: 999, teleporters: 5 }));
          setToast({ message: "UNLIMITED RESOURCES GRANTED", visible: true });
          setTimeout(() => setToast(null), 2500);
          setCheatCode("");
      } else {
          playUiSound('error');
          setToast({ message: "INVALID CODE", visible: true });
          setTimeout(() => setToast(null), 2000);
      }
  };

  const handleGameOver = () => setGameState(GameState.GAME_OVER);
  const handleRespawn = () => {
      setStats(prev => ({ ...prev, health: prev.maxHealth, oxygen: 100, infection: 0, scraps: 0, wood: 0, iron: 0, ice: 0, coal: 0, titanium: 0, uranium: 0, rareSlime: 0, repairKits: 0, oxygenTanks: 0, healthInjections: 0, immunityBoosters: 0, purifiers: 0, lanterns: 0, teleporters: 0, oreScanners: 0, baseIntegrity: 100, integrityLights: 100, integrityOxygen: 100, integritySystem: 100, scanResult: null }));
      setRequestedStage('BASE'); 
      setGameState(GameState.PLAYING);
  };
  const handleCycleInteract = () => { playUiSound('click'); setCycleTrigger(prev => prev + 1); };
  const handleLocationSelect = () => setGameState(GameState.LOCATION_SELECT);

  const confirmTravel = (destination: 'OUTSIDE' | 'MINE' | 'BASE') => {
      playUiSound('click');
      setGameState(GameState.PLAYING);
      setSelectedHotbarIndex(null);
      setIsLoading(true);
      setLoadingProgress(0);
      const speedLvl = stats.loadingSpeedLevel || 1;
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
      if (cost.rareSlime && stats.rareSlime < (cost.rareSlime || 0)) return false;
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
      if (cost.rareSlime && stats.rareSlime < (cost.rareSlime || 0)) missing.push(`${(cost.rareSlime || 0) - stats.rareSlime} ${t.res_rareSlime}`);
      return missing;
  };

  const openInfoModal = (title: string, desc: string, cost?: ResourceCost) => {
      playUiSound('click');
      setInfoModal({ title, desc, cost });
  };

  const showMissingReqs = (cost: ResourceCost) => {
      const missing = getMissingResources(cost);
      if (missing.length === 0) return;
      playUiSound('error');
      setMissingReqsModal({ cost, missing });
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
          rareSlime: prev.rareSlime - (cost.rareSlime || 0),
      }));
  };

  const craftItem = (recipeId: string) => {
      const recipe = CRAFTING_RECIPES.find(r => r.id === recipeId);
      if (!recipe) return;
      
      const efficiency = (stats.fabricationEfficiencyLevel || 1) - 1; 
      const discountFactor = Math.max(0.5, 1.0 - (efficiency * 0.1));
      
      const discountedCost: ResourceCost = {};
      Object.keys(recipe.cost).forEach(key => {
         const k = key as keyof ResourceCost;
         if (recipe.cost[k]) discountedCost[k] = Math.floor(recipe.cost[k]! * discountFactor);
      });

      if (!canAfford(discountedCost)) { showMissingReqs(discountedCost); return; }
      payCost(discountedCost);
      playUiSound('craft');
      
      if (recipe.type === 'weapon') {
          const wId = recipe.weaponId;
          if (wId) setStats(prev => ({ ...prev, unlockedWeapons: [...prev.unlockedWeapons, wId], equippedWeapon: wId }));
      } else if (recipe.type === 'upgrade') {
          const statKey = recipe.statKey;
          if (statKey) setStats(prev => ({ ...prev, [statKey]: true }));
      } else if (recipe.type === 'building') {
          const statKey = recipe.statKey as keyof PlayerStats['baseItems'];
          if (statKey) setStats(prev => ({ ...prev, baseItems: { ...prev.baseItems, [statKey]: prev.baseItems[statKey] + recipe.output } }));
      } else {
          const statKey = recipe.statKey as keyof PlayerStats;
          if (statKey) setStats(prev => ({ ...prev, [statKey]: (prev[statKey] as number) + recipe.output }));
      }
  };

  const equipWeapon = (wId: string) => { playUiSound('install'); setStats(prev => ({ ...prev, equippedWeapon: wId })); };

  const useItem = (itemKey: keyof PlayerStats) => {
      if (isLoading) return; // Prevent usage during transitions

      const currentStats = stats; // Use current state from closure
      let used = false;
      let message = '';
      let error = '';
      const updates: Partial<PlayerStats> = {};

      if (itemKey === 'repairKits') {
          if (currentStats.repairKits > 0) {
              if (currentStats.health < currentStats.maxHealth) {
                  updates.repairKits = currentStats.repairKits - 1;
                  updates.health = Math.min(currentStats.maxHealth, currentStats.health + 25);
                  used = true; message = "SUIT REPAIRED";
              } else error = "HEALTH FULL";
          }
      } 
      else if (itemKey === 'healthInjections') {
          if (currentStats.healthInjections > 0) {
              if (currentStats.health < currentStats.maxHealth) {
                  updates.healthInjections = currentStats.healthInjections - 1;
                  updates.health = Math.min(currentStats.maxHealth, currentStats.health + 50);
                  used = true; message = "HEALTH RESTORED";
              } else error = "HEALTH FULL";
          }
      }
      else if (itemKey === 'oxygenTanks') {
           if (currentStats.oxygenTanks > 0) {
               if (currentStats.oxygen < 100) {
                   updates.oxygenTanks = currentStats.oxygenTanks - 1;
                   updates.oxygen = Math.min(100, currentStats.oxygen + 50);
                   used = true; message = "OXYGEN REFILLED";
               } else error = "OXYGEN FULL";
           }
      }
      else if (itemKey === 'purifiers') {
          if (currentStats.purifiers > 0) {
              if (currentStats.infection > 0) {
                  updates.purifiers = currentStats.purifiers - 1;
                  updates.infection = Math.max(0, currentStats.infection - 15);
                  used = true; message = "INFECTION REDUCED";
              } else error = "NO INFECTION";
          }
      }
      else if (itemKey === 'immunityBoosters') {
          if (currentStats.immunityBoosters > 0) {
              if (currentStats.infection > 0) {
                  updates.immunityBoosters = currentStats.immunityBoosters - 1;
                  updates.infection = Math.max(0, currentStats.infection - 40);
                  used = true; message = "INFECTION PURGED";
              } else error = "NO INFECTION";
          }
      }
      else if (itemKey === 'lanterns') {
          if (currentStats.lanterns > 0) {
              updates.lanterns = currentStats.lanterns - 1;
              updates.lanternTimeLeft = 120; // 2 minutes
              used = true; message = "LANTERN ACTIVATED";
          }
      }
      else if (itemKey === 'oreScanners') {
          if (currentStats.oreScanners > 0) {
              updates.oreScanners = currentStats.oreScanners - 1;
              let result = "NO SIGNAL DETECTED";
              if (currentStage === 'MINE') {
                  result = "DETECTED: IRON, COAL, ICE [HIGH DENSITY]";
                  if (Math.random() > 0.5) result = "DETECTED: TITANIUM, URANIUM [DEEP]";
              } else if (currentStage === 'OUTSIDE') {
                  result = "DETECTED: SCRAP, ICE [SURFACE]";
              } else {
                  result = "DETECTED: BASE MATERIALS [LOCAL]";
              }
              updates.scanResult = result;
              used = true; message = "SCAN COMPLETE";
          }
      }
      else if (itemKey === 'teleporters') {
          if (currentStats.teleporters > 0) {
              if (currentStage !== 'BASE') {
                  updates.teleporters = currentStats.teleporters - 1;
                  used = true; message = "EMERGENCY TELEPORT INITIATED";
              } else error = "ALREADY AT BASE";
          }
      }

      if (used) {
          setStats(prev => ({ ...prev, ...updates }));
          playUiSound('consume');
          setToast({ message, visible: true });
          setTimeout(() => { setToast(null); if (itemKey === 'oreScanners') setStats(s => ({...s, scanResult: null})); }, 2500);
          
          if (itemKey === 'teleporters') {
              confirmTravel('BASE');
          }
      } else if (error) {
          playUiSound('error');
          setToast({ message: error, visible: true });
          setTimeout(() => setToast(null), 2000);
      }
  };

  const getDynamicCost = (id: string) => {
      // ... same logic ...
      if (SINGLE_UPGRADES[id]) {
          if (id === 'jump_boots' && stats.highJumpBoots) return null;
          if (id === 'radar' && stats.unlockedRooms.includes('radar')) return null;
          return SINGLE_UPGRADES[id];
      }

      if (LEVELED_UPGRADES[id]) {
          let level = 1;
          let max = MAX_LEVEL;

          if (id === 'oxygen') level = stats.oxygenLevel;
          else if (id === 'drill_radius') level = stats.miningRadiusLevel;
          else if (id === 'drill_reach') level = stats.miningReachLevel;
          else if (id === 'drill_speed') level = stats.miningSpeedLevel;
          else if (id === 'resistance') level = stats.infectionResistanceLevel;
          else if (id === 'fabricator') level = stats.inventoryLevel;
          else if (id === 'fabrication_efficiency') level = stats.fabricationEfficiencyLevel;
          else if (id === 'hyperloop') level = stats.loadingSpeedLevel;
          else if (id === 'decon_unit') { level = stats.deconLevel || 0; max = 5; }
          else if (id === 'base_expand') { level = stats.baseExpansionLevel; max = 4; }
          else if (id === 'storage_bay') { level = stats.storageLevel; max = 3; }

          if (level >= max) return null;

          const base = LEVELED_UPGRADES[id];
          const scaled: ResourceCost = {};
          
          // Cost scaling: Base * (1 + (Level * 0.5)) for simplicity
          const multiplier = 1 + (level * 0.5);

          Object.keys(base).forEach(k => {
              const key = k as keyof ResourceCost;
              if (base[key]) scaled[key] = Math.floor(base[key]! * multiplier);
          });
          return scaled;
      }
      return null;
  };

  const upgradeBase = (type: string) => {
    const cost = getDynamicCost(type);
    if (!cost) return; 
    if (!canAfford(cost)) { showMissingReqs(cost); return; }
    payCost(cost);
    if (type === 'oxygen') setStats(prev => ({ ...prev, oxygenLevel: prev.oxygenLevel + 1 }));
    else if (type === 'drill_radius') setStats(prev => ({ ...prev, miningRadiusLevel: prev.miningRadiusLevel + 1 }));
    else if (type === 'drill_reach') setStats(prev => ({ ...prev, miningReachLevel: prev.miningReachLevel + 1 }));
    else if (type === 'drill_speed') setStats(prev => ({ ...prev, miningSpeedLevel: prev.miningSpeedLevel + 1 }));
    else if (type === 'resistance') setStats(prev => ({ ...prev, infectionResistanceLevel: prev.infectionResistanceLevel + 1 }));
    else if (type === 'fabricator') setStats(prev => ({ ...prev, inventoryLevel: prev.inventoryLevel + 1 }));
    else if (type === 'fabrication_efficiency') setStats(prev => ({ ...prev, fabricationEfficiencyLevel: prev.fabricationEfficiencyLevel + 1 }));
    else if (type === 'base_expand') setStats(prev => ({ ...prev, baseExpansionLevel: prev.baseExpansionLevel + 1 }));
    else if (type === 'hyperloop') setStats(prev => ({ ...prev, loadingSpeedLevel: prev.loadingSpeedLevel + 1 }));
    else if (type === 'storage_bay') setStats(prev => ({ ...prev, storageLevel: prev.storageLevel + 1 }));
    else if (type === 'radar') setStats(prev => ({ ...prev, unlockedRooms: [...prev.unlockedRooms, 'radar'] }));
    else if (type === 'jump_boots') setStats(prev => ({ ...prev, highJumpBoots: true }));
    else if (type === 'decon_unit') setStats(prev => ({ ...prev, deconLevel: (prev.deconLevel || 0) + 1 }));
    playUiSound('upgrade');
  };

  const depositItem = (key: string, amount: number, isAll: boolean) => {
      const pKey = key as keyof PlayerStats;
      const rKey = key as keyof typeof stats.storedResources;
      const current = stats[pKey] as number;
      if (typeof current !== 'number' || current <= 0) return;
      const toTransfer = isAll ? current : Math.min(amount, current);
      if (toTransfer <= 0) return;
      playUiSound('click');
      setStats(prev => ({ ...prev, [pKey]: (prev[pKey] as number) - toTransfer, storedResources: { ...prev.storedResources, [rKey]: prev.storedResources[rKey] + toTransfer } }));
  };

  const withdrawItem = (key: string, amount: number, isAll: boolean) => {
      const pKey = key as keyof PlayerStats;
      const rKey = key as keyof typeof stats.storedResources;
      const currentStored = stats.storedResources[rKey];
      if (currentStored <= 0) return;
      const toTransfer = isAll ? currentStored : Math.min(amount, currentStored);
      if (toTransfer <= 0) return;
      playUiSound('click');
      setStats(prev => ({ ...prev, [pKey]: (prev[pKey] as number) + toTransfer, storedResources: { ...prev.storedResources, [rKey]: prev.storedResources[rKey] - toTransfer } }));
  };

  const repairIntegrity = (system: string, amount: number, cost: ResourceCost) => {
      if (!canAfford(cost)) { showMissingReqs(cost); return; }
      payCost(cost);
      setStats(prev => {
          const update: Partial<PlayerStats> = {};
          const newRate = 0.8 + Math.random() * 0.7;
          const rates = { ...prev.decayRates };
          if (system === 'hull') { update.baseIntegrity = Math.min(100, prev.baseIntegrity + amount); rates.hull = newRate; }
          else if (system === 'lights') { update.integrityLights = Math.min(100, (prev.integrityLights || 0) + amount); rates.lights = newRate; }
          else if (system === 'oxygen') { update.integrityOxygen = Math.min(100, (prev.integrityOxygen || 0) + amount); rates.oxygen = newRate; }
          else if (system === 'system') { update.integritySystem = Math.min(100, (prev.integritySystem || 0) + amount); rates.system = newRate; }
          return { ...prev, ...update, decayRates: rates };
      });
      playUiSound('install');
  };

  const updateHotbarSlot = (index: number, itemKey: string | null, type: 'building' | 'consumable' | 'weapon') => {
      setStats(prev => {
          const newSlots = [...prev.hotbarSlots];
          newSlots[index] = { index, itemKey, type };
          return { ...prev, hotbarSlots: newSlots };
      });
      playUiSound('click');
  };

  const ResourceItem = ({ icon: Icon, count, label, color = "text-gray-400" }: any) => (
      <div className="flex items-center gap-1.5 bg-gray-900/80 p-1.5 rounded border border-gray-700/50 shadow-sm backdrop-blur-sm">
          <Icon size={14} className={color} />
          <span className="font-bold text-xs">{count}</span>
          <span className="text-[10px] text-gray-500 hidden sm:inline">{label}</span>
      </div>
  );

  const renderCost = (cost: ResourceCost | null) => {
    if (!cost) return null;
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
  const isStorageOpen = gameState === GameState.STORAGE_MENU;
  const isMaintenanceOpen = gameState === GameState.MAINTENANCE_MENU;
  const isHotbarConfigOpen = gameState === GameState.HOTBAR_CONFIG;
  const showBaseOrLab = isBaseOpen || isLabOpen || isStorageOpen || isMaintenanceOpen || isHotbarConfigOpen;

  const formatTime = (seconds: number) => {
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const selectedHotbarItem = selectedHotbarIndex !== null ? stats.hotbarSlots[selectedHotbarIndex] : null;
  const isHudEditor = gameState === GameState.HUD_EDITOR;
  const layout = hudLayout || DEFAULT_HUD;

  const getPosStyle = (key: keyof HudLayout) => ({
      position: 'absolute' as 'absolute',
      left: `${layout[key].x}%`,
      top: `${layout[key].y}%`,
      transform: key.includes('right') || key === 'resources' ? 'translateX(-100%)' : 'none',
      border: isHudEditor ? '2px dashed #00ff00' : 'none',
      backgroundColor: isHudEditor ? 'rgba(0, 255, 0, 0.2)' : 'transparent',
      zIndex: isHudEditor ? 100 : 20,
      touchAction: 'none',
      padding: isHudEditor ? '10px' : '0',
      pointerEvents: isHudEditor ? 'auto' : 'none' as 'auto' | 'none',
  });

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none text-white font-mono" onContextMenu={e => e.preventDefault()}>
        
        {isHudEditor && (
             <div className="absolute inset-0 z-10 pointer-events-none opacity-20" style={{
                 backgroundImage: 'linear-gradient(#00ff00 1px, transparent 1px), linear-gradient(90deg, #00ff00 1px, transparent 1px)',
                 backgroundSize: '5% 5%'
             }} />
        )}

        {(gameState === GameState.MENU || gameState === GameState.CHARACTER_SELECT) && <MenuBackground />}

        <LivingMetalGame
            gameState={gameState}
            stats={stats}
            onUpdateStats={handleUpdateStats}
            onToggleBase={toggleBaseUI}
            interactionTrigger={interactionTrigger}
            cycleTrigger={cycleTrigger}
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
            selectedHotbarItem={selectedHotbarItem}
            onUseItem={useItem}
        />

        {isLoading && (
            <div className="absolute inset-0 bg-black z-[100] flex flex-col items-center justify-center p-8">
                {/* ... Loading UI Unchanged ... */}
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
                         <div className="h-full bg-red-600 transition-all duration-100 ease-linear" style={{ width: `${loadingProgress}%` }} />
                     </div>
                </div>
            </div>
        )}

        {/* COMPACT CHARACTER SELECTION SCREEN - CAROUSEL MODE */}
        {gameState === GameState.CHARACTER_SELECT && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-2 overflow-hidden bg-black/80">
                {/* Header */}
                <div className="w-full text-center mb-2 animate-fade-in-down shrink-0">
                    <h2 className="text-xl sm:text-3xl font-black text-red-600 uppercase tracking-widest flex items-center justify-center gap-2">
                        <User size={20} className="sm:w-8 sm:h-8" /> {t.select_character}
                    </h2>
                    <p className="text-gray-500 text-[10px] font-mono mt-1 uppercase tracking-widest">{t.select_suit_config}</p>
                </div>

                {/* Carousel Container - Compact */}
                <div className="flex items-center justify-center gap-4 w-full h-auto">
                    
                    {/* Prev Button */}
                    <button 
                        onClick={() => {
                            const chars = ['crimson', 'hazard', 'cobalt', 'stealth'];
                            const currIdx = chars.indexOf(selectedCharacter || 'crimson');
                            const prevIdx = (currIdx - 1 + chars.length) % chars.length;
                            handleCharacterClick(chars[prevIdx]);
                        }}
                        className="p-1 sm:p-2 rounded-full bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all active:scale-95 shadow-lg z-20"
                    >
                        <ChevronLeft size={20} className="sm:w-6 sm:h-6" />
                    </button>

                    {/* Main Card */}
                    {(() => {
                        const chars = [
                            { id: 'crimson', name: t.char_crimson, color: 'border-red-600', bg: 'bg-red-900/20', glow: 'shadow-red-900/40', stats: { hp: 3, spd: 2, oxy: 2 } },
                            { id: 'hazard', name: t.char_hazard, color: 'border-yellow-500', bg: 'bg-yellow-900/20', glow: 'shadow-yellow-900/40', stats: { hp: 2, spd: 2, oxy: 3 } },
                            { id: 'cobalt', name: t.char_cobalt, color: 'border-blue-500', bg: 'bg-blue-900/20', glow: 'shadow-blue-900/40', stats: { hp: 4, spd: 1, oxy: 2 } },
                            { id: 'stealth', name: t.char_stealth, color: 'border-green-500', bg: 'bg-green-900/20', glow: 'shadow-green-900/40', stats: { hp: 2, spd: 4, oxy: 1 } }
                        ];
                        const char = chars.find(c => c.id === selectedCharacter) || chars[0];
                        
                        return (
                            <div className={`relative w-[200px] sm:w-[260px] bg-black/90 backdrop-blur-md border ${char.color} rounded-xl shadow-lg flex flex-col items-center p-3 transition-all duration-300 ${char.glow}`}>
                                {/* Sprite Container */}
                                <div className="w-full flex items-center justify-center relative mb-2 rounded-lg border border-white/5 bg-black/60 overflow-hidden h-[80px] sm:h-[100px]">
                                    <div className={`absolute inset-0 bg-gradient-to-t from-${char.color.split('-')[1]}-900/30 to-transparent`} />
                                    <div 
                                        className="w-[40px] h-[50px] scale-[2]"
                                        style={{ 
                                            backgroundImage: `url(${PLAYER_PREVIEWS[char.id]})`,
                                            backgroundSize: '300% 100%', 
                                            backgroundPosition: '0 0', 
                                            imageRendering: 'pixelated'
                                        }}
                                    />
                                </div>

                                {/* Info */}
                                <div className="w-full text-center space-y-2">
                                    <h3 className={`text-base sm:text-xl font-black uppercase tracking-widest ${char.color.replace('border', 'text')}`}>
                                        {char.name}
                                    </h3>
                                    
                                    <div className="space-y-1.5 px-2 w-full">
                                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-mono text-gray-400">
                                            <HeartPulse size={12} className="text-red-500 shrink-0" />
                                            <div className="w-12 text-left">VITALS</div>
                                            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                                <div className="h-full bg-red-600" style={{ width: `${char.stats.hp * 25}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-mono text-gray-400">
                                            <Wind size={12} className="text-cyan-500 shrink-0" />
                                            <div className="w-12 text-left">OXYGEN</div>
                                            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                                <div className="h-full bg-cyan-600" style={{ width: `${char.stats.oxy * 25}%` }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-[9px] sm:text-[10px] font-mono text-gray-400">
                                            <FastForward size={12} className="text-yellow-500 shrink-0" />
                                            <div className="w-12 text-left">SPEED</div>
                                            <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                                                <div className="h-full bg-yellow-600" style={{ width: `${char.stats.spd * 25}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* Next Button */}
                    <button 
                        onClick={() => {
                            const chars = ['crimson', 'hazard', 'cobalt', 'stealth'];
                            const currIdx = chars.indexOf(selectedCharacter || 'crimson');
                            const nextIdx = (currIdx + 1) % chars.length;
                            handleCharacterClick(chars[nextIdx]);
                        }}
                        className="p-1 sm:p-2 rounded-full bg-gray-900 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 hover:bg-gray-800 transition-all active:scale-95 shadow-lg z-20"
                    >
                        <ChevronRight size={20} className="sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Footer Action */}
                <div className="w-full max-w-xs mt-4 shrink-0">
                    <button 
                        onClick={handleDeploy}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 tracking-widest text-sm sm:text-base uppercase"
                    >
                        <Rocket size={18} /> {t.deploy}
                    </button>
                </div>
            </div>
        )}

        {missingReqsModal && (
            <div className="absolute inset-0 bg-black/90 z-[110] flex items-center justify-center p-6 animate-fade-in">
                {/* ... Missing Reqs UI Unchanged ... */}
                <div className="bg-red-950/20 border-2 border-red-600 rounded-xl p-6 max-w-sm w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.5)] flex flex-col items-center">
                    <AlertCircle size={48} className="text-red-500 mb-4 animate-bounce" />
                    <h3 className="text-xl font-black text-red-500 uppercase tracking-widest mb-4">{t.missing_resources}</h3>
                    <div className="bg-black/50 p-4 rounded-lg border border-red-900/50 w-full mb-6">
                        <ul className="text-red-300 space-y-2 font-mono text-sm">
                            {missingReqsModal.missing.map((m, i) => (
                                <li key={i} className="flex items-center justify-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full"/> {m}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <button onClick={() => setMissingReqsModal(null)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-lg uppercase tracking-wider w-full shadow-lg transition-all">ACKNOWLEDGE</button>
                </div>
            </div>
        )}

        {/* ... Toasts and InfoModal Unchanged ... */}
        {toast?.visible && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                <div className="bg-red-900/90 text-red-100 px-6 py-2 border border-red-500 rounded shadow-[0_0_20px_rgba(255,0,0,0.5)] animate-bounce flex items-center gap-2">
                    <AlertCircle size={20} />
                    {toast.message}
                </div>
            </div>
        )}

        {infoModal && (
            <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                <div className="bg-gray-900 border-2 border-amber-600 p-6 max-w-sm w-[90%] shadow-[0_0_30px_rgba(255,160,0,0.4)] relative rounded-2xl animate-border-pulse">
                    <button onClick={() => setInfoModal(null)} className="absolute top-2 right-2 text-gray-500 hover:text-white"><X size={20} /></button>
                    <h3 className="text-lg font-bold text-amber-500 mb-1 border-b border-amber-800/50 pb-2 flex items-center gap-2">
                        <Info size={18} /> {infoModal.title}
                    </h3>
                    <p className="text-sm text-gray-300 mb-4 pt-2 leading-relaxed">{infoModal.desc}</p>
                    {infoModal.cost && (
                        <div className="mb-4 bg-black/30 p-2 rounded border border-gray-800">
                            <div className="text-[10px] font-bold text-gray-500 mb-1 uppercase">{t.need}</div>
                            {renderCost(infoModal.cost)}
                        </div>
                    )}
                    <button onClick={() => setInfoModal(null)} className="w-full bg-amber-900/20 hover:bg-amber-900/40 border border-amber-600 text-amber-100 py-2 text-xs font-bold transition-all rounded-lg">CLOSE</button>
                </div>
            </div>
        )}

        {/* Game UI Layer */}
        {(gameState === GameState.PLAYING || gameState === GameState.BASE_MENU || gameState === GameState.LAB_MENU || gameState === GameState.STORAGE_MENU || gameState === GameState.INVENTORY || gameState === GameState.MAINTENANCE_MENU || gameState === GameState.LOCATION_SELECT || gameState === GameState.HUD_EDITOR) && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* ... UI Components (Hotbar, Vitals, etc) Unchanged ... */}
                <div className="absolute top-14 right-2 pointer-events-none flex flex-col items-end gap-1 z-30">
                    {currentStage === 'BASE' && (
                        <div className={`px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 border backdrop-blur-sm ${stats.baseIntegrity > 50 ? 'bg-green-950/60 border-green-600/50 text-green-100' : stats.baseIntegrity > 20 ? 'bg-yellow-950/60 border-yellow-600/50 text-yellow-100' : 'bg-red-950/60 border-red-600/50 text-red-100 animate-pulse'}`}>
                            <Shield size={10} /> INTEGRITY: {Math.floor(stats.baseIntegrity)}%
                        </div>
                    )}
                    {stats.lanternTimeLeft > 0 && (
                        <div className="px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 border bg-amber-950/60 border-amber-600/50 text-amber-100 backdrop-blur-sm">
                            <Lightbulb size={10} className="animate-pulse" /> LIGHT: {formatTime(stats.lanternTimeLeft)}
                        </div>
                    )}
                    {stats.scanResult && (
                        <div className="px-2 py-1 rounded text-[9px] font-mono border bg-cyan-950/60 border-cyan-600/50 text-cyan-100 backdrop-blur-sm max-w-[200px] text-right animate-pulse">
                            <Radar size={10} className="inline mr-1" />
                            {stats.scanResult}
                        </div>
                    )}
                </div>

                {/* Hotbar Button & Panel */}
                {gameState === GameState.PLAYING && (currentStage === 'BASE' || currentStage === 'MINE') && (
                    <>
                        <button onClick={() => setHotbarExpanded(!hotbarExpanded)} className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 bg-black/50 backdrop-blur-md border border-gray-600/50 rounded-full flex items-center justify-center shadow-lg pointer-events-auto z-50 hover:bg-black/80 transition-colors">
                            {hotbarExpanded ? <ChevronDown size={18} className="text-gray-300" /> : <ChevronUp size={18} className="text-gray-300" />}
                        </button>
                        <div className={`absolute left-1/2 -translate-x-1/2 pointer-events-auto transition-all duration-300 ease-out z-40 ${hotbarExpanded ? 'bottom-14 scale-100 opacity-100' : 'bottom-0 translate-y-full scale-90 opacity-0 pointer-events-none'}`}>
                             <div className="bg-black/50 p-3 rounded-2xl border border-gray-700/50 backdrop-blur-md shadow-2xl flex gap-3 items-center">
                                 <button onClick={() => toggleInventory()} className="w-8 h-8 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center hover:bg-gray-700">
                                     <Settings size={14} className="text-gray-400" />
                                 </button>
                                 {stats.hotbarSlots.map((slot, index) => {
                                     let count = 0;
                                     let Icon = CircleDashed;
                                     if (slot.itemKey) {
                                         if (slot.type === 'building') count = stats.baseItems[slot.itemKey as keyof typeof stats.baseItems] || 0;
                                         else if (slot.type === 'consumable') count = stats[slot.itemKey as keyof PlayerStats] as number || 0;
                                         else count = 1;
                                         Icon = ITEM_ICONS[slot.itemKey] || Box;
                                     }
                                     const isSelected = selectedHotbarIndex === index;
                                     return (
                                         <button key={index} onClick={() => handleHotbarSelect(index)} className={`relative w-12 h-12 flex items-center justify-center rounded-xl border transition-all ${isSelected ? 'bg-red-900/40 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)] scale-110 -translate-y-1' : 'bg-gray-900/40 border-gray-600/50 hover:bg-gray-800/60 hover:border-gray-400'}`}>
                                             <span className="absolute top-0.5 left-1 text-[8px] text-gray-500">{index + 1}</span>
                                             {slot.itemKey ? <Icon size={20} className={isSelected ? 'text-red-200' : 'text-gray-400'} /> : <div className="w-2 h-2 bg-gray-700 rounded-full" />}
                                             {slot.itemKey && <span className="absolute -bottom-1 -right-1 bg-black/80 text-[10px] font-bold text-white px-1 rounded-full border border-gray-800">{count}</span>}
                                         </button>
                                     );
                                 })}
                             </div>
                        </div>
                    </>
                )}

                {/* Vitals */}
                <div style={getPosStyle('vitals')} onTouchMove={(e) => isHudEditor && handleHudDrag('vitals', e)} className="flex flex-col gap-1.5 pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-black/40 p-1.5 border border-gray-800/50 backdrop-blur-md rounded-lg pointer-events-auto">
                        <HeartPulse className="text-red-500" size={16} />
                        <div className="w-12 sm:w-28 h-1.5 bg-gray-800/50 rounded overflow-hidden"><div className="h-full bg-red-600 transition-all duration-300" style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }} /></div>
                        <span className="text-[10px] font-bold min-w-[20px] text-right">{Math.floor(stats.health)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 p-1.5 border border-gray-800/50 backdrop-blur-md rounded-lg pointer-events-auto">
                        <Wind className="text-cyan-400" size={16} />
                        <div className="w-12 sm:w-28 h-1.5 bg-gray-800/50 rounded overflow-hidden"><div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${stats.oxygen}%` }} /></div>
                        <span className="text-[10px] font-bold min-w-[20px] text-right">{Math.floor(stats.oxygen)}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 p-1.5 border border-gray-800/50 backdrop-blur-md rounded-lg pointer-events-auto">
                        <Biohazard className="text-green-500" size={16} />
                        <div className="w-12 sm:w-28 h-1.5 bg-gray-800/50 rounded overflow-hidden relative"><div className="absolute inset-0 bg-green-900/30" /><div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${stats.infection}%` }} /></div>
                        <span className="text-[10px] font-bold min-w-[20px] text-right">{Math.floor(stats.infection)}%</span>
                    </div>
                </div>

                <div style={getPosStyle('controls_left')} onTouchMove={(e) => isHudEditor && handleHudDrag('controls_left', e)} className="pointer-events-none lg:hidden">
                     <button onClick={toggleInventory} className="bg-gray-900/80 p-3 border border-gray-600/50 text-gray-300 shadow-lg active:scale-95 transition-transform rounded-lg backdrop-blur-sm pointer-events-auto">
                         <Briefcase size={24} />
                    </button>
                </div>

                <div style={getPosStyle('resources')} onTouchMove={(e) => isHudEditor && handleHudDrag('resources', e)} className="flex flex-col items-end gap-1.5 pointer-events-none">
                     <div className="flex items-center gap-2 pointer-events-auto">
                         <div className="flex gap-2">
                            <ResourceItem icon={RefreshCw} count={stats.scraps} label={t.res_scraps} />
                            {stats.rareSlime > 0 && (<ResourceItem icon={FlaskConical} count={stats.rareSlime} label={t.res_rareSlime} color="text-lime-400" />)}
                         </div>
                         <button onClick={togglePause} className="lg:hidden bg-gray-900/80 p-2 border border-gray-600/50 text-gray-300 shadow-lg active:scale-95 transition-transform rounded-lg h-full flex items-center justify-center backdrop-blur-sm">
                             <Pause size={18} />
                        </button>
                     </div>
                     <div className="text-[8px] text-gray-500 uppercase tracking-widest bg-black/30 px-2 py-0.5 rounded-full backdrop-blur-sm">{t.sector}</div>
                     {showSaveIndicator && (<div className="text-[8px] text-green-500 uppercase tracking-widest flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-full animate-pulse backdrop-blur-sm"><Save size={8} /> {t.game_saved}</div>)}
                 </div>

                <div style={getPosStyle('controls_right')} onTouchMove={(e) => isHudEditor && handleHudDrag('controls_right', e)} className="pointer-events-none lg:hidden z-10 flex flex-col items-end gap-3">
                    <div className="flex gap-2 items-end">
                         {canInteract && !showBaseOrLab && (
                             <button onClick={handleCycleInteract} className="w-10 h-10 mb-1 rounded-full border-2 bg-blue-900/90 border-blue-500 text-blue-100 flex items-center justify-center shadow-lg active:scale-95 transition-transform pointer-events-auto">
                                 <RotateCw size={16} />
                             </button>
                         )}
                        {canInteract && !showBaseOrLab && (
                            <button onClick={handleMobileInteract} className="w-12 h-12 mb-1 rounded-full border-2 bg-orange-900/90 border-orange-500 text-orange-100 flex items-center justify-center shadow-lg active:scale-95 transition-transform animate-pulse pointer-events-auto lg:hidden">
                                <Hand size={20} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => setMobileActionMode(prev => prev === 'MINE' ? 'ATTACK' : 'MINE')} className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center shadow-xl transition-all pointer-events-auto ${mobileActionMode === 'MINE' ? 'bg-cyan-900/80 border-cyan-400 shadow-[0_0_10px_rgba(0,255,255,0.3)]' : 'bg-red-900/80 border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.3)]'}`}>
                        {mobileActionMode === 'MINE' ? <Pickaxe size={24} /> : <Sword size={24} />}
                        <span className="text-[8px] font-bold uppercase mt-0.5">{mobileActionMode === 'MINE' ? 'MINE' : 'FIGHT'}</span>
                    </button>
                </div>
            </div>
        )}

        {/* ... Hud Editor and Menus Unchanged ... */}
        {isHudEditor && (
             <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-50 flex gap-4 pointer-events-auto">
                 <button onClick={resetHud} className="bg-red-900 border border-red-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><RotateCw size={18} /> {t.reset_hud}</button>
                 <button onClick={() => setGameState(GameState.PAUSED)} className="bg-green-900 border border-green-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2"><Save size={18} /> {t.save_hud}</button>
             </div>
        )}

        {/* Menus... */}
        {gameState === GameState.LOCATION_SELECT && (
            <LocationSelectMenu 
                t={t} 
                currentStage={currentStage}
                confirmTravel={confirmTravel}
                onClose={() => setGameState(GameState.PLAYING)}
            />
        )}

        {gameState === GameState.INVENTORY && (
            <InventoryMenu 
                onClose={toggleInventory}
                stats={stats}
                t={t}
                resourceConfig={RESOURCE_CONFIG}
                useItem={useItem}
                updateHotbarSlot={updateHotbarSlot}
                ITEM_ICONS={ITEM_ICONS}
            />
        )}

        {isMaintenanceOpen && (
            <MaintenanceMenu 
                onClose={() => toggleBaseUI(false)}
                stats={stats}
                repairError={(errorId) => {}} 
                repairIntegrity={repairIntegrity}
                t={t}
            />
        )}

        {isBaseOpen && (
            <BaseMenu 
                onClose={() => toggleBaseUI(false)}
                stats={stats}
                t={t}
                baseTab={baseTab}
                setBaseTab={setBaseTab}
                craftingRecipes={CRAFTING_RECIPES}
                leveledUpgrades={LEVELED_UPGRADES}
                singleUpgrades={SINGLE_UPGRADES}
                getDynamicCost={getDynamicCost}
                renderCost={renderCost}
                upgradeBase={upgradeBase}
                craftItem={craftItem}
                openInfo={(title, desc) => openInfoModal(title, desc)}
            />
        )}

        {isLabOpen && (
            <LabMenu 
                onClose={() => toggleBaseUI(false)}
                t={t}
                craftingRecipes={CRAFTING_RECIPES}
                renderCost={renderCost}
                craftItem={craftItem}
            />
        )}

        {isStorageOpen && (
             <StorageMenu 
                 onClose={() => toggleBaseUI(false)}
                 stats={stats}
                 t={t}
                 depositItem={depositItem}
                 withdrawItem={withdrawItem}
                 resourceConfig={RESOURCE_CONFIG}
             />
        )}

        {gameState === GameState.MENU && (
            <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-50">
                <div className="max-w-md w-[90%] p-6 border-2 border-red-900 bg-gray-900/80 backdrop-blur text-center relative overflow-hidden shadow-[0_0_50px_rgba(100,0,0,0.5)] rounded-2xl animate-border-pulse">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent" />
                    <h1 className="text-4xl md:text-5xl font-black mb-2 tracking-tighter text-red-600 uppercase glitch-text drop-shadow-lg">{t.title}</h1>
                    <p className="text-gray-400 text-xs md:text-sm mb-8 tracking-widest uppercase">{t.subtitle}</p>
                    
                    {hasSave && (
                        <button onClick={handleContinue} className="w-full bg-green-900/80 hover:bg-green-800 border border-green-600 text-green-100 font-bold py-4 px-6 mb-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:tracking-widest shadow-lg">
                            <Save size={20} /> {t.resume_signal}
                        </button>
                    )}

                    <button onClick={handleStart} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-4 px-6 mb-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:tracking-widest shadow-lg">
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
        
        {gameState === GameState.PAUSED && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-gray-900 border-2 border-red-900 p-8 rounded-xl text-center shadow-[0_0_30px_rgba(255,0,0,0.15)] max-w-sm w-full animate-border-pulse">
                    <h2 className="text-3xl font-black text-white mb-8 tracking-widest">{t.system_paused}</h2>
                    <div className="space-y-4">
                        <button onClick={togglePause} className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"><Play size={20} /> {t.resume_mission}</button>
                        <button onClick={toggleHudEditor} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold border border-gray-700"><Layout size={16} /> {t.hud_editor}</button>
                        <button onClick={toggleLanguage} className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold border border-gray-700"><Globe size={16} /> {language.toUpperCase()}</button>
                        <div className="mt-4 pt-4 border-t border-gray-800">
                            <div className="flex gap-2">
                                <input type="password" placeholder={t.cheat_code} value={cheatCode} onChange={(e) => setCheatCode(e.target.value)} className="w-full bg-black border border-gray-700 rounded px-2 text-xs text-center text-red-500 font-mono tracking-widest focus:outline-none focus:border-red-500" />
                                <button onClick={redeemCheatCode} className="bg-gray-800 hover:bg-gray-700 px-3 rounded text-[10px] font-bold text-gray-400 border border-gray-700"><Terminal size={12} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {gameState === GameState.GAME_OVER && (
            <div className="absolute inset-0 bg-red-950/90 flex items-center justify-center z-50">
                <div className="text-center p-8 border-4 border-red-600 bg-black rounded-xl shadow-[0_0_100px_rgba(255,0,0,0.5)] max-w-md w-[90%]">
                    <Skull size={64} className="text-red-600 mx-auto mb-6 animate-bounce" />
                    <h1 className="text-5xl font-black text-red-600 mb-2 glitch-text">{t.you_died}</h1>
                    <p className="text-red-800 mb-8 font-mono">{t.integrity_failed}</p>
                    <button onClick={handleRespawn} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:scale-105 transition-transform w-full">{t.respawn}</button>
                </div>
            </div>
        )}

    </div>
  );
};

export default App;
