

export type Vector2 = {
  x: number;
  y: number;
};

export type Language = 'en' | 'es';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  BASE_MENU = 'BASE_MENU',
  LAB_MENU = 'LAB_MENU', // New Menu State
  PAUSED = 'PAUSED',
  LOCATION_SELECT = 'LOCATION_SELECT',
  GAME_OVER = 'GAME_OVER',
  INVENTORY = 'INVENTORY', 
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  oxygen: number; 
  oxygenLevel: number; 
  infection: number; 
  infectionResistanceLevel: number; 
  miningRadiusLevel: number; 
  miningReachLevel: number; 
  miningSpeedLevel: number; 
  oreScannerLevel: number; 
  highJumpBoots: boolean; 
  inventoryLevel: number; 
  unlockedLantern: boolean; 
  unlockedLab: boolean; // New: Required to open Lab Menu
  
  // New Upgrades
  baseExpansionLevel: number; // 0 = Tiny, 1 = Small, 2 = Medium, etc.
  loadingSpeedLevel: number; // Reduces travel time
  hasDecontaminationUnit: boolean; // Base healing
  storageLevel: number; // Visual storage crates
  labLevel: number; // New: For researching potions
  
  // Resources
  scraps: number; 
  wood: number;
  iron: number;
  ice: number;
  coal: number;
  titanium: number; 
  uranium: number; 
  
  // Craftables & Weapons
  repairKits: number;
  oxygenTanks: number; 
  healthInjections: number; 
  immunityBoosters: number;
  purifiers: number; 
  unlockedWeapons: string[]; 
  equippedWeapon: string; 

  baseLevel: number;
  unlockedRooms: string[];
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
  type: 'solid' | 'base_entrance' | 'hazard' | 'scrap' | 'mine_door' | 'destructible';
  id: string;
  resourceType?: 'living_metal' | 'wood' | 'scrap' | 'iron' | 'ice' | 'coal' | 'titanium' | 'uranium' | 'infected_living_metal'; 
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
