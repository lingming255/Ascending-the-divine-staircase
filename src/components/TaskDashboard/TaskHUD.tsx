import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import { 
    ListTodo, 
    X, 
    CheckSquare, 
    Square, 
    GripVertical,
    ChevronDown,
    Minus,
    PinOff,
    Target,
    ChevronRight,
    Circle,
    Terminal,
    Hash,
    Clock,
    LayoutList,
    CalendarDays,
    ExternalLink
} from 'lucide-react';
import { useGameStore, Goal, Priority } from '../../store/gameStore';
import { useTaskQueue, TaskItem } from '../../hooks/useTaskQueue';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import { 
  useDraggable 
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Types & Interfaces ---
interface DraggableSubGoalProps {
    goalId: string;
    subGoal: { id: string; content: string; isCompleted: boolean };
    toggleSubGoal: (goalId: string, subGoalId: string) => void;
}

const DraggableSubGoal = ({ goalId, subGoal, toggleSubGoal }: DraggableSubGoalProps) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: `hud-subgoal-${goalId}-${subGoal.id}`,
        data: { 
            type: 'subgoal', 
            goalId, 
            id: subGoal.id, 
            content: subGoal.content 
        }
    });

    const style = {
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div 
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className="flex items-center gap-2 text-xs group/item font-mono touch-none"
        >
            <button 
                onClick={(e) => { e.stopPropagation(); toggleSubGoal(goalId, subGoal.id); }}
                className={`transition p-0.5 ${subGoal.isCompleted ? 'text-green-500' : 'text-slate-500 hover:text-green-400'}`}
                onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on checkbox
            >
                {subGoal.isCompleted ? <CheckSquare size={12} /> : <Square size={12} />}
            </button>
            <span className={`flex-1 truncate cursor-grab active:cursor-grabbing ${subGoal.isCompleted ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                {subGoal.content}
            </span>
        </div>
    );
};

interface TaskHUDProps {
  onOpenMap: () => void;
  onOpenOverview: () => void;
  isStandalone?: boolean;
}

// --- Tactical UI Components ---

const TacticalCorner = ({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) => {
    const borderClass = {
        'tl': 'border-t-2 border-l-2 top-0 left-0',
        'tr': 'border-t-2 border-r-2 top-0 right-0',
        'bl': 'border-b-2 border-l-2 bottom-0 left-0',
        'br': 'border-b-2 border-r-2 bottom-0 right-0'
    };
    return (
        <div className={`absolute w-3 h-3 border-indigo-500/50 pointer-events-none z-50 ${borderClass[position]}`} />
    );
};

const PriorityBadge = ({ priority, onClick }: { priority: string, onClick?: (e: React.MouseEvent) => void }) => {
  const colors = {
    'P0': 'bg-red-900/40 text-red-400 border-red-500/40 hover:bg-red-900/60 cursor-pointer',
    'P1': 'bg-amber-900/40 text-amber-400 border-amber-500/40 hover:bg-amber-900/60 cursor-pointer',
    'P2': 'bg-slate-800 text-slate-400 border-slate-600 hover:bg-slate-700 cursor-pointer',
  };
  
  return (
    <button 
        onClick={onClick}
        className={`px-1.5 py-[1px] text-[10px] border font-mono tracking-wider transition-colors ${colors[priority as keyof typeof colors] || colors['P2']}`}
        title="Cycle Priority"
    >
      {priority}
    </button>
  );
};

// --- Main Item Component ---

const HUDItemCard = ({ 
    item, 
    isOverlay = false, 
    dragHandleProps,
    onOpenMap
}: { 
    item: TaskItem, 
    isOverlay?: boolean, 
    dragHandleProps?: any,
    onOpenMap: () => void
}) => {
    const { goals, toggleSubGoal, completeGoal, setScrollToId, activeGoalId, setActiveGoal, updateGoal, invalidDragId } = useGameStore();
    const [isExpanded, setIsExpanded] = useState(false);
    
    const goal = item.goal;
    const isActive = activeGoalId === goal.id;
    const isInvalid = invalidDragId === goal.id; // Check if this card triggered an invalid drag

    const handlePriorityClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        const priorities: Priority[] = ['P0', 'P1', 'P2'];
        const currentIndex = priorities.indexOf(goal.priority);
        const nextPriority = priorities[(currentIndex + 1) % priorities.length];
        updateGoal(goal.id, { priority: nextPriority });
    };

    // Helper for recursive tree render
    const RecursiveGoalTree = ({ goalId, depth = 0 }: { goalId: string, depth?: number }) => {
        const currentGoal = goals.find(g => g.id === goalId);
        if (!currentGoal) return null;
        
        const childrenGoals = goals.filter(g => g.parentIds.includes(goalId));
        const subGoals = currentGoal.subGoals || [];
        
        if (depth > 5) return null;

        return (
            <div className="pl-3 border-l border-slate-700/50 ml-1 mt-1 space-y-1">
                {/* Metadata Controls (Only at top level of expansion) */}
                {depth === 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-2 p-1 bg-slate-900/50 rounded border border-slate-800/50">
                        <div className="col-span-2 flex items-center gap-2">
                             <Clock size={10} className="text-slate-500" />
                             <select 
                                value={currentGoal.recurrence || 'none'}
                                onChange={(e) => updateGoal(goalId, { recurrence: e.target.value as any })}
                                className="bg-transparent text-[10px] text-slate-300 border-none focus:ring-0 p-0 cursor-pointer w-full outline-none"
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                             >
                                <option value="none">No Recurrence</option>
                                <option value="daily">Daily Loop</option>
                                <option value="weekly">Weekly Loop</option>
                             </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[9px] text-slate-600">Start</label>
                            <input 
                                type="date" 
                                value={currentGoal.startDate || ''}
                                onChange={(e) => updateGoal(goalId, { startDate: e.target.value || null })}
                                className="bg-transparent text-[10px] text-slate-400 p-0 border-none focus:ring-0"
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[9px] text-slate-600">End</label>
                            <input 
                                type="date" 
                                value={currentGoal.endDate || ''}
                                onChange={(e) => updateGoal(goalId, { endDate: e.target.value || null })}
                                className="bg-transparent text-[10px] text-slate-400 p-0 border-none focus:ring-0"
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                )}

                {/* SubGoals (Checklist) */}
                {subGoals.map(sg => (
                    <DraggableSubGoal 
                        key={sg.id} 
                        goalId={goalId} 
                        subGoal={sg} 
                        toggleSubGoal={toggleSubGoal} 
                    />
                ))}
                
                {/* Child Goals */}
                {childrenGoals.map(child => (
                    <ExpandableChildGoal key={child.id} goal={child} depth={depth + 1} />
                ))}
                
                {subGoals.length === 0 && childrenGoals.length === 0 && (
                    <div className="text-[10px] text-slate-600 italic pl-1 font-mono">{'<NULL>'}</div>
                )}
            </div>
        );
    };

    const ExpandableChildGoal = ({ goal, depth }: { goal: Goal, depth: number }) => {
        const [expanded, setExpanded] = useState(false);
        const hasChildren = (goal.subGoals?.length || 0) > 0 || goals.some(g => g.parentIds.includes(goal.id));
        
        return (
            <div>
                <div className="flex items-center gap-1 group/child font-mono">
                    <button 
                        onClick={(e) => { e.stopPropagation(); if(hasChildren) setExpanded(!expanded); }}
                        className={`p-0.5 ${hasChildren ? 'text-slate-500 hover:text-white' : 'text-transparent cursor-default'}`}
                    >
                        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                    <span className="text-[10px] text-indigo-500/70">::</span>
                    <span className="text-xs text-slate-400 truncate flex-1">{goal.content}</span>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setScrollToId(goal.id); onOpenMap(); }}
                        className="opacity-0 group-hover/child:opacity-100 p-0.5 text-slate-600 hover:text-indigo-400 transition"
                        title="Locate"
                    >
                        <Target size={10} />
                    </button>
                </div>
                {expanded && <RecursiveGoalTree goalId={goal.id} depth={depth} />}
            </div>
        );
    };

    return (
        <div 
            onClick={() => setActiveGoal(goal.id)}
            className={`
                relative pl-3 pr-2 py-2 border-l-2 transition-all duration-100 group cursor-pointer font-mono
                ${isInvalid ? 'bg-red-900/50 border-l-red-500 animate-pulse' : ''}
                ${!isInvalid && isActive 
                    ? 'bg-indigo-950/30 border-l-indigo-500 border-y border-r border-indigo-900/30 z-10' 
                    : !isInvalid && 'bg-slate-900/40 border-l-slate-700 border-y border-r border-transparent hover:bg-slate-800/50 hover:border-l-slate-400'
                }
                ${isOverlay 
                    ? 'bg-slate-900 border border-slate-600 shadow-xl scale-105 z-50' 
                    : ''
                }
            `}
        >
            {/* Active Marker */}
            {isActive && (
                <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-indigo-500/20" />
            )}

            <div className="flex items-center gap-2">
                 <div 
                    className="cursor-grab active:cursor-grabbing text-slate-700 hover:text-slate-400 touch-none outline-none p-1"
                    {...dragHandleProps}
                    onClick={(e) => e.stopPropagation()}
                >
                    <GripVertical size={14} />
                </div>
                
                <div className="w-full min-w-0">
                    <div className="flex items-center gap-3 w-full">
                        <PriorityBadge priority={goal.priority} onClick={handlePriorityClick} />
                        
                        <button
                            onClick={(e) => { e.stopPropagation(); completeGoal(goal.id); }}
                            className="text-slate-600 hover:text-green-500 transition"
                            title="COMPLETE"
                        >
                             <Square size={14} />
                        </button>

                        <span className={`flex-1 truncate font-mono text-sm ${goal.isCompleted ? 'line-through text-slate-600' : 'text-slate-200'}`}>
                            {goal.content}
                        </span>
                        
                        <div className="flex items-center gap-2">
                            <div className="text-[10px] text-slate-500 font-mono bg-slate-900 px-1 border border-slate-800">
                                {goal.subGoals?.filter(sg => sg.isCompleted).length}/{goal.subGoals?.length || 0}
                            </div>
                            
                            {/* Actions Group */}
                            <div className="flex items-center border border-slate-700 bg-slate-900/50">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setScrollToId(goal.id); onOpenMap(); }}
                                    className="p-1 text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition"
                                    title="LOCATE"
                                >
                                    <Target size={12} />
                                </button>
                                <div className="w-[1px] h-3 bg-slate-700" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                                    className={`p-1 hover:bg-slate-800 transition ${isExpanded ? 'text-indigo-400 bg-slate-800' : 'text-slate-500 hover:text-white'}`}
                                    title={isExpanded ? "COLLAPSE" : "EXPAND"}
                                >
                                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Expanded Content */}
                    <AnimatePresence>
                        {isExpanded && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mt-2 pt-2 border-t border-slate-800 pb-1">
                                    <RecursiveGoalTree goalId={goal.id} />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

const SortableHUDItemWrapper = ({ item, onOpenMap }: { item: TaskItem, onOpenMap: () => void }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `hud-task-${item.goal.id}` });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? undefined : transition,
        opacity: isDragging ? 0.3 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes}>
            <HUDItemCard 
                item={item} 
                dragHandleProps={listeners}
                onOpenMap={onOpenMap}
            />
        </div>
    );
};

// --- Main HUD Component ---

const TaskHUDComponent = ({ onOpenMap, onOpenOverview, isStandalone = false }: TaskHUDProps) => {
    const dragControls = useDragControls();
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const { taskQueue } = useTaskQueue();
    const { dashboardViewMode, setDashboardViewMode } = useGameStore();
    
    // Resize State
    const [size, setSize] = useState({ width: 340, height: 450 });
    const [isResizing, setIsResizing] = useState(false);
    const resizeRef = useRef<{ startX: number, startY: number, startWidth: number, startHeight: number } | null>(null);

    const [isMinimized, setIsMinimized] = useState(false);

    const [isElectron, setIsElectron] = useState(false);

    useEffect(() => {
        // Detect Electron environment
        const checkElectron = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.indexOf(' electron/') > -1) return true;
             // @ts-ignore
            if (window.navigator && window.navigator.userAgent && window.navigator.userAgent.indexOf('Electron') !== -1) return true;
            return false;
        };
        setIsElectron(checkElectron());
    }, []);

    // Resize Handlers
    const startResize = (e: React.MouseEvent) => {
        if (isStandalone) return;
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        resizeRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            startWidth: size.width,
            startHeight: size.height
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', stopResize);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!resizeRef.current) return;
        
        const deltaX = e.clientX - resizeRef.current.startX;
        const deltaY = e.clientY - resizeRef.current.startY;
        
        const newWidth = Math.max(280, Math.min(800, resizeRef.current.startWidth - deltaX));
        const newHeight = Math.max(200, Math.min(1000, resizeRef.current.startHeight - deltaY));
        
        setSize({ width: newWidth, height: newHeight });
    };

    const stopResize = () => {
        setIsResizing(false);
        resizeRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', stopResize);
    };

    const handlePopOut = () => {
        try {
            // @ts-ignore
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('open-cmd-center');
            setIsMinimized(true); // Minimize this one
        } catch (e) {
            console.error("Not in Electron environment");
        }
    };

    // Minimized State
    if (isMinimized && !isStandalone) {
        return (
        <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-32 right-0 z-40 pointer-events-auto"
        >
            <button 
            onClick={() => setIsMinimized(false)}
            className="bg-slate-950 border-l-2 border-y border-indigo-500/50 p-2 shadow-xl hover:bg-slate-900 transition flex items-center gap-2 group font-mono"
            title="Expand Terminal"
            >
            <Terminal size={18} className="text-indigo-500" />
            <span className="text-xs font-bold text-white/90">{taskQueue.length}</span>
            </button>
        </motion.div>
        );
    }

    const containerClasses = isStandalone 
        ? "w-full h-full flex flex-col bg-slate-950" 
        : "fixed bottom-6 right-6 z-40 flex flex-col items-end pointer-events-none";

    const windowStyle = isStandalone 
        ? { width: '100%', height: '100%' }
        : { width: size.width, height: size.height };

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={isStandalone ? {} : { x, y }}
            drag={!isStandalone}
            dragListener={!isStandalone ? false : undefined}
            dragMomentum={false}
            dragControls={dragControls}
            className={containerClasses}
        >
            <div 
                className={`bg-slate-950/95 backdrop-blur-md border border-slate-700 shadow-2xl flex flex-col pointer-events-auto relative transition-colors duration-200 ${isStandalone ? 'w-full h-full border-0' : ''}`}
                style={windowStyle}
            >
                {!isStandalone && <TacticalCorner position="tl" />}
                {!isStandalone && <TacticalCorner position="br" />}

                {/* Resize Handle (Top-Left) */}
                {!isStandalone && (
                <div 
                    className="absolute -top-1 -left-1 w-6 h-6 cursor-nw-resize z-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
                    onMouseDown={startResize}
                >
                    <div className="w-2 h-2 bg-indigo-500/50 group-hover:bg-indigo-400 transition" />
                </div>
                )}

                {/* Header */}
                <div 
                    className="flex items-center justify-between p-2 pl-3 border-b border-slate-800 shrink-0 cursor-move bg-slate-900/50"
                    onPointerDown={(e) => !isStandalone && dragControls.start(e)}
                >
                    <h3 className="text-indigo-400 font-bold text-xs font-mono tracking-widest flex items-center gap-2 select-none uppercase">
                        <Terminal size={14} />
                        CMD_Center
                        <span className="text-[10px] text-slate-500 px-1 border border-slate-800">
                            {taskQueue.length.toString().padStart(2, '0')}
                        </span>
                    </h3>
                    <div className="flex items-center gap-1">
                        {!isStandalone && isElectron && (
                            <button 
                                onClick={handlePopOut}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-slate-800 rounded-none text-slate-600 hover:text-white transition"
                                title="POP OUT"
                            >
                                <ExternalLink size={14} />
                            </button>
                        )}

                        <button 
                            onClick={onOpenOverview}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="p-1 hover:bg-slate-800 rounded-none text-slate-600 hover:text-white transition"
                            title="AGENDA"
                        >
                            <CalendarDays size={14} />
                        </button>

                        <button 
                            onClick={() => setDashboardViewMode(dashboardViewMode === 'timeline' ? 'stairs' : 'timeline')}
                            onPointerDown={(e) => e.stopPropagation()}
                            className={`p-1 hover:bg-slate-800 rounded-none transition ${dashboardViewMode === 'timeline' ? 'text-indigo-400' : 'text-slate-600 hover:text-white'}`}
                            title={dashboardViewMode === 'timeline' ? "VIEW: STAIRS" : "VIEW: TIMELINE"}
                        >
                            {dashboardViewMode === 'timeline' ? <LayoutList size={14} /> : <Clock size={14} />}
                        </button>
                        
                        {!isStandalone && (
                            <button 
                                onClick={() => setIsMinimized(true)}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="p-1 hover:bg-slate-800 rounded-none text-slate-600 hover:text-white transition"
                                title="MINIMIZE"
                            >
                                <Minus size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[1] pointer-events-none bg-[length:100%_2px,3px_100%] opacity-20" />

                {/* List */}
                <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent z-10">
                        <SortableContext items={taskQueue.map(i => `hud-task-${i.goal.id}`)} strategy={verticalListSortingStrategy}>
                            <div className="space-y-0 relative">
                                
                                {taskQueue.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full py-12 text-slate-600 font-mono text-xs">
                                        <Hash size={24} className="mb-2 opacity-20" />
                                        <p className="mb-1 opacity-50">NO ACTIVE TASKS</p>
                                        <p className="text-[10px] opacity-30 uppercase tracking-wider">Waiting for input...</p>
                                    </div>
                                ) : (
                                    taskQueue.map(item => (
                                        <SortableHUDItemWrapper 
                                            key={item.goal.id} 
                                            item={item} 
                                            onOpenMap={onOpenMap}
                                        />
                                    ))
                                )}
                            </div>
                        </SortableContext>
                    </div>
                    
                {/* Footer / Status Bar */}
                <div className="h-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-2 text-[8px] font-mono text-slate-600 uppercase tracking-widest select-none">
                    <span>SYS: ONLINE</span>
                    <span>V.2.0.4</span>
                </div>
            </div>
        </motion.div>
    );
};

export const TaskHUD = React.memo(TaskHUDComponent);
