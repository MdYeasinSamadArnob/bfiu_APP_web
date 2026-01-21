'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Play, ChevronRight, ChevronLeft, Trash2, Edit2, X, Target, Zap, Brain, AlertTriangle, ZoomIn, ZoomOut, Plus, Minus, MousePointer2, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface RFQViewerProps {
  pdfPath: string;
}

interface Annotation {
  id: string;
  pageNumber: number;
  rect: { x: number; y: number; width: number; height: number }; // Percentages
  title: string;
  content: string;
  type: 'strategic' | 'urgent' | 'technical' | 'risk';
}

export default function RFQViewer({ pdfPath }: RFQViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isPresenting, setIsPresenting] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [currentAnnotationIndex, setCurrentAnnotationIndex] = useState(-1);
  const [isEditing, setIsEditing] = useState(false);
  
  // Selection / Creation
  const [newAnnotationStart, setNewAnnotationStart] = useState<{x: number, y: number} | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  
  // Resizing / Moving State
  const [dragState, setDragState] = useState<{
    type: 'move' | 'resize';
    id: string;
    handle?: string; // 'nw', 'ne', 'sw', 'se'
    startX: number;
    startY: number;
    initialRect: { x: number, y: number, width: number, height: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageOverlayRef = useRef<HTMLDivElement>(null);
  const activeAnnotationRef = useRef<HTMLDivElement>(null);
  const [activeAnnotationRect, setActiveAnnotationRect] = useState<DOMRect | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Track Active Annotation Position
  useEffect(() => {
    // Only run if presenting and we have a current annotation
    if (isPresenting && annotations[currentAnnotationIndex]) {
      const updateRect = () => {
        // Find the element by ID manually if ref is not reliable due to re-renders
        const element = document.getElementById(`annotation-${annotations[currentAnnotationIndex].id}`);
        if (element) {
          setActiveAnnotationRect(element.getBoundingClientRect());
        }
      };
      
      // Initial update with a small delay to ensure DOM is ready
      setTimeout(updateRect, 100);
      
      window.addEventListener('resize', updateRect);
      window.addEventListener('scroll', updateRect);
      return () => {
        window.removeEventListener('resize', updateRect);
        window.removeEventListener('scroll', updateRect);
      };
    } else {
      setActiveAnnotationRect(null);
    }
  }, [isPresenting, currentAnnotationIndex, scale, currentPage, annotations]);

  // Save Annotations
  const saveAnnotations = async (newAnnotations: Annotation[]) => {
    // Optimistic Update
    setAnnotations(newAnnotations);
    
    try {
        await fetch('/api/rfq-annotations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAnnotations)
        });
    } catch (error) {
        console.error("Failed to save annotations:", error);
    }
  };

  // Load Annotations
  useEffect(() => {
    fetch('/api/rfq-annotations')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
            // Ensure unique IDs
            const seen = new Set();
            const uniqueData = data.filter(item => {
                const duplicate = seen.has(item.id);
                seen.add(item.id);
                return !duplicate;
            });
            setAnnotations(uniqueData);
        }
      });
  }, []);

  // Fit to Screen Logic
  const fitToScreen = useCallback(() => {
      if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          // Calculate scale to fit width with some padding
          // A4 aspect ratio is ~0.707 (width/height)
          // We can't know the exact PDF page dimensions until rendered, 
          // but we can estimate or rely on the container width.
          // React-PDF Page component scales based on width if width prop is provided, 
          // or we can manipulate the 'scale' prop directly.
          
          // Let's assume a standard page width of around 600-800px at scale 1.
          // A better approach for "Fit Width" is to set scale such that it fills container width.
          // Since we don't have the PDF page width in pixels, we can try a responsive scale.
          
          // Actually, a simpler "Fit" is just resetting to 1.0 or 1.2
          // But to fix the "too zoomed up" issue, we need to ensure the container handles overflow properly.
          
          setScale(1.2); // Good default reading size
          
          // Reset scroll position
          if (containerRef.current) {
              containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          }
      }
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Global Mouse Handlers for Drag/Resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState || !pageOverlayRef.current) return;

      const overlayRect = pageOverlayRef.current.getBoundingClientRect();
      const deltaX = ((e.clientX - dragState.startX) / overlayRect.width) * 100;
      const deltaY = ((e.clientY - dragState.startY) / overlayRect.height) * 100;

      setAnnotations(prev => prev.map(ann => {
        if (ann.id !== dragState.id) return ann;

        const newRect = { ...dragState.initialRect };

        if (dragState.type === 'move') {
          newRect.x += deltaX;
          newRect.y += deltaY;
        } else if (dragState.type === 'resize' && dragState.handle) {
          if (dragState.handle.includes('e')) newRect.width += deltaX;
          if (dragState.handle.includes('s')) newRect.height += deltaY;
          if (dragState.handle.includes('w')) {
            newRect.x += deltaX;
            newRect.width -= deltaX;
          }
          if (dragState.handle.includes('n')) {
            newRect.y += deltaY;
            newRect.height -= deltaY;
          }
        }

        // Constraints (min size, bounds)
        if (newRect.width < 1) newRect.width = 1;
        if (newRect.height < 1) newRect.height = 1;
        // Optional: Bound check to 0-100%
        
        return { ...ann, rect: newRect };
      }));
    };

    const handleMouseUp = () => {
      if (dragState) {
        // Save on drop
        const ann = annotations.find(a => a.id === dragState.id);
        if (ann) saveAnnotations(annotations); // Saves the current state
        setDragState(null);
      }
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, annotations]);


  // Presentation Logic
  const startPresentation = () => {
    setIsPresenting(true);
    setIsEditing(false);
    if (annotations.length > 0) {
      setCurrentAnnotationIndex(0);
      setCurrentPage(annotations[0].pageNumber);
    }
  };

  const nextSlide = useCallback(() => {
    if (currentAnnotationIndex < annotations.length - 1) {
      const nextIndex = currentAnnotationIndex + 1;
      setCurrentAnnotationIndex(nextIndex);
      setCurrentPage(annotations[nextIndex].pageNumber);
    }
  }, [currentAnnotationIndex, annotations]);

  const prevSlide = useCallback(() => {
    if (currentAnnotationIndex > 0) {
      const nextIndex = currentAnnotationIndex - 1;
      setCurrentAnnotationIndex(nextIndex);
      setCurrentPage(annotations[nextIndex].pageNumber);
    }
  }, [currentAnnotationIndex, annotations]);

  // Editing Logic: Add Annotation
  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || dragState) return;
    
    // If clicking on an annotation, don't create new one (handled by stopPropagation)
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    if (!newAnnotationStart) {
      setNewAnnotationStart({ x, y });
    } else {
      // Create new annotation
      const width = Math.abs(x - newAnnotationStart.x);
      const height = Math.abs(y - newAnnotationStart.y);
      const startX = Math.min(x, newAnnotationStart.x);
      const startY = Math.min(y, newAnnotationStart.y);

      const newAnnotation: Annotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pageNumber: currentPage,
        rect: { x: startX, y: startY, width, height },
        title: 'New Highlight',
        content: 'Edit this description...',
        type: 'technical'
      };

      saveAnnotations([...annotations, newAnnotation]);
      setNewAnnotationStart(null);
      setSelectedAnnotationId(newAnnotation.id);
    }
  };

  const deleteAnnotation = (id: string) => {
    const updatedAnnotations = annotations.filter(a => a.id !== id);
    saveAnnotations(updatedAnnotations);
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  };

  const updateAnnotation = (id: string, updates: Partial<Annotation>) => {
    saveAnnotations(annotations.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-slate-100 dark:bg-slate-950">
      
      {/* Sidebar (Editor) */}
      <AnimatePresence>
        {(isEditing || !isPresenting) && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-20 shrink-0"
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="font-bold text-slate-800 dark:text-slate-200">Tender Insights</h2>
              <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}
                title="Toggle Edit Mode"
              >
                <Edit2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {annotations.sort((a,b) => a.pageNumber - b.pageNumber).map((ann) => (
                <div 
                  key={ann.id}
                  onClick={() => {
                    setCurrentPage(ann.pageNumber);
                    setSelectedAnnotationId(ann.id);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    (selectedAnnotationId === ann.id || currentPage === ann.pageNumber) ? 'bg-indigo-50 border-indigo-500 dark:bg-indigo-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-mono text-slate-400">Page {ann.pageNumber}</span>
                    {isEditing && (
                      <button onClick={(e) => { e.stopPropagation(); deleteAnnotation(ann.id); }} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {isEditing && selectedAnnotationId === ann.id ? (
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                      <input 
                        value={ann.title} 
                        onChange={e => updateAnnotation(ann.id, { title: e.target.value })}
                        className="w-full text-sm font-bold bg-transparent border-b border-slate-300 focus:border-indigo-500 outline-none"
                      />
                      <textarea 
                        value={ann.content} 
                        onChange={e => updateAnnotation(ann.id, { content: e.target.value })}
                        className="w-full text-xs bg-transparent border border-slate-300 rounded p-1 focus:border-indigo-500 outline-none h-20"
                      />
                      <select 
                        value={ann.type}
                        onChange={e => updateAnnotation(ann.id, { type: e.target.value as Annotation['type'] })}
                        className="w-full text-xs bg-slate-100 dark:bg-slate-700 rounded p-1"
                      >
                        <option value="strategic">Strategic</option>
                        <option value="technical">Technical</option>
                        <option value="urgent">Urgent</option>
                        <option value="risk">Risk</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">{ann.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ann.content}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button 
                onClick={startPresentation}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all transform hover:scale-[1.02]"
              >
                <Play className="w-5 h-5" />
                Start Presention
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Viewer Area */}
      <div 
        ref={containerRef} 
        className={`flex-1 relative flex items-center justify-center transition-colors duration-500 ${isPresenting ? 'bg-slate-900' : 'bg-slate-200 dark:bg-slate-950'}`}
      >
        <Document
          file={pdfPath}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          className="shadow-2xl relative"
        >
          <Page 
            pageNumber={currentPage} 
            scale={scale}
            height={containerSize.height - (isPresenting ? 40 : 80)}
            className="shadow-2xl transition-all duration-500"
            renderTextLayer={false}
            renderAnnotationLayer={false}
          >
             {/* Interactive Overlay Layer */}
             <div 
                ref={pageOverlayRef}
                className={`absolute inset-0 z-10 ${isEditing ? 'cursor-crosshair' : ''}`}
                onClick={handlePageClick}
             >
               {/* Drawing Preview */}
               {newAnnotationStart && (
                  <div 
                    className="absolute border-2 border-dashed border-indigo-500 bg-indigo-500/20"
                    style={{
                      left: `${newAnnotationStart.x}%`,
                      top: `${newAnnotationStart.y}%`,
                      width: '0%', 
                      height: '0%'
                    }}
                  />
               )}

               {/* Annotations */}
               {annotations.filter(a => a.pageNumber === currentPage).map(ann => {
                 const isActive = isPresenting && annotations[currentAnnotationIndex]?.id === ann.id;
                 const isSelected = isEditing && selectedAnnotationId === ann.id;
                 const isVisible = !isPresenting || isActive;

                 if (!isVisible) return null;

                 // Smart Position Logic
                 const isLeft = ann.rect.x < 50;
                 // Ref for active annotation to track its screen position
                 const isCurrentActive = isActive; 

                 return (
                   <motion.div
                     key={ann.id}
                     id={`annotation-${ann.id}`}
                     initial={{ opacity: 0, scale: 0.8 }}
                     animate={{ opacity: 1, scale: 1 }}
                     className={`absolute transition-colors duration-300 group
                       ${isSelected ? 'border-2 border-dashed border-indigo-500 bg-indigo-500/10 z-30' : 
                         ann.type === 'strategic' ? 'border-2 border-purple-500 bg-purple-500/10' :
                         ann.type === 'urgent' ? 'border-2 border-red-500 bg-red-500/10' :
                         ann.type === 'risk' ? 'border-2 border-orange-500 bg-orange-500/10' :
                         'border-2 border-blue-500 bg-blue-500/10'
                       } 
                       ${isActive ? 'ring-4 ring-white/50 z-20 shadow-[0_0_30px_rgba(255,255,255,0.3)]' : ''}
                     `}
                     style={{
                       left: `${ann.rect.x}%`,
                       top: `${ann.rect.y}%`,
                       width: `${ann.rect.width}%`,
                       height: `${ann.rect.height}%`,
                       cursor: isEditing ? 'move' : 'pointer'
                     }}
                     onClick={(e) => {
                       e.stopPropagation();
                       setSelectedAnnotationId(ann.id);
                     }}
                     onMouseDown={(e) => {
                       if (isEditing) {
                         e.stopPropagation();
                         setDragState({
                           type: 'move',
                           id: ann.id,
                           startX: e.clientX,
                           startY: e.clientY,
                           initialRect: ann.rect
                         });
                       }
                     }}
                   >
                      {/* Resize Handles (Only in Edit Mode & Selected) */}
                      {isSelected && (
                        <>
                          {['nw', 'ne', 'sw', 'se'].map((handle) => (
                            <div
                              key={handle}
                              className={`absolute w-3 h-3 bg-white border border-indigo-500 rounded-full z-40
                                ${handle === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                                ${handle === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : ''}
                                ${handle === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                                ${handle === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                              `}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                setDragState({
                                  type: 'resize',
                                  id: ann.id,
                                  handle,
                                  startX: e.clientX,
                                  startY: e.clientY,
                                  initialRect: ann.rect
                                });
                              }}
                            />
                          ))}
                        </>
                      )}
                   </motion.div>
                 );
               })}
             </div>
          </Page>
        </Document>

        {/* Presentation Controls */}
        {isPresenting && (
           <div className="absolute bottom-8 flex items-center gap-6 bg-black/50 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-white z-50">
              <button onClick={prevSlide} className="hover:text-indigo-400 transition-colors"><ChevronLeft className="w-6 h-6" /></button>
              <div className="font-mono text-sm">
                 {currentAnnotationIndex + 1} / {annotations.length}
              </div>
              <button onClick={nextSlide} className="hover:text-indigo-400 transition-colors"><ChevronRight className="w-6 h-6" /></button>
              
              <div className="w-px h-4 bg-white/20" />
              
              <div className="flex items-center gap-2">
                 <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="hover:text-indigo-400"><Minus className="w-4 h-4" /></button>
                 <span className="text-xs font-mono w-8 text-center">{Math.round(scale * 100)}%</span>
                 <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="hover:text-indigo-400"><Plus className="w-4 h-4" /></button>
              </div>

              <div className="w-px h-4 bg-white/20" />
              <button onClick={() => setIsPresenting(false)} className="hover:text-red-400 transition-colors"><X className="w-5 h-5" /></button>
           </div>
        )}

        {/* Global AR Overlay */}
        <AnimatePresence>
          {isPresenting && activeAnnotationRect && annotations[currentAnnotationIndex] && (
            (() => {
              const ann = annotations[currentAnnotationIndex];
              // Decide side based on highlight center X
              const isLeft = (activeAnnotationRect.left + activeAnnotationRect.width/2) < window.innerWidth / 2;
              
              // Card Position (Fixed Sidebar)
              const cardWidth = 320;
              const cardX = isLeft ? 40 : window.innerWidth - cardWidth - 40;
              
              // Card Y (Centered on highlight, but clamped to screen)
              const cardHeight = 200; // Approx
              const highlightCenterY = activeAnnotationRect.top + activeAnnotationRect.height/2;
              const cardY = Math.min(
                window.innerHeight - cardHeight - 100, // Bottom padding
                Math.max(100, highlightCenterY - cardHeight/2) // Top padding
              );

              // Line Endpoints - Adjusted for better visual connection
              // Start from the edge of the highlight box
              const lineStartX = isLeft ? activeAnnotationRect.left : activeAnnotationRect.right;
              const lineStartY = highlightCenterY;
              
              // End at the edge of the card
              const lineEndX = isLeft ? cardX + cardWidth : cardX;
              const lineEndY = cardY + 60; // Connect to top-ish part of card

              return (
                <React.Fragment key="ar-overlay">
                   {/* Connecting Line (SVG) */}
                   <svg className="fixed inset-0 z-40 pointer-events-none" style={{ width: '100vw', height: '100vh' }}>
                      <motion.path 
                         initial={{ pathLength: 0, opacity: 0 }}
                         animate={{ pathLength: 1, opacity: 1 }}
                         d={`M ${lineStartX} ${lineStartY} C ${isLeft ? lineStartX - 50 : lineStartX + 50} ${lineStartY}, ${isLeft ? lineEndX + 50 : lineEndX - 50} ${lineEndY}, ${lineEndX} ${lineEndY}`}
                         fill="none"
                         stroke="white"
                         strokeWidth="2"
                         strokeDasharray="4 4"
                      />
                      <circle cx={lineStartX} cy={lineStartY} r="4" fill="white" className="animate-pulse" />
                      <circle cx={lineEndX} cy={lineEndY} r="3" fill="white" />
                   </svg>

                   {/* AR Card */}
                   <motion.div
                     initial={{ opacity: 0, x: isLeft ? -50 : 50 }}
                     animate={{ opacity: 1, x: 0 }}
                     exit={{ opacity: 0, scale: 0.9 }}
                     className="fixed z-50 bg-black/80 backdrop-blur-xl border border-white/20 p-6 rounded-2xl text-white shadow-2xl w-80"
                     style={{
                        left: cardX,
                        top: cardY
                     }}
                   >
                      <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                          {ann.type === 'strategic' && <Brain className="w-5 h-5 text-purple-400" />}
                          {ann.type === 'urgent' && <Zap className="w-5 h-5 text-red-400" />}
                          {ann.type === 'risk' && <AlertTriangle className="w-5 h-5 text-orange-400" />}
                          {ann.type === 'technical' && <Target className="w-5 h-5 text-blue-400" />}
                          <span className="text-xs font-bold uppercase tracking-wider opacity-70">{ann.type} Insight</span>
                      </div>
                      <h3 className="text-xl font-bold mb-3">{ann.title}</h3>
                      <div className="text-sm text-slate-200 leading-relaxed font-mono">
                        {ann.content}
                      </div>
                   </motion.div>
                </React.Fragment>
              );
            })()
          )}
        </AnimatePresence>

        {/* Normal Navigation & Toolbar */}
        {!isPresenting && (
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-black/50 px-2 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 z-50">
              
              {/* Page Nav */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-200 dark:border-slate-800">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                <span className="text-sm font-medium w-24 text-center">Page {currentPage} / {numPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
              </div>

              {/* Zoom */}
              <div className="flex items-center gap-1 px-2 border-r border-slate-200 dark:border-slate-800">
                 <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Minus className="w-4 h-4" /></button>
                 <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                 <button onClick={() => setScale(s => Math.min(2.5, s + 0.1))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"><Plus className="w-4 h-4" /></button>
                 <button onClick={fitToScreen} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg" title="Fit Screen"><Maximize className="w-4 h-4" /></button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 px-2">
                 <button 
                   onClick={() => setIsEditing(!isEditing)}
                   className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                     isEditing 
                       ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                       : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'
                   }`}
                 >
                   <Edit2 className="w-4 h-4" />
                   {isEditing ? 'Done Editing' : 'Edit Mode'}
                 </button>

                 <button 
                   onClick={startPresentation}
                   className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
                 >
                   <Play className="w-4 h-4" />
                   Present
                 </button>
              </div>
           </div>
        )}

        {/* Edit Mode Instructions Overlay */}
        <AnimatePresence>
          {isEditing && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg z-50 flex items-center gap-3"
            >
               <MousePointer2 className="w-5 h-5 animate-bounce" />
               <span className="font-medium">Click anywhere to add a note. Drag to move.</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
