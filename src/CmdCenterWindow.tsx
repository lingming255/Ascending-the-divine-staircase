import React, { useState } from 'react';
import { TaskHUD } from './components/TaskDashboard/TaskHUD';
import { 
  DndContext, 
  DragEndEvent, 
  DragOverlay, 
  useSensor, 
  useSensors, 
  PointerSensor, 
  KeyboardSensor, 
  closestCenter 
} from '@dnd-kit/core';
import { 
  sortableKeyboardCoordinates, 
  arrayMove 
} from '@dnd-kit/sortable';
import { useTaskQueue } from './hooks/useTaskQueue';
import { useGameStore } from './store/gameStore';

export const CmdCenterWindow = () => {
    const { taskQueue, updateOrder } = useTaskQueue();
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const { goals } = useGameStore();

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragStart = (event: any) => {
        setActiveDragId(event.active.id);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (!over) return;

        const activeId = active.id.toString();
        const overId = over.id.toString();

        // Reordering Logic
        if (activeId.startsWith('hud-task-') && overId.startsWith('hud-task-')) {
            const activeGoalId = activeId.replace('hud-task-', '');
            const overGoalId = overId.replace('hud-task-', '');

            const oldIndex = taskQueue.findIndex(i => i.goal.id === activeGoalId);
            const newIndex = taskQueue.findIndex(i => i.goal.id === overGoalId);
            
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const newItems = arrayMove(taskQueue, oldIndex, newIndex);
                updateOrder(newItems);
            }
        }
    };

    // Find the active goal object for the drag overlay
    const getActiveContent = () => {
        if (!activeDragId) return null;
        let id = activeDragId;
        if (id.startsWith('hud-task-')) id = id.replace('hud-task-', '');
        
        const goal = goals.find(g => g.id === id) || goals.flatMap(g => g.subGoals || []).find(sg => sg.id === id);
        return goal?.content;
    };
    
    const activeContent = getActiveContent();

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="w-screen h-screen bg-slate-950 text-white overflow-hidden">
                <TaskHUD 
                    onOpenMap={() => {}} // No map in standalone
                    onOpenOverview={() => {}} // No overview in standalone
                    isStandalone={true}
                />
                
                <DragOverlay dropAnimation={null} zIndex={100}>
                    {activeContent ? (
                        <div className="p-2 text-xs font-mono border shadow-xl rounded w-48 flex items-center gap-2 cursor-grabbing bg-indigo-600/90 border-indigo-400 text-white">
                            <span className="truncate">{activeContent}</span>
                        </div>
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
};
