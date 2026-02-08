import React from 'react';
import { LucideIcon } from 'lucide-react';

interface TacticalButtonProps {
    onClick: () => void;
    icon: LucideIcon;
    title?: string;
    active?: boolean;
}

export const TacticalButton: React.FC<TacticalButtonProps> = ({ onClick, icon: Icon, title, active = false }) => (
    <button 
        onClick={onClick}
        className={`
            p-2 border border-slate-700 transition-all duration-100 group relative
            ${active ? 'bg-indigo-900/40 border-indigo-500 text-indigo-400' : 'bg-slate-900/50 hover:bg-slate-800 text-slate-500 hover:text-white'}
        `}
        title={title}
    >
        {active && <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-indigo-500 shadow-[0_0_5px_#6366f1]" />}
        <Icon size={16} />
    </button>
);
