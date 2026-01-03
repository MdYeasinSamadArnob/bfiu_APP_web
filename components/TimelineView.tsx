'use client';

import { useState, useEffect } from 'react';
import { TimelinePhase, timelineData as initialTimelineData } from '../data/timelineData';
import { Calendar, Clock, Target, CheckCircle2, Flag, ChevronDown, ChevronUp, AlertCircle, Edit, Moon } from 'lucide-react';

export default function TimelineView() {
  const [timelineData, setTimelineData] = useState<TimelinePhase[]>(initialTimelineData);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

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

  const handleSavePhase = async (updatedPhase: TimelinePhase) => {
    const newData = timelineData.map(p => p.id === updatedPhase.id ? updatedPhase : p);
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

  const togglePhase = (id: string) => {
    if (expandedPhase === id) {
      setExpandedPhase(null);
    } else {
      setExpandedPhase(id);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Implementation Roadmap
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
          A strategic 7-month iterative plan delivering rapid value with early MVP milestones, 
          culminating in full ERA AML Guardian coverage by July 2026.
        </p>
      </div>

      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-400 to-indigo-200 dark:from-indigo-900 dark:via-indigo-700 dark:to-indigo-900 md:-translate-x-1/2" />

        <div className="space-y-12">
          {timelineData.map((phase, index) => {
             const isEven = index % 2 === 0;
             const isExpanded = expandedPhase === phase.id;

             return (
               <div key={phase.id} className="relative flex flex-col md:flex-row items-start md:items-center justify-between">
                 
                 {/* Left Side (Card if Even, Date if Odd) */}
                 <div className={`md:w-[45%] mb-4 md:mb-0 ${isEven ? 'order-2 md:order-1' : 'order-2 md:order-3'}`}>
                   {isEven ? (
                     <TimelineCard phase={phase} isExpanded={isExpanded} onClick={() => togglePhase(phase.id)} onSave={handleSavePhase} />
                   ) : (
                     <TimelineDate phase={phase} align="right" />
                   )}
                 </div>

                 {/* Center Node */}
                 <div className="absolute left-6 md:left-1/2 -translate-x-1/2 flex items-center justify-center z-10 order-1 md:order-2 h-full top-0">
                    <div className={`w-12 h-12 rounded-full border-4 flex items-center justify-center shadow-lg transition-colors duration-300 bg-white dark:bg-slate-900 ${isExpanded ? 'border-indigo-600 text-indigo-600' : 'border-slate-300 dark:border-slate-700 text-slate-500'}`}>
                        <span className="text-sm font-bold">{index + 1}</span>
                    </div>
                 </div>

                 {/* Right Side (Date if Even, Card if Odd) */}
                 <div className={`pl-16 md:pl-0 md:w-[45%] ${isEven ? 'order-3 md:order-3' : 'order-3 md:order-1'}`}>
                   {isEven ? (
                      <div className="md:hidden">
                          <TimelineDate phase={phase} align="left" className="hidden md:block" />
                      </div>
                   ) : (
                      <TimelineCard phase={phase} isExpanded={isExpanded} onClick={() => togglePhase(phase.id)} onSave={handleSavePhase} />
                   )}
                   {isEven && <TimelineDate phase={phase} align="left" className="hidden md:block" />}
                 </div>
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineCard({ phase, isExpanded, onClick, onSave }: { phase: TimelinePhase, isExpanded: boolean, onClick: () => void, onSave: (p: TimelinePhase) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<TimelinePhase>(phase);

  useEffect(() => {
    setEditForm(phase);
  }, [phase]);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave(editForm);
    setIsEditing(false);
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditForm(phase);
    setIsEditing(false);
  };

  if (isEditing) {
      return (
        <div className="ml-16 md:ml-0 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border-2 border-indigo-500 overflow-hidden p-4 cursor-default">
            <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                    <input 
                        value={editForm.title}
                        onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                        className="w-full px-2 py-1.5 text-sm border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Duration</label>
                        <input 
                            value={editForm.duration}
                            onChange={(e) => setEditForm({...editForm, duration: e.target.value})}
                            className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Dates</label>
                        <input 
                            value={editForm.dates}
                            onChange={(e) => setEditForm({...editForm, dates: e.target.value})}
                            className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Holiday / Break</label>
                    <input 
                        value={editForm.holiday || ''}
                        onChange={(e) => setEditForm({...editForm, holiday: e.target.value})}
                        placeholder="e.g. Eid al-Fitr Break (~Mar 19-23)"
                        className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                    <select 
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value as TimelinePhase['status']})}
                        className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                    >
                        <option value="planned">Planned</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Focus</label>
                    <textarea 
                        value={editForm.focus}
                        onChange={(e) => setEditForm({...editForm, focus: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        rows={2}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Deliverables (one per line)</label>
                    <textarea 
                        value={editForm.deliverables.join('\n')}
                        onChange={(e) => setEditForm({...editForm, deliverables: e.target.value.split('\n')})}
                        className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        rows={3}
                    />
                </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Testing & QA</label>
                    <textarea 
                        value={editForm.testing}
                        onChange={(e) => setEditForm({...editForm, testing: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        rows={2}
                    />
                </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                    <textarea 
                        value={editForm.notes}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        className="w-full px-2 py-1.5 text-xs border rounded bg-slate-50 dark:bg-slate-800 dark:border-slate-700"
                        rows={2}
                    />
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                    <button
                        onClick={handleCancel}
                        className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-3 py-1.5 rounded text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div 
      className={`ml-16 md:ml-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group ${isExpanded ? 'ring-2 ring-indigo-500/50 shadow-lg' : ''}`}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
              <span className="md:hidden flex items-center gap-1">
                <Calendar className="w-3 h-3"/> 
                {phase.dates}
                {phase.holiday && <Moon className="w-3 h-3 text-amber-500 ml-1" />}
              </span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20">{phase.duration}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
              {phase.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {phase.focus}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button className={`p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`}>
                {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
            </button>
            <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Edit Phase"
            >
                <Edit className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${phase.status === 'completed' ? 'bg-green-500' : phase.status === 'in-progress' ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          <span className="text-xs font-medium text-slate-500 uppercase">{phase.status}</span>
        </div>
      </div>

      {/* Expanded Details */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-6">
            
            {/* Deliverables Section */}
            <div className="pt-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-200 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Key Deliverables
              </h4>
              <ul className="space-y-2">
                {phase.deliverables.map((item: string, i: number) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Testing Section */}
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-200 mb-3">
                <Target className="w-4 h-4 text-rose-500" />
                Testing & QA
              </h4>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 shadow-sm">
                {phase.testing}
              </div>
            </div>

            {/* Notes & Milestone */}
            {(phase.notes || phase.milestone) && (
              <div className="space-y-3">
                {phase.notes && (
                  <div className="flex gap-2 text-sm text-slate-500 italic bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-900/20">
                    <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <p>{phase.notes}</p>
                  </div>
                )}
                
                {phase.milestone && (
                  <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200 dark:border-amber-900/20 text-amber-800 dark:text-amber-200 text-sm font-semibold">
                    <Flag className="w-5 h-5 fill-amber-500 text-amber-600" />
                    {phase.milestone}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineDate({ phase, align = 'left', className = '' }: { phase: TimelinePhase, align?: 'left' | 'right', className?: string }) {
  return (
    <div className={`hidden md:flex flex-col justify-center h-full ${align === 'right' ? 'items-end text-right pr-8' : 'items-start text-left pl-8'} ${className}`}>
      <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
        {align === 'right' && <span>{phase.dates}</span>}
        <Calendar className="w-5 h-5" />
        {align === 'left' && <span>{phase.dates}</span>}
        {phase.holiday && (
          <div className="relative group cursor-help ml-1">
            <Moon className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-slate-800 text-white text-xs rounded-lg py-1.5 px-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-lg z-20">
              {phase.holiday}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm font-medium">
        <Clock className="w-4 h-4" />
        <span>{phase.duration}</span>
      </div>
    </div>
  );
}
