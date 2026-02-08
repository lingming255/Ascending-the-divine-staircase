import React, { useState } from 'react';
import { Goal, SubGoal, useGameStore } from '../../store/gameStore';
import { Sun, CheckCircle, Crosshair, Trash2, ChevronDown, ChevronRight, Plus, X, Square, CheckSquare } from 'lucide-react';

interface GoalNodeProps {
  goal: Goal;
  isActive: boolean;
  isSelected: boolean;
  isTarget?: boolean;
  onToggleToday: () => void;
  onSetActive: () => void;
  onDelete: () => void;
  onUnlink: () => void;
  onFocus: () => void;
}

export const GoalNode: React.FC<GoalNodeProps> = ({
  goal,
  isActive,
  isSelected,
  isTarget,
  onToggleToday,
  onSetActive,
  onDelete,
  onUnlink,
  onFocus,
}) => {
  const { addSubGoal, toggleSubGoal, deleteSubGoal, updateGoal, goals } = useGameStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [subInput, setSubInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // Calculate Progress (External Goals)
  const childrenNodes = goals.filter(g => g.parentIds?.includes(goal.id));
  const totalChildren = childrenNodes.length;
  const completedChildren = childrenNodes.filter(c => c.isCompleted).length;
  const progress = totalChildren > 0 ? completedChildren / totalChildren : 0;
  const hasChildren = totalChildren > 0;

  const handleAddSub = (e: React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!subInput.trim()) return;
    addSubGoal(goal.id, subInput);
    setSubInput('');
  };

  const startEditing = () => {
    setEditContent(goal.content);
    setIsEditing(true);
  };

  const saveEditing = () => {
    if (editContent.trim() && editContent !== goal.content) {
      updateGoal(goal.id, { content: editContent });
    }
    setIsEditing(false);
  };

  const getPriorityColor = () => {
      switch (goal.priority) {
          case 'P0': return 'border-l-red-500 shadow-[inset_2px_0_0_0_rgba(239,68,68,1)]';
          case 'P1': return 'border-l-amber-500 shadow-[inset_2px_0_0_0_rgba(245,158,11,1)]';
          default: return 'border-l-transparent'; // Default
      }
  };

  return (
    <div
      className={`absolute flex flex-col items-center group select-none touch-none`}
      style={{
        transform: `translate(${goal.position.x}px, ${goal.position.y}px)`,
        width: 220,
      }}
      data-type="node"
      data-id={goal.id}
      onContextMenu={(e) => {
         e.stopPropagation();
         e.preventDefault();
         if (goal.parentIds && goal.parentIds.length > 0) {
             onUnlink();
         }
      }}
    >
      {/* Node Card */}
      <div 
        className={`
          relative w-full p-4 rounded-xl backdrop-blur-md border transition-all duration-200 overflow-hidden
          ${goal.isCompleted ? 'bg-stone-800/80 border-stone-600' : 'bg-black/60 border-white/20'}
          ${isActive ? 'ring-2 ring-green-400 shadow-[0_0_20px_rgba(74,222,128,0.2)]' : ''}
          ${isSelected ? 'ring-1 ring-white' : ''}
          ${isTarget ? 'ring-2 ring-amber-400 scale-105 shadow-[0_0_20px_rgba(251,191,36,0.3)] bg-white/10' : ''}
          ${goal.isToday ? 'border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.2)]' : ''}
          ${getPriorityColor()}
          hover:bg-black/80 cursor-move border-l-4
        `}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onFocus();
        }}
      >
        {/* Header Icons */}
        <div className="flex justify-between items-start mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <button 
             onClick={(e) => { e.stopPropagation(); onToggleToday(); }}
             onPointerDown={(e) => e.stopPropagation()} 
             className={`p-1.5 rounded-full hover:bg-white/10 transition ${goal.isToday ? 'text-amber-400' : 'text-white/20'}`}
             title="Toggle Today's Focus"
           >
             <Sun size={16} className={goal.isToday ? "fill-amber-400" : ""} />
           </button>
           
           <div className="flex gap-1 items-center">
             {/* Progress Ring */}
             {hasChildren && (
                 <div className="w-4 h-4 relative mr-1" title={`${completedChildren}/${totalChildren} Completed`}>
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-white/10" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                        <path className="text-green-500 transition-all duration-500" strokeDasharray={`${progress * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                    </svg>
                 </div>
             )}

             <button
               onClick={(e) => { 
                 e.stopPropagation(); 
                 // No confirmation as requested
                 onDelete(); 
               }}
               onPointerDown={(e) => e.stopPropagation()}
               className="p-1.5 rounded-full hover:bg-white/10 transition text-white/20 hover:text-red-400"
               title="Delete Goal"
             >
               <Trash2 size={16} />
             </button>
             {goal.isCompleted && <CheckCircle size={16} className="text-stone-500" />}
             <button
               onClick={(e) => { e.stopPropagation(); onSetActive(); }}
               onPointerDown={(e) => e.stopPropagation()}
               className={`p-1.5 rounded-full hover:bg-white/10 transition ${isActive ? 'text-green-400' : 'text-white/20'}`}
               title="Set as Active Goal"
             >
               <Crosshair size={16} />
             </button>
           </div>
        </div>
        
        {/* Always show Today icon if active, even if not hovering */}
        {goal.isToday && (
            <div className="absolute top-4 left-4 text-amber-400 pointer-events-none group-hover:opacity-0 transition-opacity">
                <Sun size={12} className="fill-amber-400" />
            </div>
        )}

        {/* Content */}
        {isEditing ? (
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onBlur={saveEditing}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEditing();
              e.stopPropagation();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            autoFocus
            className="w-full bg-black/50 text-center text-sm py-1 text-white border-b border-white/30 focus:outline-none rounded"
          />
        ) : (
          <div 
            className={`text-center font-light text-sm py-1 ${goal.isCompleted ? 'text-white/50 line-through' : 'text-white'} cursor-text hover:bg-white/5 rounded transition select-text`}
            onPointerDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              startEditing();
            }}
            title="Double click text to edit name"
          >
            {goal.content}
          </div>
        )}
        
        {/* Sub-goals Section (Internal Checklist) */}
        <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition w-full justify-center"
          >
            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <span>{goal.subGoals?.length || 0} Checklist</span>
          </button>
          
          {isExpanded && (
            <div className="flex flex-col gap-1 mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {(goal.subGoals || []).map((sg: SubGoal) => (
                <div key={sg.id} className="flex items-center gap-2 text-xs group/sub px-1 py-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleSubGoal(goal.id, sg.id); }}
                        className={`hover:text-white transition p-1 ${sg.isCompleted ? 'text-green-400' : 'text-white/30'}`}
                    >
                        {sg.isCompleted ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                    <span className={`flex-1 text-left break-words ${sg.isCompleted ? 'line-through text-white/30' : 'text-white/80'}`}>{sg.content}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); deleteSubGoal(goal.id, sg.id); }}
                        className="opacity-0 group-hover/sub:opacity-100 text-white/20 hover:text-red-400 transition p-1"
                    >
                        <X size={14} />
                    </button>
                </div>
              ))}
              <form onSubmit={handleAddSub} className="flex gap-1 mt-1 px-1">
                <input 
                    type="text" 
                    value={subInput}
                    onChange={(e) => setSubInput(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder="New item..."
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
                />
                <button type="submit" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-white/10 text-white/50 hover:text-white transition">
                    <Plus size={12} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Connection Handle (Bottom) */}
        <div 
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center cursor-crosshair opacity-0 group-hover:opacity-100 transition z-10"
            title="Drag to link to child"
            data-type="handle"
            data-id={goal.id}
        >
            <div className="w-3 h-3 bg-white rounded-full border-2 border-black shadow-sm hover:scale-125 transition pointer-events-none" />
        </div>
        
         {/* Connection Target (Top) - Visual only */}
         <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white/10 rounded-full" />
      </div>
    </div>
  );
};
