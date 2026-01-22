'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCases as initialUseCases, UseCase } from '../data/useCases';
import UseCaseCard from '../components/UseCaseCard';
import { ThemeToggle } from '../components/ThemeToggle';
import Link from 'next/link';
import { Search, BarChart3, Filter, LayoutGrid, Zap, Brain, Database, Calendar, Menu, X, FileText, ChevronRight, CheckCircle2, Edit2, Plus, Trash2, Save, MoreVertical, GripVertical, BookOpen, Server } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [useCases, setUseCases] = useState<UseCase[]>(initialUseCases);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'requirements' | 'rules'>('requirements');
  const [requirements, setRequirements] = useState<any[]>([]);
  const [selectedReqIndex, setSelectedReqIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

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

    fetch('/api/requirements')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            setRequirements(data);
        }
      })
      .catch(err => console.error('Failed to load requirements:', err));
  }, []);

  const saveRequirements = async (newRequirements: any[]) => {
    setRequirements(newRequirements);
    try {
      await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequirements)
      });
    } catch (err) {
      console.error('Failed to save requirements:', err);
      alert('Failed to save changes.');
    }
  };

  const handleAddFeature = () => {
    const newFeature = {
      id: Date.now().toString(),
      title: 'New Feature',
      description: 'Feature description...',
      items: []
    };
    const newReqs = [...requirements, newFeature];
    saveRequirements(newReqs);
    setSelectedReqIndex(newReqs.length - 1);
  };

  const handleDeleteFeature = (index: number) => {
    if (confirm('Are you sure you want to delete this feature?')) {
      const newReqs = requirements.filter((_, i) => i !== index);
      saveRequirements(newReqs);
      if (selectedReqIndex >= newReqs.length) {
        setSelectedReqIndex(Math.max(0, newReqs.length - 1));
      }
    }
  };

  const handleUpdateFeature = (index: number, field: string, value: string) => {
    const newReqs = [...requirements];
    newReqs[index] = { ...newReqs[index], [field]: value };
    saveRequirements(newReqs);
  };

  const handleAddItem = (moduleIndex: number) => {
    const newReqs = [...requirements];
    newReqs[moduleIndex].items.push({
      id: Date.now().toString(),
      title: 'New Item',
      subtitle: '',
      details: ['New detail point']
    });
    saveRequirements(newReqs);
  };

  const handleDeleteItem = (moduleIndex: number, itemIndex: number) => {
    const newReqs = [...requirements];
    newReqs[moduleIndex].items.splice(itemIndex, 1);
    saveRequirements(newReqs);
  };

  const handleUpdateItem = (moduleIndex: number, itemIndex: number, field: string, value: string) => {
    const newReqs = [...requirements];
    newReqs[moduleIndex].items[itemIndex] = { ...newReqs[moduleIndex].items[itemIndex], [field]: value };
    saveRequirements(newReqs);
  };

  const handleUpdateItemDetail = (moduleIndex: number, itemIndex: number, detailIndex: number, value: string) => {
    const newReqs = [...requirements];
    newReqs[moduleIndex].items[itemIndex].details[detailIndex] = value;
    saveRequirements(newReqs);
  };

  const handleAddDetail = (moduleIndex: number, itemIndex: number) => {
    const newReqs = [...requirements];
    newReqs[moduleIndex].items[itemIndex].details.push('New detail point');
    saveRequirements(newReqs);
  };

  const handleDeleteDetail = (moduleIndex: number, itemIndex: number, detailIndex: number) => {
    const newReqs = [...requirements];
    newReqs[moduleIndex].items[itemIndex].details.splice(detailIndex, 1);
    saveRequirements(newReqs);
  };

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

  const renderSidebarItem = (req: any, idx: number) => {
    const isActive = selectedReqIndex === idx;
    return (
      <div key={idx} className="relative group">
          <button
          onClick={() => setSelectedReqIndex(idx)}
          className={`w-full text-left p-3 rounded-xl text-sm transition-all duration-200 flex items-center gap-3 group relative ${
              isActive
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
          }`}
          >
          <span className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
              isActive 
              ? 'bg-white/20 text-white' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-900/30 dark:group-hover:text-indigo-400'
          }`}>
              {idx + 1}
          </span>
          <span className={`font-medium truncate ${isActive ? 'text-white' : 'group-hover:text-slate-900 dark:group-hover:text-slate-200'}`}>
              {req.title.replace(/^\d+\.\s*/, '')}
          </span>
          {isActive && !isEditing && (
              <motion.div
              layoutId="active-indicator"
              className="absolute right-2"
              >
              <ChevronRight className="w-4 h-4 text-white/70" />
              </motion.div>
          )}
          </button>
          {isEditing && (
              <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteFeature(idx); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
              >
                  <Trash2 className="w-3.5 h-3.5" />
              </button>
          )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-slate-900 shadow-sm z-20 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-500/30">
                    <LayoutGrid className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      EFRM Analytics
                    </h1>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4 border-l border-slate-200 dark:border-slate-700 pl-4">
                    {/* View Mode Toggle */}
                    <button
                        onClick={() => setViewMode(viewMode === 'requirements' ? 'rules' : 'requirements')}
                        className={`p-2 rounded-lg transition-colors ${viewMode === 'requirements' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
                        title={viewMode === 'requirements' ? 'Switch to BFIU Rules' : 'Switch to Tender Requirements'}
                    >
                        {viewMode === 'requirements' ? <FileText className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                    </button>

                    {/* Edit Mode Toggle */}
                    {viewMode === 'requirements' && (
                        <>
                            <button
                                onClick={() => setIsEditing(!isEditing)}
                                className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' : 'text-slate-500 hover:text-amber-600 dark:hover:text-amber-400'}`}
                                title={isEditing ? 'Stop Editing' : 'Edit Requirements'}
                            >
                                {isEditing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                            </button>
                            {requirements.length > 8 && (
                                <button
                                    onClick={() => setSelectedReqIndex(8)}
                                    className={`p-2 rounded-lg transition-colors ${selectedReqIndex === 8 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                                    title="Knowledge Transfer"
                                >
                                    <BookOpen className="w-5 h-5" />
                                </button>
                            )}
                        </>
                    )}
                  </div>
                </div>

                {/* Mobile Controls */}
                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>
            
            <div className="hidden md:flex items-center gap-4">
                <Link 
                  href="/rfq" 
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 transition-all font-medium text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Tender</span>
                </Link>

                <Link 
                  href="/timeline" 
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 transition-all font-medium text-xs"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Timeline</span>
                </Link>
                
                <Link 
                  href="/architecture" 
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700 transition-all font-medium text-xs"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Architecture</span>
                </Link>

                {requirements.length > 9 && (
                    <button
                        onClick={() => {
                            setViewMode('requirements');
                            setSelectedReqIndex(9);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all font-medium text-xs ${
                            selectedReqIndex === 9 && viewMode === 'requirements'
                            ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-700'
                        }`}
                    >
                        <Server className="w-3.5 h-3.5" />
                        <span>Infrastructure</span>
                    </button>
                )}

                <ThemeToggle />
            </div>

            {viewMode === 'rules' && (
              <div className="relative w-full md:w-96 group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl leading-5 bg-slate-50 dark:bg-slate-800/50 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 sm:text-sm"
                  placeholder="Search rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto w-full">
        
        {viewMode === 'requirements' ? (
          <div className="h-full flex flex-col lg:flex-row gap-4">
            {/* Left Sidebar - Navigation */}
            <div className="w-full lg:w-72 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                
                {/* Features Section */}
                <div className="px-3 py-2 mt-2 first:mt-0 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 text-sm uppercase tracking-wider">
                        <Zap className="w-4 h-4 text-indigo-500" />
                        Features
                    </h2>
                    <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold">
                        {Math.min(requirements.length, 8)}
                    </span>
                </div>
                {requirements.slice(0, 8).map((req, idx) => renderSidebarItem(req, idx))}
                
                {isEditing && (
                    <button
                        onClick={handleAddFeature}
                        className="w-full mt-4 p-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Feature
                    </button>
                )}
              </div>
            </div>

            {/* Right Panel - Content */}
            <div className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
              {requirements.length > 0 && requirements[selectedReqIndex] && (
                <>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex items-start justify-between gap-4">
                     <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                              Feature {selectedReqIndex + 1}
                           </span>
                           <span className="text-slate-400 dark:text-slate-500 text-xs">
                              {requirements[selectedReqIndex].items.length} key components
                           </span>
                        </div>
                        {isEditing ? (
                            <input 
                                type="text"
                                value={requirements[selectedReqIndex].title.replace(/^\d+\.\s*/, '')}
                                onChange={(e) => handleUpdateFeature(selectedReqIndex, 'title', e.target.value)}
                                className="text-2xl font-bold text-slate-900 dark:text-white leading-tight w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        ) : (
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                {requirements[selectedReqIndex].title.replace(/^\d+\.\s*/, '')}
                            </h2>
                        )}
                     </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 bg-slate-50/30 dark:bg-black/20">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={selectedReqIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                         {requirements[selectedReqIndex].description && (
                           <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-sm text-slate-600 dark:text-slate-400 italic">
                             {isEditing ? (
                                <textarea
                                    value={requirements[selectedReqIndex].description}
                                    onChange={(e) => handleUpdateFeature(selectedReqIndex, 'description', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 resize-none p-0 italic"
                                    rows={3}
                                />
                             ) : (
                                requirements[selectedReqIndex].description
                             )}
                           </div>
                         )}

                         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                            {requirements[selectedReqIndex].items.map((item: any, i: number) => (
                               <div key={i} className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors shadow-sm relative group">
                                  {isEditing && (
                                      <button 
                                        onClick={() => handleDeleteItem(selectedReqIndex, i)}
                                        className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  )}
                                  
                                  <div className="mb-3 pr-8">
                                      {isEditing ? (
                                          <div className="space-y-2">
                                              <input
                                                  type="text"
                                                  value={item.title}
                                                  onChange={(e) => handleUpdateItem(selectedReqIndex, i, 'title', e.target.value)}
                                                  className="font-bold text-slate-800 dark:text-slate-200 w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none"
                                                  placeholder="Item Title"
                                              />
                                              <input
                                                  type="text"
                                                  value={item.subtitle || ''}
                                                  onChange={(e) => handleUpdateItem(selectedReqIndex, i, 'subtitle', e.target.value)}
                                                  className="text-xs font-normal text-slate-500 dark:text-slate-400 w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 outline-none"
                                                  placeholder="Subtitle (optional)"
                                              />
                                          </div>
                                      ) : (
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-start gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                                            <span>
                                                {item.title}
                                                {item.subtitle && <span className="block text-xs font-normal text-slate-500 dark:text-slate-400 mt-0.5">{item.subtitle}</span>}
                                            </span>
                                        </h3>
                                      )}
                                  </div>

                                  <ul className="space-y-2 pl-2">
                                     {item.details.map((detail: string, d: number) => (
                                        <li key={d} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2 leading-relaxed group/detail">
                                           <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mt-2 shrink-0" />
                                           {isEditing ? (
                                               <div className="flex-1 flex items-center gap-2">
                                                   <input
                                                       type="text"
                                                       value={detail}
                                                       onChange={(e) => handleUpdateItemDetail(selectedReqIndex, i, d, e.target.value)}
                                                       className="flex-1 bg-transparent border-b border-dashed border-slate-200 focus:border-indigo-500 outline-none text-sm"
                                                   />
                                                   <button onClick={() => handleDeleteDetail(selectedReqIndex, i, d)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover/detail:opacity-100">
                                                       <X className="w-3 h-3" />
                                                   </button>
                                               </div>
                                           ) : (
                                               <span dangerouslySetInnerHTML={{ 
                                                  __html: detail.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-700 dark:text-indigo-300 font-semibold">$1</strong>') 
                                               }} />
                                           )}
                                        </li>
                                     ))}
                                     {isEditing && (
                                         <button 
                                            onClick={() => handleAddDetail(selectedReqIndex, i)}
                                            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium flex items-center gap-1 mt-2"
                                         >
                                             <Plus className="w-3 h-3" /> Add Detail
                                         </button>
                                     )}
                                  </ul>
                               </div>
                            ))}
                            {isEditing && (
                                <button
                                    onClick={() => handleAddItem(selectedReqIndex)}
                                    className="bg-white dark:bg-slate-800/50 rounded-xl p-5 border-2 border-dashed border-slate-200 dark:border-slate-700/50 hover:border-indigo-500 hover:text-indigo-500 text-slate-400 transition-colors flex flex-col items-center justify-center gap-2 min-h-[200px]"
                                >
                                    <Plus className="w-8 h-8" />
                                    <span className="font-medium">Add New Item</span>
                                </button>
                            )}
                         </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto pr-2">
            {/* Dashboard Stats */}
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
        </div>
      )}
      </main>
    </div>
  );
}
