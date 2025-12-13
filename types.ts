

export type Vector2 = {
  x: number;
  y: number;
};

export type Language = 'en' | 'es';

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  BASE_MENU = 'BASE_MENU',
  LAB_MENU = 'LAB_MENU', 
  STORAGE_MENU = 'STORAGE_MENU', // New Menu State
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
  
  // Lantern Updates
  lanterns: number; 
  lanternTimeLeft: number; 
  
  // New Unique Item
  teleporters: number;

  unlockedLab: boolean; 
  
  // New Upgrades
  baseExpansionLevel: number; 
  loadingSpeedLevel: number; 
  hasDecontaminationUnit: boolean; 
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
  rareSlime: number; // New Resource

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