import React, { useState, useRef } from 'react';
import { useGameStore, Goal } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Download, Upload, Cloud, Sun, CloudRain, Snowflake, CheckCircle, Book, ArrowUp, X, Palette, Globe, Paintbrush, Edit2, Trash2, Save, Map, Plus, Square, CheckSquare, Lock, Map as MapIcon, Terminal, Activity, Zap, Cpu } from 'lucide-react';
import { EnvironmentType, ColorTheme } from '../store/gameStore';
import { TacticalButton } from './Toolbar/TacticalButton';
import { EnvironmentToggle } from './Toolbar/EnvironmentToggle';

interface UIProps {
  onWeatherToggle: () => void;
  currentWeather: string;
  onOpenMap: () => void;
}

const TacticalModal = ({ title, onClose, children }: { title: string, onClose: () => void, children: React.ReactNode }) => (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
        <div className="bg-slate-950 border border-slate-700 w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col relative shadow-2xl font-mono animate-in zoom-in-95 duration-200">
             {/* Decorative Corners */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-indigo-500" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-indigo-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-indigo-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-indigo-500" />

            {/* Header */}
            <div className="flex justify-between items-center p-3 border-b border-slate-800 bg-slate-900/50">
                <h2 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Terminal size={14} />
                    {title}
                </h2>
                <button onClick={onClose} className="text-slate-600 hover:text-white transition">
                    <X size={16} />
                </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

const UI: React.FC<UIProps> = ({ onWeatherToggle, currentWeather, onOpenMap }) => {
  const { 
    goals, activeGoalId, addGoal, completeGoal,
    addDailyLog, exportData, importData, dailyLogs,
    viewMode, setViewMode, stairStyle, setStairStyle,
    environment, setEnvironment,
    colorTheme, setColorTheme,
    updateDailyLog, deleteDailyLog,
    updateGoal, deleteGoal,
    addSubGoal, toggleSubGoal, deleteSubGoal,
    dashboardViewMode // Get current view mode
  } = useGameStore();
  
  const activeGoal = goals.find(g => g.id === activeGoalId);
  const completedGoals = goals.filter(g => g.isCompleted);
  const [shake, setShake] = useState(false);

  // Active Goal Lock Logic
  const subGoals = activeGoal?.subGoals || [];
  const totalSub = subGoals.length;
  const completedSub = subGoals.filter(s => s.isCompleted).length;
  const isLocked = totalSub > 0 && completedSub < totalSub;
  const progress = totalSub > 0 ? (completedSub / totalSub) * 100 : 0;

  const handleCompleteGoal = () => {
      if (activeGoalId) {
          if (isLocked) {
              setShake(true);
              setTimeout(() => setShake(false), 500);
              return;
          }
          triggerCelebration();
          completeGoal(activeGoalId);
      }
  };

  const [goalInput, setGoalInput] = useState('');
  const [logInput, setLogInput] = useState('');
  const [showLogInput, setShowLogInput] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Edit States
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editLogContent, setEditLogContent] = useState('');
  
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [editGoalContent, setEditGoalContent] = useState('');

  // Subgoal input for Modal
  const [modalSubInput, setModalSubInput] = useState('');

  const triggerCelebration = () => {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60, startVelocity: 25 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  };

  const handleSetGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (goalInput.trim()) {
      const newId = addGoal(goalInput);
      useGameStore.getState().setActiveGoal(newId);
      setGoalInput('');
    }
  };

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (logInput.trim()) {
      addDailyLog(logInput);
      setLogInput('');
      setShowLogInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          handleLog(e);
      }
      if (e.key === 'Escape') {
          setShowLogInput(false);
      }
  };

  const toggleStyle = () => {
      const styles: ('minimal' | 'ethereal')[] = ['minimal', 'ethereal'];
      const nextIndex = (styles.indexOf(stairStyle as 'minimal' | 'ethereal') + 1) % styles.length;
      setStairStyle(styles[nextIndex]);
  };

  const toggleColorTheme = () => {
    const themes: ColorTheme[] = ['midnight', 'bamboo', 'sunset', 'ocean', 'desert', 'city'];
    const nextIndex = (themes.indexOf(colorTheme) + 1) % themes.length;
    setColorTheme(themes[nextIndex]);
  };

  const startEditLog = (log: { id: string, content: string }) => {
      setEditingLogId(log.id);
      setEditLogContent(log.content);
  };

  const saveEditLog = () => {
      if (editingLogId && editLogContent.trim()) {
          updateDailyLog(editingLogId, editLogContent);
          setEditingLogId(null);
          setEditLogContent('');
      }
  };

  const cancelEditLog = () => {
      setEditingLogId(null);
      setEditLogContent('');
  };

  const handleDeleteLog = (id: string) => {
      if (window.confirm('Delete this chronicle?')) {
          deleteDailyLog(id);
      }
  };
  
  const handleStoneClick = (goal: Goal) => {
      setSelectedGoal(goal);
      setEditGoalContent(goal.content);
      setIsEditingGoal(false);
  };

  const saveEditGoal = () => {
      if (selectedGoal && editGoalContent.trim()) {
          updateGoal(selectedGoal.id, { content: editGoalContent });
          setSelectedGoal({ ...selectedGoal, content: editGoalContent });
          setIsEditingGoal(false);
      }
  };

  const handleDeleteGoal = () => {
      if (selectedGoal) {
          deleteGoal(selectedGoal.id);
          setSelectedGoal(null);
      }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);
        const success = importData(data);
        if (success) {
          console.log('Import successful');
        } else {
          alert('Failed to import data. Invalid format.');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Failed to parse file.');
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };
  
  // If in Timeline mode, hide the main UI overlay to reduce clutter
  if (dashboardViewMode === 'timeline') {
      return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 font-mono">
      {/* Top Bar: Settings & Controls */}
      <div className="flex justify-between items-start pointer-events-auto">
        {/* Goal Input / Active Display */}
        <div className="flex-1 flex justify-start">
          <AnimatePresence mode="wait">
          {activeGoal ? (
             <div className="flex items-center">
                <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 px-4 py-2 flex items-center gap-4 relative overflow-hidden group">
                  {/* Progress Bar Background */}
                  {totalSub > 0 && (
                      <div className="absolute bottom-0 left-0 h-[2px] bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  )}
                  
                  <div className="flex flex-col">
                      <span className="text-[9px] text-slate-500 uppercase tracking-widest">Current Objective</span>
                      <span className="text-sm font-bold text-slate-200 tracking-wide flex items-center gap-2">
                        {activeGoal.content}
                        {totalSub > 0 && (
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-indigo-400">
                                {completedSub}/{totalSub}
                            </span>
                        )}
                      </span>
                  </div>
                </div>
             </div>
          ) : (
            <motion.form 
              key="goal-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              onSubmit={handleSetGoal} 
              className="pointer-events-auto flex gap-0 shadow-lg"
            >
               <button 
                type="button"
                onClick={onOpenMap}
                className="bg-slate-900 border-y border-l border-slate-700 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Select from Map"
              >
                <MapIcon size={16} />
              </button>
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder="INPUT_NEW_DIRECTIVE..."
                className="bg-slate-900/90 border border-slate-700 px-4 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 w-64 text-xs tracking-wider"
              />
            </motion.form>
          )}
          </AnimatePresence>
        </div>

        {/* Tactical Toolbar */}
        <div className="flex gap-1 bg-slate-950/80 p-1 border border-slate-800 backdrop-blur-sm shadow-xl">
           {activeGoal && (
             <>
               <TacticalButton onClick={onOpenMap} icon={MapIcon} title="Tactical Map" />
               <div className="w-[1px] bg-slate-800 mx-1 my-1" />
             </>
           )}
           <EnvironmentToggle />
           <TacticalButton onClick={toggleColorTheme} icon={Paintbrush} title={`Theme: ${colorTheme}`} />
           <TacticalButton onClick={toggleStyle} icon={Palette} title={`Style: ${stairStyle}`} />
           <TacticalButton onClick={() => setViewMode(viewMode === 'diagonal' ? 'vertical' : 'diagonal')} icon={ArrowUp} title="Toggle Perspective" active={viewMode === 'vertical'} />
           <TacticalButton onClick={onWeatherToggle} icon={currentWeather === 'clear' ? Sun : CloudRain} title={`Weather: ${currentWeather}`} active={currentWeather !== 'clear'} />
           <div className="w-[1px] bg-slate-800 mx-1 my-1" />
           <TacticalButton onClick={() => setShowHistory(true)} icon={Book} title="Chronicle" />
           <TacticalButton onClick={exportData} icon={Download} title="Export Data" />
           <TacticalButton onClick={handleImportClick} icon={Upload} title="Import Data" />
           <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
        </div>
      </div>

      {/* BIG BOTTOM BUTTON (Tactical Execution) */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-auto flex flex-col items-center gap-4 w-full max-w-lg px-4 z-20">
         {activeGoal && (
             <motion.button
                onClick={handleCompleteGoal}
                animate={shake ? { x: [-5, 5, -5, 5, 0] } : {}}
                className={`
                    relative w-full h-14 bg-slate-900/90 border-2 transition-all active:scale-[0.98] shadow-2xl group overflow-hidden
                    ${isLocked ? 'border-slate-700 cursor-not-allowed opacity-80' : 'border-indigo-500 hover:bg-indigo-900/20'}
                `}
             >
                 {/* Striped Texture Background */}
                 <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,#fff_25%,#fff_50%,transparent_50%,transparent_75%,#fff_75%,#fff_100%)] bg-[length:10px_10px]" />
                 
                 {/* Progress Bar for Locked State */}
                 {isLocked && (
                     <div className="absolute top-0 bottom-0 left-0 bg-indigo-500/20 transition-all duration-300" style={{ width: `${progress}%` }} />
                 )}

                 <div className="absolute inset-0 flex items-center justify-center gap-3">
                     {isLocked ? (
                         <>
                            <Lock size={16} className="text-slate-500" />
                            <span className="text-slate-500 text-xs font-bold tracking-widest uppercase">
                                Sub-tasks Pending ({completedSub}/{totalSub})
                            </span>
                         </>
                     ) : (
                         <>
                            <Zap size={18} className="text-indigo-400 group-hover:text-white transition-colors" />
                            <span className="text-indigo-400 group-hover:text-white font-bold text-sm tracking-[0.2em] uppercase transition-colors">
                                Execute_Objective
                            </span>
                         </>
                     )}
                 </div>

                 {/* Corner Accents */}
                 <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20" />
                 <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20" />
             </motion.button>
         )}
      </div>

      {/* History Modal */}
      {showHistory && (
        <TacticalModal title="Mission_Chronicle" onClose={() => setShowHistory(false)}>
            {dailyLogs.length === 0 ? (
                <div className="text-center text-slate-600 italic py-10 text-xs uppercase tracking-widest">Log Empty</div>
            ) : (
                dailyLogs.slice().reverse().map((log) => (
                    <div key={log.id} className="bg-slate-900/50 p-3 mb-2 border border-slate-800 group relative hover:border-slate-600 transition">
                        <div className="text-[10px] text-indigo-400 mb-1 font-mono flex justify-between border-b border-slate-800 pb-1">
                            <span>[{new Date(log.date).toLocaleDateString()}]</span>
                            <div className="hidden group-hover:flex gap-2">
                                    <button onClick={() => startEditLog(log)} className="text-slate-500 hover:text-white transition"><Edit2 size={10}/></button>
                                    <button onClick={() => handleDeleteLog(log.id)} className="text-slate-500 hover:text-red-400 transition"><Trash2 size={10}/></button>
                            </div>
                        </div>
                        {editingLogId === log.id ? (
                            <div className="flex flex-col gap-2 mt-2">
                                <textarea 
                                    value={editLogContent} 
                                    onChange={(e) => setEditLogContent(e.target.value)}
                                    className="bg-slate-950 text-slate-300 w-full p-2 border border-slate-700 focus:outline-none focus:border-indigo-500 text-xs font-mono"
                                    autoFocus
                                />
                                <div className="flex justify-end gap-2">
                                    <button onClick={cancelEditLog} className="text-[10px] text-slate-500 hover:text-white uppercase">Cancel</button>
                                    <button onClick={saveEditLog} className="text-[10px] bg-indigo-900/30 border border-indigo-500/50 text-indigo-300 px-2 py-1 uppercase hover:bg-indigo-900/50">Save</button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap mt-1">{log.content}</div>
                        )}
                    </div>
                ))
            )}
        </TacticalModal>
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <TacticalModal title="Objective_Details" onClose={() => setSelectedGoal(null)}>
            <div className="flex flex-col items-center text-center">
                <div className="mb-4 text-emerald-500">
                    <CheckCircle size={32} />
                </div>

                {isEditingGoal ? (
                    <div className="flex flex-col gap-4 w-full">
                        <input 
                            type="text" 
                            value={editGoalContent} 
                            onChange={(e) => setEditGoalContent(e.target.value)}
                            className="bg-slate-950 text-slate-200 text-center p-2 border border-slate-700 focus:outline-none focus:border-indigo-500 font-mono text-sm"
                            autoFocus
                        />
                        <div className="flex justify-center gap-3 mt-2">
                                <button onClick={() => setIsEditingGoal(false)} className="px-3 py-1 text-slate-500 hover:text-white text-xs uppercase">Cancel</button>
                                <button onClick={saveEditGoal} className="px-3 py-1 bg-indigo-900/30 border border-indigo-500/50 text-indigo-300 text-xs uppercase hover:bg-indigo-900/50">Save</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <h3 className="text-sm font-bold text-slate-200 mb-2 uppercase tracking-wide">{selectedGoal.content}</h3>
                        <div className="text-slate-500 text-[10px] font-mono mb-6 border-b border-slate-800 pb-2 w-full">
                            {selectedGoal.completedAt && (
                                <>COMPLETED: {new Date(selectedGoal.completedAt).toLocaleDateString()}</>
                            )}
                        </div>
                        <div className="flex justify-center gap-4">
                                <button onClick={() => setIsEditingGoal(true)} className="p-2 border border-slate-700 text-slate-500 hover:text-white hover:bg-slate-800 transition" title="Edit">
                                <Edit2 size={16} />
                                </button>
                                <button onClick={handleDeleteGoal} className="p-2 border border-slate-700 text-slate-500 hover:text-red-400 hover:bg-slate-800 transition" title="Delete">
                                <Trash2 size={16} />
                                </button>
                        </div>
                    </>
                )}
            </div>
        </TacticalModal>
      )}

      {/* Daily Engrave Modal */}
      {showLogInput && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center pointer-events-auto z-50">
             <div className="w-[600px] max-w-[90vw] flex flex-col gap-0 border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200 bg-slate-950">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-3 bg-slate-900 border-b border-slate-800">
                    <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                        <Edit2 size={14} />
                        Daily_Log_Entry
                    </h3>
                    <button onClick={() => setShowLogInput(false)} className="text-slate-600 hover:text-white transition">
                        <X size={16} />
                    </button>
                </div>

                <div className="p-6 flex flex-col gap-4">
                    {/* Active Goal Sub-goals Section in Modal */}
                    {activeGoal && (
                        <div className="bg-slate-900/50 p-3 border border-slate-800 flex flex-col gap-2 shrink-0">
                            <div className="flex justify-between items-center text-slate-500 text-[10px] font-mono tracking-widest uppercase border-b border-slate-800 pb-1">
                                <span>Target: <span className="text-slate-300">{activeGoal.content}</span></span>
                                <span>{activeGoal.subGoals?.filter(sg => sg.isCompleted).length || 0}/{activeGoal.subGoals?.length || 0}</span>
                            </div>
                            
                            <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                                {(activeGoal.subGoals || []).map(sg => (
                                    <div key={sg.id} className="flex items-center gap-2 text-xs group px-2 py-1 hover:bg-slate-800 transition font-mono">
                                        <button 
                                            onClick={() => toggleSubGoal(activeGoal.id, sg.id)}
                                            className={`transition ${sg.isCompleted ? 'text-green-500' : 'text-slate-600 hover:text-white'}`}
                                        >
                                            {sg.isCompleted ? <CheckSquare size={12} /> : <Square size={12} />}
                                        </button>
                                        <span className={`flex-1 ${sg.isCompleted ? 'line-through text-slate-600' : 'text-slate-400'}`}>
                                            {sg.content}
                                        </span>
                                        <button 
                                            onClick={() => deleteSubGoal(activeGoal.id, sg.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition"
                                        >
                                            <X size={10} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <form 
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (modalSubInput.trim()) {
                                        addSubGoal(activeGoal.id, modalSubInput);
                                        setModalSubInput('');
                                    }
                                }}
                                className="flex gap-2 mt-1 border-t border-slate-800 pt-2"
                            >
                                <span className="text-slate-600 text-xs mt-1">{'>'}</span>
                                <input 
                                    type="text" 
                                    value={modalSubInput}
                                    onChange={(e) => setModalSubInput(e.target.value)}
                                    placeholder="Add sub-task..."
                                    className="flex-1 bg-transparent border-none text-xs text-slate-300 placeholder:text-slate-600 focus:outline-none"
                                />
                                <button type="submit" className="text-slate-500 hover:text-white transition">
                                    <Plus size={14} />
                                </button>
                            </form>
                        </div>
                    )}

                    <form onSubmit={handleLog} className="flex flex-col gap-4 flex-1">
                    <div className="relative group">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-50 group-focus-within:opacity-100 transition-opacity" />
                        <textarea
                            value={logInput}
                            onChange={(e) => setLogInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="LOG_ENTRY_CONTENT..."
                            className="bg-slate-950 p-4 border border-slate-700 text-slate-300 text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 w-full resize-none h-[150px] block"
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="text-[10px] text-slate-600 uppercase tracking-wider">
                            <span className="text-slate-400">Ctrl+Enter</span> to Save
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowLogInput(false)} className="text-slate-500 hover:text-white px-3 py-1 text-xs uppercase transition">Discard</button>
                            <button type="submit" className="bg-indigo-900/30 border border-indigo-500/50 text-indigo-400 px-4 py-1 hover:bg-indigo-900/50 font-bold text-xs uppercase transition shadow-[0_0_15px_rgba(99,102,241,0.2)]">Engrave</button>
                        </div>
                    </div>
                    </form>
                </div>
             </div>
          </div>
      )}

      {/* Bottom Section */}
      <div className="flex justify-between items-end pointer-events-auto">
        {/* Stone Pile (Completed Goals) - Refactored to Data Blocks */}
        <div className="flex flex-col gap-1 items-start">
            <div className="text-slate-600 text-[9px] uppercase tracking-widest mb-1 pl-1">Archives</div>
            <div className="flex flex-wrap gap-1 max-w-[300px] items-end">
                {completedGoals.map((g) => (
                    <div key={g.id} className="group relative" onClick={() => handleStoneClick(g)}>
                        {/* The Block */}
                        <div 
                            className="w-3 h-3 bg-slate-800 border border-slate-600 hover:bg-indigo-500 hover:border-indigo-400 transition cursor-pointer" 
                        />
                        {/* Custom Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-max max-w-[250px] bg-slate-950 text-slate-300 text-xs px-3 py-2 border border-slate-700 z-20 pointer-events-none shadow-xl font-mono">
                            <div className="font-bold mb-1 text-white">{g.content}</div>
                            {g.completedAt && (
                                <div className="text-slate-500 text-[9px]">{new Date(g.completedAt).toLocaleDateString()}</div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Daily Engrave Button (Only visible when modal closed) */}
        {!showLogInput && (
            <button 
                onClick={() => setShowLogInput(true)}
                className="group flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 px-4 py-2 border border-slate-700 text-slate-400 hover:text-white transition shadow-lg"
            >
                <Edit2 size={14} className="text-indigo-500" />
                <span className="text-xs font-bold uppercase tracking-widest">Log_Entry</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default UI;
