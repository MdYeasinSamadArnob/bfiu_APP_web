'use client';

import { useState } from 'react';
import { timelineData } from '../data/timelineData';
import { Calendar, Clock, Target, CheckCircle2, Flag, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export default function TimelineView() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

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
                     <TimelineCard phase={phase} isExpanded={isExpanded} onClick={() => togglePhase(phase.id)} />
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
                          {/* Mobile: Date is already shown inside card or we can hide this duplicative date logic if card handles it. 
                              Actually, let's keep the structure clean. 
                              On mobile, we want: Node (left) - Content (right). 
                              The "Date" component is mostly for Desktop visual balance.
                              I'll hide the separate Date component on mobile and put date inside Card.
                          */}
                          <TimelineDate phase={phase} align="left" className="hidden md:block" />
                      </div>
                   ) : (
                      <TimelineCard phase={phase} isExpanded={isExpanded} onClick={() => togglePhase(phase.id)} />
                   )}
                   {isEven && <TimelineDate phase={phase} align="left" className="hidden md:block" />}
                 </div>

                 {/* Mobile Date Adjustment: Since we used absolute positioning for node, the flow is tricky.
                     Let's adjust for mobile:
                     The "Node" is absolute at left-6.
                     The Content is pushed with pl-16.
                     The "Date" logic above was for desktop columns.
                 */}
               </div>
             );
          })}
        </div>
      </div>
    </div>
  );
}

function TimelineCard({ phase, isExpanded, onClick }: { phase: any, isExpanded: boolean, onClick: () => void }) {
  return (
    <div 
      className={`ml-16 md:ml-0 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-xl cursor-pointer group ${isExpanded ? 'ring-2 ring-indigo-500/50 shadow-lg' : ''}`}
      onClick={onClick}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2">
              <span className="md:hidden flex items-center gap-1"><Calendar className="w-3 h-3"/> {phase.dates}</span>
              <span className="hidden md:inline-block px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20">{phase.duration}</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
              {phase.title}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              {phase.focus}
            </p>
          </div>
          <button className={`p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${isExpanded ? 'text-indigo-600' : 'text-slate-400'}`}>
            {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
          </button>
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

function TimelineDate({ phase, align = 'left', className = '' }: { phase: any, align?: 'left' | 'right', className?: string }) {
  return (
    <div className={`hidden md:flex flex-col justify-center h-full ${align === 'right' ? 'items-end text-right pr-8' : 'items-start text-left pl-8'} ${className}`}>
      <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
        {align === 'right' && <span>{phase.dates}</span>}
        <Calendar className="w-5 h-5" />
        {align === 'left' && <span>{phase.dates}</span>}
      </div>
      <div className="flex items-center gap-2 text-slate-500 mt-1 text-sm font-medium">
        <Clock className="w-4 h-4" />
        <span>{phase.duration}</span>
      </div>
    </div>
  );
}
