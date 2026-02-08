import { useMemo, useRef } from 'react';
import { useGameStore, Goal } from '../store/gameStore';
import { Priority } from '../types';
import { getGoalRoot } from '../utils/treeHelpers';

export interface TaskItem {
  goal: Goal;
  root: Goal | null;
}

export const useTaskQueue = () => {
  const { goals, taskOrder, setTaskOrder } = useGameStore();
  const itemCache = useRef<Map<string, TaskItem>>(new Map());

  const taskQueue = useMemo(() => {
    // 1. Get all incomplete goals
    const incompleteGoals = goals.filter(g => !g.isCompleted);
    const incompleteMap = new Map(incompleteGoals.map(g => [g.id, g]));

    // 2. Identify Blocked Parents (Goals that have incomplete children)
    // If a goal has an incomplete child, it is a "Container" and should be hidden
    // until the child is done.
    const blockedParents = new Set<string>();
    incompleteGoals.forEach(g => {
        if (g.parentIds) {
            g.parentIds.forEach(pid => blockedParents.add(pid));
        }
    });

    // 3. Filter for Actionable Leaves
    // An actionable goal is one that is incomplete AND has no incomplete children
    const leafGoals = incompleteGoals.filter(g => !blockedParents.has(g.id));

    // Helper to get stable item reference
    const getItem = (goal: Goal) => {
        const cached = itemCache.current.get(goal.id);
        if (cached && cached.goal === goal) {
            return cached;
        }
        const newItem = {
            goal,
            root: getGoalRoot(goal.id, goals)
        };
        itemCache.current.set(goal.id, newItem);
        return newItem;
    };

    // Helper to get effective priority (inherits from ancestors)
    // Returns the highest priority (lexicographically smallest string: P0 < P1 < P2)
    // encountered in the ancestry chain.
    const getEffectivePriority = (goal: Goal, visited = new Set<string>()): Priority => {
        if (visited.has(goal.id)) return goal.priority; // Cycle protection
        visited.add(goal.id);

        let highestPriority = goal.priority;

        if (goal.parentIds) {
            for (const pid of goal.parentIds) {
                const parent = incompleteMap.get(pid);
                if (parent) {
                    const parentPriority = getEffectivePriority(parent, visited);
                    if (parentPriority.localeCompare(highestPriority) < 0) {
                        highestPriority = parentPriority;
                    }
                }
            }
        }
        return highestPriority;
    };

    // 4. Build ordered list based on taskOrder + Priority
    const orderedItems: TaskItem[] = [];
    const processedIds = new Set<string>();

    // First, add items present in taskOrder (if they are still actionable leaves)
    taskOrder.forEach(id => {
      // Only include if it is an actionable leaf
      if (!blockedParents.has(id)) {
          const goal = incompleteMap.get(id);
          if (goal) {
            orderedItems.push(getItem(goal));
            processedIds.add(id);
          }
      }
    });

    // 5. Append remaining actionable items
    const remaining = leafGoals.filter(g => !processedIds.has(g.id));
    
    remaining.sort((a, b) => {
       const priorityA = getEffectivePriority(a);
       const priorityB = getEffectivePriority(b);

       // Primary: Effective Priority (P0 > P1 > P2)
       if (priorityA !== priorityB) {
           return priorityA.localeCompare(priorityB);
       }
       // Secondary: Creation Time (Newest first)
       return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    remaining.forEach(goal => {
      orderedItems.push(getItem(goal));
    });

    // Cleanup cache
    if (itemCache.current.size > incompleteGoals.length + 20) {
        const currentIds = new Set(incompleteGoals.map(g => g.id));
        for (const id of itemCache.current.keys()) {
            if (!currentIds.has(id)) {
                itemCache.current.delete(id);
            }
        }
    }

    return orderedItems;
  }, [goals, taskOrder]);

  const updateOrder = (newItems: TaskItem[]) => {
      const newOrderIds = newItems.map(item => item.goal.id);
      setTaskOrder(newOrderIds);
  };

  return { taskQueue, updateOrder };
};
