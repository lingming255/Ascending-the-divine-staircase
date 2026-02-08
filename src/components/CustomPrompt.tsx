import React, { useState, useEffect, useRef } from 'react';
import { X, Terminal } from 'lucide-react';

interface CustomPromptProps {
  isOpen: boolean;
  title: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const CustomPrompt: React.FC<CustomPromptProps> = ({
  isOpen,
  title,
  defaultValue = '',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-950 border border-slate-700 shadow-2xl p-0 transform scale-100 animate-in zoom-in-95 duration-200 font-mono">
        {/* Header */}
        <div className="flex justify-between items-center p-3 bg-slate-900 border-b border-slate-800">
          <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
            <Terminal size={14} />
            {title}
          </h3>
          <button onClick={onCancel} className="text-slate-600 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="relative mb-6 group">
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-50 group-focus-within:opacity-100 transition-opacity" />
             <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-slate-900/50 border-y border-r border-slate-800 py-3 px-4 text-slate-200 placeholder:text-slate-700 focus:outline-none focus:border-indigo-500/50 focus:bg-slate-900 transition-colors font-mono text-sm"
                placeholder="INPUT_VALUE..."
              />
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-700 text-slate-500 hover:text-white hover:border-slate-500 hover:bg-slate-900 transition text-xs uppercase tracking-wider"
            >
              [ Cancel ]
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-900/30 border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500 hover:text-white transition text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              [ Confirm ]
            </button>
          </div>
        </form>

        {/* Status Line */}
        <div className="h-1 w-full bg-slate-900 relative overflow-hidden">
             <div className="absolute inset-0 bg-indigo-500/20 w-1/3 animate-[shimmer_2s_infinite]" />
        </div>
      </div>
    </div>
  );
};
