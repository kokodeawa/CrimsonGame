
import { LevelObject, PlayerStats } from '../types';
import { BLOCK_SIZE, CHUNK_SIZE } from './constants';

export const loadOutsideStage = (w: number, h: number, addObject: (obj: LevelObject) => void) => {
    addObject({ x: -100, y: -20, width: w + 200, height: 60, type: 'solid', id: 'ceil_main' });
    const airlockX = 400; addObject({ x: airlockX, y: -20, width: 32, height: 50, type: 'base_entrance', id: 'airlock_outside' });
};

export const loadBaseStage = (w: number, h: number, stats: PlayerStats, addObject: (obj: LevelObject) => void) => {
    const expansion = stats.baseExpansionLevel || 0;
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
    if (stats.hasDecontaminationUnit) {
        addObject({ x: roomX + roomW - 120, y: roomY + roomH - 50, width: 30, height: 50, type: 'solid', id: 'decon_machine' });
    }

    // Storage
    const storeLvl = stats.storageLevel || 0;
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

export const loadMineStage = (w: number, h: number, stats: PlayerStats, addObject: (obj: LevelObject) => void) => {
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

    const scannerLevel = stats.oreScannerLevel || 1;
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
                    if (Math.random() < 0.13) { 
                        type = 'infected_living_metal'; 
                        health = 25; // NERFED FROM 90 TO 25 for easy accidental breaking
                    } 
                    else if (Math.random() < 0.05) { variant = 1; health = 100; }
                break; 
            } 
            if (size > 1) health *= 2; 
            
            addObject({ x: worldX, y: worldY, width: pixelSize, height: pixelSize, type: 'destructible', id: `ore_${x}_${y}`, resourceType: type, health: health, maxHealth: health, variant: variant }); 
        } 
    }
};
