

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
  ctx.fillStyle = '#2d0a0a';
  ctx.fillRect(0, 0, 32, 32);
  return canvas;
};

export const generateCockroachSprites = () => {
    // Generates a spritesheet with 2 frames of animation for different sizes
    const { canvas, ctx } = createOffscreenCanvas(64, 32);
    
    // Helper to draw a roach
    const drawRoach = (x: number, y: number, w: number, h: number, frame: number) => {
        ctx.save();
        ctx.translate(x, y);
        
        // Legs
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 1;
        const legOffset = frame === 0 ? 2 : -2;
        
        ctx.beginPath();
        // Left legs
        ctx.moveTo(w*0.2, h*0.5); ctx.lineTo(-w*0.2, h*0.2 + legOffset);
        ctx.moveTo(w*0.5, h*0.5); ctx.lineTo(w*0.5, -h*0.2 - legOffset);
        ctx.moveTo(w*0.8, h*0.5); ctx.lineTo(w*1.2, h*0.2 + legOffset);
        // Right legs
        ctx.moveTo(w*0.2, h*0.5); ctx.lineTo(-w*0.2, h*0.8 - legOffset);
        ctx.moveTo(w*0.5, h*0.5); ctx.lineTo(w*0.5, h*1.2 + legOffset);
        ctx.moveTo(w*0.8, h*0.5); ctx.lineTo(w*1.2, h*0.8 - legOffset);
        ctx.stroke();

        // Body
        ctx.fillStyle = '#3e2723'; // Dark brown
        ctx.beginPath();
        ctx.ellipse(w/2, h/2, w/2, h/3, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Head
        ctx.fillStyle = '#5d4037';
        ctx.beginPath();
        ctx.ellipse(w*0.8, h/2, w/4, h/4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Antennae
        ctx.strokeStyle = '#a1887f';
        ctx.beginPath();
        ctx.moveTo(w*0.9, h*0.4); ctx.lineTo(w*1.4, h*0.1 + (frame*2));
        ctx.moveTo(w*0.9, h*0.6); ctx.lineTo(w*1.4, h*0.9 - (frame*2));
        ctx.stroke();
        
        // Eyes
        ctx.fillStyle = '#f00'; // Red evil eyes
        ctx.fillRect(w*0.85, h*0.35, 1, 1);
        ctx.fillRect(w*0.85, h*0.65, 1, 1);

        ctx.restore();
    };

    // Frame 1
    drawRoach(0, 0, 32, 16, 0);
    // Frame 2
    drawRoach(32, 0, 32, 16, 1);
    
    return canvas;
};

export const generateResourceTextures = () => {
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
  {
      // Rare Slime (Moco raro)
      const { canvas, ctx } = init();
      ctx.fillStyle = '#000000'; ctx.fillRect(0,0,size,size);
      ctx.fillStyle = '#39ff14'; // Bright green
      ctx.beginPath();
      ctx.arc(size/2, size/2, size/3, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#ccffcc';
      ctx.fillRect(size/2 - 1, size/2 - 1, 2, 2);
      textures['rareSlime'] = canvas;
  }
  return textures;
};

export const generatePlayerSprites = () => {
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