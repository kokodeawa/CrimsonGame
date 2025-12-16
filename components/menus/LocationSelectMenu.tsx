
import React from 'react';
import { Globe, ArrowRight, Home, X } from 'lucide-react';

interface LocationSelectMenuProps {
  onClose?: () => void;
  confirmTravel: (destination: 'OUTSIDE' | 'MINE' | 'BASE') => void;
  currentStage: 'OUTSIDE' | 'MINE' | 'BASE';
  t: any; // Translations
}

export const LocationSelectMenu: React.FC<LocationSelectMenuProps> = ({ confirmTravel, currentStage, t, onClose }) => {
  return (
    <div className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
        <div className="w-full h-full bg-gray-900 border-2 border-red-900 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.15)] animate-border-pulse flex flex-col relative overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b-2 border-red-900/50 flex justify-between items-center bg-black/40">
                <div>
                    <h2 className="text-xl font-black text-red-600 tracking-widest uppercase flex items-center gap-2">
                        <Globe size={24} /> {t.deployment}
                    </h2>
                    <p className="text-red-900/70 font-mono text-[10px] mt-0.5">{t.travel_protocol}</p>
                </div>
                {onClose && (
                    <button onClick={onClose} className="text-red-800 hover:text-red-500 transition-colors">
                        <X size={24} />
                    </button>
                )}
            </div>

            {/* Content - Cards Grid */}
            <div className="flex-1 p-6 flex flex-col md:flex-row gap-4 items-stretch justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImEiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgNDBMOF0iIHN0cm9rZT0iIzIyMDAwMCIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PC9zdmc+')]">
                
                {currentStage === 'BASE' && (
                    <>
                        <button onClick={() => confirmTravel('OUTSIDE')} className="flex-1 bg-black/60 hover:bg-red-950/30 border-2 border-red-900/30 hover:border-red-600 p-6 rounded-xl flex flex-col items-center justify-center gap-4 group transition-all duration-300">
                            <div className="p-4 rounded-full bg-red-900/20 border border-red-900/50 group-hover:scale-110 transition-transform">
                                <ArrowRight size={32} className="text-red-500" />
                            </div>
                            <div className="text-center">
                                <span className="text-lg font-black text-gray-200 block tracking-widest">{t.surface}</span>
                                <span className="text-xs text-red-500 mt-1 block font-mono bg-red-950/50 px-2 py-0.5 rounded border border-red-900/50">{t.inverted}</span>
                            </div>
                        </button>
                        
                        <button onClick={() => confirmTravel('MINE')} className="flex-1 bg-black/60 hover:bg-yellow-950/20 border-2 border-red-900/30 hover:border-yellow-600 p-6 rounded-xl flex flex-col items-center justify-center gap-4 group transition-all duration-300">
                            <div className="p-4 rounded-full bg-yellow-900/10 border border-yellow-900/30 group-hover:scale-110 transition-transform">
                                <ArrowRight size={32} className="text-yellow-600" />
                            </div>
                            <div className="text-center">
                                <span className="text-lg font-black text-gray-200 block tracking-widest">{t.mine}</span>
                                <span className="text-xs text-yellow-600 mt-1 block font-mono bg-yellow-950/30 px-2 py-0.5 rounded border border-yellow-900/50">{t.sector}</span>
                            </div>
                        </button>
                    </>
                )}
                
                {(currentStage === 'OUTSIDE' || currentStage === 'MINE') && (
                  <button onClick={() => confirmTravel('BASE')} className="flex-1 max-w-lg bg-black/60 hover:bg-green-950/20 border-2 border-red-900/30 hover:border-green-600 p-6 rounded-xl flex flex-col items-center justify-center gap-4 group transition-all duration-300">
                      <div className="p-4 rounded-full bg-green-900/10 border border-green-900/30 group-hover:scale-110 transition-transform">
                          <Home size={40} className="text-green-500" />
                      </div>
                      <div className="text-center">
                          <span className="text-2xl font-black text-gray-200 block tracking-widest">{t.base}</span>
                          <span className="text-xs text-green-500 mt-1 block font-mono bg-green-950/30 px-3 py-0.5 rounded border border-green-900/50">{t.safe_zone}</span>
                      </div>
                  </button>
                )}
            </div>
        </div>
    </div>
  );
};
