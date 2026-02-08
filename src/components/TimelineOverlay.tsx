import React, { useRef, useState, useMemo } from 'react';
import { useGameStore, Goal, SubGoal } from '../store/gameStore';
import { useTimeSystem } from '../hooks/useTimeSystem';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Download, Upload, ChevronLeft, ChevronRight, Calendar, X, Settings, Clock, Square, CheckSquare, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { getLocalDateString } from '../utils/helpers';
import { MiniCalendar } from './MiniCalendar';

// Constants
const HOURS_START = 6;
const HOURS_END = 24;
const TOTAL_HOURS = HOURS_END - HOURS_START;
const PIXELS_PER_HOUR = 80;

// Utility Types
type Granularity = 5 | 10 | 15 | 30;

// Helper: Convert time string to pixels
const timeToOffset = (time: string): number => {
    let timeStr = time;
    if (time.includes('T')) {
        timeStr = time.split('T')[1];
    }
    const [h, m] = timeStr.split(':').map(Number);
    if (isNaN(h)) return 0;
    
    if (h < HOURS_START) return 0;
    const totalMinutes = (h - HOURS_START) * 60 + m;
    return (totalMinutes / 60) * PIXELS_PER_HOUR;
};

// Helper: Parse time string to minutes from midnight
const getMinutesFromMidnight = (time: string): number => {
    let timeStr = time;
    if (time.includes('T')) timeStr = time.split('T')[1];
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

// Component: TimelineHourSlot
const TimelineHourSlot = ({ hour, minute, granularity }: { hour: number, minute: number, granularity: number }) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const { setNodeRef, isOver } = useDroppable({
        id: `slot-${timeStr}`,
        data: { time: timeStr, type: 'slot' }
    });

    return (
        <div 
            ref={setNodeRef}
            className={`
                absolute w-full border-t border-indigo-500/5
                ${isOver ? 'bg-indigo-500/20 z-10' : ''}
            `}
            style={{
                top: `${timeToOffset(timeStr)}px`,
                height: `${(granularity / 60) * PIXELS_PER_HOUR}px`,
                left: 0,
                right: 0
            }}
        />
    );
};

// Component: ScheduledTaskBlock (Enhanced for Overlap)
interface ScheduledItem {
    id: string;
    type: 'goal' | 'subgoal';
    content: string;
    start: number; // minutes from start of day (00:00)
    end: number;
    duration: number;
    original: Goal | SubGoal;
    goalId?: string; // for subgoals
    subGoalId?: string; // for subgoals
    color?: string;
    isCompleted: boolean;
    // Layout props
    column?: number;
    totalColumns?: number;
}

const ScheduledTaskBlock = ({ item, style, onOpenMap }: { item: ScheduledItem, style: React.CSSProperties, onOpenMap: () => void }) => {
    const { highlightedGoalId, setHighlightedGoalId, toggleGoalToday, toggleSubGoal, completeGoal } = useGameStore();
    const [isExpanded, setIsExpanded] = useState(false);
    const isHighlighted = highlightedGoalId === item.id;
    const blockRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to highlighted item
    React.useEffect(() => {
        if (isHighlighted && blockRef.current) {
            blockRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Clear highlight after animation
            const timer = setTimeout(() => setHighlightedGoalId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [isHighlighted, setHighlightedGoalId]);

    // Construct unique ID for draggable
    const draggableId = item.type === 'goal' 
        ? `timeline-goal-${item.id}` 
        : `timeline-subgoal-${item.goalId}-${item.id}`;

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: draggableId,
        data: { 
            type: item.type, 
            goalId: item.goalId || item.id, 
            subGoalId: item.subGoalId,
            id: item.type === 'subgoal' ? item.subGoalId : item.id,
            duration: item.duration 
        }
    });

    const { setGoalSchedule, unscheduleSubGoal } = useGameStore();

    const handleUnschedule = (e: React.PointerEvent) => {
        e.stopPropagation();
        if (item.type === 'goal') {
            setGoalSchedule(item.id, null);
        } else if (item.type === 'subgoal' && item.goalId && item.subGoalId) {
            unscheduleSubGoal(item.goalId, item.subGoalId);
        }
    };

    const handleToggleComplete = (e: React.PointerEvent) => {
        e.stopPropagation();
        if (item.type === 'goal') {
             // Check for subgoals
             const goal = item.original as Goal;
             if (goal.subGoals && goal.subGoals.some(sg => !sg.isCompleted)) {
                 // Block completion
                 return;
             }
             completeGoal(item.id);
        } else if (item.type === 'subgoal' && item.goalId && item.subGoalId) {
             toggleSubGoal(item.goalId, item.subGoalId);
        }
    };
    
    const handleLocate = (e: React.PointerEvent) => {
        e.stopPropagation();
        // Set as active/focused goal in store?
        // useGameStore.getState().setActiveGoal(item.id); 
        onOpenMap();
    };

    const toggleExpand = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const finalStyle: React.CSSProperties = {
        ...style,
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        zIndex: isDragging ? 100 : (style.zIndex || (isHighlighted ? 50 : 20)),
        opacity: isDragging ? 0.6 : 1,
        height: isExpanded ? 'auto' : style.height, // Allow expansion
        minHeight: style.height
    };

    // Priority Border
    let borderClass = 'border-l-2';
    if (item.type === 'goal') {
        const p = (item.original as Goal).priority;
        if (p === 'P0') borderClass = 'border-l-[15px] border-red-500';
        else if (p === 'P1') borderClass = 'border-l-[10px] border-orange-500';
        else if (p === 'P2') borderClass = 'border-l-[5px] border-emerald-500';
    }

    const hasSubGoals = item.type === 'goal' && (item.original as Goal).subGoals?.length > 0;
    const canComplete = item.type === 'subgoal' || (item.type === 'goal' && !(item.original as Goal).subGoals?.some(sg => !sg.isCompleted));

    return (
        <div 
            ref={(node) => {
                setNodeRef(node);
                // @ts-ignore
                blockRef.current = node;
            }}
            style={finalStyle}
            {...listeners}
            {...attributes}
            className={`
                absolute p-1.5 text-xs font-mono overflow-hidden cursor-grab active:cursor-grabbing 
                group shadow-sm backdrop-blur-md rounded-sm flex flex-col justify-between ${borderClass}
                transition-all hover:z-[60] hover:shadow-lg hover:scale-[1.02]
                ${item.isCompleted ? 'opacity-60 saturate-50' : ''}
                ${item.type === 'goal' 
                    ? 'bg-indigo-600/90 border-indigo-400 text-white' 
                    : 'bg-emerald-600/90 border-emerald-400 text-white'}
                ${isHighlighted ? 'ring-2 ring-white animate-pulse' : ''}
            `}
        >
            <div className="flex justify-between items-start gap-1">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <button 
                        onPointerDown={handleToggleComplete}
                        className={`
                            p-1 rounded transition-colors
                            ${canComplete ? 'hover:text-green-300' : 'opacity-50 cursor-not-allowed'}
                        `}
                    >
                        {item.isCompleted ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                    
                    <div className="font-bold text-[10px] opacity-70 leading-none truncate">
                         {Math.floor(item.start / 60).toString().padStart(2,'0')}:{Math.floor(item.start % 60).toString().padStart(2,'0')}
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.type === 'goal' && (
                        <button 
                            onPointerDown={handleLocate}
                            className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                            title="Locate on Map"
                        >
                            <Target size={12} />
                        </button>
                    )}
                    {hasSubGoals && (
                         <button 
                            onPointerDown={toggleExpand}
                            className="p-1 hover:bg-white/20 rounded text-white/70 hover:text-white"
                            title={isExpanded ? "Collapse" : "Expand"}
                        >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                    )}
                    <button 
                        onPointerDown={handleUnschedule}
                        className="text-white/50 hover:text-white p-1 rounded hover:bg-white/20"
                        title="Unschedule"
                    >
                        <X size={12} />
                    </button>
                </div>
            </div>
            
            <div className="mt-1 truncate font-medium text-[10px] leading-tight whitespace-normal line-clamp-2">
                {item.content}
            </div>

            {/* Expanded Subtasks View */}
            {isExpanded && hasSubGoals && (
                <div className="mt-2 pt-2 border-t border-white/10 space-y-1">
                    {(item.original as Goal).subGoals.map(sg => (
                         <div key={sg.id} className="flex items-center gap-2 text-[9px]">
                             <button 
                                onPointerDown={(e) => {
                                    e.stopPropagation();
                                    toggleSubGoal(item.id, sg.id);
                                }}
                                className={`p-0.5 ${sg.isCompleted ? 'text-green-300' : 'opacity-70'}`}
                             >
                                 {sg.isCompleted ? <CheckSquare size={10} /> : <Square size={10} />}
                             </button>
                             <span className={`truncate ${sg.isCompleted ? 'line-through opacity-50' : ''}`}>
                                 {sg.content}
                             </span>
                         </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Layout Algorithm
const calculateLayout = (items: ScheduledItem[]): (ScheduledItem & { style: React.CSSProperties })[] => {
    // 1. Sort by start time, then duration (desc)
    const sorted = [...items].sort((a, b) => {
        if (a.start !== b.start) return a.start - b.start;
        return b.duration - a.duration;
    });

    const layoutItems: (ScheduledItem & { style: React.CSSProperties })[] = [];
    const groups: ScheduledItem[][] = [];
    let currentGroup: ScheduledItem[] = [];
    let groupEnd = -1;

    for (const item of sorted) {
        if (currentGroup.length === 0 || item.start < groupEnd) {
            currentGroup.push(item);
            groupEnd = Math.max(groupEnd, item.end);
        } else {
            groups.push(currentGroup);
            currentGroup = [item];
            groupEnd = item.end;
        }
    }
    if (currentGroup.length > 0) groups.push(currentGroup);

    // Process each group
    for (const group of groups) {
        // Simple column packing within group
        const groupColumns: ScheduledItem[][] = [];
        
        for (const item of group) {
            let placed = false;
            for (let i = 0; i < groupColumns.length; i++) {
                const col = groupColumns[i];
                const lastInCol = col[col.length - 1];
                if (lastInCol.end <= item.start) {
                    col.push(item);
                    item.column = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                groupColumns.push([item]);
                item.column = groupColumns.length - 1;
            }
        }
        
        const totalCols = groupColumns.length;
        
        // Calculate styles
        for (const item of group) {
            const viewStart = HOURS_START * 60;
            const viewEnd = HOURS_END * 60;
            
            // Calculate visible top and height
            const effectiveStart = Math.max(item.start, viewStart);
            const effectiveEnd = Math.min(item.end, viewEnd);
            
            if (effectiveStart >= effectiveEnd) continue; // Skip if out of view

            const top = ((effectiveStart - viewStart) / 60) * PIXELS_PER_HOUR;
            const height = ((effectiveEnd - effectiveStart) / 60) * PIXELS_PER_HOUR;

            const leftOffset = 60; // Time labels area
            const rightPadding = 10;
            
            // Using percentages for width within the available area
            // left = leftOffset + (availableWidth * column / totalCols)
            // width = availableWidth / totalCols
            
            layoutItems.push({
                ...item,
                style: {
                    top: `${top}px`,
                    height: `${Math.max(height, 20)}px`,
                    left: `calc(${leftOffset}px + (100% - ${leftOffset + rightPadding}px) * ${item.column || 0} / ${totalCols})`,
                    width: `calc((100% - ${leftOffset + rightPadding}px) / ${totalCols})`,
                }
            });
        }
    }

    return layoutItems;
};

export const TimelineOverlay: React.FC<{ onOpenMap: () => void }> = ({ onOpenMap }) => {
    const { goals, exportData, importData, timelineDate, setTimelineDate } = useGameStore();
    const { time } = useTimeSystem();
    const [granularity, setGranularity] = useState<Granularity>(15);
    const [showCalendar, setShowCalendar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const todayStr = getLocalDateString();
    const isToday = timelineDate === todayStr;

    // Prepare Items
    const scheduledItems = useMemo(() => {
        const scheduled: ScheduledItem[] = [];
        const targetDate = new Date(timelineDate);
        const targetDateStr = timelineDate; // YYYY-MM-DD
        const targetDayOfWeek = targetDate.getDay();

        // Helper to check if date falls in range
        const isInRange = (start?: string | null, end?: string | null) => {
             if (!start) return false;
             if (end && targetDateStr > end) return false;
             return targetDateStr >= start;
        };

        goals.forEach(g => {
            // Logic to determine if goal should appear on this timelineDate
            let itemTime: string | null = null;
            let showGoal = false;

            // 1. Recurrence
            if (g.recurrence === 'daily') {
                 const created = g.createdAt.split('T')[0];
                 if (targetDateStr >= created) {
                     showGoal = true;
                     // Use scheduledTime part if available
                     if (g.scheduledTime && g.scheduledTime.includes('T')) itemTime = g.scheduledTime.split('T')[1];
                 }
            } else if (g.recurrence === 'weekly') {
                 const createdDate = new Date(g.createdAt);
                 if (targetDateStr >= g.createdAt.split('T')[0] && createdDate.getDay() === targetDayOfWeek) {
                     showGoal = true;
                     if (g.scheduledTime && g.scheduledTime.includes('T')) itemTime = g.scheduledTime.split('T')[1];
                 }
            } 
            // 2. Multi-day Range
            else if (g.startDate) {
                 if (isInRange(g.startDate, g.endDate)) {
                     showGoal = true;
                     if (g.scheduledTime && g.scheduledTime.includes('T')) itemTime = g.scheduledTime.split('T')[1];
                 }
            } 
            // 3. Explicit Schedule Match (Single Day)
            else if (g.scheduledTime && g.scheduledTime.startsWith(targetDateStr)) {
                 showGoal = true;
                 itemTime = g.scheduledTime.split('T')[1];
            }

            // Only add if it has a specific time scheduled (for the timeline view)
            if (showGoal && itemTime && !g.isCompleted) {
                const start = getMinutesFromMidnight(itemTime);
                const duration = g.duration || 60;
                scheduled.push({
                    id: g.id,
                    type: 'goal',
                    content: g.content,
                    start,
                    end: start + duration,
                    duration,
                    original: g,
                    isCompleted: g.isCompleted
                });
            }

            // Process SubGoals
            // Subgoals currently don't have recurrence/multi-day fields in UI, 
            // but they should follow parent or have their own schedule.
            // For now, if they have an explicit schedule matching today, show them.
            g.subGoals?.forEach(sg => {
                if (sg.isCompleted) return;
                
                let sgTime: string | null = null;
                if (sg.scheduledTime && sg.scheduledTime.startsWith(targetDateStr)) {
                    sgTime = sg.scheduledTime.split('T')[1];
                }

                if (sgTime) {
                    const start = getMinutesFromMidnight(sgTime);
                    const duration = sg.duration || 30; 
                    scheduled.push({
                        id: sg.id,
                        goalId: g.id,
                        subGoalId: sg.id,
                        type: 'subgoal',
                        content: sg.content,
                        start,
                        end: start + duration,
                        duration,
                        original: sg,
                        isCompleted: sg.isCompleted
                    });
                }
            });
        });
        
        return scheduled;
    }, [goals, timelineDate]);

    const layoutItems = useMemo(() => calculateLayout(scheduledItems), [scheduledItems]);

    // Handlers
    const handleDateChange = (days: number) => {
        const date = new Date(timelineDate);
        date.setDate(date.getDate() + days);
        setTimelineDate(date.toISOString().split('T')[0]);
    };
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const success = importData(data);
                if (success) {
                    console.log("Timeline: Data imported successfully");
                }
            } catch (error) {
                console.error("Timeline: Invalid JSON format", error);
            }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Generate Slots
    const slots = [];
    for (let h = HOURS_START; h < HOURS_END; h++) {
        for (let m = 0; m < 60; m += granularity) {
            slots.push(<TimelineHourSlot key={`${h}:${m}`} hour={h} minute={m} granularity={granularity} />);
        }
    }
    
    // Time Labels
    const timeLabels = [];
    for (let h = HOURS_START; h < HOURS_END; h++) {
        timeLabels.push(
            <div 
                key={h} 
                className="absolute left-4 text-xs font-mono text-indigo-300/50 font-bold"
                style={{ top: `${(h - HOURS_START) * PIXELS_PER_HOUR}px` }}
            >
                {h.toString().padStart(2, '0')}:00
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-10 flex flex-col bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-500 text-indigo-100">
            {/* Header */}
            <div className="flex-none flex justify-between items-center px-6 py-3 border-b border-indigo-500/20 bg-slate-900/60 z-40">
                <div className="flex items-center gap-6">
                    <h2 className="text-indigo-100 font-bold text-lg font-mono tracking-wider flex items-center gap-2">
                        <Clock size={18} />
                        TIMELINE
                    </h2>
                    
                    {/* Date Nav */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-indigo-500/30 rounded p-0.5">
                        <button onClick={() => handleDateChange(-1)} className="p-1 hover:text-indigo-400 hover:bg-indigo-500/10 rounded"><ChevronLeft size={16} /></button>
                         <div className="relative">
                            <button 
                                onClick={() => setShowCalendar(!showCalendar)}
                                className={`px-3 py-1 font-mono text-sm transition w-28 text-center ${!isToday ? 'text-indigo-300' : 'text-white font-bold'}`}
                            >
                                {timelineDate}
                            </button>
                             {showCalendar && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowCalendar(false)} />
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
                                        <MiniCalendar />
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-1 hover:text-indigo-400 hover:bg-indigo-500/10 rounded"><ChevronRight size={16} /></button>
                    </div>
                    
                    {!isToday && (
                        <button 
                             onClick={() => setTimelineDate(todayStr)}
                             className="ml-2 text-[10px] bg-indigo-600/80 hover:bg-indigo-500 text-white px-2 py-1 rounded font-mono animate-in fade-in slide-in-from-left-2"
                        >
                            TODAY
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-4">
                     {/* Granularity Control */}
                     <div className="flex items-center gap-2 text-xs font-mono text-indigo-400/70 bg-slate-900/50 px-2 py-1 rounded border border-indigo-500/20">
                        <Settings size={12} />
                        <span>SNAP:</span>
                        <select 
                            value={granularity} 
                            onChange={(e) => setGranularity(Number(e.target.value) as Granularity)}
                            className="bg-transparent border-none focus:ring-0 p-0 text-indigo-300 font-bold cursor-pointer"
                        >
                            <option value={5}>5m</option>
                            <option value={10}>10m</option>
                            <option value={15}>15m</option>
                            <option value={30}>30m</option>
                        </select>
                     </div>

                    {/* Import/Export */}
                    <div className="flex gap-2">
                         <input 
                             type="file" 
                             ref={fileInputRef} 
                             onChange={handleFileChange} 
                             className="hidden" 
                             accept=".json" 
                         />
                         <button onClick={handleImportClick} className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-400" title="Import">
                            <Upload size={16} />
                         </button>
                         <button onClick={exportData} className="p-1.5 hover:bg-indigo-500/20 rounded text-indigo-400" title="Export">
                            <Download size={16} />
                         </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Timeline Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-slate-900/20">
                    <div 
                        className="relative w-full max-w-4xl mx-auto my-4 border-x border-indigo-500/10 min-h-[1440px]" 
                        style={{ height: `${TOTAL_HOURS * PIXELS_PER_HOUR}px` }}
                    >
                         {/* Grid Lines */}
                        {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                            <div 
                                key={i} 
                                className="absolute w-full border-t border-indigo-500/20"
                                style={{ top: `${i * PIXELS_PER_HOUR}px` }}
                            />
                        ))}

                        {/* Slots */}
                        {slots}
                        
                        {/* Current Time Indicator */}
                        {isToday && time >= HOURS_START && time <= HOURS_END && (
                            <div 
                                className="absolute w-full border-t-2 border-red-500/70 z-30 pointer-events-none flex items-center"
                                style={{ top: `${(time - HOURS_START) * PIXELS_PER_HOUR}px` }}
                            >
                                 <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
                                 <span className="ml-1 text-[10px] text-red-400 font-mono bg-slate-900/80 px-1 rounded shadow-sm">
                                     {Math.floor(time).toString().padStart(2,'0')}:{Math.floor((time % 1) * 60).toString().padStart(2,'0')}
                                 </span>
                            </div>
                        )}

                        {/* Labels */}
                        {timeLabels}

                        {/* Scheduled Items */}
                        {layoutItems.map(item => (
                            <ScheduledTaskBlock 
                                key={item.type === 'goal' ? item.id : item.subGoalId} 
                                item={item} 
                                style={item.style}
                                onOpenMap={onOpenMap}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
