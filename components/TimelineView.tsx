'use client';

import { useState, useEffect, useCallback } from 'react';
import { TimelinePhase, timelineData as initialTimelineData } from '../data/timelineData';
import { Calendar, Clock, Target, CheckCircle2, Flag, ChevronDown, ChevronUp, AlertCircle, Edit, Moon, History, Archive, Trash2, Plus } from 'lucide-react';

export default function TimelineView() {
  const [timelineData, setTimelineData] = useState<TimelinePhase[]>(initialTimelineData);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  
  // Versioning State
  const [versions, setVersions] = useState<{id: string, name: string, createdAt: string}[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  const [showRenameVersionModal, setShowRenameVersionModal] = useState(false);
  const [renameVersionName, setRenameVersionName] = useState('');
  const [versionToRename, setVersionToRename] = useState<string | null>(null);

  const loadVersions = useCallback(() => {
      fetch('/api/timeline?action=list_versions')
          .then(res => res.json())
          .then(data => {
              if (Array.isArray(data)) {
                  setVersions(data);
              }
          })
          .catch(err => console.error('Failed to load versions:', err));
  }, []);

  const loadTimeline = useCallback((versionId: string | null) => {
    // Add timestamp to prevent caching
    const timestamp = Date.now();
    const url = versionId 
        ? `/api/timeline?versionId=${versionId}&t=${timestamp}`
        : `/api/timeline?t=${timestamp}`;

    fetch(url, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            setTimelineData(data);
        } else {
             // Fallback or empty state
             if (!versionId) setTimelineData(initialTimelineData);
        }
      })
      .catch(err => {
          console.error('Failed to load timeline:', err);
          if (!versionId) setTimelineData(initialTimelineData);
      });
  }, []);

  useEffect(() => {
    loadTimeline(currentVersionId);
    loadVersions();
  }, [currentVersionId, loadTimeline, loadVersions]);

  const handleSavePhase = async (updatedPhase: TimelinePhase) => {
    if (currentVersionId) {
        alert("You are viewing a historical version. Switch to 'Live Version' to make changes.");
        return;
    }

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

  const saveNewVersion = useCallback(async () => {
      if (!newVersionName.trim()) return;
      
      try {
          const res = await fetch('/api/timeline?action=create_version', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newVersionName }),
          });
          
          if (res.ok) {
              alert(`Version "${newVersionName}" saved successfully!`);
              setNewVersionName('');
              setShowSaveVersionModal(false);
              loadVersions();
          } else {
              alert('Failed to save version.');
          }
      } catch (err) {
          console.error(err);
          alert('Error saving version.');
      }
  }, [newVersionName, loadVersions]);

  const renameVersion = useCallback(async () => {
    if (!renameVersionName.trim() || !versionToRename) return;
    
    try {
        const res = await fetch('/api/timeline?action=rename_version', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: versionToRename, name: renameVersionName }),
        });
        
        if (res.ok) {
            alert(`Version renamed successfully!`);
            setShowRenameVersionModal(false);
            setRenameVersionName('');
            setVersionToRename(null);
            loadVersions();
        } else {
            alert('Failed to rename version.');
        }
    } catch (err) {
        console.error(err);
        alert('Error renaming version.');
    }
  }, [renameVersionName, versionToRename, loadVersions]);

  const deleteVersion = useCallback(async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this version?')) return;
      
      try {
          await fetch('/api/timeline?action=delete_version', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id }),
          });
          loadVersions();
          if (currentVersionId === id) {
              setCurrentVersionId(null); // Switch back to live
          }
      } catch (err) {
          console.error(err);
      }
  }, [loadVersions, currentVersionId]);

  const restoreVersion = useCallback(async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to restore version "${name}" as the LIVE version? This will overwrite the current live state.`)) return;

    try {
        await fetch('/api/timeline?action=restore_version', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        
        alert(`Version "${name}" is now LIVE!`);
        
        // Force state update sequence
        setCurrentVersionId(null); 
        setShowVersionMenu(false);
        
        // Small delay to ensure file system sync before reload
        setTimeout(() => {
            loadVersions();
            loadTimeline(null); 
        }, 100);
    } catch (err) {
        console.error(err);
        alert('Failed to restore version.');
    }
  }, [loadVersions, loadTimeline]);

  const togglePhase = (id: string) => {
    if (expandedPhase === id) {
      setExpandedPhase(null);
    } else {
      setExpandedPhase(id);
    }
  };

  const calculateTotalDuration = (data: TimelinePhase[]) => {
      let totalMonths = 0;
      data.forEach(phase => {
          const durationStr = phase.duration.toLowerCase();
          if (durationStr.includes('month')) {
              const months = parseFloat(durationStr.replace(/[^0-9.]/g, ''));
              if (!isNaN(months)) totalMonths += months;
          }
      });
      return totalMonths > 0 ? totalMonths : 0;
  };

  const totalDuration = calculateTotalDuration(timelineData);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Version Control Header */}
      <div className="flex justify-end mb-4 gap-2">
            <div className="relative">
                <button
                    onClick={() => setShowVersionMenu(!showVersionMenu)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-xs font-medium ${
                        currentVersionId 
                        ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                >
                    <History className="w-3 h-3" />
                    {currentVersionId ? versions.find(v => v.id === currentVersionId)?.name || 'Unknown Version' : 'Live Version'}
                </button>
                
                {showVersionMenu && (
                    <div className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
                        <button
                            onClick={() => { setCurrentVersionId(null); setShowVersionMenu(false); }}
                            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${!currentVersionId ? 'text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-700 dark:text-slate-300'}`}
                        >
                            <span>Live Version</span>
                            {!currentVersionId && <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
                        </button>
                        
                        <div className="my-1 border-t border-slate-100 dark:border-slate-700"></div>
                        
                        <div className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Saved Versions
                        </div>
                        
                        {versions.length === 0 && (
                            <div className="px-4 py-2 text-sm text-slate-400 italic">No saved versions</div>
                        )}
                        
                        {versions.map(v => (
                            <div key={v.id} className="group relative">
                                <button
                                    onClick={() => { setCurrentVersionId(v.id); setShowVersionMenu(false); }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 ${currentVersionId === v.id ? 'text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/20' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    <div className="flex flex-col">
                                        <span>{v.name}</span>
                                        <span className="text-[10px] text-slate-400">{new Date(v.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {currentVersionId === v.id && <div className="w-2 h-2 rounded-full bg-amber-500"></div>}
                                </button>
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setVersionToRename(v.id); setRenameVersionName(v.name); setShowRenameVersionModal(true); setShowVersionMenu(false); }}
                                        className="p-1.5 rounded text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                                        title="Rename Version"
                                    >
                                        <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => restoreVersion(e, v.id, v.name)}
                                        className="p-1.5 rounded text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                                        title="Make Live (Restore)"
                                    >
                                        <Archive className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={(e) => deleteVersion(e, v.id)}
                                        className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        title="Delete Version"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!currentVersionId && (
                <button
                    onClick={() => setShowSaveVersionModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                >
                    <Plus className="w-3 h-3" />
                    Save Version
                </button>
            )}
      </div>

      <div className="text-center mb-16 space-y-4">
        <h2 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          {currentVersionId ? versions.find(v => v.id === currentVersionId)?.name : 'Implementation Roadmap'}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed">
            {timelineData.length > 0 ? (
               `A strategic ${totalDuration > 0 ? `${totalDuration}-month` : ''} ${timelineData.length}-phase plan delivering rapid value, culminating in full system coverage.`
            ) : (
               "A strategic iterative plan delivering rapid value with early MVP milestones."
            )}
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
      
      {/* Save Version Modal */}
      {showSaveVersionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 w-96 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Save Timeline Version</h3>
                  <input
                      type="text"
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      placeholder="Version Name (e.g., v1.0 MVP)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                      autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button
                          onClick={() => setShowSaveVersionModal(false)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={saveNewVersion}
                          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                      >
                          Save
                      </button>
                  </div>
              </div>
          </div>
      )}
      {/* Rename Version Modal */}
      {showRenameVersionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 w-96 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Rename Version</h3>
                  <input
                      type="text"
                      value={renameVersionName}
                      onChange={(e) => setRenameVersionName(e.target.value)}
                      placeholder="New Version Name"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none mb-4"
                      autoFocus
                  />
                  <div className="flex justify-end gap-2">
                      <button
                          onClick={() => setShowRenameVersionModal(false)}
                          className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 rounded-lg"
                      >
                          Cancel
                      </button>
                      <button
                          onClick={renameVersion}
                          className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg"
                      >
                          Save
                      </button>
                  </div>
              </div>
          </div>
      )}
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
