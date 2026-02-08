import React, { useState, useRef, useMemo } from 'react';
import { useGameStore, Goal } from '../../store/gameStore';
import { GoalNode } from './GoalNode';
import { CustomPrompt } from '../CustomPrompt';
import { ProjectSidebar } from './ProjectSidebar';
import { getSubTreeIds, getAncestors } from '../../utils/treeHelpers';
import { X, Plus, Locate, Home, ChevronRight as ChevronRightIcon } from 'lucide-react';

interface GoalCanvasProps {
  onClose: () => void;
}

export const GoalCanvas: React.FC<GoalCanvasProps> = ({ onClose }) => {
  const { 
    goals, 
    updateGoal, 
    activeGoalId, 
    setActiveGoal, 
    toggleGoalToday, 
    addGoal, 
    deleteGoal,
    focusedGoalId,
    setFocusedGoalId,
    scrollToId,
    setScrollToId
  } = useGameStore();

  const [view, setView] = useState({ x: window.innerWidth / 2, y: 100, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); // Screen coords
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // Screen coords for line
  
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle ScrollToId
  React.useEffect(() => {
    if (scrollToId) {
        // 1. Ensure the goal is visible (might be inside a focused subtree)
        // If we are in focus mode, we might need to exit it OR check if target is inside.
        // For simplicity, let's exit focus mode if target is not found in visibleGoals
        // But visibleGoals depends on focusedGoalId.
        
        // Actually, let's just find it in global goals first.
        const target = goals.find(g => g.id === scrollToId);
        if (target) {
            // Check if we need to change focus
            // If focusedGoalId is set, check if target is a descendant
            // If not, we might need to reset focus or switch focus.
            // For now, let's just reset focus if not visible.
            
            // NOTE: visibleGoals is memoized. We can't easily check "is visible" synchronously here before render.
            // So we'll force view update assuming it will be rendered.
            
            // To be safe, if we are in Drill-down, we might want to exit it to show the global node.
            // setFocusedGoalId(null); // Optional: Force global view? User might find this jarring.
            
            // Calculate center position
            const targetX = target.position.x;
            const targetY = target.position.y;
            
            setView({
                x: window.innerWidth / 2 - targetX * view.scale - 110 * view.scale,
                y: window.innerHeight / 2 - targetY * view.scale - 50 * view.scale,
                scale: view.scale
            });
            
            // Clear the request
            setScrollToId(null);
        }
    }
  }, [scrollToId, goals, view.scale]);

  // Focus Mode Logic
  const visibleGoals = useMemo(() => {
    if (!focusedGoalId) return goals;
    const ids = getSubTreeIds(focusedGoalId, goals);
    return goals.filter(g => ids.has(g.id));
  }, [goals, focusedGoalId]);

  const breadcrumbs = useMemo(() => {
    if (!focusedGoalId) return [];
    return getAncestors(focusedGoalId, goals);
  }, [focusedGoalId, goals]);

  // Helper to convert screen to world coordinates
  const screenToWorld = (sx: number, sy: number) => {
    return {
      x: (sx - view.x) / view.scale,
      y: (sy - view.y) / view.scale
    };
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom
    e.stopPropagation();
    const zoomSensitivity = 0.001;
    const newScale = Math.min(Math.max(view.scale - e.deltaY * zoomSensitivity, 0.2), 3);
    setView(v => ({ ...v, scale: newScale }));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // Centralized Event Handling
    const target = e.target as HTMLElement;
    const nodeEl = target.closest('[data-type="node"]');
    const handleEl = target.closest('[data-type="handle"]');
    
    // Always capture pointer on the container to ensure we receive move/up events
    containerRef.current?.setPointerCapture(e.pointerId);

    if (e.button === 0 && handleEl) {
        // Start Connecting
        const id = handleEl.getAttribute('data-id');
        if (id) {
            setConnectingId(id);
            setCursorPos({ x: e.clientX, y: e.clientY });
            e.preventDefault();
            e.stopPropagation(); // Stop propagation to prevent panning start
        }
    } else if (e.button === 0 && nodeEl) {
        // Start Dragging Node
        const id = nodeEl.getAttribute('data-id');
        if (id) {
            setDraggingId(id);
            setDragStart({ x: e.clientX, y: e.clientY });
            e.preventDefault();
        }
    } else if (e.button === 1 || e.button === 2 || e.button === 0) {
        // Pan
        setIsPanning(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (draggingId) {
      const dx = (e.clientX - dragStart.x) / view.scale;
      const dy = (e.clientY - dragStart.y) / view.scale;
      
      const goal = goals.find(g => g.id === draggingId);
      if (goal) {
        updateGoal(draggingId, {
          position: {
            x: goal.position.x + dx,
            y: goal.position.y + dy
          }
        });
      }
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (connectingId) {
       // Force re-render for line update
       setCursorPos({ x: e.clientX, y: e.clientY });
       
       // Hit Test for highlighting
       const worldPos = screenToWorld(e.clientX, e.clientY);
       const target = visibleGoals.find(g => {
         if (g.id === connectingId) return false;
         return (
           worldPos.x >= g.position.x && 
           worldPos.x <= g.position.x + 220 &&
           worldPos.y >= g.position.y &&
           worldPos.y <= g.position.y + 150
         );
       });
       setHoveredTargetId(target ? target.id : null);
    } else if (isPanning) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setView(v => ({ ...v, x: v.x + dx, y: v.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only handle context menu if not dragging or connecting
    if (connectingId) {
        setConnectingId(null);
        setHoveredTargetId(null);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    containerRef.current?.releasePointerCapture(e.pointerId);
    
    if (draggingId) {
      setDraggingId(null);
    } else if (connectingId) {
      // Hit Test
      const worldPos = screenToWorld(e.clientX, e.clientY);
      // We check all nodes to see if we dropped on one
      const target = visibleGoals.find(g => {
        if (g.id === connectingId) return false; // Can't link to self
        return (
          worldPos.x >= g.position.x && 
          worldPos.x <= g.position.x + 220 &&
          worldPos.y >= g.position.y &&
          worldPos.y <= g.position.y + 150 // Increased hit area height
        );
      });

      if (target) {
        // Check if connection already exists to avoid duplicates
        if (!target.parentIds.includes(connectingId)) {
            const newParentIds = [...target.parentIds, connectingId];
            updateGoal(target.id, { parentIds: newParentIds });
        }
      }
      setConnectingId(null);
      setHoveredTargetId(null);
    } else if (isPanning) {
      setIsPanning(false);
    }
  };

  const handleAddGoalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPromptOpen(true);
  };

  const handlePromptConfirm = (content: string) => {
    if (content && content.trim()) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        let pos = { x: 0, y: 0 };
        
        try {
            const center = screenToWorld(cx, cy);
            pos = { x: center.x - 110, y: center.y - 40 };
        } catch (err) {
            console.warn("screenToWorld failed, using zero:", err);
        }

        // If in focus mode, add as child of focused goal?
        // User might expect this.
        const parentId = focusedGoalId;

        const newId = addGoal(content, parentId, pos);
        console.log("Goal added:", newId);
    }
    setIsPromptOpen(false);
  };
  
  const centerOnActive = () => {
      const active = visibleGoals.find(g => g.id === activeGoalId);
      if (active) {
          setView({
              x: window.innerWidth / 2 - active.position.x * view.scale - 110 * view.scale,
              y: window.innerHeight / 2 - active.position.y * view.scale - 50 * view.scale,
              scale: 1
          });
      }
  };

  const handleSelectProject = (id: string) => {
    setFocusedGoalId(null); // Exit focus mode
    const node = goals.find(g => g.id === id);
    if (node) {
        setView({
           x: window.innerWidth / 2 - node.position.x * view.scale - 110 * view.scale,
           y: 100, // Top align
           scale: 1
        });
    }
  };

  // Draw Lines
  const connections = useMemo(() => {
    return visibleGoals.flatMap(g => {
      if (!g.parentIds || g.parentIds.length === 0) return [];
      return g.parentIds.map(parentId => {
          // If in focus mode, ensure parent is also visible
          const parent = visibleGoals.find(p => p.id === parentId);
          if (!parent) return null;
          return { from: parent, to: g };
      }).filter(Boolean);
    }) as { from: Goal, to: Goal }[];
  }, [visibleGoals]);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f172a] overflow-hidden text-white font-sans animate-in fade-in duration-300">
      
      {/* Sidebar */}
      <ProjectSidebar goals={goals} onSelectProject={handleSelectProject} />

      {/* Breadcrumbs Bar */}
      {focusedGoalId && (
        <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/80 backdrop-blur-md border-b border-white/10 z-40 flex items-center px-4 md:pl-72 animate-in slide-in-from-top">
            <button 
                onClick={() => setFocusedGoalId(null)}
                className="p-1 hover:bg-white/10 rounded mr-2 text-white/50 hover:text-white transition"
            >
                <Home size={18} />
            </button>
            <div className="flex items-center gap-1 text-sm overflow-hidden">
                {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={crumb.id}>
                        {i > 0 && <ChevronRightIcon size={14} className="text-white/30" />}
                        <button 
                            onClick={() => setFocusedGoalId(crumb.id)}
                            className="hover:text-white text-white/70 truncate max-w-[150px] transition"
                        >
                            {crumb.content}
                        </button>
                    </React.Fragment>
                ))}
            </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <button onClick={handleAddGoalClick} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition flex items-center gap-2" title="Add New Goal">
          <Plus size={24} />
          <span className="text-sm font-medium pr-2">New Goal</span>
        </button>
        <button onClick={centerOnActive} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition" title="Locate Active">
            <Locate size={24} />
        </button>
        <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
          <X size={24} />
        </button>
      </div>
      
      <div className="absolute bottom-4 right-4 bg-black/40 px-4 py-2 rounded-full text-xs text-white/50 border border-white/5 pointer-events-none select-none z-40">
            Double-click node to Focus • Drag background to pan • Scroll to zoom
      </div>

      <CustomPrompt 
        isOpen={isPromptOpen}
        title="Create New Goal"
        onConfirm={handlePromptConfirm}
        onCancel={() => setIsPromptOpen(false)}
      />

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      >
        <div 
          style={{ 
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
            position: 'absolute',
            pointerEvents: 'none' 
          }}
        >
          {/* SVG Layer for Connections */}
          <svg className="absolute top-0 left-0 w-full h-full overflow-visible pointer-events-none">
             <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
                </marker>
             </defs>
             {connections.map((conn, i) => {
                const startX = conn.from.position.x + 110; 
                const startY = conn.from.position.y + 80; 
                const endX = conn.to.position.x + 110;
                const endY = conn.to.position.y;
                const cp1y = startY + 50;
                const cp2y = endY - 50;
                
                return (
                   <path 
                     key={i}
                     d={`M ${startX} ${startY} C ${startX} ${cp1y}, ${endX} ${cp2y}, ${endX} ${endY}`}
                     stroke="#475569"
                     strokeWidth="2"
                     fill="none"
                     markerEnd="url(#arrowhead)"
                   />
                );
             })}
             
             {/* Temporary Connection Line */}
             {connectingId && (
                (() => {
                   const startNode = visibleGoals.find(g => g.id === connectingId);
                   if (!startNode) return null;
                   
                   const startX = startNode.position.x + 110;
                   const startY = startNode.position.y + 80; // Approximate handle position (bottom center)
                   const worldCursor = screenToWorld(cursorPos.x, cursorPos.y);
                   
                   return (
                      <line 
                        x1={startX} 
                        y1={startY} 
                        x2={worldCursor.x} 
                        y2={worldCursor.y} 
                        stroke="#fbbf24" 
                        strokeWidth="2" 
                        strokeDasharray="5,5" 
                        pointerEvents="none"
                      />
                   );
                })()
             )}
          </svg>

          {/* Nodes Layer */}
          <div className="pointer-events-auto">
              {visibleGoals.map(goal => (
                <GoalNode
                  key={goal.id}
                  goal={goal}
                  isActive={goal.id === activeGoalId}
                  isSelected={false}
                  isTarget={goal.id === hoveredTargetId}
                  onToggleToday={() => toggleGoalToday(goal.id)}
                  onSetActive={() => setActiveGoal(goal.id)}
                  onDelete={() => deleteGoal(goal.id)}
                  onUnlink={() => useGameStore.getState().unlinkGoal(goal.id)}
                  onFocus={() => setFocusedGoalId(goal.id)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
