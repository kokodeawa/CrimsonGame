
import React, { useState } from 'react';
import { Briefcase, X, Box, Circle, ArrowRight, Wrench, Wind, Lightbulb, Zap, Syringe, ShieldPlus, Droplet, Radar, Hammer, Terminal, DoorOpen, FlaskConical, Container, Square, GripHorizontal, Sword, Shield, Crosshair } from 'lucide-react';
import { PlayerStats, HotbarSlot } from '../../types';

interface InventoryMenuProps {
  onClose: () => void;
  stats: PlayerStats;
  t: any;
  resourceConfig: any;
  useItem: (itemKey: keyof PlayerStats) => void;
  updateHotbarSlot: (index: number, itemKey: string | null, type: 'building' | 'consumable' | 'weapon') => void;
  ITEM_ICONS: Record<string, any>;
}

export const InventoryMenu: React.FC<InventoryMenuProps> = ({ onClose, stats, t, resourceConfig, useItem, updateHotbarSlot, ITEM_ICONS }) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'resources' | 'items' | 'build' | 'weapons'>('items');

  // Aggregate Items
  const consumables = [
      { key: 'repairKits', type: 'consumable', count: stats.repairKits, label: t.item_repair },
      { key: 'oxygenTanks', type: 'consumable', count: stats.oxygenTanks, label: t.item_tank },
      { key: 'lanterns', type: 'consumable', count: stats.lanterns, label: t.item_lantern },
      { key: 'teleporters', type: 'consumable', count: stats.teleporters, label: t.item_teleporter },
      { key: 'healthInjections', type: 'consumable', count: stats.healthInjections, label: t.item_injection },
      { key: 'immunityBoosters', type: 'consumable', count: stats.immunityBoosters, label: t.item_booster },
      { key: 'purifiers', type: 'consumable', count: stats.purifiers, label: t.item_purifier },
      { key: 'oreScanners', type: 'consumable', count: stats.oreScanners, label: t.item_scanner },
  ].filter(i => i.count > 0);

  const buildings = Object.keys(stats.baseItems).map(key => ({
      key, type: 'building', count: stats.baseItems[key as keyof typeof stats.baseItems], label: t[`build_${key}`] || key
  })).filter(i => i.count > 0);

  const weapons = stats.unlockedWeapons.map(w => ({
      key: w, type: 'weapon', count: 1, label: t[`wpn_${w}`] || w
  }));

  const handleItemClick = (item: any) => {
      if (selectedSlotIndex !== null) {
          // Assign to Hotbar
          updateHotbarSlot(selectedSlotIndex, item.key, item.type);
          setSelectedSlotIndex(null); // Auto deselect after assignment
      } else {
          // Use Item (Consumables Only)
          if (item.type === 'consumable') {
              useItem(item.key as keyof PlayerStats);
          }
      }
  };

  const clearSlot = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      updateHotbarSlot(index, null, 'building');
      if (selectedSlotIndex === index) setSelectedSlotIndex(null);
  };

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4">
        <div className="w-full h-full bg-gray-900 border-2 border-gray-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-900/20 rounded border border-red-900/50">
                        <Briefcase size={20} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-100 tracking-widest uppercase">{t.inventory}</h2>
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-2">
                            <span>{t.loadout_config}</span>
                            <span className="text-gray-700">|</span>
                            <span>LVL {stats.inventoryLevel}</span>
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:bg-red-900/50 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                
                {/* LEFT COLUMN: HOTBAR (BELT) */}
                <div className="w-full md:w-24 bg-black/60 border-r border-gray-800 flex md:flex-col items-center p-4 gap-3 overflow-x-auto md:overflow-visible no-scrollbar">
                    {stats.hotbarSlots.map((slot, idx) => {
                        const Icon = slot.itemKey && ITEM_ICONS[slot.itemKey] ? ITEM_ICONS[slot.itemKey] : null;
                        const isSelected = selectedSlotIndex === idx;
                        return (
                            <button 
                                key={idx}
                                onClick={() => setSelectedSlotIndex(isSelected ? null : idx)}
                                className={`relative shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected ? 'border-red-500 bg-red-900/20 shadow-[0_0_15px_rgba(220,38,38,0.3)] scale-105' : 'border-gray-700 bg-gray-900/50 hover:border-gray-500'}`}
                            >
                                <span className="absolute top-1 left-1.5 text-[8px] font-mono text-gray-500">{idx + 1}</span>
                                {slot.itemKey ? (
                                    <>
                                        {Icon ? <Icon size={24} className="text-gray-200" /> : <div className="w-4 h-4 bg-gray-600 rounded-full" />}
                                        <button onClick={(e) => clearSlot(e, idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-900 text-white rounded-full flex items-center justify-center border border-red-500 hover:scale-110"><X size={10} /></button>
                                    </>
                                ) : (
                                    <div className="w-2 h-2 bg-gray-800 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* RIGHT COLUMN: ITEMS & RESOURCES */}
                <div className="flex-1 flex flex-col bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMOF0iIHN0cm9rZT0iIzIyMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-800 bg-black/40 px-4 pt-4 gap-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setActiveTab('items')} className={`px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider border-t border-x ${activeTab === 'items' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}>{t.tab_items}</button>
                        <button onClick={() => setActiveTab('build')} className={`px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider border-t border-x ${activeTab === 'build' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}>{t.tab_build}</button>
                        <button onClick={() => setActiveTab('weapons')} className={`px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider border-t border-x ${activeTab === 'weapons' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}>{t.tab_weapons}</button>
                        <button onClick={() => setActiveTab('resources')} className={`px-4 py-2 rounded-t-lg text-xs font-bold uppercase tracking-wider border-t border-x ${activeTab === 'resources' ? 'bg-gray-800 border-gray-700 text-white' : 'bg-transparent border-transparent text-gray-500 hover:text-gray-300'}`}>{t.tab_resources}</button>
                    </div>

                    {/* Grid Content */}
                    <div className="flex-1 p-4 overflow-y-auto">
                        {selectedSlotIndex !== null && (
                            <div className="mb-4 bg-red-900/20 border border-red-500/30 p-2 rounded flex items-center justify-center gap-2 animate-pulse">
                                <span className="text-red-400 text-xs font-bold uppercase">{t.select_assign_prompt} {selectedSlotIndex + 1}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                            
                            {activeTab === 'resources' && Object.entries(resourceConfig).map(([key, config]: [string, any]) => (
                                <div key={key} className="bg-gray-900/50 border border-gray-800 p-3 rounded flex flex-col items-center justify-center opacity-80">
                                    <config.icon size={24} className={`${config.color} mb-2`} />
                                    <span className="text-lg font-black text-gray-200">{stats[key as keyof PlayerStats] as number}</span>
                                    <span className="text-[9px] text-gray-600 uppercase mt-1">{t[`res_${key}`] || key}</span>
                                </div>
                            ))}

                            {activeTab === 'items' && consumables.map(item => {
                                // Resolve Icon
                                const Icon = ITEM_ICONS[item.key] || Box;
                                
                                return (
                                    <button 
                                        key={item.key} 
                                        onClick={() => handleItemClick(item)}
                                        className={`bg-gray-900 border p-3 rounded flex flex-col justify-between group transition-all h-24 ${selectedSlotIndex !== null ? 'border-red-500/50 hover:bg-red-900/20' : 'border-gray-700 hover:border-gray-500 hover:bg-gray-800'}`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <div className="flex items-center gap-2">
                                                <Icon size={16} className="text-gray-400 group-hover:text-white" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase leading-tight text-left">{item.label}</span>
                                            </div>
                                            <span className="text-[10px] bg-black/50 px-1.5 rounded text-white">{item.count}</span>
                                        </div>
                                        <div className="self-end mt-auto">
                                            {selectedSlotIndex !== null ? <span className="text-[9px] text-red-400 uppercase font-bold">{t.assign}</span> : <span className="text-[9px] text-green-400 uppercase font-bold bg-green-900/20 px-2 py-1 rounded border border-green-900">{t.use}</span>}
                                        </div>
                                    </button>
                                );
                            })}

                            {activeTab === 'build' && buildings.map(item => {
                                const Icon = ITEM_ICONS[item.key] || Square;
                                return (
                                    <button 
                                        key={item.key} 
                                        onClick={() => handleItemClick(item)}
                                        disabled={selectedSlotIndex === null}
                                        className={`bg-gray-900 border p-3 rounded flex flex-col justify-between group transition-all h-24 ${selectedSlotIndex !== null ? 'border-blue-500/50 hover:bg-blue-900/20 cursor-pointer' : 'border-gray-800 opacity-50 cursor-not-allowed'}`}
                                    >
                                        <div className="flex justify-between items-start w-full">
                                            <div className="flex items-center gap-2">
                                                <Icon size={16} className="text-gray-400 group-hover:text-blue-300" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase leading-tight text-left">{item.label}</span>
                                            </div>
                                            <span className="text-[10px] bg-black/50 px-1.5 rounded text-white">{item.count}</span>
                                        </div>
                                        {selectedSlotIndex === null && <span className="text-[8px] text-gray-600 mt-auto self-end">{t.select_slot_first}</span>}
                                        {selectedSlotIndex !== null && <span className="text-[9px] text-blue-400 uppercase font-bold mt-auto self-end">{t.assign}</span>}
                                    </button>
                                );
                            })}

                            {activeTab === 'weapons' && weapons.map(item => {
                                let Icon = Sword;
                                if (item.key === 'force') Icon = Crosshair;
                                if (item.key === 'laser') Icon = Zap;

                                return (
                                    <button 
                                        key={item.key} 
                                        onClick={() => handleItemClick(item)}
                                        disabled={selectedSlotIndex === null}
                                        className={`bg-gray-900 border p-3 rounded flex flex-col justify-between group transition-all h-24 ${selectedSlotIndex !== null ? 'border-orange-500/50 hover:bg-orange-900/20 cursor-pointer' : 'border-gray-800 opacity-50 cursor-not-allowed'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Icon size={16} className="text-orange-500" />
                                            <span className="text-[10px] font-bold text-gray-400 uppercase leading-tight text-left">{item.label}</span>
                                        </div>
                                        {selectedSlotIndex === null && <span className="text-[8px] text-gray-600 mt-auto self-end">{t.select_slot_first}</span>}
                                        {selectedSlotIndex !== null && <span className="text-[9px] text-orange-400 uppercase font-bold mt-auto self-end">{t.assign}</span>}
                                    </button>
                                );
                            })}
                            
                            {/* Empty State */}
                            {((activeTab === 'items' && consumables.length === 0) || (activeTab === 'build' && buildings.length === 0) || (activeTab === 'weapons' && weapons.length === 0)) && (
                                <div className="col-span-full py-10 flex flex-col items-center justify-center text-gray-600">
                                    <Box size={32} className="mb-2 opacity-20" />
                                    <span className="text-xs font-mono uppercase tracking-widest">{t.no_items_detected}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
