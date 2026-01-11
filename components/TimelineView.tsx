'use client';

import { useState, useEffect } from 'react';
import { TimelinePhase, timelineData as initialTimelineData } from '../data/timelineData';
import { Calendar, Clock, Target, CheckCircle2, Flag, ChevronDown, ChevronUp, AlertCircle, Edit, GripVertical, Plus, Trash2, Save, X } from 'lucide-react';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TimelineCardProps {
    phase: TimelinePhase;
    isExpanded: boolean;
    onClick: () => void;
    onSave: (phase: TimelinePhase) => void;
    onDelete?: (id: string) => void;
}

function TimelineCard({ phase, isExpanded, onClick, onSave, onDelete }: TimelineCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedPhase, setEditedPhase] = useState(phase);

    // Update local state when prop changes
    useEffect(() => {
        setEditedPhase(phase);
    }, [phase]);

    const handleSaveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSave(editedPhase);
        setIsEditing(false);
    };

    const handleCancelClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditedPhase(phase);
        setIsEditing(false);
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditing(true);
        if (!isExpanded) {
            onClick(); // Expand if not already
        }
    };

    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this phase?')) {
            onDelete?.(phase.id);
        }
    };

    const handleChange = (field: keyof TimelinePhase, value: string | string[]) => {
        setEditedPhase(prev => ({ ...prev, [field]: value }));
    };

    const handleDeliverableChange = (index: number, value: string) => {
        const newDeliverables = [...editedPhase.deliverables];
        newDeliverables[index] = value;
        setEditedPhase(prev => ({ ...prev, deliverables: newDeliverables }));
    };

    if (isEditing) {
        return (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-l-4 border-indigo-500 cursor-default" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-4">
                    <input 
                        className="w-full text-lg font-bold p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                        value={editedPhase.title}
                        onChange={(e) => handleChange('title', e.target.value)}
                        placeholder="Phase Title"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                            className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            value={editedPhase.duration}
                            onChange={(e) => handleChange('duration', e.target.value)}
                            placeholder="Duration (e.g. 1 month)"
                        />
                        <input 
                            className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            value={editedPhase.dates}
                            onChange={(e) => handleChange('dates', e.target.value)}
                            placeholder="Dates"
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                         <div className="flex flex-col space-y-1">
                            <label className="text-xs font-semibold uppercase text-slate-500">Status</label>
                            <select
                                className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                                value={editedPhase.status}
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                <option value="planned">Planned</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <div className="flex flex-col space-y-1">
                             <label className="text-xs font-semibold uppercase text-slate-500">Milestone</label>
                             <input
                                className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                                value={editedPhase.milestone || ''}
                                onChange={(e) => handleChange('milestone', e.target.value)}
                                placeholder="Milestone (optional)"
                            />
                        </div>
                        <div className="flex flex-col space-y-1">
                             <label className="text-xs font-semibold uppercase text-slate-500">Holiday</label>
                             <input
                                className="p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                                value={editedPhase.holiday || ''}
                                onChange={(e) => handleChange('holiday', e.target.value)}
                                placeholder="Holiday (optional)"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold">Focus Area</label>
                        <textarea 
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            value={editedPhase.focus}
                            onChange={(e) => handleChange('focus', e.target.value)}
                            placeholder="Focus Area"
                        />
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Deliverables</label>
                        {editedPhase.deliverables.map((del, idx) => (
                            <div key={idx} className="flex gap-2">
                                <input 
                                    className="flex-1 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 text-sm"
                                    value={del}
                                    onChange={(e) => handleDeliverableChange(idx, e.target.value)}
                                />
                                <button 
                                    onClick={() => {
                                        const newDeliverables = editedPhase.deliverables.filter((_, i) => i !== idx);
                                        setEditedPhase(prev => ({ ...prev, deliverables: newDeliverables }));
                                    }}
                                    className="text-red-500 hover:text-red-700"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        <button 
                            onClick={() => setEditedPhase(prev => ({ ...prev, deliverables: [...prev.deliverables, "New Deliverable"] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            + Add Deliverable
                        </button>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold">Testing Criteria</label>
                        <textarea 
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            value={editedPhase.testing}
                            onChange={(e) => handleChange('testing', e.target.value)}
                            placeholder="Testing goals..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-semibold">Notes</label>
                        <textarea 
                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600"
                            value={editedPhase.notes}
                            onChange={(e) => handleChange('notes', e.target.value)}
                            placeholder="Internal notes..."
                        />
                    </div>

                    <div className="flex justify-end space-x-2 mt-4">
                        <button onClick={handleCancelClick} className="px-3 py-1 text-slate-600 hover:bg-slate-100 rounded flex items-center">
                            <X className="w-4 h-4 mr-1" /> Cancel
                        </button>
                        <button onClick={handleSaveClick} className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded flex items-center">
                            <Save className="w-4 h-4 mr-1" /> Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className={`bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md border-l-4 transition-all duration-300 hover:shadow-lg cursor-pointer group ${isExpanded ? 'border-indigo-500 scale-105 z-10 ring-1 ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
            onClick={onClick}
        >
            <div className="flex justify-between items-start mb-3">
                <h3 className={`text-xl font-bold ${isExpanded ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {phase.title}
                </h3>
                <div className="flex items-center space-x-2">
                    {/* Edit/Delete buttons visible on hover or when expanded */}
                    <div className={`flex space-x-1 ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                        <button onClick={handleEditClick} className="p-1 text-slate-400 hover:text-indigo-600 rounded">
                            <Edit className="w-4 h-4" />
                        </button>
                        {onDelete && (
                            <button onClick={handleDeleteClick} className="p-1 text-slate-400 hover:text-red-600 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-500" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
            </div>

            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400 mb-4 space-x-4">
                <span className="flex items-center"><Clock className="w-4 h-4 mr-1" /> {phase.duration}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium uppercase ${
                    phase.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    phase.status === 'in-progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                }`}>
                    {phase.status}
                </span>
            </div>

            <div className="mb-4">
                <div className="flex items-start mb-2">
                    <Target className="w-5 h-5 text-indigo-500 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-700 dark:text-slate-300 italic">{phase.focus}</p>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center">
                            <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Key Deliverables
                        </h4>
                        <ul className="space-y-2 pl-6">
                            {phase.deliverables.map((item, idx) => (
                                <li key={idx} className="text-slate-600 dark:text-slate-300 text-sm list-disc marker:text-indigo-300">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg text-sm">
                        <div className="flex items-start mb-2">
                            <Flag className="w-4 h-4 text-orange-500 mr-2 mt-0.5" />
                            <span className="font-semibold text-slate-700 dark:text-slate-200">Testing Goal:</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 pl-6">{phase.testing}</p>
                    </div>

                    {phase.notes && (
                        <div className="text-xs text-slate-400 italic pl-1 border-l-2 border-slate-300 dark:border-slate-600">
                            {phase.notes}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TimelineDate({ phase, align, className }: { phase: TimelinePhase, align: 'left' | 'right', className?: string }) {
    return (
        <div className={`flex flex-col justify-center ${align === 'right' ? 'items-start pl-8' : 'items-end pr-8'} ${className}`}>
            <div className="flex items-center text-indigo-600 dark:text-indigo-400 font-bold text-lg mb-1">
                <Calendar className="w-5 h-5 mr-2" />
                {phase.dates}
            </div>
            {phase.milestone && (
                <div className={`flex items-center text-sm font-medium text-amber-600 dark:text-amber-500 mt-2 ${align === 'right' ? 'text-left' : 'text-right'}`}>
                    {align === 'right' && <Flag className="w-4 h-4 mr-1 flex-shrink-0" />}
                    <span>{phase.milestone}</span>
                    {align === 'left' && <Flag className="w-4 h-4 ml-1 flex-shrink-0" />}
                </div>
            )}
            {phase.holiday && (
                <div className={`flex items-center text-xs text-rose-500 dark:text-rose-400 mt-1 ${align === 'right' ? 'text-left' : 'text-right'}`}>
                    {align === 'right' && <AlertCircle className="w-3 h-3 mr-1 flex-shrink-0" />}
                    <span>{phase.holiday}</span>
                    {align === 'left' && <AlertCircle className="w-3 h-3 ml-1 flex-shrink-0" />}
                </div>
            )}
        </div>
    );
}

interface SortableItemProps {
  phase: TimelinePhase;
  index: number;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onSave: (phase: TimelinePhase) => void;
  onDelete: (id: string) => void;
}

function SortableTimelineItem({ phase, index, isExpanded, onToggle, onSave, onDelete }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: phase.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isEven = index % 2 === 0;

  return (
    <div ref={setNodeRef} style={style} className="relative flex flex-col md:flex-row items-start md:items-center justify-between mb-12">
        
        {/* Drag Handle */}
        <div className="absolute -left-10 md:left-[50%] md:-ml-12 top-0 z-20 cursor-grab opacity-50 hover:opacity-100 p-2 touch-none" {...attributes} {...listeners}>
            <GripVertical className="w-5 h-5 text-slate-400 hover:text-indigo-600" />
        </div>

        {/* Left Side */}
        <div className={`md:w-[45%] mb-4 md:mb-0 ${isEven ? 'order-2 md:order-1' : 'order-2 md:order-3'}`}>
        {isEven ? (
            <TimelineCard phase={phase} isExpanded={isExpanded} onClick={() => onToggle(phase.id)} onSave={onSave} onDelete={onDelete} />
        ) : (
            <TimelineDate phase={phase} align="right" />
        )}
        </div>

        {/* Center Node */}
        <div className="absolute left-6 md:left-1/2 -translate-x-1/2 flex items-center justify-center z-10 order-1 md:order-2 h-full top-0 pointer-events-none">
            <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-lg transition-colors duration-300 bg-white dark:bg-slate-900 ${isExpanded ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                <span className="text-sm font-bold">{index + 1}</span>
            </div>
        </div>

        {/* Right Side */}
        <div className={`pl-16 md:pl-0 md:w-[45%] ${isEven ? 'order-3 md:order-3' : 'order-3 md:order-1'}`}>
        {isEven ? (
            <div className="md:hidden">
                <TimelineDate phase={phase} align="left" className="hidden md:block" />
            </div>
        ) : (
            <TimelineCard phase={phase} isExpanded={isExpanded} onClick={() => onToggle(phase.id)} onSave={onSave} onDelete={onDelete} />
        )}
        {isEven && <TimelineDate phase={phase} align="left" className="hidden md:block" />}
        </div>
    </div>
  );
}

export default function TimelineView() {
  const [timelineData, setTimelineData] = useState<TimelinePhase[]>(initialTimelineData);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetch('/api/timeline')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            setTimelineData(data);
        }
      })
      .catch(err => console.error('Failed to load timeline:', err));
  }, []);

  const saveTimeline = async (newData: TimelinePhase[]) => {
    setTimelineData(newData);
    try {
        await fetch('/api/timeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newData)
        });
    } catch (err) {
        console.error('Failed to save timeline:', err);
        alert('Failed to save changes.');
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = timelineData.findIndex((item) => item.id === active.id);
      const newIndex = timelineData.findIndex((item) => item.id === over?.id);
      
      const newOrder = arrayMove(timelineData, oldIndex, newIndex);
      saveTimeline(newOrder);
    }
  };

  const handleSavePhase = async (updatedPhase: TimelinePhase) => {
    const newData = timelineData.map(p => p.id === updatedPhase.id ? updatedPhase : p);
    saveTimeline(newData);
  };

  const handleDeletePhase = async (id: string) => {
    const newData = timelineData.filter(p => p.id !== id);
    saveTimeline(newData);
    if (expandedPhase === id) setExpandedPhase(null);
  };

  const handleAddPhase = () => {
    const newPhase: TimelinePhase = {
        id: `phase-${Date.now()}`,
        title: "New Phase",
        duration: "1 month",
        dates: "TBD",
        focus: "Define focus area...",
        deliverables: ["Deliverable 1"],
        testing: "Define testing criteria...",
        notes: "Add notes...",
        status: "planned"
    };
    saveTimeline([...timelineData, newPhase]);
    setExpandedPhase(newPhase.id); // Auto expand new phase
  };

  const togglePhase = (id: string) => {
    if (expandedPhase === id) {
      setExpandedPhase(null);
    } else {
      setExpandedPhase(id);
    }
  };

  const totalMonths = timelineData.reduce((acc, phase) => {
    const durationMatch = phase.duration.match(/([\d.]+)/);
    if (durationMatch) {
        return acc + parseFloat(durationMatch[1]);
    }
    return acc;
  }, 0);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Implementation Roadmap
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          A strategic {totalMonths > 0 ? totalMonths : 7}-month iterative plan delivering rapid value with early MVP milestones, 
          culminating in full ERA AML Guardian coverage.
        </p>
        
        <button 
            onClick={handleAddPhase}
            className="mt-4 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm font-medium"
        >
            <Plus className="w-4 h-4 mr-2" />
            Add Phase
        </button>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-200 dark:from-indigo-900 dark:via-indigo-700 dark:to-indigo-900 md:-translate-x-1/2" />

        <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext 
                items={timelineData.map(p => p.id)}
                strategy={verticalListSortingStrategy}
            >
                <div className="space-y-0">
                {timelineData.map((phase, index) => (
                    <SortableTimelineItem 
                        key={phase.id} 
                        phase={phase} 
                        index={index} 
                        isExpanded={expandedPhase === phase.id}
                        onToggle={togglePhase}
                        onSave={handleSavePhase}
                        onDelete={handleDeletePhase}
                    />
                ))}
                </div>
            </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
