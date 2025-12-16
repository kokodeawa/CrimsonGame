
import React from 'react';
import { FlaskConical, X } from 'lucide-react';

interface LabMenuProps {
  onClose: () => void;
  t: any;
  craftingRecipes: any[];
  renderCost: (cost: any) => React.ReactNode;
  craftItem: (id: string) => void;
}

export const LabMenu: React.FC<LabMenuProps> = ({ onClose, t, craftingRecipes, renderCost, craftItem }) => {
  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4">
         {/* Green Theme Container */}
         <div className="w-full h-full bg-gray-900 border border-emerald-900 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.15)] animate-border-pulse-green flex flex-col overflow-hidden">
             
             {/* Header */}
             <div className="p-3 border-b border-emerald-900/50 flex justify-between items-center bg-black/40">
                 <div>
                    <h2 className="text-xl font-black text-emerald-500 flex items-center gap-2 tracking-widest uppercase">
                        <FlaskConical size={20} /> {t.laboratory}
                    </h2>
                    <p className="text-[10px] text-emerald-800 font-mono mt-0.5">{t.chem_synth}</p>
                 </div>
                 <button onClick={onClose} className="text-emerald-900 hover:text-emerald-500 transition-colors"><X size={24} /></button>
             </div>

             {/* Content */}
             <div className="flex-1 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMOF0iIHN0cm9rZT0iIzIyMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1c2UodXJsKCNhKSkiLz48L3N2Zz4')] lab-scroll">
                 {craftingRecipes.filter((r: any) => r.type === 'consumable').map((r: any) => (
                     <div key={r.id} className="bg-black/80 border border-emerald-900/30 p-3 rounded-lg hover:border-emerald-500 transition-all group flex flex-col justify-between">
                         <div className="flex justify-between mb-2 pb-1 border-b border-emerald-900/20">
                             <h3 className="font-bold text-gray-200 tracking-wider text-xs">
                                 {r.id === 'repair_kit' && t.item_repair}
                                 {r.id === 'oxygen_tank' && t.item_tank}
                                 {r.id === 'lantern' && t.item_lantern}
                                 {r.id === 'health_injection' && t.item_injection}
                                 {r.id === 'immunity_booster' && t.item_booster}
                                 {r.id === 'purifier' && t.item_purifier}
                                 {/* Added missing ore scanner and potential teleporter */}
                                 {r.id === 'ore_scanner' && t.item_scanner}
                                 {r.id === 'teleporter' && t.item_teleporter}
                             </h3>
                         </div>
                         <div className="mb-2">
                            {renderCost(r.cost)}
                         </div>
                         <button onClick={() => craftItem(r.id)} className="w-full bg-emerald-900/20 hover:bg-emerald-900/60 text-emerald-100 py-2 rounded text-[10px] font-bold border border-emerald-800 uppercase tracking-widest shadow-lg hover:shadow-emerald-900/20 transition-all">
                             {t.craft}
                         </button>
                     </div>
                 ))}
             </div>
         </div>
    </div>
  );
};
