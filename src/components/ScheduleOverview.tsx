import React, { useMemo } from 'react';
import { useGameStore, Goal, SubGoal } from '../store/gameStore';
import { X, CalendarRange, Clock, Repeat, ArrowRight } from 'lucide-react';

// --- Types ---
interface AgendaItem {
    id: string;
    type: 'goal' | 'subgoal';
    content: string;
    startStr: string | null; // HH:mm or null for All Day
    endStr: string | null;   // HH:mm or null
    duration: number;
    original: Goal | SubGoal;
    isCompleted: boolean;
    tags: ('recurring' | 'multi-day')[];
}

interface DayAgenda {
    date: string; // YYYY-MM-DD
    displayDate: string; // e.g. "Feb 10 (Mon)"
    items: AgendaItem[];
}

// --- Helper Functions ---
const getMinutesFromMidnight = (time: string): number => {
    let timeStr = time;
    if (time.includes('T')) timeStr = time.split('T')[1];
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

const formatTime = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === tomorrow.toISOString().split('T')[0]) return 'Tomorrow';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
};

// --- Component ---
export const ScheduleOverview: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { goals, setTimelineDate, setHighlightedGoalId } = useGameStore();
    const [hideDaily, setHideDaily] = React.useState(false);

    // Generate Agenda Data
    const agenda = useMemo(() => {
        const days: DayAgenda[] = [];
        const today = new Date();
        
        // Generate next 14 days
        for (let i = 0; i < 14; i++) {
            const currentDate = new Date(today);
            currentDate.setDate(today.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayOfWeek = currentDate.getDay();

            const items: AgendaItem[] = [];

            // Helper to check if date falls in range
            const isInRange = (start?: string | null, end?: string | null) => {
                if (!start) return false;
                if (end && dateStr > end) return false;
                return dateStr >= start;
            };

            goals.forEach(g => {
                let itemTime: string | null = null;
                let showGoal = false;
                const tags: ('recurring' | 'multi-day')[] = [];

                // Filter Daily if enabled
                if (hideDaily && g.recurrence === 'daily') return;

                // 1. Recurrence
                if (g.recurrence === 'daily') {
                    const created = g.createdAt.split('T')[0];
                    if (dateStr >= created) {
                        showGoal = true;
                        tags.push('recurring');
                        if (g.scheduledTime && g.scheduledTime.includes('T')) itemTime = g.scheduledTime.split('T')[1];
                    }
                } else if (g.recurrence === 'weekly') {
                    const createdDate = new Date(g.createdAt);
                    if (dateStr >= g.createdAt.split('T')[0] && createdDate.getDay() === dayOfWeek) {
                        showGoal = true;
                        tags.push('recurring');
                        if (g.scheduledTime && g.scheduledTime.includes('T')) itemTime = g.scheduledTime.split('T')[1];
                    }
                } 
                // 2. Multi-day Range
                else if (g.startDate) {
                    if (isInRange(g.startDate, g.endDate)) {
                        showGoal = true;
                        tags.push('multi-day');
                        if (g.scheduledTime && g.scheduledTime.includes('T')) itemTime = g.scheduledTime.split('T')[1];
                    }
                } 
                // 3. Explicit Schedule Match (Single Day)
                else if (g.scheduledTime && g.scheduledTime.startsWith(dateStr)) {
                    showGoal = true;
                    itemTime = g.scheduledTime.split('T')[1];
                }

                // Add Goal
                if (showGoal) {
                    const startMins = itemTime ? getMinutesFromMidnight(itemTime) : 0;
                    const duration = g.duration || 60;
                    items.push({
                        id: g.id,
                        type: 'goal',
                        content: g.content,
                        startStr: itemTime,
                        endStr: itemTime ? formatTime(startMins + duration) : null,
                        duration,
                        original: g,
                        isCompleted: g.isCompleted,
                        tags
                    });
                }

                // Process SubGoals
                g.subGoals?.forEach(sg => {
                    let sgTime: string | null = null;
                    if (sg.scheduledTime && sg.scheduledTime.startsWith(dateStr)) {
                        sgTime = sg.scheduledTime.split('T')[1];
                    }

                    if (sgTime) {
                        const startMins = getMinutesFromMidnight(sgTime);
                        const duration = sg.duration || 30;
                        items.push({
                            id: sg.id,
                            type: 'subgoal',
                            content: sg.content,
                            startStr: sgTime,
                            endStr: formatTime(startMins + duration),
                            duration,
                            original: sg,
                            isCompleted: sg.isCompleted,
                            tags: [] // Subgoals currently don't inherit recurrence tags in UI
                        });
                    }
                });
            });

            // Sort by time (All day / null time first)
            items.sort((a, b) => {
                if (!a.startStr && !b.startStr) return 0;
                if (!a.startStr) return -1;
                if (!b.startStr) return 1;
                return getMinutesFromMidnight(a.startStr) - getMinutesFromMidnight(b.startStr);
            });

            if (items.length > 0) {
                days.push({
                    date: dateStr,
                    displayDate: formatDate(dateStr),
                    items
                });
            }
        }

        return days;
    }, [goals]);

    const handleJumpToTask = (date: string, goalId: string) => {
        setTimelineDate(date);
        setHighlightedGoalId(goalId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-8 animate-in fade-in duration-200">
            <div className="w-full max-w-3xl h-[80vh] bg-slate-900/90 border border-slate-700 shadow-2xl rounded-lg flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-slate-700 bg-slate-900">
                    <div className="flex items-center gap-3">
                        <CalendarRange className="text-indigo-400" size={20} />
                        <h2 className="text-lg font-mono font-bold text-slate-200 tracking-wider">TACTICAL AGENDA</h2>
                        <span className="text-xs font-mono text-slate-500 px-2 py-0.5 border border-slate-700 rounded">
                            NEXT 14 DAYS
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                         {/* Filter Toggle */}
                         <label className="flex items-center gap-2 cursor-pointer group">
                             <input 
                                 type="checkbox" 
                                 checked={hideDaily}
                                 onChange={(e) => setHideDaily(e.target.checked)}
                                 className="rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-0 focus:ring-offset-0 w-3 h-3"
                             />
                             <span className="text-xs font-mono text-slate-500 group-hover:text-indigo-300 transition">
                                 Hide Daily Loop
                             </span>
                         </label>

                        <button 
                            onClick={onClose}
                            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded transition"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {agenda.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 font-mono">
                            <Clock size={48} className="mb-4 opacity-20" />
                            <p>NO UPCOMING OPERATIONS</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {agenda.map(day => (
                                <div key={day.date} className="animate-in slide-in-from-bottom-2 duration-500">
                                    {/* Date Header */}
                                    <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur py-2 mb-3 border-b border-indigo-500/20 flex items-baseline gap-3">
                                        <h3 className="text-indigo-300 font-bold font-mono text-lg">{day.displayDate}</h3>
                                        <span className="text-slate-600 text-xs font-mono">{day.date}</span>
                                    </div>

                                    {/* Items List */}
                                    <div className="space-y-2 pl-4 border-l-2 border-slate-800 ml-2">
                                        {day.items.map((item, idx) => (
                                            <div 
                                                key={`${item.id}-${idx}`}
                                                onClick={() => handleJumpToTask(day.date, item.original.id)}
                                                className={`
                                                    flex items-center gap-4 p-3 rounded border font-mono text-sm transition-all hover:translate-x-1 cursor-pointer
                                                    ${item.isCompleted 
                                                        ? 'bg-slate-900/50 border-slate-800 text-slate-500' 
                                                        : 'bg-slate-800/40 border-slate-700 text-slate-200 hover:border-indigo-500/30 hover:bg-slate-800/80'}
                                                `}
                                            >
                                                {/* Time Column */}
                                                <div className="w-24 shrink-0 flex flex-col items-end border-r border-slate-700/50 pr-4">
                                                    {item.startStr ? (
                                                        <>
                                                            <span className={`font-bold ${item.isCompleted ? 'opacity-50' : 'text-indigo-300'}`}>
                                                                {item.startStr}
                                                            </span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {item.duration}m
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1">
                                                            Anytime
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Content Column */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {item.type === 'subgoal' && (
                                                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-900/30 text-emerald-400 border border-emerald-500/20">
                                                                SUB
                                                            </span>
                                                        )}
                                                        <span className={`truncate ${item.isCompleted ? 'line-through' : ''}`}>
                                                            {item.content}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Tags */}
                                                    <div className="flex gap-2">
                                                        {item.tags.includes('recurring') && (
                                                            <div className="flex items-center gap-1 text-[10px] text-amber-500/80">
                                                                <Repeat size={10} />
                                                                <span>Loop</span>
                                                            </div>
                                                        )}
                                                        {item.tags.includes('multi-day') && (
                                                            <div className="flex items-center gap-1 text-[10px] text-sky-500/80">
                                                                <ArrowRight size={10} />
                                                                <span>Span</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
