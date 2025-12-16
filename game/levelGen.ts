
import { LevelObject, PlayerStats } from '../types';
import { BLOCK_SIZE, CHUNK_SIZE } from './constants';

export const loadOutsideStage = (w: number, h: number, addObject: (obj: LevelObject) => void) => {
    // Floor (Normal Gravity) - Placed at the bottom
    addObject({ x: -200, y: h - 60, width: w + 400, height: 200, type: 'solid', id: 'floor_main' });
    
    // Bounds Walls - Prevent falling off the edges
    addObject({ x: -40, y: -1000, width: 40, height: h + 2000, type: 'solid', id: 'wall_limit_l' });
    addObject({ x: w, y: -1000, width: 40, height: h + 2000, type: 'solid', id: 'wall_limit_r' });

    const airlockX = 400; 
    // Airlock sits on the floor. Floor at h-60. Airlock height 50. Y = h - 60 - 50 = h - 110.
    addObject({ x: airlockX, y: h - 110, width: 32, height: 50, type: 'base_entrance', id: 'airlock_outside' });
};

export const loadBaseStage = (w: number, h: number, stats: PlayerStats, addObject: (obj: LevelObject) => void) => {
    const expansion = stats.baseExpansionLevel || 0;
    
    // Core Room Dimensions - Aligned to 40px grid (2x 20px grid blocks)
    // The building grid is 20px. Walls must be 40px (2x2 cells) to match the look.
    // Room Width must be divisible by 40 to tile perfectly.
    const roomW = 240; // 6 * 40
    const roomH = 320; // 8 * 40
    
    // Calculate Room Center snapped to grid
    // W=1000, RoomW=240 -> (1000-240)/2 = 380. 
    // 380 is not a multiple of 40 (360 is, 400 is). 
    // However, placement grid is 20px. 380 is a multiple of 20. 
    // Wall starts at 380 - 40 = 340. 340 is a multiple of 20 (17*20).
    // So the wall occupies slots on the 20px grid perfectly.
    const roomX = 380; 
    const roomY = 240; // (800-320)/2 = 240. (6 * 40). Perfect.

    // Border thickness (multiple of 40)
    const borderThick = 1200; 
    
    // Wall thickness (40px = 2x2 grid cells of 20px each)
    const wallThick = 40; 
    
    // Side Room Width (multiple of 40)
    const sideRoomW = 200; // 5 * 40
    
    // Door Height (multiple of 40)
    const doorH = 80; // 2 * 40
    
    // Upper Room Height (Reduced)
    const upRoomH = 120; // 3 * 40

    // --- FLOORS & CEILINGS (Horizontal) ---
    const floorY = roomY + roomH; // 240 + 320 = 560 (14 * 40)
    
    // Surface Floor (Walkable - Uses Tech Floor 32px or 40px? Kept 32 as per prev req, but maybe 40?)
    // Using 40px for floor surface to align perfectly with walls.
    const floorH = 40;
    addObject({ x: -borderThick, y: floorY, width: w + (borderThick*2), height: floorH, type: 'solid', id: 'floor_surface' });
    
    // Deep Foundation (Underground)
    addObject({ x: -borderThick, y: floorY + floorH, width: w + (borderThick*2), height: borderThick, type: 'solid', id: 'floor_foundation' });

    // --- CEILING ---
    // If Expansion < 3, we have a simple ceiling above Main+Side rooms.
    // If Expansion >= 3, we have Upper Rooms, so the "ceiling" moves up.
    
    if (expansion < 3) {
        // No upper rooms. Solid block above main level.
        addObject({ x: -borderThick, y: roomY - borderThick, width: w + (borderThick*2), height: borderThick, type: 'solid', id: 'ceil_base' });
    } else {
        // Upper rooms exist.
        // 1. Ultimate Ceiling (Above upper rooms)
        const upperCeilY = roomY - upRoomH - borderThick;
        addObject({ x: -borderThick, y: upperCeilY, width: w + (borderThick*2), height: borderThick, type: 'solid', id: 'ceil_upper' });

        // 2. Mid Ceiling / Upper Floor (Separating lower and upper levels)
        const midCeilY = roomY - wallThick;
        const midCeilH = wallThick;

        // Above Left Room (Solid)
        addObject({ x: roomX - wallThick - sideRoomW, y: midCeilY, width: sideRoomW + wallThick, height: midCeilH, type: 'solid', id: 'mid_ceil_left_room' });
        
        // Above Right Room (Solid)
        addObject({ x: roomX + roomW, y: midCeilY, width: sideRoomW + wallThick, height: midCeilH, type: 'solid', id: 'mid_ceil_right_room' });

        // Above Main Room (With Gaps)
        // Segment 1 (Far Left of Main)
        // 40px wide
        addObject({ x: roomX, y: midCeilY, width: 40, height: midCeilH, type: 'solid', id: 'mid_ceil_main_1' });
        
        // Center Segment (Between gaps)
        // RoomW = 240. Center = 120. 
        // 40px block centered is at 100 relative to roomX.
        if (expansion >= 4) {
            addObject({ x: roomX + 100, y: midCeilY, width: 40, height: midCeilH, type: 'solid', id: 'mid_ceil_main_center' });
        } else {
            // If only exp 3, right gap is closed.
            // Spans from 100 to (240-40) = 200. Width = 100.
            addObject({ x: roomX + 100, y: midCeilY, width: 100, height: midCeilH, type: 'solid', id: 'mid_ceil_main_center_long' });
        }

        // Segment 3 (Far Right of Main)
        addObject({ x: roomX + roomW - 40, y: midCeilY, width: 40, height: midCeilH, type: 'solid', id: 'mid_ceil_main_end' });

        // Upper Room Walls (Outer Limits)
        // Left Wall for Upper Area
        addObject({ x: roomX - borderThick, y: roomY - upRoomH, width: borderThick, height: upRoomH, type: 'solid', id: 'wall_up_far_l' });
        // Right Wall for Upper Area
        addObject({ x: roomX + roomW, y: roomY - upRoomH, width: borderThick, height: upRoomH, type: 'solid', id: 'wall_up_far_r' });
        
        // Partition between Upper Left and Upper Right rooms
        // Centered: roomX + 100, width 40
        addObject({ x: roomX + 100, y: roomY - upRoomH, width: wallThick, height: upRoomH, type: 'solid', id: 'wall_up_partition' });
    }

    // --- WALLS (Level 0, 1, 2) ---

    // Left Side
    if (expansion >= 1) {
        // Partition (Main <-> Left)
        // Height = roomH - doorH = 320 - 80 = 240
        addObject({ x: roomX - wallThick, y: roomY, width: wallThick, height: roomH - doorH, type: 'solid', id: 'wall_l_partition' });
        // Far Left Wall
        addObject({ x: roomX - wallThick - sideRoomW - borderThick, y: roomY, width: borderThick, height: roomH, type: 'solid', id: 'wall_l_far' });
    } else {
        // Solid Wall
        addObject({ x: roomX - borderThick, y: roomY, width: borderThick, height: roomH, type: 'solid', id: 'wall_l_solid' });
    }

    // Right Side
    if (expansion >= 2) {
        // Partition (Main <-> Right)
        addObject({ x: roomX + roomW, y: roomY, width: wallThick, height: roomH - doorH, type: 'solid', id: 'wall_r_partition' });
        // Far Right Wall
        addObject({ x: roomX + roomW + wallThick + sideRoomW, y: roomY, width: borderThick, height: roomH, type: 'solid', id: 'wall_r_far' });
    } else {
        // Solid Wall
        addObject({ x: roomX + roomW, y: roomY, width: borderThick, height: roomH, type: 'solid', id: 'wall_r_solid' });
    }

    // Load User Placed Objects
    if (stats.baseLayout) {
        stats.baseLayout.forEach(obj => {
            addObject(obj);
        });
    }
};
