
import { BLOCK_SIZE } from './constants';

export const createOffscreenCanvas = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { alpha: true });
  if (!ctx) throw new Error("Could not create canvas context");
  return { canvas: c, ctx: ctx as CanvasRenderingContext2D };
};

export const generateGlowSprite = (radius: number, color: string) => {
  const size = radius * 2;
  const { canvas, ctx } = createOffscreenCanvas(size, size);
  const grad = ctx.createRadialGradient(radius, radius, 1, radius, radius, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return canvas;
};

export const generateCrackTextures = () => {
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

export const generateMetalTexture = () => {
  const { canvas, ctx } = createOffscreenCanvas(32, 32);
  // Dark Crimson Metal Base
  ctx.fillStyle = '#1a0505'; 
  ctx.fillRect(0, 0, 32, 32);
  
  // Organic Veins
  ctx.strokeStyle = '#350a0a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 5); ctx.bezierCurveTo(10, 10, 20, 0, 32, 5);
  ctx.moveTo(0, 20); ctx.bezierCurveTo(10, 15, 20, 25, 32, 20);
  ctx.stroke();

  // Highlight specks
  ctx.fillStyle = '#501010';
  for(let i=0; i<5; i++) {
      ctx.fillRect(Math.random()*30, Math.random()*30, 2, 2);
  }
  return canvas;
};

// Base Background Grid
export const generateBaseGrid = () => {
    const size = 20; 
    const { canvas, ctx } = createOffscreenCanvas(size, size);
    ctx.fillStyle = '#121218'; 
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#1f1f25';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(size, 0); 
    ctx.moveTo(0, 0); ctx.lineTo(0, size); 
    ctx.stroke();
    ctx.fillStyle = '#1a1a20';
    ctx.fillRect(size/2 - 1, size/2 - 1, 2, 2);
    return canvas;
};

// Mine Wall / Mother Wall Texture (Crimson Bedrock)
// IMPROVED TEXTURE: Organic, Veiny, Wet Metal look
export const generateMineWallTexture = () => {
    const size = 32; // Higher resolution for tiling pattern
    const { canvas, ctx } = createOffscreenCanvas(size, size);
    
    // 1. Deep Dark Base (Crimson/Black)
    ctx.fillStyle = '#120404';
    ctx.fillRect(0, 0, size, size);
    
    // 2. Micro-Noise (Simulate porous/organic surface)
    for(let i=0; i<40; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#1f0808' : '#0a0000';
        ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
    }

    // 3. Organic Arteries/Veins (Flowing look)
    ctx.strokeStyle = '#3d0e0e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Primary vein curve
    const startY = Math.random() * size;
    const endY = Math.random() * size;
    ctx.moveTo(0, startY);
    ctx.bezierCurveTo(size * 0.3, startY - 10, size * 0.7, endY + 10, size, endY);
    ctx.stroke();

    // 4. Secondary connecting tissue (Darker web)
    ctx.strokeStyle = '#000000';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(size/2, 0);
    ctx.lineTo(size/2 + (Math.random()-0.5)*10, size);
    ctx.moveTo(0, size/2);
    ctx.lineTo(size, size/2 + (Math.random()-0.5)*10);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    // 5. Metallic/Wet Highlights (The "Living" sheen)
    ctx.fillStyle = '#6b2121';
    for(let i=0; i<3; i++) {
        const hx = Math.random() * size;
        const hy = Math.random() * size;
        // Bright spot
        ctx.fillRect(hx, hy, 2, 2);
        // Faint glow around spot
        ctx.fillStyle = 'rgba(255, 100, 100, 0.05)';
        ctx.fillRect(hx-1, hy-1, 4, 4);
        ctx.fillStyle = '#6b2121'; // Reset for next
    }

    return canvas;
};

// NEW: 2.5D Mine Background Layers
export const generateMineBackgroundLayers = () => {
    const width = 800;
    const height = 600;
    
    // Layer 1: Far Background (The Deep Dark Void with faint giant structures)
    const farLayer = createOffscreenCanvas(width, height);
    const fCtx = farLayer.ctx;
    
    // Deepest Red/Black gradient
    const grad = fCtx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#0a0000');
    grad.addColorStop(1, '#150505');
    fCtx.fillStyle = grad;
    fCtx.fillRect(0, 0, width, height);

    // Distant giant pillars (Silhouettes)
    fCtx.fillStyle = '#0f0202';
    for(let i=0; i<5; i++) {
        const w = Math.random() * 100 + 50;
        const x = Math.random() * width;
        fCtx.fillRect(x, 0, w, height);
    }
    
    // Layer 2: Mid Background (Detailed Cave Walls in distance)
    const midLayer = createOffscreenCanvas(width, height);
    const mCtx = midLayer.ctx;
    
    // Clear transparent
    mCtx.clearRect(0, 0, width, height);
    
    // Organic arches and stalactites
    mCtx.fillStyle = '#1f0808';
    for(let i=0; i<8; i++) {
        const x = Math.random() * width;
        const w = Math.random() * 80 + 40;
        const h = Math.random() * height * 0.8;
        
        mCtx.beginPath();
        // Stalactite
        mCtx.moveTo(x, 0);
        mCtx.lineTo(x + w/2, h);
        mCtx.lineTo(x + w, 0);
        mCtx.fill();
        
        // Stalagmite
        const h2 = Math.random() * height * 0.5;
        const x2 = Math.random() * width;
        mCtx.beginPath();
        mCtx.moveTo(x2, height);
        mCtx.lineTo(x2 + w/2, height - h2);
        mCtx.lineTo(x2 + w, height);
        mCtx.fill();
    }
    
    // Veins on Mid Layer
    mCtx.strokeStyle = '#350a0a';
    mCtx.lineWidth = 2;
    mCtx.globalAlpha = 0.5;
    for(let i=0; i<10; i++) {
        mCtx.beginPath();
        mCtx.moveTo(Math.random()*width, Math.random()*height);
        mCtx.lineTo(Math.random()*width, Math.random()*height);
        mCtx.stroke();
    }

    return { far: farLayer.canvas, mid: midLayer.canvas };
};

// NEW: Specific Building Assets
export const generateBuildingAssets = () => {
    const assets: Record<string, HTMLCanvasElement> = {};

    // 1. Metal Block (Single Cell: 20x20)
    {
        const { canvas, ctx } = createOffscreenCanvas(20, 20);
        // Base
        ctx.fillStyle = '#3a3a40';
        ctx.fillRect(0, 0, 20, 20);
        // Bevel/Border
        ctx.strokeStyle = '#5a5a60';
        ctx.lineWidth = 2;
        ctx.strokeRect(1, 1, 18, 18);
        // Rivets
        ctx.fillStyle = '#1a1a20';
        ctx.fillRect(2, 2, 2, 2); ctx.fillRect(16, 2, 2, 2);
        ctx.fillRect(2, 16, 2, 2); ctx.fillRect(16, 16, 2, 2);
        // Cross support
        ctx.strokeStyle = '#2a2a30';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(4,4); ctx.lineTo(16,16); ctx.moveTo(16,4); ctx.lineTo(4,16); ctx.stroke();
        
        assets['metal_block'] = canvas;
    }

    // 2. Terminal (2x2: 40x40) - Now Maintenance Station
    {
        const { canvas, ctx } = createOffscreenCanvas(40, 40);
        // Main Console Body
        ctx.fillStyle = '#202025';
        ctx.fillRect(2, 10, 36, 30);
        // Screen Border
        ctx.fillStyle = '#101015';
        ctx.fillRect(4, 2, 32, 20);
        // Screen Glow (Amber/Yellow for maintenance feel)
        ctx.fillStyle = '#ffaa00';
        ctx.globalAlpha = 0.8;
        ctx.fillRect(6, 4, 28, 16);
        ctx.globalAlpha = 1.0;
        // Text Lines on Screen
        ctx.fillStyle = '#331100';
        ctx.fillRect(8, 6, 20, 2); ctx.fillRect(8, 10, 15, 2); ctx.fillRect(8, 14, 18, 2);
        // Keyboard Deck
        ctx.fillStyle = '#303035';
        ctx.beginPath(); ctx.moveTo(2, 22); ctx.lineTo(38, 22); ctx.lineTo(40, 40); ctx.lineTo(0, 40); ctx.fill();
        // Buttons
        ctx.fillStyle = '#ff5555'; ctx.fillRect(5, 28, 4, 4);
        ctx.fillStyle = '#5555ff'; ctx.fillRect(12, 28, 4, 4);
        
        assets['terminal'] = canvas;
    }

    // 3. Airlock / Door (2x3: 40x60)
    {
        const { canvas, ctx } = createOffscreenCanvas(40, 60);
        // Frame
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, 40, 60);
        // Door Panels
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(4, 4, 15, 52); // Left Panel
        ctx.fillRect(21, 4, 15, 52); // Right Panel
        // Center Split
        ctx.fillStyle = '#111';
        ctx.fillRect(19, 4, 2, 52);
        // Caution Stripes
        ctx.fillStyle = '#aa8800';
        ctx.fillRect(6, 10, 28, 4);
        ctx.fillRect(6, 46, 28, 4);
        // Window
        ctx.fillStyle = '#557788';
        ctx.fillRect(12, 18, 16, 10);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 18, 16, 10);

        assets['airlock'] = canvas;
    }

    // 4. Lab Station (2x2: 40x40)
    {
        const { canvas, ctx } = createOffscreenCanvas(40, 40);
        // Desk
        ctx.fillStyle = '#ccc';
        ctx.fillRect(2, 15, 36, 25); // Table Top
        ctx.fillStyle = '#999';
        ctx.fillRect(5, 20, 4, 20); // Leg L
        ctx.fillRect(31, 20, 4, 20); // Leg R
        // Equipment - Microscope
        ctx.fillStyle = '#333';
        ctx.fillRect(8, 5, 6, 10);
        ctx.fillRect(6, 15, 10, 2);
        // Flask
        ctx.fillStyle = '#00ff00';
        ctx.beginPath(); ctx.moveTo(28, 5); ctx.lineTo(32, 15); ctx.lineTo(24, 15); ctx.fill();
        // Computer Monitor side
        ctx.fillStyle = '#111';
        ctx.fillRect(20, 8, 10, 8);
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(21, 9, 8, 6);

        assets['lab_station'] = canvas;
    }

    // 5. Storage Crate (2x2: 40x40)
    {
        const { canvas, ctx } = createOffscreenCanvas(40, 40);
        // Base Crate
        ctx.fillStyle = '#884400'; // Orange/Brown industrial
        ctx.fillRect(2, 5, 36, 35);
        // Frame
        ctx.strokeStyle = '#552200';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 5, 36, 35);
        // Cross bracing
        ctx.beginPath(); ctx.moveTo(2, 5); ctx.lineTo(38, 40); ctx.moveTo(38, 5); ctx.lineTo(2, 40); ctx.stroke();
        // Label
        ctx.fillStyle = '#eee';
        ctx.fillRect(15, 10, 10, 6);
        
        assets['storage_crate'] = canvas;
    }

    // 6. Workbench (2x1: 40x20)
    {
        const { canvas, ctx } = createOffscreenCanvas(40, 20);
        // Table Top
        ctx.fillStyle = '#555';
        ctx.fillRect(0, 0, 40, 8);
        ctx.fillStyle = '#444'; // Shadow
        ctx.fillRect(0, 8, 40, 2);
        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(4, 10, 4, 10);
        ctx.fillRect(32, 10, 4, 10);
        // Crossbar
        ctx.fillRect(4, 15, 28, 2);
        
        // Tools on top
        // Hammer
        ctx.fillStyle = '#840'; ctx.fillRect(5, 2, 8, 2); ctx.fillStyle='#888'; ctx.fillRect(11,1,3,4);
        // Schematic/Paper
        ctx.fillStyle = '#eef'; ctx.fillRect(20, 1, 10, 6); ctx.fillStyle='#000'; ctx.fillRect(22,2,6,1); ctx.fillRect(22,4,4,1);

        assets['workbench'] = canvas;
    }

    // 7. Platform (1x1: 20x20, visual height ~6px)
    {
        const { canvas, ctx } = createOffscreenCanvas(20, 20);
        // Platform top bar
        ctx.fillStyle = '#555';
        ctx.fillRect(0, 0, 20, 6);
        // Grill pattern
        ctx.fillStyle = '#333';
        for(let i=2; i<20; i+=4) {
            ctx.fillRect(i, 1, 2, 4);
        }
        // Support frame
        ctx.fillStyle = '#222';
        ctx.fillRect(0, 0, 20, 1);
        ctx.fillRect(0, 5, 20, 1);
        
        assets['platform'] = canvas;
    }

    return assets;
};

export const generateBaseTiles = () => {
    const tiles: Record<string, HTMLCanvasElement> = {};
    
    // Tech Wall (40x40 - 2x2 cells, 20px grid)
    {
        const { canvas, ctx } = createOffscreenCanvas(40, 40);
        // Main Background
        ctx.fillStyle = '#2a2a30'; 
        ctx.fillRect(0, 0, 40, 40);
        
        // Heavy Industrial Border
        ctx.strokeStyle = '#3a3a45';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, 37, 37);
        
        // Inner Recess
        ctx.fillStyle = '#202025';
        ctx.fillRect(4, 4, 32, 32);

        // Center Cross Brace (X) to match placement ghost
        ctx.strokeStyle = '#2a2a30'; // Darker gray for the brace
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(4, 4); ctx.lineTo(36, 36);
        ctx.moveTo(36, 4); ctx.lineTo(4, 36);
        ctx.stroke();

        // Center Plate/Junction
        ctx.fillStyle = '#3a3a45';
        ctx.fillRect(14, 14, 12, 12);
        
        // Bolts
        ctx.fillStyle = '#5a5a60';
        ctx.fillRect(15, 15, 2, 2); ctx.fillRect(23, 15, 2, 2);
        ctx.fillRect(15, 23, 2, 2); ctx.fillRect(23, 23, 2, 2);

        tiles['tech_wall'] = canvas;
    }

    // Tech Floor
    {
        const { canvas, ctx } = createOffscreenCanvas(32, 32);
        ctx.fillStyle = '#353540';
        ctx.fillRect(0, 0, 32, 32);
        ctx.fillStyle = '#252530';
        ctx.fillRect(0, 30, 32, 2);
        ctx.strokeStyle = '#454555';
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(32, 0);
        ctx.stroke();
        ctx.fillStyle = '#3a3a45';
        ctx.fillRect(8, 8, 16, 16);
        tiles['tech_floor'] = canvas;
    }

    // Foundation (Dark heavy structure)
    {
        const { canvas, ctx } = createOffscreenCanvas(32, 32);
        // Heavy dark metal
        ctx.fillStyle = '#15151a'; 
        ctx.fillRect(0, 0, 32, 32);
        
        // Diagonal bracing pattern
        ctx.strokeStyle = '#222225';
        ctx.lineWidth = 3;
        ctx.beginPath();
        // X pattern
        ctx.moveTo(0, 0); ctx.lineTo(32, 32);
        ctx.moveTo(32, 0); ctx.lineTo(0, 32);
        ctx.stroke();

        // Top heavy border for "support"
        ctx.fillStyle = '#2a2a30';
        ctx.fillRect(0, 0, 32, 4);

        // Rivets at intersections
        ctx.fillStyle = '#333';
        ctx.fillRect(14, 14, 4, 4);

        tiles['foundation'] = canvas;
    }

    return tiles;
}

export const generateCockroachSprites = () => {
    const width = 64; 
    const height = 32;
    const { canvas, ctx } = createOffscreenCanvas(width, height);
    
    const drawXeno = (x: number, y: number, w: number, h: number, frame: number) => {
        ctx.save();
        ctx.translate(x, y);
        const armorColor = '#1a1a2e'; 
        const detailColor = '#303040';
        const glowColor = '#00f7ff'; 
        const glowColorSecondary = '#ff0055'; 

        ctx.strokeStyle = '#4a4a5a';
        ctx.lineWidth = 2;
        const legLift = frame === 0 ? -3 : 3;

        ctx.beginPath();
        ctx.moveTo(w*0.8, h*0.5); ctx.lineTo(w*1.1, h*0.8 + legLift);
        ctx.moveTo(w*0.8, h*0.5); ctx.lineTo(w*1.1, h*0.2 - legLift);
        ctx.moveTo(w*0.3, h*0.5); ctx.lineTo(w*0.1, h*1.2);
        ctx.moveTo(w*0.5, h*0.5); ctx.lineTo(w*0.5, h*1.3 - (legLift/2));
        ctx.moveTo(w*0.7, h*0.5); ctx.lineTo(w*0.9, h*1.2);
        ctx.stroke();

        ctx.fillStyle = armorColor;
        ctx.beginPath();
        ctx.moveTo(0, h*0.5);
        ctx.quadraticCurveTo(w*0.5, -h*0.2, w, h*0.4); 
        ctx.lineTo(w, h*0.6);
        ctx.quadraticCurveTo(w*0.5, h*1.2, 0, h*0.5); 
        ctx.fill();
        
        ctx.strokeStyle = detailColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w*0.3, h*0.2); ctx.lineTo(w*0.3, h*0.8);
        ctx.moveTo(w*0.6, h*0.1); ctx.lineTo(w*0.6, h*0.9);
        ctx.stroke();

        ctx.fillStyle = glowColor;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 5;
        
        ctx.beginPath();
        ctx.arc(w*0.4, h*0.3, 2, 0, Math.PI*2);
        ctx.arc(w*0.5, h*0.4, 2.5, 0, Math.PI*2);
        ctx.arc(w*0.6, h*0.3, 2, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = detailColor;
        ctx.beginPath();
        ctx.ellipse(w*0.9, h*0.5, w*0.15, h*0.2, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = glowColorSecondary;
        ctx.shadowColor = glowColorSecondary;
        ctx.shadowBlur = 3;
        ctx.fillRect(w*0.92, h*0.4, 2, 2);
        ctx.shadowBlur = 0;

        ctx.restore();
    };

    drawXeno(0, 0, 32, 16, 0);
    drawXeno(32, 0, 32, 16, 1);
    
    return canvas;
};

export const generateResourceTextures = () => {
  const textures: Record<string, HTMLCanvasElement> = {};
  const size = BLOCK_SIZE;
  const init = (w = size, h = size) => createOffscreenCanvas(w, h);
  
  // Helper to create a nice blocky texture
  const createBlock = (mainColor: string, shadowColor: string, highlightColor: string, gemsColor?: string) => {
    const { canvas, ctx } = init();
    // Base
    ctx.fillStyle = mainColor; 
    ctx.fillRect(0, 0, size, size);
    
    // Bevel Top/Left
    ctx.fillStyle = highlightColor;
    ctx.fillRect(0, 0, size, 1);
    ctx.fillRect(0, 0, 1, size);
    
    // Bevel Bottom/Right
    ctx.fillStyle = shadowColor;
    ctx.fillRect(0, size-1, size, 1);
    ctx.fillRect(size-1, 0, 1, size);
    
    // Texture Noise
    ctx.fillStyle = shadowColor;
    ctx.globalAlpha = 0.2;
    for(let i=0; i<4; i++) ctx.fillRect(Math.random()*size, Math.random()*size, 2, 2);
    ctx.globalAlpha = 1.0;

    // Gems/Ores
    if (gemsColor) {
        ctx.fillStyle = gemsColor;
        // Central Cluster
        ctx.fillRect(3, 3, 2, 2);
        ctx.fillRect(5, 4, 1, 1);
        ctx.fillRect(2, 5, 2, 2);
    }
    return canvas;
  };

  textures['scrap'] = createBlock('#3a3a3a', '#1a1a1a', '#5a5a5a', '#775533');
  textures['iron'] = createBlock('#4a4a55', '#2a2a35', '#6a6a75', '#aaccdd');
  textures['wood'] = createBlock('#4e342e', '#2e140e', '#6e544e', '#8d6e63'); // Fossilized wood
  textures['ice'] = createBlock('#006064', '#003034', '#00838f', '#84ffff');
  // Updated Living Metal to match new walls better
  textures['living_metal'] = createBlock('#2d0a0a', '#100000', '#4a1515'); 
  textures['infected_living_metal'] = createBlock('#2d0a1e', '#1a0010', '#4d1a3e', '#ff0055');
  textures['hardened_metal'] = createBlock('#1a0505', '#000000', '#300a0a');
  textures['coal'] = createBlock('#151515', '#000000', '#252525', '#111');
  textures['titanium'] = createBlock('#555555', '#333333', '#777777', '#ffffff');
  textures['uranium'] = createBlock('#1a201a', '#0a100a', '#2a302a', '#39ff14');
  textures['rareSlime'] = createBlock('#1a201a', '#000', '#2a302a', '#ccffcc');

  return textures;
};

// Generates multiple variations of the player sprite
export const generatePlayerSprites = () => {
  const variations: Record<string, HTMLCanvasElement> = {};

  const createPlayerSheet = (
      suitDark: string, 
      suitLight: string, 
      highlight: string, 
      visor: string, 
      backpack: string, 
      light: string
  ) => {
      const { canvas, ctx } = createOffscreenCanvas(48, 20);
      const drawScavenger = (offsetX: number, frame: number) => {
        ctx.save();
        ctx.translate(offsetX, 0);
        ctx.fillStyle = backpack; ctx.fillRect(2, 5, 4, 8); 
        ctx.fillStyle = light; ctx.fillRect(3, 6, 1, 1); 
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

  // 1. Crimson Ops (Default) - Red/Dark Grey
  variations['crimson'] = createPlayerSheet('#2a2a35', '#4a4a55', '#606070', '#00eaff', '#353535', '#ff4444');
  
  // 2. Bio-Hazard - Yellow/Black
  variations['hazard'] = createPlayerSheet('#222', '#eab308', '#facc15', '#10b981', '#444', '#ef4444');

  // 3. Cobalt Heavy - Blue/Silver
  variations['cobalt'] = createPlayerSheet('#1e3a8a', '#94a3b8', '#cbd5e1', '#f59e0b', '#1e293b', '#3b82f6');

  // 4. Stealth Recon - Black/Green Neon
  variations['stealth'] = createPlayerSheet('#111', '#222', '#333', '#22c55e', '#000', '#22c55e');

  return variations;
};

export const generateSpikyBackground = (width: number, height: number, color: string) => {
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
