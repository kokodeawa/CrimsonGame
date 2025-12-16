

export type Vector2 = {
  x: number;
  y: number;
};

export type Language = 'en' | 'es';

export enum GameState {
  MENU = 'MENU',
  CHARACTER_SELECT = 'CHARACTER_SELECT', // New Stage
  PLAYING = 'PLAYING',
  BASE_MENU = 'BASE_MENU', // Workbench now opens this
  LAB_MENU = 'LAB_MENU', 
  STORAGE_MENU = 'STORAGE_MENU', 
  MAINTENANCE_MENU = 'MAINTENANCE_MENU', // New Terminal Menu
  PAUSED = 'PAUSED',
  LOCATION_SELECT = 'LOCATION_SELECT',
  GAME_OVER = 'GAME_OVER',
  INVENTORY = 'INVENTORY', 
  HUD_EDITOR = 'HUD_EDITOR',
  HOTBAR_CONFIG = 'HOTBAR_CONFIG',
}

export interface HudLayout {
  vitals: { x: number; y: number };
  resources: { x: number; y: number };
  controls_left: { x: number; y: number }; // Inventory
  controls_right: { x: number; y: number }; // Action/Jump/Interact
}

export interface HotbarSlot {
    index: number;
    itemKey: string | null; // e.g., 'terminal', 'lantern', 'metal_block'
    type: 'building' | 'consumable' | 'weapon';
}

export interface PlayerStats {
  characterId: string; // New: Selected Character Style
  health: number;
  maxHealth: number;
  oxygen: number; 
  oxygenLevel: number; 
  infection: number; 
  infectionResistanceLevel: number; 
  miningRadiusLevel: number; 
  miningReachLevel: number; 
  miningSpeedLevel: number; 
  // oreScannerLevel removed, now an item
  highJumpBoots: boolean; 
  inventoryLevel: number; 
  fabricationEfficiencyLevel: number; // New: Reduces costs
  
  // Lantern Updates
  lanterns: number; 
  lanternTimeLeft: number; 
  
  // New Unique Item
  teleporters: number;
  oreScanners: number; // New Consumable

  unlockedLab: boolean; 
  
  // New Upgrades
  baseExpansionLevel: number; 
  loadingSpeedLevel: number; 
  deconLevel: number; // Replaces boolean, now 1-5
  storageLevel: number; 
  labLevel: number; 
  
  // Resources (Inventory)
  scraps: number; 
  wood: number;
  iron: number;
  ice: number;
  coal: number;
  titanium: number; 
  uranium: number; 
  rareSlime: number; 

  // Stored Resources (Safe in Base)
  storedResources: {
      scraps: number;
      wood: number;
      iron: number;
      ice: number;
      coal: number;
      titanium: number;
      uranium: number;
      rareSlime: number;
  };

  // Stored Consumables
  storedItems: {
      lanterns: number;
      teleporters: number;
      oreScanners: number;
      repairKits: number;
      oxygenTanks: number;
      healthInjections: number;
      immunityBoosters: number;
      purifiers: number;
  };
  
  // Craftables & Weapons (Inventory)
  repairKits: number;
  oxygenTanks: number; 
  healthInjections: number; 
  immunityBoosters: number;
  purifiers: number; 
  unlockedWeapons: string[]; 
  equippedWeapon: string; 

  baseLevel: number;
  unlockedRooms: string[];

  // Base Maintenance System (0 to 100)
  baseIntegrity: number; // Hull / Structure
  integrityLights: number;
  integrityOxygen: number;
  integritySystem: number;
  
  // Dynamic Decay Rates (Multipliers)
  decayRates: {
      hull: number;
      lights: number;
      oxygen: number;
      system: number;
  };

  // Scanner Result State
  scanResult: string | null; 
  
  // BUILDING SYSTEM
  baseItems: {
    terminal: number;
    workbench: number; // New Item
    airlock: number;
    lab_station: number;
    decon_machine: number; // Kept for legacy save compatibility, essentially unused visually now implies upgrade
    storage_crate: number;
    metal_block: number;
    platform: number; // New Platform Item
  };
  baseLayout: LevelObject[]; // Stores the placement of objects in the base
  
  // HUD & Config
  hudLayout?: HudLayout;
  hotbarSlots: HotbarSlot[];
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: 'small' | 'medium' | 'large';
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  animTimer: number;
  facingRight: boolean;
  isGrounded: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number; 
  type: 'force' | 'laser' | 'sword'; 
  life: number;
  width: number;
  height: number;
  color: string;
  angle: number; 
}

export interface LevelObject {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'solid' | 'base_entrance' | 'hazard' | 'scrap' | 'mine_door' | 'destructible' | 'platform';
  id: string;
  resourceType?: 'living_metal' | 'wood' | 'scrap' | 'iron' | 'ice' | 'coal' | 'titanium' | 'uranium' | 'infected_living_metal' | 'rareSlime'; 
  health?: number; 
  maxHealth?: number; 
  variant?: number;
}

export interface FloatingText {
    id: number;
    x: number;
    y: number;
    text: string;
    life: number;
    color: string;
    velocity: number;
}