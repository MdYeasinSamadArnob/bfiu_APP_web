'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, Square, Info, Shield, Zap, Brain, Database } from 'lucide-react';
import { UseCase } from '../data/useCases';
import HighlightableTextContent from './HighlightableText';

interface UseCaseCardProps {
  useCase: UseCase;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({ useCase }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [currentCharIndex, setCurrentCharIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechSupported(true);
    }
    return () => {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakSegment = (text: string, sectionName: string): Promise<void> => {
    return new Promise((resolve, reject) => {
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
      // Spoken: "Title: [Title]"
      // Prefix length: 7 ("Title: ".length)
      await speakSegment(`Title: ${useCase.title}`, 'title');
      
      // 2. Metadata (Section, Type, Risk)
      // We don't do word highlighting here as it's multiple fields, just block highlight
      if (!isCancelledRef.current) {
          await speakSegment(`Section: ${useCase.section}. Type: ${useCase.type}. Risk: ${useCase.risk}.`, 'metadata');
      }

      // 3. Description
      // Spoken: "Description: [Description]"
      // Prefix length: 13 ("Description: ".length)
      if (!isCancelledRef.current) {
          await speakSegment(`Description: ${useCase.description}`, 'description');
      }

      // 4. Indicators
      // Spoken: "Indicators: [ind1]. [ind2]..."
      // Prefix length: 12 ("Indicators: ".length)
      // Note: If we speak all indicators as one block, highlighting becomes tricky across list items.
      // Better strategy: Speak "Indicators" label, then speak each indicator individually.
      
      if (!isCancelledRef.current && useCase.indicators.length > 0) {
          // Speak label first
          await speakSegment("Indicators", 'indicators-label');
          
          // Speak each indicator
          for (let i = 0; i < useCase.indicators.length; i++) {
              if (isCancelledRef.current) break;
              // Speak without prefix for cleaner mapping
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

  const getRiskColor = (risk: string) => {
    const r = risk.toLowerCase();
    if (r.includes('high')) return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30';
    if (r.includes('med')) return 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
    return 'text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/30';
  };

  const getTypeIcon = (type: string) => {
    if (type === 'Hard Logic') return <Zap className="w-3 h-3 mr-1" />;
    if (type === 'AI-General') return <Brain className="w-3 h-3 mr-1" />;
    if (type === 'AI-RAG') return <Database className="w-3 h-3 mr-1" />;
    return <Info className="w-3 h-3 mr-1" />;
  };

  const getHighlightClass = (sectionName: string) => {
    // Keep section highlight but make it subtler since we have word highlight
    return activeSection === sectionName || (activeSection?.startsWith('indicator-') && sectionName === 'indicators')
      ? 'ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 rounded-lg transition-all duration-300 bg-indigo-50/50 dark:bg-indigo-900/10' 
      : 'transition-all duration-300';
  };

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
          <span className="text-xs font-mono text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-100 dark:border-slate-700 whitespace-nowrap">
            {useCase.id}
          </span>
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
