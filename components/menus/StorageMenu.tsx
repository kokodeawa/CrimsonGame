
import React from 'react';
import { Container, X, ArrowLeftRight } from 'lucide-react';
import { PlayerStats } from '../../types';

interface StorageMenuProps {
  onClose: () => void;
  stats: PlayerStats;
  t: any;
  depositItem: (key: string, amount: number, isAll: boolean) => void;
  withdrawItem: (key: string, amount: number, isAll: boolean) => void;
  resourceConfig: any;
}

export const StorageMenu: React.FC<StorageMenuProps> = ({ onClose, stats, t, depositItem, withdrawItem, resourceConfig }) => {
  return (
     <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4">
         <div className="w-full h-full bg-gray-900 border border-red-900 rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.15)] animate-border-pulse flex flex-col overflow-hidden">
             
             {/* Header */}
             <div className="p-3 border-b border-red-900/50 flex justify-between items-center bg-black/40">
                 <div>
                    <h2 className="text-xl font-black text-amber-600 flex items-center gap-2 tracking-widest uppercase">
                        <Container size={20} /> {t.storage}
                    </h2>
                    <p className="text-[10px] text-amber-900 font-mono mt-0.5">{t.vault_access}</p>
                 </div>
                 <button onClick={onClose} className="text-red-900 hover:text-red-500 transition-colors"><X size={24} /></button>
             </div>

             {/* Content */}
             <div className="flex-1 p-4 overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMOF0iIHN0cm9rZT0iIzIyMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
                 <div className="grid grid-cols-2 gap-4 h-full">
                     {/* Inventory Side */}
                     <div className="bg-black/60 border border-gray-800 rounded-lg p-3 flex flex-col h-full overflow-hidden">
                         <h3 className="text-xs font-black text-gray-500 uppercase mb-3 text-center border-b border-gray-800 pb-1 tracking-widest">{t.inventory}</h3>
                         <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                             {Object.keys(resourceConfig).map(key => (
                                 <div key={key} className="flex items-center justify-between bg-gray-900/80 p-2 rounded border border-gray-800 hover:border-gray-600 transition-colors">
                                     <div className="flex items-center gap-2">
                                         {React.createElement(resourceConfig[key].icon, { size: 14, className: resourceConfig[key].color })}
                                         <span className="text-xs font-bold text-gray-300">{stats[key as keyof PlayerStats] as number}</span>
                                     </div>
                                     <button onClick={() => depositItem(key, 10, true)} className="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-2 py-1 rounded uppercase font-bold tracking-wider hover:bg-gray-700 hover:text-white transition-colors">{t.deposit}</button>
                                 </div>
                             ))}
                         </div>
                     </div>

                     {/* Base Side */}
                     <div className="bg-black/60 border border-amber-900/30 rounded-lg p-3 flex flex-col h-full overflow-hidden">
                         <h3 className="text-xs font-black text-amber-600 uppercase mb-3 text-center border-b border-amber-900/30 pb-1 tracking-widest">{t.base}</h3>
                         <div className="space-y-2 overflow-y-auto pr-1 flex-1">
                             {Object.keys(resourceConfig).map(key => (
                                 <div key={key} className="flex items-center justify-between bg-amber-950/10 p-2 rounded border border-amber-900/20 hover:border-amber-700 transition-colors">
                                     <div className="flex items-center gap-2">
                                         {React.createElement(resourceConfig[key].icon, { size: 14, className: resourceConfig[key].color })}
                                         <span className="text-xs font-bold text-amber-100">{stats.storedResources[key as keyof typeof stats.storedResources]}</span>
                                     </div>
                                     <button onClick={() => withdrawItem(key, 10, true)} className="text-[10px] bg-amber-900/30 text-amber-500 border border-amber-900/50 px-2 py-1 rounded uppercase font-bold tracking-wider hover:bg-amber-900/50 hover:text-amber-200 transition-colors">{t.withdraw}</button>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>
             </div>
         </div>
     </div>
  );
};
