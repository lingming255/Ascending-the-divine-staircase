import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useGameStore } from '../store/gameStore';
import { getLocalDateString } from '../utils/helpers';

export const MiniCalendar: React.FC = () => {
    const { timelineDate, setTimelineDate } = useGameStore();
    
    // Internal state for the viewed month (might be different from selected date)
    const [viewDate, setViewDate] = useState(() => new Date(timelineDate));

    // Sync viewDate if timelineDate changes externally (optional, but good for UX)
    useEffect(() => {
        const selected = new Date(timelineDate);
        // Only jump view if the selected date is far away? 
        // Or just keep view independent? 
        // Let's sync view only if the month is different to ensure selected date is visible
        if (selected.getMonth() !== viewDate.getMonth() || selected.getFullYear() !== viewDate.getFullYear()) {
            setViewDate(selected);
        }
    }, [timelineDate]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay(); // 0 = Sunday
        return { days, firstDay };
    };

    const { days: totalDays, firstDay } = getDaysInMonth(viewDate);
    const prevMonthDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleToday = (e: React.MouseEvent) => {
        e.stopPropagation();
        const today = new Date();
        const localDateStr = getLocalDateString(today);
        setTimelineDate(localDateStr);
        setViewDate(today);
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Adjust for timezone offset issues by using local YYYY-MM-DD construction manually
        const year = newDate.getFullYear();
        const month = (newDate.getMonth() + 1).toString().padStart(2, '0');
        const d = day.toString().padStart(2, '0');
        const isoDate = `${year}-${month}-${d}`;
        
        setTimelineDate(isoDate);
    };

    // Generate calendar grid
    const renderCalendarGrid = () => {
        const days = [];
        const totalSlots = 42; // 6 rows * 7 cols

        // Previous month filler
        for (let i = 0; i < firstDay; i++) {
            days.push(
                <div key={`prev-${i}`} className="text-slate-700 text-center py-1 text-xs font-mono pointer-events-none">
                    {prevMonthDays - firstDay + 1 + i}
                </div>
            );
        }

        // Current month days
        for (let i = 1; i <= totalDays; i++) {
            const currentDateStr = `${viewDate.getFullYear()}-${(viewDate.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
            const isSelected = currentDateStr === timelineDate;
            const isToday = getLocalDateString() === currentDateStr;

            days.push(
                <button
                    key={`curr-${i}`}
                    onClick={(e) => { e.stopPropagation(); handleDateClick(i); }}
                    className={`
                        text-center py-1 text-xs font-mono rounded transition relative
                        ${isSelected 
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50' 
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }
                        ${isToday && !isSelected ? 'text-indigo-400 font-bold' : ''}
                    `}
                >
                    {i}
                    {isToday && <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400" />}
                </button>
            );
        }

        // Next month filler
        const remainingSlots = totalSlots - days.length;
        for (let i = 1; i <= remainingSlots; i++) {
            days.push(
                <div key={`next-${i}`} className="text-slate-700 text-center py-1 text-xs font-mono pointer-events-none">
                    {i}
                </div>
            );
        }

        return days;
    };

    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

    return (
        <div 
            className="w-64 bg-slate-950/90 border border-slate-700 rounded shadow-2xl overflow-hidden pointer-events-auto select-none"
            onPointerDown={(e) => e.stopPropagation()} // Prevent dragging parent if applicable
        >
            {/* Header */}
            <div className="flex items-center justify-between p-2 bg-slate-900 border-b border-slate-800">
                <button 
                    onClick={handlePrevMonth}
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                >
                    <ChevronLeft size={16} />
                </button>
                
                <div className="flex items-center gap-2 font-mono text-sm font-bold text-indigo-100">
                    <span>{monthNames[viewDate.getMonth()]}</span>
                    <span className="text-slate-500">{viewDate.getFullYear()}</span>
                </div>

                <div className="flex items-center gap-1">
                    <button 
                        onClick={handleToday}
                        className="text-[10px] font-mono text-indigo-400 hover:text-white px-1.5 py-0.5 rounded border border-indigo-500/30 hover:bg-indigo-500/20 transition uppercase"
                        title="Jump to Today"
                    >
                        Today
                    </button>
                    <button 
                        onClick={handleNextMonth}
                        className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 p-2 pb-0">
                {['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'].map(day => (
                    <div key={day} className="text-center text-[10px] font-mono text-slate-600 font-bold">
                        {day}
                    </div>
                ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 p-2">
                {renderCalendarGrid()}
            </div>
        </div>
    );
};
