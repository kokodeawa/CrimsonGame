
import React from 'react';
import { Cpu, X, Box, Info } from 'lucide-react';
import { PlayerStats } from '../../types';

interface BaseMenuProps {
  onClose: () => void;
  stats: PlayerStats;
  t: any;
  baseTab: 'upgrades' | 'fabrication';
  setBaseTab: (tab: 'upgrades' | 'fabrication') => void;
  craftingRecipes: any[];
  leveledUpgrades: any;
  singleUpgrades: any;
  getDynamicCost: (id: string) => any;
  renderCost: (cost: any) => React.ReactNode;
  upgradeBase: (id: string) => void;
  craftItem: (id: string) => void;
  openInfo: (title: string, desc: string) => void;
}

export const BaseMenu: React.FC<BaseMenuProps> = ({ 
    onClose, stats, t, baseTab, setBaseTab, 
    craftingRecipes, leveledUpgrades, singleUpgrades, 
    getDynamicCost, renderCost, upgradeBase, craftItem, openInfo
}) => {
  
  const getItemName = (id: string) => {
      if (id === 'weapon_sword') return t.wpn_sword;
      if (id === 'weapon_force') return t.wpn_force;
      if (id === 'weapon_laser') return t.wpn_laser;
      if (id === 'metal_block') return t.build_block;
      if (id === 'platform_kit') return t.build_platform;
      if (id === 'airlock_kit') return t.build_airlock;
      if (id === 'terminal_kit') return t.build_terminal;
      if (id === 'workbench_kit') return t.build_workbench;
      if (id === 'lab_kit') return t.build_lab;
      if (id === 'storage_kit') return t.build_storage;
      if (id === 'ore_scanner') return t.item_scanner;
      return id; // Fallback
  };

  const getUpgradeDesc = (id: string) => {
      if (id === 'decon_unit') return t.desc_decon;
      if (id === 'fabrication_efficiency') return t.desc_fab_eff;
      if (id === 'base_expand') return t.desc_expand;
      if (id === 'storage_bay') return t.desc_storage;
      return "";
  };

  const getUpgradeName = (id: string) => {
      if (id === 'oxygen') return t.upg_oxygen;
      if (id === 'drill_radius') return t.upg_radius;
      if (id === 'drill_reach') return t.upg_reach;
      if (id === 'drill_speed') return t.upg_speed;
      if (id === 'scanner_luck') return t.upg_scanner;
      if (id === 'resistance') return t.upg_resistance;
      if (id === 'fabricator') return t.upg_fabricator;
      if (id === 'base_expand') return t.upg_expand;
      if (id === 'hyperloop') return t.upg_hyperloop;
      if (id === 'storage_bay') return t.upg_storage;
      if (id === 'lab_research') return t.upg_lab;
      if (id === 'lab_key') return t.item_lab_key;
      if (id === 'radar') return t.upg_radar;
      if (id === 'jump_boots') return t.upg_boots;
      if (id === 'decon_unit') return t.upg_decon;
      if (id === 'fabrication_efficiency') return t.upg_fab_eff;
      return id;
  };

  const getCurrentLevel = (id: string) => {
      switch (id) {
          case 'oxygen': return stats.oxygenLevel;
          case 'drill_radius': return stats.miningRadiusLevel;
          case 'drill_reach': return stats.miningReachLevel;
          case 'drill_speed': return stats.miningSpeedLevel;
          case 'resistance': return stats.infectionResistanceLevel;
          case 'fabricator': return stats.inventoryLevel;
          case 'fabrication_efficiency': return stats.fabricationEfficiencyLevel;
          case 'base_expand': return stats.baseExpansionLevel;
          case 'hyperloop': return stats.loadingSpeedLevel;
          case 'storage_bay': return stats.storageLevel;
          case 'decon_unit': return stats.deconLevel;
          case 'jump_boots': return stats.highJumpBoots ? "MAX" : 0;
          case 'radar': return stats.unlockedRooms.includes('radar') ? "MAX" : 0;
          default: return 1;
      }
  };

  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4">
        <div className="relative w-full h-full flex flex-col bg-gray-900 border border-red-900 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.15)] animate-border-pulse overflow-hidden">
            
            {/* Scanline Effect Overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-5" style={{ background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(255, 0, 0, 0.02))', backgroundSize: '100% 2px, 3px 100%' }} />
            
            {/* Header */}
            <div className="p-3 border-b border-red-900/50 flex justify-between items-center bg-black/40">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-900/20 border border-red-700/50 rounded">
                        <Cpu size={20} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-red-500 uppercase tracking-widest leading-none">{t.engineering}</h2>
                        <div className="text-[10px] text-red-800 font-mono">{t.sys_ver}</div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-black rounded p-0.5 border border-red-900/30">
                            <button onClick={() => setBaseTab('upgrades')} className={`px-4 py-1.5 rounded text-[10px] font-bold tracking-wider transition-all ${baseTab === 'upgrades' ? 'bg-red-900 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-red-900 hover:text-red-400'}`}>{t.upgrade}</button>
                            <button onClick={() => setBaseTab('fabrication')} className={`px-4 py-1.5 rounded text-[10px] font-bold tracking-wider transition-all ${baseTab === 'fabrication' ? 'bg-red-900 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]' : 'text-red-900 hover:text-red-400'}`}>{t.crafting}</button>
                    </div>
                    <button onClick={onClose} className="text-red-900 hover:text-red-500 transition-colors"><X size={24} /></button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMOF0iIHN0cm9rZT0iIzIyMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
                {baseTab === 'upgrades' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {[...Object.keys(leveledUpgrades), ...Object.keys(singleUpgrades)].map(id => {
                            const cost = getDynamicCost(id);
                            const isMaxed = !cost;
                            const name = getUpgradeName(id);
                            const desc = getUpgradeDesc(id);
                            const level = getCurrentLevel(id);
                            
                            return (
                                <div key={id} className={`bg-black/80 border p-3 rounded flex flex-col gap-2 relative group overflow-hidden ${isMaxed ? 'border-green-900/50' : 'border-red-900/40 hover:border-red-600 transition-colors'}`}>
                                    {!isMaxed && <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-red-900/20 to-transparent pointer-events-none" />}
                                    
                                    <div className="flex justify-between items-start z-10 w-full">
                                        <div className="flex flex-col flex-1">
                                            <h3 className="font-bold text-gray-200 text-xs uppercase tracking-wider line-clamp-1">
                                                {name}
                                            </h3>
                                            <span className={`text-[10px] font-mono ${isMaxed ? 'text-green-500' : 'text-red-400'}`}>
                                                LVL {level}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {desc && (
                                                <button onClick={(e) => { e.stopPropagation(); openInfo(name, desc); }} className="text-gray-500 hover:text-white transition-colors">
                                                    <Info size={12} />
                                                </button>
                                            )}
                                            {isMaxed && <span className="text-[8px] bg-green-900/20 border border-green-800 text-green-400 px-1 py-0.5 rounded font-mono">{t.active}</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="my-1 border-t border-red-900/20 pt-1 min-h-[30px]">
                                         {!isMaxed && renderCost(cost)}
                                    </div>

                                    <button disabled={isMaxed} onClick={() => upgradeBase(id)} className={`mt-auto py-2 rounded text-[10px] font-bold uppercase tracking-widest border transition-all relative overflow-hidden group-hover:shadow-[0_0_10px_rgba(220,38,38,0.2)] ${isMaxed ? 'bg-gray-900 border-gray-800 text-gray-600' : 'bg-red-950/40 border-red-800 text-red-100 hover:bg-red-900'}`}>
                                        <span className="relative z-10">{isMaxed ? t.max_level : t.upgrade}</span>
                                        {!isMaxed && <div className="absolute inset-0 bg-red-600/10 transform -translate-x-full group-hover:translate-x-full transition-transform duration-500" />}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {craftingRecipes.filter((r: any) => r.type !== 'consumable').map((r: any) => (
                                <div key={r.id} className="bg-black/80 border border-red-900/30 p-3 rounded flex flex-col gap-2 hover:border-red-500 transition-colors group">
                                    <div className="flex justify-between border-b border-red-900/20 pb-1">
                                        <h3 className="font-bold text-gray-200 text-xs uppercase line-clamp-1">
                                            {getItemName(r.id)}
                                        </h3>
                                        <Box size={14} className="text-red-800 group-hover:text-red-500 transition-colors" />
                                    </div>
                                    <div className="min-h-[30px]">
                                        {renderCost(r.cost)}
                                    </div>
                                    <button onClick={() => craftItem(r.id)} className="bg-orange-950/40 hover:bg-orange-900/60 border border-orange-900/50 hover:border-orange-600 text-orange-200 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-all">
                                        {t.craft}
                                    </button>
                                </div>
                            ))}
                    </div>
                )}
            </div>
            {/* Footer Deco */}
            <div className="h-4 bg-black border-t border-red-900/50 flex items-center justify-between px-4">
                 <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => <div key={i} className={`w-1 h-1 rounded-full ${i===0 ? 'bg-red-500 animate-pulse' : 'bg-red-900/30'}`} />)}
                 </div>
                 <div className="text-[8px] text-red-900 uppercase tracking-widest">{t.eng_online}</div>
            </div>
        </div>
    </div>
  );
};
