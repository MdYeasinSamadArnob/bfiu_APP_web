'use client';

import React, { useState, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap, 
  useNodesState, 
  useEdgesState, 
  addEdge,
  updateEdge,
  Connection,
  Edge,
  Node,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import ArchitectureNode from '../../components/architecture/ArchitectureNode';
import ArchitectureGroupNode from '../../components/architecture/ArchitectureGroupNode';
import { initialNodes, initialEdges } from '../../data/architectureData';
import { Info, X, ChevronLeft, Save, Plus, Trash2, Layout, RotateCcw } from 'lucide-react';
import Link from 'next/link';

const nodeTypes = {
  custom: ArchitectureNode,
  customGroup: ArchitectureGroupNode,
};

export default function ArchitecturePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);

  // Load initial data
  React.useEffect(() => {
    fetch('/api/architecture')
      .then(res => res.json())
      .then(data => {
        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
        } else {
            // Fallback to static data if file is empty/missing
             setNodes(initialNodes);
             setEdges(initialEdges);
        }
      })
      .catch(err => {
        console.error('Failed to load architecture data:', err);
        setNodes(initialNodes);
        setEdges(initialEdges);
      });
  }, [setNodes, setEdges]);

  const saveArchitecture = useCallback(async () => {
    try {
        // Clean up data before saving (remove React Flow specific runtime props if needed)
        // For now, we just save nodes and edges as is. 
        // Note: isEditMode flag in data might be saved, which is fine or we can strip it.
        const cleanNodes = nodes.map(n => ({
            ...n,
            data: { ...n.data, isEditMode: undefined } // Don't persist edit mode state
        }));
        
        await fetch('/api/architecture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes: cleanNodes, edges }),
        });
        setHasUnsavedChanges(false);
        alert('Architecture saved successfully!');
    } catch (error) {
        console.error('Failed to save:', error);
        alert('Failed to save changes.');
    }
  }, [nodes, edges]);

  const resetArchitecture = useCallback(async () => {
      if (confirm('Are you sure you want to reset the architecture to the default state? This cannot be undone.')) {
          // Reset nodes but preserve current edit mode state
          const resetNodes = initialNodes.map(n => ({
              ...n,
              data: {
                  ...n.data,
                  isEditMode: isEditMode
              }
          }));
          setNodes(resetNodes);
          setEdges(initialEdges);
          setHasUnsavedChanges(true);
      }
  }, [setNodes, setEdges, isEditMode]);

  const onConnect = useCallback(
    (params: Connection) => {
        setEdges((eds) => addEdge(params, eds));
        setHasUnsavedChanges(true);
    },
    [setEdges],
  );
  
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
        setEdges((els) => updateEdge(oldEdge, newConnection, els));
        setHasUnsavedChanges(true);
    },
    [setEdges]
  );
  
  // Track changes
  const onNodesChangeWithTrack = useCallback((changes: any) => {
      onNodesChange(changes);
      if (changes.some((c: any) => c.type !== 'select')) {
          setHasUnsavedChanges(true);
      }
  }, [onNodesChange]);
  
  const onEdgesChangeWithTrack = useCallback((changes: any) => {
      onEdgesChange(changes);
      if (changes.some((c: any) => c.type !== 'select')) {
          setHasUnsavedChanges(true);
      }
  }, [onEdgesChange]);

  const addNode = (type: string) => {
      const id = `node_${Date.now()}`;
      const position = { 
          x: Math.random() * 400 + 100, 
          y: Math.random() * 400 + 100 
      };
      
      let newNode: Node;
      
      if (type === 'group') {
          newNode = {
            id,
            type: 'customGroup',
            position,
            style: { width: 300, height: 200 },
            data: { label: 'New Group', isEditMode: true }
          };
      } else {
          newNode = {
            id,
            type: 'custom',
            position,
            data: { 
                label: 'New Node', 
                icon: 'Server', 
                type: 'service',
                isEditMode: true
            }
          };
      }
      
      setNodes((nds) => nds.concat(newNode));
      setHasUnsavedChanges(true);
  };

  const deleteSelected = useCallback(() => {
      if (selectedNodeId) {
          setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
          setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
          setSelectedNodeId(null);
          setHasUnsavedChanges(true);
      }
  }, [selectedNodeId, setNodes, setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const closeSidebar = () => {
    setSelectedNodeId(null);
  };

  const updateNodeData = (key: string, value: any) => {
      if (!selectedNodeId) return;
      setNodes((nds) => nds.map((node) => {
          if (node.id === selectedNodeId) {
              return {
                  ...node,
                  data: {
                      ...node.data,
                      [key]: value
                  }
              };
          }
          return node;
      }));
      setHasUnsavedChanges(true);
  };
  
  const toggleEditMode = () => {
      const newMode = !isEditMode;
      setIsEditMode(newMode);
      setNodes((nds) => 
        nds.map((node) => ({
            ...node,
            data: {
                ...node.data,
                isEditMode: newMode
            }
        }))
      );
  };

  return (
    <div className="w-full h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">System Architecture</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Interactive Component Diagram</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {isEditMode && (
                <div className="flex items-center gap-2 mr-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => addNode('service')}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                        title="Add Service Node"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => addNode('group')}
                        className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300 transition-colors"
                        title="Add Group"
                    >
                        <Layout className="w-4 h-4" />
                    </button>
                    <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                     <button
                        onClick={saveArchitecture}
                        disabled={!hasUnsavedChanges}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                            hasUnsavedChanges 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed dark:bg-slate-800 dark:text-slate-600'
                        }`}
                        title="Save Changes"
                    >
                        <Save className="w-3 h-3" />
                        Save
                    </button>
                    <button
                        onClick={resetArchitecture}
                        className="p-1.5 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 rounded text-slate-500 dark:text-slate-400 transition-colors"
                        title="Reset to Default"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            )}
            <button
                onClick={toggleEditMode}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    isEditMode 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' 
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
            >
                {isEditMode ? (
                    <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        Editing Active
                    </>
                ) : (
                    <>
                        <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                        View Mode
                    </>
                )}
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-grow relative flex overflow-hidden">
        {/* React Flow Canvas */}
        <div className="flex-grow h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeWithTrack}
            onEdgesChange={onEdgesChangeWithTrack}
            onConnect={isEditMode ? onConnect : undefined}
            onEdgeUpdate={isEditMode ? onEdgeUpdate : undefined}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            nodesDraggable={isEditMode}
            nodesConnectable={isEditMode}
            elementsSelectable={true}
            deleteKeyCode={isEditMode ? ['Backspace', 'Delete'] : null}
            fitView
            className="bg-slate-50 dark:bg-slate-950"
            minZoom={0.1}
          >
            <Background color="#94a3b8" gap={20} size={1} />
            <Controls className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 fill-slate-600 dark:fill-slate-300" />
            <MiniMap 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              maskColor="rgba(0, 0, 0, 0.1)"
              nodeColor={(n) => {
                if (n.type === 'group') return '#e2e8f0';
                return '#6366f1';
              }}
            />
            <Panel position="top-right" className="bg-white/80 dark:bg-slate-900/80 p-2 rounded shadow backdrop-blur text-xs text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {isEditMode ? 'Drag to move • Drag handles to resize • Backspace to delete' : 'Click nodes to view details'}
            </Panel>
          </ReactFlow>
        </div>

        {/* Sidebar for Details */}
        <div 
          className={`absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out z-20 ${
            selectedNode ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {selectedNode && (
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Info className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <button 
                  onClick={closeSidebar}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              {isEditMode ? (
                 <div className="space-y-4 overflow-y-auto flex-grow">
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Label</label>
                          <input 
                              type="text" 
                              value={selectedNode.data.label || ''} 
                              onChange={(e) => updateNodeData('label', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Sub Label</label>
                          <input 
                              type="text" 
                              value={selectedNode.data.subLabel || ''} 
                              onChange={(e) => updateNodeData('subLabel', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Icon Name (Lucide)</label>
                          <input 
                              type="text" 
                              value={selectedNode.data.icon || ''} 
                              onChange={(e) => updateNodeData('icon', e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">e.g. Server, Database, Cloud, Shield</p>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Node Type</label>
                          <select
                             value={selectedNode.data.type || 'service'}
                             onChange={(e) => updateNodeData('type', e.target.value)}
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          >
                              <option value="service">Service</option>
                              <option value="database">Database</option>
                              <option value="interface">Interface</option>
                              <option value="security">Security</option>
                              <option value="integration">Integration</option>
                          </select>
                      </div>

                      <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-700">
                           <button
                               onClick={deleteSelected}
                               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
                           >
                               <Trash2 className="w-4 h-4" />
                               Delete Node
                           </button>
                      </div>
                 </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {selectedNode.data.label}
                  </h2>
                  {selectedNode.data.subLabel && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-mono">
                      {selectedNode.data.subLabel}
                    </p>
                  )}
    
                  <div className="space-y-6 overflow-y-auto flex-grow">
                    {selectedNode.data.details && selectedNode.data.details.length > 0 ? (
                      <div>
                        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                          Key Capabilities
                        </h3>
                        <ul className="space-y-3">
                          {selectedNode.data.details.map((detail: string, i: number) => (
                            <li key={i} className="flex items-start text-sm text-slate-700 dark:text-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 mr-2 flex-shrink-0" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 italic">
                        No additional details configured for this component.
                      </div>
                    )}
    
                    {/* Placeholder for future dynamic data */}
                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                        Live Metrics (Simulated)
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Uptime</div>
                          <div className="text-lg font-semibold text-green-600 dark:text-green-400">99.9%</div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                          <div className="text-xs text-slate-500 mb-1">Latency</div>
                          <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">45ms</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
