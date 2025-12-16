
import React from 'react';
import { ShieldAlert, Zap, Wind, Terminal, X, RefreshCw, Activity, AlertTriangle } from 'lucide-react';
import { PlayerStats } from '../../types';

interface MaintenanceMenuProps {
    onClose: () => void;
    stats: PlayerStats;
    repairError: (errorId: string) => void; 
    repairIntegrity: (system: string, amount: number, cost: { scraps?: number }) => void;
    t: any;
}

export const MaintenanceMenu: React.FC<MaintenanceMenuProps> = ({ onClose, stats, repairIntegrity, t }) => {
    
    // Helper to render a system row
    const renderSystemRow = (label: string, icon: React.ReactNode, value: number, systemKey: string) => {
        const isCritical = value < 25;
        const isDamaged = value < 100;
        const barColor = isCritical ? 'bg-red-600' : value < 60 ? 'bg-yellow-500' : 'bg-green-500';
        
        // Increased repair cost (was 5, now 25)
        const cost = 25;

        // Visual indicator of decay speed (simulated for UI flavor)
        // We use the actual decay rate multiplier if available to color the warning
        const decayRate = stats.decayRates ? (stats.decayRates as any)[systemKey] || 1 : 1;
        const isUnstable = decayRate > 1.2;

        return (
            <div className="flex items-center justify-between bg-black/60 border border-gray-800 p-2 rounded gap-3">
                <div className="flex items-center gap-2 min-w-[80px]">
                    <div className={`p-1.5 rounded ${isCritical ? 'bg-red-900/30 text-red-500 animate-pulse' : 'bg-gray-800 text-gray-400'}`}>
                        {icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide flex items-center gap-1">
                            {label}
                            {isUnstable && <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" title="High Degradation Detected" />}
                        </span>
                        <span className={`text-[9px] font-mono ${isCritical ? 'text-red-500' : 'text-gray-500'}`}>{Math.floor(value)}%</span>
                    </div>
                </div>

                <div className="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-700 relative">
                    <div className={`h-full transition-all duration-300 ${barColor}`} style={{ width: `${value}%` }} />
                </div>

                <button 
                    onClick={() => repairIntegrity(systemKey, 25, { scraps: cost })}
                    disabled={!isDamaged || stats.scraps < cost}
                    className={`px-3 py-1.5 rounded flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider border transition-all ${!isDamaged ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed' : 'bg-amber-900/20 text-amber-400 border-amber-800 hover:bg-amber-900/40 hover:text-amber-200'}`}
                >
                    <RefreshCw size={10} />
                    <span>{t.fix} ({cost})</span>
                </button>
            </div>
        );
    };

    return (
        <div className="absolute inset-0 bg-black/95 z-50 flex flex-col p-4 items-center justify-center">
            <div className="w-full max-w-md bg-gray-900 border border-amber-900/50 rounded-lg shadow-[0_0_30px_rgba(180,83,9,0.1)] animate-border-pulse flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-3 border-b border-amber-900/30 flex justify-between items-center bg-black/40">
                    <div className="flex items-center gap-2">
                        <Activity className="text-amber-500" size={18} />
                        <div>
                            <h2 className="text-sm font-black text-amber-500 uppercase tracking-widest leading-none">{t.diagnostics}</h2>
                            <div className="text-[8px] text-amber-800 font-mono">{t.sys_monitor}</div>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-amber-900 hover:text-amber-500 transition-colors"><X size={20} /></button>
                </div>

                {/* Content */}
                <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjBMMjAgME0xMCAyMEwyMCAxME0wIDEwTDEwIDAiIHN0cm9rZT0iIzIyMTEwMCIgc3Ryb2tlLXdpZHRoPSIwLjUiLz48L3N2Zz4=')]">
                    
                    {/* Overall Status */}
                    <div className="bg-amber-950/10 border border-amber-900/30 p-2 rounded text-center">
                        <span className="text-[9px] text-amber-700 block uppercase tracking-widest mb-1">{t.avail_resources}</span>
                        <div className="text-lg font-black text-amber-100 flex justify-center items-center gap-2">
                            <RefreshCw size={14} /> {stats.scraps} <span className="text-xs text-amber-600">{t.res_scraps.toUpperCase()}</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {renderSystemRow(t.sys_hull, <ShieldAlert size={14} />, stats.baseIntegrity, 'hull')}
                        {renderSystemRow(t.sys_lights, <Zap size={14} />, stats.integrityLights !== undefined ? stats.integrityLights : 100, 'lights')}
                        {renderSystemRow(t.sys_oxygen, <Wind size={14} />, stats.integrityOxygen !== undefined ? stats.integrityOxygen : 100, 'oxygen')}
                        {renderSystemRow(t.sys_system, <Terminal size={14} />, stats.integritySystem !== undefined ? stats.integritySystem : 100, 'system')}
                    </div>

                    {(stats.baseIntegrity < 20 || (stats.integrityOxygen !== undefined && stats.integrityOxygen < 20)) && (
                        <div className="mt-auto bg-red-900/20 border border-red-500/50 p-2 rounded flex items-center gap-2 text-red-400">
                            <AlertTriangle size={16} className="animate-bounce" />
                            <div className="text-[9px] font-mono leading-tight">
                                <strong className="block text-red-300">{t.crit_warning}</strong>
                                {t.crit_desc}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
