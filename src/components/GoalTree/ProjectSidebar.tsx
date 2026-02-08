import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Folder, Layout, Database } from 'lucide-react';
import { Goal } from '../../types';
import { getRootGoals } from '../../utils/treeHelpers';

interface ProjectSidebarProps {
  goals: Goal[];
  onSelectProject: (id: string) => void;
}

export const ProjectSidebar: React.FC<ProjectSidebarProps> = ({ goals, onSelectProject }) => {
  const [isOpen, setIsOpen] = useState(true);
  const rootGoals = getRootGoals(goals);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: -250, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -250, opacity: 0 }}
            className="absolute top-16 left-4 bottom-16 w-64 bg-slate-950/90 backdrop-blur-md border border-slate-700 shadow-2xl z-40 flex flex-col font-mono"
          >
             {/* Decorative Corner */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/30" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/30" />

            <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <h2 className="text-indigo-400 text-xs font-bold flex items-center gap-2 uppercase tracking-widest">
                <Database size={14} />
                Project_Index
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-600 hover:text-white transition"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              {rootGoals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-700 space-y-2">
                  <div className="text-[10px] uppercase tracking-wider">No Records</div>
                  <div className="text-[8px] opacity-50">Initialize Root Node</div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {rootGoals.map(goal => (
                    <button
                      key={goal.id}
                      onClick={() => onSelectProject(goal.id)}
                      className="w-full text-left px-4 py-3 border-l-2 border-transparent hover:border-indigo-500 hover:bg-slate-900/50 text-slate-400 hover:text-white transition-all flex items-center gap-3 group text-xs"
                    >
                      <Folder size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                      <span className="truncate flex-1">{goal.content}</span>
                      <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 text-slate-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-2 border-t border-slate-800 text-[9px] text-slate-600 text-center uppercase tracking-widest">
                System Ready
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isOpen && (
        <motion.button
          initial={{ x: -50 }}
          animate={{ x: 0 }}
          onClick={() => setIsOpen(true)}
          className="absolute top-20 left-0 bg-slate-950 p-2 border-y border-r border-slate-700 text-slate-500 hover:text-indigo-400 z-40 shadow-lg group"
        >
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <ChevronRight size={20} />
        </motion.button>
      )}
    </>
  );
};
