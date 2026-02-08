import { useState, useMemo, useEffect } from 'react';
import AscensionCanvas from './components/AscensionCanvas';
import GrisBackground from './components/GrisBackground';
import UI from './components/UI';
import { GoalCanvas } from './components/GoalTree/GoalCanvas';
import { TaskHUD } from './components/TaskDashboard/TaskHUD';
import { useTimeSystem } from './hooks/useTimeSystem';
import { getTimePhase, getSkyGradient } from './utils/environment';
import { WeatherType } from './types';
import { useGameStore } from './store/gameStore';
import { DndContext, DragEndEvent, DragOverlay, useSensor, useSensors, PointerSensor, KeyboardSensor, closestCenter } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { TaskItem, useTaskQueue } from './hooks/useTaskQueue';

import { ScheduleOverview } from './components/ScheduleOverview';
import { TimelineOverlay } from './components/TimelineOverlay';
import { CmdCenterWindow } from './CmdCenterWindow';

function App() {
  const [isCmdCenter] = useState(() => window.location.hash.includes('cmd-center'));

  if (isCmdCenter) {
      return <CmdCenterWindow />;
  }

  const { time, season } = useTimeSystem();
  const { viewMode, stairStyle, environment, colorTheme, setGoalSchedule, scheduleSubGoal, unscheduleSubGoal, taskOrder, setTaskOrder, goals, dashboardViewMode } = useGameStore();
  const { taskQueue, updateOrder } = useTaskQueue();
  const [manualWeather, setManualWeather] = useState<WeatherType | null>(null);
  const [autoWeather, setAutoWeather] = useState<WeatherType>('clear');
  const [showMap, setShowMap] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [invalidDrag, setInvalidDrag] = useState(false);
  
  const phase = getTimePhase(time);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: any) => {
    setActiveDragId(event.active.id);
    setInvalidDrag(false);
    useGameStore.getState().setInvalidDragId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id.toString();
    setActiveDragId(null);
    setInvalidDrag(false);
    // Don't clear invalidDragId immediately here, let the timeout handle it for the flash effect
    // But we need to ensure it clears eventually if not triggered below

    if (!over) {
        useGameStore.getState().setInvalidDragId(null);
        return;
    }
    const overId = over.id.toString();
    const activeData = active.data.current;
    const overData = over.data.current;

    // Case 1: Scheduling (Drag to Time Slot)
    if (overId.startsWith('slot-')) {
        const time = overData?.time; // HH:mm
        if (time) {
            const { timelineDate, goals, setInvalidDragId } = useGameStore.getState();
            
            // --- VALIDATION: Check End Date ---
            let targetEndDate: string | null = null;
            let targetGoalId: string | null = null;
            
            if (activeData?.type === 'subgoal') {
                targetGoalId = activeData.goalId;
            } else {
                let id = activeId;
                if (id.startsWith('hud-task-')) id = id.replace('hud-task-', '');
                else if (id.startsWith('timeline-goal-')) id = id.replace('timeline-goal-', '');
                targetGoalId = id;
            }

            if (targetGoalId) {
                const goal = goals.find(g => g.id === targetGoalId);
                if (goal && goal.endDate) {
                    if (timelineDate > goal.endDate) {
                        // INVALID DROP: Date exceeds end date
                        setInvalidDrag(true);
                        setInvalidDragId(targetGoalId); // Flash the card in HUD
                        
                        // Trigger flash animation then clear
                        setTimeout(() => {
                            setInvalidDrag(false);
                            setInvalidDragId(null);
                        }, 500); 
                        return; // ABORT
                    }
                }
            }
            // ----------------------------------
            
            // Success path - clear any residual invalid state
            setInvalidDragId(null);

            const scheduledTime = `${timelineDate}T${time}`;

            // Handle SubGoals
            if (activeData?.type === 'subgoal') {
                 const { goalId, id: subGoalId, duration } = activeData;
                 if (goalId && subGoalId) {
                     // Preserve duration if dragging from unscheduled, or keep existing?
                     // Requirements say: "If subGoal has no time, it is unscheduled."
                     // When dragging to timeline, we assign time. Duration?
                     // If it has duration in data, use it. Default 60?
                     // But wait, "SubGoal... duration (number, minutes)".
                     // I should probably pass duration if it exists.
                     scheduleSubGoal(goalId, subGoalId, scheduledTime, duration || 30); // Default 30 for subgoals? Or 60?
                     return;
                 }
            }
            
            // Handle Goals
            let goalId = activeId;
            // Strip prefixes
            if (activeId.startsWith('hud-task-')) goalId = activeId.replace('hud-task-', '');
            else if (activeId.startsWith('timeline-goal-')) goalId = activeId.replace('timeline-goal-', '');
            
            // If we have strict type data, use it to avoid false positives
            if (activeData?.type === 'goal' || !activeData?.type) { // Default to goal if no type
                 setGoalSchedule(goalId, scheduledTime);
            }
        }
        return;
    }

    // Case 3: Unscheduling (Drag to Unscheduled Drawer)
    if (overId === 'unscheduled-pool') {
         if (activeData?.type === 'subgoal') {
             const { goalId, id: subGoalId } = activeData;
             if (goalId && subGoalId) {
                 unscheduleSubGoal(goalId, subGoalId);
             }
         } else {
            // Goal
            let goalId = activeId;
            if (activeId.startsWith('hud-task-')) goalId = activeId.replace('hud-task-', '');
            else if (activeId.startsWith('timeline-goal-')) goalId = activeId.replace('timeline-goal-', '');
            
            if (goalId) {
                setGoalSchedule(goalId, null);
            }
         }
         return;
    }

    // Case 2: Reordering (Task Queue via HUD)
    if (activeId.startsWith('hud-task-') && overId.startsWith('hud-task-')) {
        const activeGoalId = activeId.replace('hud-task-', '');
        const overGoalId = overId.replace('hud-task-', '');

        const oldIndex = taskQueue.findIndex(i => i.goal.id === activeGoalId);
        const newIndex = taskQueue.findIndex(i => i.goal.id === overGoalId);
        
        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
            const newItems = arrayMove(taskQueue, oldIndex, newIndex);
            updateOrder(newItems);
        }
        return;
    }
  };

  // Find the active goal object for the drag overlay
  const getActiveContent = () => {
      if (!activeDragId) return null;
      let id = activeDragId;
      if (id.startsWith('hud-task-')) id = id.replace('hud-task-', '');
      else if (id.startsWith('timeline-goal-')) id = id.replace('timeline-goal-', '');
      
      const goal = goals.find(g => g.id === id) || goals.flatMap(g => g.subGoals || []).find(sg => sg.id === id);
      return goal?.content;
  };
  
  const activeContent = getActiveContent();
  
  // Simulate weather changes based on season and randomness
  useEffect(() => {
    // Only update weather occasionally (every hour in game logic, but here simplified)
    const updateWeather = () => {
      const rand = Math.random();
      let nextWeather: WeatherType = 'clear';

      if (season === 'winter') {
        if (rand > 0.7) nextWeather = 'snow';
        else if (rand > 0.5) nextWeather = 'cloudy';
      } else if (season === 'spring' || season === 'autumn') {
        if (rand > 0.8) nextWeather = 'rain';
        else if (rand > 0.6) nextWeather = 'cloudy';
      } else { // Summer
        if (rand > 0.9) nextWeather = 'rain'; // Summer storm
        else if (rand > 0.8) nextWeather = 'cloudy';
      }
      
      setAutoWeather(nextWeather);
    };

    updateWeather();
    const interval = setInterval(updateWeather, 1000 * 60 * 30); // Change every 30 mins
    return () => clearInterval(interval);
  }, [season]);

  const weather = manualWeather || autoWeather;

  // Re-calculate gradient whenever phase or weather changes
  const bgGradient = useMemo(() => getSkyGradient(phase, weather, colorTheme), [phase, weather, colorTheme]);

  const toggleWeather = () => {
    // If currently manual, cycle through. If auto, start manual cycle from current auto.
    const weathers: WeatherType[] = ['clear', 'cloudy', 'rain', 'snow'];
    const currentBase = manualWeather || autoWeather;
    const nextIndex = (weathers.indexOf(currentBase) + 1) % weathers.length;
    
    // If we cycle back to auto (optional logic, but here let's just cycle manual)
    setManualWeather(weathers[nextIndex]);
  };

  const handleOpenMap = useMemo(() => () => setShowMap(true), []);
  const handleOpenOverview = useMemo(() => () => setShowOverview(true), []);

  return (
    <DndContext  
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
    <div 
      className="relative w-full h-screen overflow-hidden transition-[background] duration-[3000ms] ease-in-out"
      style={{ background: bgGradient }}
    >
      <GrisBackground />
      <AscensionCanvas 
        timePhase={phase}  
        weather={weather} 
        viewMode={viewMode} 
        stairStyle={stairStyle}
        environment={environment}
        colorTheme={colorTheme}
      />
      
      <UI 
        onWeatherToggle={toggleWeather} 
        currentWeather={weather} 
        onOpenMap={handleOpenMap} 
      />
      
      <TaskHUD 
          onOpenMap={handleOpenMap}
          onOpenOverview={handleOpenOverview}
      />

      {showMap && (
        <GoalCanvas onClose={() => setShowMap(false)} />
      )}

      {showOverview && (
        <ScheduleOverview onClose={() => setShowOverview(false)} />
      )}
      
      {dashboardViewMode === 'timeline' && <TimelineOverlay onOpenMap={handleOpenMap} />}

      {/* Time Debug/Display (Optional, minimal) */}
      <div className="absolute top-4 left-6 text-white/30 text-xs font-mono tracking-widest pointer-events-none flex gap-2 z-50">
        <span>{phase.toUpperCase()}</span>
        <span>|</span>
        <span>{weather.toUpperCase()}</span>
      </div>

      <DragOverlay dropAnimation={null} zIndex={100}>
        {activeContent ? (
             <div className={`
                p-2 text-xs font-mono border shadow-xl rounded w-48 flex items-center gap-2 cursor-grabbing transition-colors duration-200
                ${invalidDrag 
                    ? 'bg-red-900/90 border-red-500 text-red-100 animate-pulse' 
                    : 'bg-indigo-600/90 border-indigo-400 text-white'}
             `}>
                <span className="truncate">{activeContent}</span>
                {invalidDrag && <span className="text-[10px] font-bold uppercase ml-auto">INVALID DATE</span>}
            </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
  );
}

export default App;
