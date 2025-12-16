
import React, { useState } from 'react';
import { Package, X, ArrowDown, Circle, Settings } from 'lucide-react';
import { PlayerStats, HotbarSlot } from '../../types';

interface HotbarMenuProps {
    onClose: () => void;
    stats: PlayerStats;
    updateHotbarSlot: (index: number, itemKey: string | null, type: 'building' | 'consumable' | 'weapon') => void;
    resourceConfig: any;
    HOTBAR_ITEMS_REF: any[];
    ITEM_ICONS: Record<string, any>;
}

export const HotbarMenu: React.FC<HotbarMenuProps> = ({ onClose, stats, updateHotbarSlot, resourceConfig, ITEM_ICONS }) => {
    const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

    // Aggregate all available items from stats
    const availableItems = [
        ...Object.keys(stats.baseItems).map(key => ({ key, type: 'building', count: stats.baseItems[key as keyof typeof stats.baseItems] })),
        { key: 'repairKits', type: 'consumable', count: stats.repairKits },
        { key: 'lanterns', type: 'consumable', count: stats.lanterns },
        { key: 'oxygenTanks', type: 'consumable', count: stats.oxygenTanks },
        { key: 'teleporters', type: 'consumable', count: stats.teleporters },
        ...stats.unlockedWeapons.map(w => ({ key: w, type: 'weapon', count: 1 }))
    ].filter(item => item.count > 0);

    const handleItemSelect = (item: any) => {
        if (selectedSlotIndex !== null) {
            updateHotbarSlot(selectedSlotIndex, item.key, item.type as any);
            setSelectedSlotIndex(null); // Deselect
        }
    };

    const clearSlot = (index: number) => {
        updateHotbarSlot(index, null, 'building');
    };

    return (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4">
             <div className="w-full h-full bg-gray-900 border border-red-900 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.15)] animate-border-pulse flex flex-col overflow-hidden">
                 
                 {/* Header */}
                 <div className="p-3 border-b border-red-900/50 flex justify-between items-center bg-black/40">
                     <div>
                        <h2 className="text-xl font-black text-gray-200 tracking-widest flex items-center gap-2 uppercase">
                            <Settings size={20} className="text-red-600" /> HOTBAR CONFIG
                        </h2>
                        <p className="text-[10px] text-red-900 font-mono mt-0.5">QUICK ACCESS PROTOCOL</p>
                     </div>
                     <button onClick={onClose} className="text-red-900 hover:text-red-500 transition-colors"><X size={24} /></button>
                 </div>

                 <div className="flex-1 p-4 flex flex-col items-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMOF0iIHN0cm9rZT0iIzIyMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
                     
                     {/* Slots Row */}
                     <div className="mb-8 text-center w-full">
                         <div className="text-xs font-bold text-red-500 mb-3 uppercase tracking-[0.2em]">Select a Slot to Edit</div>
                         <div className="flex justify-center gap-2 flex-wrap">
                             {stats.hotbarSlots.map((slot, idx) => {
                                 const Icon = slot.itemKey && ITEM_ICONS[slot.itemKey] ? ITEM_ICONS[slot.itemKey] : null;
                                 return (
                                     <button 
                                        key={idx}
                                        onClick={() => setSelectedSlotIndex(idx)}
                                        className={`w-14 h-14 rounded-lg border-2 flex flex-col items-center justify-center relative transition-all duration-300 ${selectedSlotIndex === idx ? 'border-red-500 bg-red-900/30 scale-110 shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'border-gray-700 bg-gray-800 hover:border-gray-500 hover:bg-gray-700'}`}
                                     >
                                         <span className="absolute top-0.5 left-1 text-[8px] text-gray-500 font-mono">0{idx + 1}</span>
                                         {slot.itemKey ? (
                                             <div className="flex flex-col items-center gap-0.5">
                                                 {Icon ? <Icon size={20} className="text-gray-200" /> : (
                                                     <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-[8px] font-bold">
                                                         {slot.itemKey.substring(0,2).toUpperCase()}
                                                     </div>
                                                 )}
                                             </div>
                                         ) : (
                                             <div className="text-gray-600 text-[8px] uppercase tracking-wider">EMPTY</div>
                                         )}
                                         {slot.itemKey && <button onClick={(e) => { e.stopPropagation(); clearSlot(idx); }} className="absolute -top-1.5 -right-1.5 bg-red-900 text-red-200 rounded-full p-0.5 border border-red-500 hover:scale-110 transition-transform"><X size={10} /></button>}
                                     </button>
                                 );
                             })}
                         </div>
                     </div>

                     {/* Available Items */}
                     <div className="w-full max-w-3xl border-t border-red-900/30 pt-4 flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-[0.2em] text-center">Available Items</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 overflow-y-auto p-1">
                            {availableItems.map((item) => {
                                const Icon = ITEM_ICONS[item.key] || Circle;
                                return (
                                    <button 
                                        key={item.key} 
                                        onClick={() => handleItemSelect(item)}
                                        disabled={selectedSlotIndex === null}
                                        className={`p-2 rounded border flex flex-col items-center gap-1 transition-all ${selectedSlotIndex !== null ? 'bg-gray-800/80 border-gray-600 hover:bg-gray-700 hover:border-red-500 hover:scale-105 cursor-pointer' : 'bg-gray-900/50 border-gray-800 opacity-30 cursor-not-allowed grayscale'}`}
                                    >
                                        <div className={`text-xs font-bold ${selectedSlotIndex !== null ? 'text-gray-200' : 'text-gray-600'} flex flex-col items-center gap-1`}>
                                            <Icon size={18} />
                                            <span className="text-center uppercase text-[8px] tracking-wide leading-tight">{item.key.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="text-[8px] text-gray-500 bg-black/40 px-1.5 py-0.5 rounded">x{item.count}</div>
                                    </button>
                                );
                            })}
                        </div>
                        {selectedSlotIndex === null && (
                            <div className="text-center mt-4 animate-pulse p-2 border border-dashed border-red-900/30 rounded bg-red-950/10">
                                <span className="text-red-500 font-mono text-[10px] uppercase tracking-widest">Select a slot above to assign an item</span>
                            </div>
                        )}
                     </div>
                 </div>
             </div>
        </div>
    );
};
