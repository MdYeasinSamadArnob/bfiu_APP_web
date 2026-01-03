'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCases as initialUseCases, UseCase } from '../data/useCases';
import UseCaseCard from '../components/UseCaseCard';
import { ThemeToggle } from '../components/ThemeToggle';
import Link from 'next/link';
import { Search, BarChart3, Filter, LayoutGrid, Zap, Brain, Database, Calendar } from 'lucide-react';

export default function Home() {
  const [useCases, setUseCases] = useState<UseCase[]>(initialUseCases);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Load data from API
  useEffect(() => {
    fetch('/api/rules')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
            setUseCases(data);
        }
      })
      .catch(err => console.error('Failed to load rules:', err));
  }, []);

  const handleSaveUseCase = async (updatedUseCase: UseCase) => {
    const newUseCases = useCases.map(uc => uc.id === updatedUseCase.id ? updatedUseCase : uc);
    setUseCases(newUseCases);
    
    try {
        await fetch('/api/rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUseCases)
        });
    } catch (err) {
        console.error('Failed to save rule:', err);
        alert('Failed to save changes.');
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const sections = ['General Banking', 'Credit', 'Trade', 'Remittance'];
    
    const sectionCounts: Record<string, { total: number, hard: number, aiGen: number, aiRag: number }> = {};
    
    sections.forEach(sec => {
      const sectionCases = useCases.filter(uc => uc.section === sec);
      sectionCounts[sec] = {
        total: sectionCases.length,
        hard: sectionCases.filter(uc => uc.type === 'Hard Logic').length,
        aiGen: sectionCases.filter(uc => uc.type === 'AI Agents').length,
        aiRag: sectionCases.filter(uc => uc.type === 'AI-RAG').length
      };
    });

    const total = useCases.length;
    const totalHard = useCases.filter(uc => uc.type === 'Hard Logic').length;
    const totalAiGen = useCases.filter(uc => uc.type === 'AI Agents').length;
    const totalAiRag = useCases.filter(uc => uc.type === 'AI-RAG').length;

    return { sectionCounts, total, totalHard, totalAiGen, totalAiRag };
  }, [useCases]);

  const filteredUseCases = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    return useCases.filter(uc => {
      const matchesSearch = 
        uc.title.toLowerCase().includes(lowerTerm) ||
        uc.description.toLowerCase().includes(lowerTerm) ||
        uc.id.toLowerCase().includes(lowerTerm) ||
        uc.indicators.some(ind => ind.toLowerCase().includes(lowerTerm));
      
      const matchesSection = selectedSection === 'All' || uc.section === selectedSection;
      const matchesType = selectedType === 'All' || uc.type === selectedType;

      return matchesSearch && matchesSection && matchesType;
    });
  }, [useCases, searchTerm, selectedSection, selectedType]);

  const sections = ['General Banking', 'Remittance', 'Trade', 'Credit'];
  const types = ['Hard Logic', 'AI Agents', 'AI-RAG'];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md bg-opacity-90 dark:bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  BFIU Rules Analytics
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                  INTELLIGENT RULE MANAGEMENT SYSTEM
                </p>
              </div>
            </div>
            
            <Link 
              href="/timeline" 
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 font-medium text-sm shadow-sm hover:shadow hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <Calendar className="w-4 h-4" />
              <span>Project Timeline</span>
            </Link>
            
            <Link 
              href="/architecture" 
              className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 font-medium text-sm shadow-sm hover:shadow hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Architecture</span>
            </Link>

            <ThemeToggle />
            
            <div className="relative w-full md:w-96 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800/50 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm"
                placeholder="Search rules, indicators, descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Dashboard Stats */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {sections.map(sec => {
             const data = stats.sectionCounts[sec];
             const isSelected = selectedSection === sec;
             return (
               <button 
                 key={sec}
                 onClick={() => setSelectedSection(isSelected ? 'All' : sec)}
                 className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border ${
                   isSelected 
                    ? 'bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg translate-y-[-2px]' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md'
                 }`}
               >
                 <div className="flex justify-between items-start mb-4">
                    <h3 className={`font-semibold text-lg ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-200'}`}>
                      {sec}
                    </h3>
                    <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      <BarChart3 className="w-4 h-4" />
                    </div>
                 </div>
                 
                 <div className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                   {data.total} <span className="text-sm font-normal text-slate-500 dark:text-slate-400">rules</span>
                 </div>
                 
                 <div className="space-y-2">
                   <div className="flex items-center justify-between text-xs">
                     <span className="flex items-center text-slate-600 dark:text-slate-400">
                       <Zap className="w-3 h-3 mr-1.5 text-amber-500" /> Hard Logic
                     </span>
                     <span className="font-medium text-slate-900 dark:text-slate-200">{data.hard}</span>
                   </div>
                   <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                     <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${(data.hard / data.total) * 100}%` }}></div>
                   </div>

                   <div className="flex items-center justify-between text-xs pt-1">
                     <span className="flex items-center text-slate-600 dark:text-slate-400">
                       <Brain className="w-3 h-3 mr-1.5 text-indigo-500" /> AI Agents
                     </span>
                     <span className="font-medium text-slate-900 dark:text-slate-200">{data.aiGen}</span>
                   </div>
                   <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${(data.aiGen / data.total) * 100}%` }}></div>
                   </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                     <span className="flex items-center text-slate-600 dark:text-slate-400">
                       <Database className="w-3 h-3 mr-1.5 text-emerald-500" /> AI RAG
                     </span>
                     <span className="font-medium text-slate-900 dark:text-slate-200">{data.aiRag}</span>
                   </div>
                   <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(data.aiRag / data.total) * 100}%` }}></div>
                   </div>
                 </div>
               </button>
             );
           })}
        </section>

        {/* Filters & Content */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
             <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto no-scrollbar">
                <button
                  onClick={() => setSelectedType('All')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedType === 'All' 
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  All Types
                </button>
                {types.map(type => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${
                      selectedType === type 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {type === 'Hard Logic' && <Zap className="w-3.5 h-3.5" />}
                    {type === 'AI Agents' && <Brain className="w-3.5 h-3.5" />}
                    {type === 'AI-RAG' && <Database className="w-3.5 h-3.5" />}
                    {type}
                  </button>
                ))}
             </div>

             <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Showing {filteredUseCases.length} results
             </div>
          </div>

          {filteredUseCases.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-full inline-block mb-4">
                <Filter className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No rules found</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
                We couldn&apos;t find any rules matching your current filters. Try adjusting your search or clearing filters.
              </p>
              <button 
                onClick={() => {setSearchTerm(''); setSelectedSection('All'); setSelectedType('All');}}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredUseCases.map((useCase) => (
                <UseCaseCard 
                    key={useCase.id} 
                    useCase={useCase} 
                    onSave={handleSaveUseCase}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
