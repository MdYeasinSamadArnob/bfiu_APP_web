'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Info, Shield, Zap, Brain, Database, Edit, Save, X } from 'lucide-react';
import { UseCase } from '../data/useCases';
import HighlightableTextContent from './HighlightableText';

interface UseCaseCardProps {
  useCase: UseCase;
  onSave?: (updatedUseCase: UseCase) => void;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({ useCase, onSave }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<UseCase>(useCase);

  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Update edit form when useCase prop changes
  useEffect(() => {
    setEditForm(useCase);
  }, [useCase]);

  const speakSegment = (text: string, sectionName: string): Promise<void> => {
    return new Promise((resolve) => {
      if (isCancelledRef.current) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      
      utterance.onstart = () => {
        if (!isCancelledRef.current) {
            setActiveSection(sectionName);
            setCurrentCharIndex(0);
        }
      };
      
      utterance.onboundary = (event) => {
         if (!isCancelledRef.current && event.name === 'word') {
             setCurrentCharIndex(event.charIndex);
         }
      };
      
      utterance.onend = () => {
        resolve();
      };
      
      utterance.onerror = (e) => {
        if (e.error === 'interrupted' || e.error === 'canceled') {
            resolve();
        } else {
            console.error("Speech error", e);
            resolve();
        }
      };

      window.speechSynthesis.speak(utterance);
    });
  };

  const handleSpeak = async () => {
    if (!speechSupported) return;

    if (isSpeaking) {
      isCancelledRef.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setActiveSection(null);
      setCurrentCharIndex(0);
      return;
    }

    isCancelledRef.current = false;
    setIsSpeaking(true);
    window.speechSynthesis.cancel(); 

    try {
      // 1. Title
      await speakSegment(`Title: ${useCase.title}`, 'title');
      
      // 2. Metadata
      if (!isCancelledRef.current) {
          await speakSegment(`Section: ${useCase.section}. Type: ${useCase.type}. Risk: ${useCase.risk}.`, 'metadata');
      }

      // 3. Description
      if (!isCancelledRef.current) {
          await speakSegment(`Description: ${useCase.description}`, 'description');
      }

      // 4. Indicators
      if (!isCancelledRef.current && useCase.indicators.length > 0) {
          await speakSegment("Indicators", 'indicators-label');
          for (let i = 0; i < useCase.indicators.length; i++) {
              if (isCancelledRef.current) break;
              await speakSegment(useCase.indicators[i], `indicator-${i}`);
          }
      }
    } catch (e) {
      console.error("Speech sequence error", e);
    } finally {
      if (!isCancelledRef.current) {
          setIsSpeaking(false);
          setActiveSection(null);
          setCurrentCharIndex(0);
      }
    }
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editForm);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(useCase);
    setIsEditing(false);
  };

  const getRiskColor = (risk: string) => {
    const r = risk.toLowerCase();
    if (r.includes('high')) return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30';
    if (r.includes('med')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'Hard Logic') return <Zap className="w-3 h-3 mr-1" />;
    if (type === 'AI Agents') return <Brain className="w-3 h-3 mr-1" />;
    if (type === 'AI-RAG') return <Database className="w-3 h-3 mr-1" />;
    return <Info className="w-3 h-3 mr-1" />;
  };

  const getHighlightClass = (sectionName: string) => {
    return activeSection === sectionName || (activeSection?.startsWith('indicator-') && sectionName === 'indicators')
      ? 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 rounded-lg transition-all duration-300 bg-indigo-50/50 dark:bg-indigo-900/10' 
      : 'transition-all duration-300';
  };

  if (isEditing) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border-2 border-indigo-500 p-6 flex flex-col gap-4 h-full">
        <div className="flex justify-between items-center mb-2">
           <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">Edit Rule</h3>
           <span className="text-xs font-mono text-slate-400">{editForm.id}</span>
        </div>
        
        <div className="space-y-4 flex-grow">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title</label>
            <input 
              type="text" 
              value={editForm.title}
              onChange={(e) => setEditForm({...editForm, title: e.target.value})}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
             <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Section</label>
                <select 
                  value={editForm.section}
                  onChange={(e) => setEditForm({...editForm, section: e.target.value})}
                  className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option>General Banking</option>
                  <option>Credit</option>
                  <option>Trade</option>
                  <option>Remittance</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Type</label>
                <select 
                  value={editForm.type}
                  onChange={(e) => setEditForm({...editForm, type: e.target.value})}
                  className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option>Hard Logic</option>
                  <option>AI Agents</option>
                  <option>AI-RAG</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Risk</label>
                <select 
                  value={editForm.risk}
                  onChange={(e) => setEditForm({...editForm, risk: e.target.value})}
                  className="w-full px-2 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500"
                >
                  <option>High</option>
                  <option>Med</option>
                  <option>Low</option>
                </select>
             </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description</label>
            <textarea 
              value={editForm.description}
              onChange={(e) => setEditForm({...editForm, description: e.target.value})}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Indicators (one per line)</label>
            <textarea 
              value={editForm.indicators.join('\n')}
              onChange={(e) => setEditForm({...editForm, indicators: e.target.value.split('\n')})}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
           <button
             onClick={handleCancel}
             className="px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-sm font-medium flex items-center gap-1"
           >
             <X className="w-4 h-4" /> Cancel
           </button>
           <button
             onClick={handleSave}
             className="px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-sm font-medium flex items-center gap-1 shadow-sm"
           >
             <Save className="w-4 h-4" /> Save
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-full group ${isSpeaking ? 'ring-2 ring-indigo-400' : ''}`}>
      <div className="p-6 flex-grow relative">
        <div className="flex justify-between items-start mb-4 gap-2">
          <div className="flex-1">
             <div className={`flex flex-wrap gap-2 mb-2 p-1 -m-1 rounded ${getHighlightClass('metadata')}`}>
                <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getRiskColor(useCase.risk)}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {useCase.risk}
                </span>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                  {getTypeIcon(useCase.type)}
                  {useCase.type}
                </span>
             </div>
            <h3 className={`text-lg font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors p-1 -m-1 rounded ${getHighlightClass('title')}`}>
              <HighlightableTextContent 
                text={useCase.title}
                isActive={activeSection === 'title'}
                currentGlobalIndex={currentCharIndex}
                prefixLength={7} // "Title: "
              />
            </h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700 whitespace-nowrap">
              {useCase.id}
            </span>
            <button
                onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Edit Rule"
            >
                <Edit className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className={`mb-6 p-1 -m-1 rounded ${getHighlightClass('description')}`}>
            <p className={`text-slate-600 dark:text-slate-300 text-sm leading-relaxed transition-all ${isExpanded ? '' : 'line-clamp-4'}`}>
                <HighlightableTextContent 
                    text={useCase.description}
                    isActive={activeSection === 'description'}
                    currentGlobalIndex={currentCharIndex}
                    prefixLength={13} // "Description: "
                />
            </p>
            {useCase.description.length > 150 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 focus:outline-none flex items-center"
                >
                    {isExpanded ? 'Show Less' : 'Read More'}
                </button>
            )}
        </div>

        {useCase.indicators.length > 0 && (
          <div className={`mb-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800 ${activeSection === 'indicators-label' ? 'ring-2 ring-indigo-500/50' : ''}`}>
            <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center">
              <Info className="w-3 h-3 mr-1" /> Indicators / Logic
            </h4>
            <ul className="space-y-1">
              {useCase.indicators.map((indicator, index) => (
                <li key={index} className={`text-sm text-slate-700 dark:text-slate-300 pl-2 border-l-2 ${activeSection === `indicator-${index}` ? 'border-indigo-500 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-r' : 'border-indigo-200 dark:border-indigo-900'} transition-all duration-200`}>
                  <HighlightableTextContent 
                    text={indicator}
                    isActive={activeSection === `indicator-${index}`}
                    currentGlobalIndex={currentCharIndex}
                    prefixLength={0} // No prefix for individual indicators
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            {useCase.section}
        </span>
        
        {speechSupported && (
          <button
            onClick={handleSpeak}
            className={`p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isSpeaking
                ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400'
            }`}
            title={isSpeaking ? "Stop reading" : "Read aloud"}
          >
            {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default UseCaseCard;
