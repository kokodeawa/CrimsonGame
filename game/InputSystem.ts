
import { PIXEL_SCALE } from './constants';

export class InputSystem {
    public keys: Set<string> = new Set();
    public mouse = { x: 0, y: 0, isDown: false, isRightClick: false };
    
    // Joysticks
    public leftJoystick = { active: false, originX: 0, originY: 0, currentX: 0, currentY: 0, id: -1 };
    public rightJoystick = { active: false, originX: 0, originY: 0, currentX: 0, currentY: 0, id: -1 };

    private canvas: HTMLCanvasElement | null = null;

    constructor() {
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchMove = this.handleTouchMove.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        this.handleContextMenu = this.handleContextMenu.bind(this);
    }

    public bind(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);
        window.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('contextmenu', this.handleContextMenu);
        
        // Touch events need passive: false to prevent scrolling
        window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
        window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
        window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    public unbind() {
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);
        window.removeEventListener('mousedown', this.handleMouseDown);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('contextmenu', this.handleContextMenu);
        window.removeEventListener('touchstart', this.handleTouchStart);
        window.removeEventListener('touchmove', this.handleTouchMove);
        window.removeEventListener('touchend', this.handleTouchEnd);
        this.canvas = null;
    }

    private handleKeyDown(e: KeyboardEvent) {
        this.keys.add(e.code);
    }

    private handleKeyUp(e: KeyboardEvent) {
        this.keys.delete(e.code);
    }

    private handleMouseDown(e: MouseEvent) {
        this.mouse.isDown = true;
        this.mouse.isRightClick = (e.button === 2);
    }

    private handleMouseUp() {
        this.mouse.isDown = false;
        this.mouse.isRightClick = false;
    }

    private handleMouseMove(e: MouseEvent) {
        if (this.canvas) {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        }
    }

    private handleContextMenu(e: Event) {
        e.preventDefault();
    }

    private handleTouchStart(e: TouchEvent) {
        if (e.target !== this.canvas) return;
        if (e.cancelable) e.preventDefault();
        
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();

        // Used to track if this touch event was consumed by a joystick
        // If not, it might be a "tap" for building/interaction which is handled by mouse emulation
        let touchConsumed = false;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const tx = t.clientX - rect.left;
            const ty = t.clientY - rect.top;

            // Restrict Joysticks to the bottom 20% of the screen (Lowered from 25%)
            const zoneTop = rect.height * 0.80; 

            // Logic:
            // 1. Must be in the bottom section
            // 2. Left Stick: Left 30% of width (Reduced from 35%)
            // 3. Right Stick: Right 30% of width (Reduced from 35% - starts at 70%)
            
            if (ty > zoneTop) {
                if (tx < rect.width * 0.30) {
                    // Left Stick Zone
                    if (!this.leftJoystick.active) {
                        this.leftJoystick = { active: true, originX: tx, originY: ty, currentX: tx, currentY: ty, id: t.identifier };
                        touchConsumed = true;
                    }
                } else if (tx > rect.width * 0.70) {
                    // Right Stick Zone
                    if (!this.rightJoystick.active) {
                        this.rightJoystick = { active: true, originX: tx, originY: ty, currentX: tx, currentY: ty, id: t.identifier };
                        touchConsumed = true;
                    }
                }
            }
        }

        // Map first non-joystick touch to mouse for building placement
        if (!touchConsumed && e.changedTouches.length > 0) {
            const t = e.changedTouches[0];
            this.mouse.x = t.clientX - rect.left;
            this.mouse.y = t.clientY - rect.top;
            this.mouse.isDown = true;
        }
    }

    private handleTouchMove(e: TouchEvent) {
        if (e.target !== this.canvas) return;
        if (e.cancelable) e.preventDefault();
        if (!this.canvas) return;
        
        const rect = this.canvas.getBoundingClientRect();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            const tx = t.clientX - rect.left;
            const ty = t.clientY - rect.top;
            
            if (t.identifier === this.leftJoystick.id) {
                this.leftJoystick.currentX = tx;
                this.leftJoystick.currentY = ty;
            } else if (t.identifier === this.rightJoystick.id) {
                this.rightJoystick.currentX = tx;
                this.rightJoystick.currentY = ty;
            } else {
                // If it's a building tap drag
                this.mouse.x = tx;
                this.mouse.y = ty;
            }
        }
    }

    private handleTouchEnd(e: TouchEvent) {
        let joystickReleased = false;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i];
            if (t.identifier === this.leftJoystick.id) {
                this.leftJoystick.active = false;
                this.leftJoystick.id = -1;
                joystickReleased = true;
            }
            if (t.identifier === this.rightJoystick.id) {
                this.rightJoystick.active = false;
                this.rightJoystick.id = -1;
                joystickReleased = true;
            }
        }
        
        if (!joystickReleased) {
            this.mouse.isDown = false;
        }
    }
}
