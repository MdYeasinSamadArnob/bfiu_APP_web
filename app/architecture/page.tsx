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
  Panel,
  NodeChange,
  EdgeChange
} from 'reactflow';
import 'reactflow/dist/style.css';

import ArchitectureNode, { iconMap, getTypeColor } from '../../components/architecture/ArchitectureNode';
import ArchitectureGroupNode from '../../components/architecture/ArchitectureGroupNode';
import { initialNodes, initialEdges } from '../../data/architectureData';
import { ChevronLeft, Save, Plus, Layout, CornerUpLeft, ClipboardCopy, RotateCcw, Trash2, Info, X, ArrowRightCircle, Activity } from 'lucide-react';
import Link from 'next/link';

const nodeTypes = {
  custom: ArchitectureNode,
  customGroup: ArchitectureGroupNode,
};

export default function ArchitecturePage() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [, setHasUnsavedChanges] = useState(false);
  const [viewStack, setViewStack] = useState<{id: string, name: string}[]>([{id: 'root', name: 'System Architecture'}]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const currentView = viewStack[viewStack.length - 1];
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  // Load initial data
  const loadArchitecture = useCallback((viewId: string) => {
    fetch(`/api/architecture?viewId=${viewId}`)
      .then(res => res.json())
      .then(data => {
        if (data.nodes && data.edges) {
          // If root view is empty (e.g. from accidental clear), restore factory defaults
          if (viewId === 'root' && data.nodes.length === 0) {
              setNodes(initialNodes.map(n => ({
                  ...n,
                  data: {
                      ...n.data,
                      isEditMode: isEditMode
                  }
              })));
              setEdges(initialEdges);
          } else {
              setNodes(data.nodes.map((n: Node) => ({
                 ...n,
                 data: {
                     ...n.data,
                     isEditMode: isEditMode // Apply current edit mode
                 }
              })));
              setEdges(data.edges);
          }
        } else {
             // For sub-views, we might want to start empty or with a default structure
             if (viewId === 'root') {
                 setNodes(initialNodes.map(n => ({...n, data: {...n.data, isEditMode: isEditMode}})));
                 setEdges(initialEdges);
             } else {
                 setNodes([]);
                 setEdges([]);
             }
        }
      })
      .catch(err => {
        console.error('Failed to load architecture data:', err);
        if (viewId === 'root') {
            setNodes(initialNodes);
            setEdges(initialEdges);
        } else {
            setNodes([]);
            setEdges([]);
        }
      });
  }, [setNodes, setEdges, isEditMode]);

  React.useEffect(() => {
    loadArchitecture(currentView.id);
  }, [currentView.id, loadArchitecture]);

  const saveArchitecture = useCallback(async () => {
    try {
        const cleanNodes = nodes.map(n => ({
            ...n,
            data: { ...n.data, isEditMode: undefined, onEnterGroup: undefined } 
        }));
        
        await fetch(`/api/architecture?viewId=${currentView.id}`, {
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
  }, [nodes, edges, currentView.id]);

  const resetArchitecture = useCallback(async () => {
      if (confirm('Are you sure you want to reset? This will revert to your last saved state.')) {
          loadArchitecture(currentView.id);
          setHasUnsavedChanges(false);
      }
  }, [loadArchitecture, currentView.id]);

  const factoryReset = useCallback(async () => {
      if (currentView.id !== 'root') {
          alert('Factory reset is only available for the root architecture.');
          return;
      }
      if (confirm('Are you sure you want to perform a FACTORY RESET? This will delete your saved layout and revert to the original system state. You must click "Set as Default" to make this permanent.')) {
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
  }, [setNodes, setEdges, isEditMode, currentView.id]);

  const handleEnterGroup = useCallback((groupId: string, groupLabel: string) => {
     setViewStack(prev => [...prev, { id: groupId, name: groupLabel }]);
     setSelectedNodeId(null);
  }, []);

  const handleNavigateBack = useCallback(() => {
      if (viewStack.length > 1) {
          setViewStack(prev => prev.slice(0, -1));
          setSelectedNodeId(null);
      }
  }, [viewStack]);

  // Inject handlers into node data
  React.useEffect(() => {
    setNodes((nds) => nds.map((n) => {
        // Inject handler for all supported node types
        if (n.type === 'customGroup' || n.type === 'group' || n.type === 'custom') {
             return {
                 ...n,
                 data: {
                     ...n.data,
                     onEnterGroup: handleEnterGroup
                 }
             };
        }
        return n;
    }));
  }, [handleEnterGroup, setNodes]);

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
  const onNodesChangeWithTrack = useCallback((changes: NodeChange[]) => {
      onNodesChange(changes);
      if (changes.some((c) => c.type !== 'select')) {
          setHasUnsavedChanges(true);
      }
  }, [onNodesChange]);
  
  const onEdgesChangeWithTrack = useCallback((changes: EdgeChange[]) => {
      onEdgesChange(changes);
      if (changes.some((c) => c.type !== 'select')) {
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
      } else if (selectedEdgeId) {
          setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
          setSelectedEdgeId(null);
          setHasUnsavedChanges(true);
      }
  }, [selectedNodeId, selectedEdgeId, setNodes, setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  };

  const onEdgeClick = (_: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const closeSidebar = () => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const updateEdgeData = (key: string, value: unknown) => {
      if (!selectedEdgeId) return;
      setEdges((eds) => eds.map((edge) => {
          if (edge.id === selectedEdgeId) {
              return {
                  ...edge,
                  [key]: value
              };
          }
          return edge;
      }));
      setHasUnsavedChanges(true);
  };

  const updateNodeData = (key: string, value: unknown) => {
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
  
  /*
   * Download functionality temporarily removed due to SVG export issues
   */


  const copyMetadata = useCallback(async () => {
    try {
        const data = {
            context: "System Architecture Overview",
            nodes: nodes.map(n => ({
                label: n.data?.label || 'Unnamed Node',
                type: n.data?.type || 'service',
                subLabel: n.data?.subLabel,
                details: n.data?.details,
                notes: n.data?.notes
            })),
            connections: edges.map(e => ({
                from: nodes.find(n => n.id === e.source)?.data?.label || 'Unknown',
                to: nodes.find(n => n.id === e.target)?.data?.label || 'Unknown',
                label: e.label,
                type: e.type
            }))
        };
        
        const text = `SYSTEM ARCHITECTURE METADATA (Prompt Context)
    
NODES:
${data.nodes.map(n => `- [${(n.type || 'service').toUpperCase()}] ${n.label}${n.subLabel ? ` (${n.subLabel})` : ''}
  Capabilities: ${n.details ? n.details.join(', ') : 'None'}
  Notes: ${n.notes || 'None'}`).join('\n\n')}

CONNECTIONS:
${data.connections.map(c => `- ${c.from} --> ${c.to} ${c.label ? `[${c.label}]` : ''}`).join('\n')}
`;
        
        await navigator.clipboard.writeText(text);
        alert("Architecture metadata copied to clipboard! You can now paste this into ChatGPT as context.");
    } catch (err) {
        console.error('Failed to copy metadata:', err);
        alert('Failed to copy metadata. Please check permissions or try again.');
    }
  }, [nodes, edges]);

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
            <div className="flex items-center gap-2">
                 <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">System Architecture</h1>
                 {viewStack.length > 1 && (
                     <>
                        <span className="text-slate-400">/</span>
                        <span className="text-indigo-600 dark:text-indigo-400 font-medium">{currentView.name}</span>
                     </>
                 )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Interactive Component Diagram</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={copyMetadata}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm"
                title="Copy Architecture Metadata for ChatGPT"
            >
                <ClipboardCopy className="w-4 h-4" />
            </button>
            {/* Download button hidden due to unresolved SVG export issues
            <button
                onClick={downloadImage}
                className="p-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors shadow-sm mr-2"
                title="Export as PNG"
            >
                <Download className="w-4 h-4" />
            </button>
            */}

            {viewStack.length > 1 && (
                <button
                   onClick={handleNavigateBack}
                   className="flex items-center gap-2 px-3 py-1.5 mr-2 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors text-xs font-medium"
                >
                   <CornerUpLeft className="w-3 h-3" />
                   Back to Parent
                </button>
            )}
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
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
                        title="Save current layout as your default (persists after reset)"
                    >
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Set as Default</span>
                    </button>
                    <button
                        onClick={resetArchitecture}
                        className="p-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm flex items-center gap-2"
                        title="Reset to your last saved default"
                    >
                        <RotateCcw className="w-4 h-4" />
                        <span className="hidden sm:inline">Reset</span>
                    </button>
                    <button
                        onClick={factoryReset}
                        className="p-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors shadow-sm flex items-center gap-2 border border-red-200 dark:border-red-800"
                        title="Restore original factory settings (clears your saved default)"
                    >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden lg:inline">Factory Reset</span>
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
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            connectionRadius={50}
            nodesDraggable={isEditMode}
            nodesConnectable={isEditMode}
            elementsSelectable={true}
            deleteKeyCode={isEditMode ? ['Backspace', 'Delete'] : null}
            edgesUpdatable={isEditMode}
            edgesFocusable={true}
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
          className={`absolute right-0 top-0 h-full w-80 bg-white dark:bg-slate-900 shadow-xl border-l border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out z-20 overflow-y-auto ${
            (selectedNode || selectedEdge) ? 'translate-x-0' : 'translate-x-full'
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
                          <div className="flex gap-2">
                              <div className="relative flex-grow">
                                  <input 
                                      type="text" 
                                      list="icon-options"
                                      value={selectedNode.data.icon || ''} 
                                      onChange={(e) => updateNodeData('icon', e.target.value)}
                                      className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                      placeholder="Select or type icon..."
                                  />
                                  <datalist id="icon-options">
                                      {Object.keys(iconMap).map(name => (
                                          <option key={name} value={name} />
                                      ))}
                                  </datalist>
                              </div>
                              <button
                                  onClick={() => setShowIconPicker(!showIconPicker)}
                                  className={`p-2 rounded-lg border transition-colors ${
                                      showIconPicker 
                                      ? 'bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' 
                                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
                                  }`}
                                  title="Browse Icons"
                              >
                                  <Layout className="w-5 h-5" />
                              </button>
                          </div>
                          
                          {showIconPicker && (
                              <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-5 gap-1 max-h-40 overflow-y-auto">
                                  {Object.entries(iconMap).map(([name, IconComponent]) => (
                                      <button
                                          key={name}
                                          onClick={() => {
                                              updateNodeData('icon', name);
                                              setShowIconPicker(false);
                                          }}
                                          className={`p-2 rounded hover:bg-white dark:hover:bg-slate-700 flex flex-col items-center justify-center gap-1 transition-all ${
                                              selectedNode.data.icon === name 
                                              ? 'bg-white shadow-sm ring-1 ring-indigo-500 dark:bg-slate-700' 
                                              : ''
                                          }`}
                                          title={name}
                                      >
                                          <IconComponent className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                                      </button>
                                  ))}
                              </div>
                          )}
                          
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center flex-wrap gap-1">
                              Supported: {Object.keys(iconMap).slice(0, 3).join(', ')}... 
                              <a href="https://lucide.dev/icons" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-0.5">
                                  Browse Library <CornerUpLeft className="w-2 h-2 rotate-90" />
                              </a>
                          </p>
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

                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Node Color</label>
                          <div className="flex flex-wrap gap-2">
                            {['default', 'blue', 'red', 'orange', 'purple', 'green', 'yellow', 'indigo', 'pink', 'teal', 'cyan', 'slate'].map((color) => {
                                const typeColor = getTypeColor(selectedNode.data.type);
                                
                                return (
                                <button
                                    key={color}
                                    onClick={() => updateNodeData('color', color)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                                        (selectedNode.data.color || 'default') === color 
                                        ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-110' 
                                        : 'hover:scale-110'
                                    } ${
                                        color === 'default' ? 'bg-white border-slate-300' :
                                        color === 'blue' ? 'bg-blue-500 border-blue-600' :
                                        color === 'red' ? 'bg-red-500 border-red-600' :
                                        color === 'orange' ? 'bg-orange-500 border-orange-600' :
                                        color === 'purple' ? 'bg-purple-500 border-purple-600' :
                                        color === 'green' ? 'bg-emerald-500 border-emerald-600' :
                                        color === 'yellow' ? 'bg-amber-500 border-amber-600' :
                                        color === 'indigo' ? 'bg-indigo-500 border-indigo-600' :
                                        color === 'pink' ? 'bg-pink-500 border-pink-600' :
                                        color === 'teal' ? 'bg-teal-500 border-teal-600' :
                                        color === 'cyan' ? 'bg-cyan-500 border-cyan-600' :
                                        'bg-slate-500 border-slate-600'
                                    }`}
                                    title={color === 'default' ? `Default (${typeColor})` : color.charAt(0).toUpperCase() + color.slice(1)}
                                >
                                    {color === 'default' && (
                                        <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${
                                            typeColor === 'blue' ? 'text-blue-500' :
                                            typeColor === 'red' ? 'text-red-500' :
                                            typeColor === 'orange' ? 'text-orange-500' :
                                            typeColor === 'purple' ? 'text-purple-500' :
                                            typeColor === 'green' ? 'text-emerald-500' :
                                            typeColor === 'yellow' ? 'text-amber-500' :
                                            typeColor === 'indigo' ? 'text-indigo-500' :
                                            'text-slate-500'
                                        }`}>
                                            /
                                        </div>
                                    )}
                                </button>
                            )})}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Node Style</label>
                          <select
                             value={selectedNode.data.variant || 'default'}
                             onChange={(e) => updateNodeData('variant', e.target.value)}
                             className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                          >
                              <option value="default">Default</option>
                              <option value="solid">Solid</option>
                              <option value="glow">Glow</option>
                              <option value="dashed">Dashed</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">Key Capabilities</label>
                          <textarea
                              value={selectedNode.data.details ? selectedNode.data.details.join('\n') : ''}
                              onChange={(e) => updateNodeData('details', e.target.value.split('\n'))}
                              className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm font-mono"
                              placeholder="Enter one capability per line..."
                          />
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                           <label className="block text-xs font-semibold text-slate-500 mb-2">Internal Architecture</label>
                           <button
                               onClick={() => handleEnterGroup(selectedNode.id, selectedNode.data.label)}
                               className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors text-sm font-medium border border-indigo-200 dark:border-indigo-800"
                           >
                               <ArrowRightCircle className="w-4 h-4" />
                               Manage Sub-Architecture
                           </button>
                           <p className="text-[10px] text-slate-400 mt-2">
                               Create or edit the internal components and flow for this node.
                           </p>
                      </div>

                      <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-700">
                           <div className="mb-4">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Management Notes</label>
                              <textarea
                                  value={selectedNode.data.notes || ''}
                                  onChange={(e) => updateNodeData('notes', e.target.value)}
                                  className="w-full h-24 px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
                                  placeholder="Add details, notes, or management comments here..."
                              />
                           </div>
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
                  
                  {selectedNode.data.notes && (
                      <div className="mb-6 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg">
                          <h3 className="text-xs font-semibold text-yellow-800 dark:text-yellow-500 mb-1 uppercase tracking-wide">Management Notes</h3>
                          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                              {selectedNode.data.notes}
                          </p>
                      </div>
                  )}

                  <div className="mb-6">
                       <button
                           onClick={() => handleEnterGroup(selectedNode.id, selectedNode.data.label)}
                           className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors text-sm font-medium shadow-sm"
                       >
                           <ArrowRightCircle className="w-4 h-4" />
                           View Internal Architecture
                       </button>
                  </div>
    
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

          {selectedEdge && (
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <button 
                  onClick={closeSidebar}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                </button>
              </div>

              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-6">
                 Connection Details
              </h2>

              <div className="space-y-6 overflow-y-auto flex-grow">
                   <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">Connection Type</label>
                       <select 
                           value={selectedEdge.type || 'default'} 
                           onChange={(e) => updateEdgeData('type', e.target.value)}
                           disabled={!isEditMode}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                       >
                           <option value="default">Bezier (Curved)</option>
                           <option value="straight">Straight</option>
                           <option value="step">Step (Right Angles)</option>
                           <option value="smoothstep">Smooth Step</option>
                           <option value="simplebezier">Simple Bezier</option>
                       </select>
                   </div>
                   
                   <div>
                       <label className="block text-xs font-semibold text-slate-500 mb-1">Label</label>
                       <input 
                           type="text" 
                           value={(selectedEdge.label as string) || ''} 
                           onChange={(e) => updateEdgeData('label', e.target.value)}
                           disabled={!isEditMode}
                           className="w-full px-3 py-2 border border-slate-300 rounded-lg dark:bg-slate-800 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                           placeholder="Optional label..."
                       />
                   </div>

                   <div className="flex items-center gap-2">
                       <input 
                           type="checkbox" 
                           id="edge-animated"
                           checked={selectedEdge.animated || false} 
                           onChange={(e) => updateEdgeData('animated', e.target.checked)}
                           disabled={!isEditMode}
                           className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                       />
                       <label htmlFor="edge-animated" className="text-sm text-slate-700 dark:text-slate-300">
                           Animated Flow
                       </label>
                   </div>
              </div>

              {isEditMode && (
                  <div className="pt-6 mt-4 border-t border-slate-200 dark:border-slate-700">
                       <button
                           onClick={deleteSelected}
                           className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors text-sm font-medium"
                       >
                           <Trash2 className="w-4 h-4" />
                           Delete Connection
                       </button>
                  </div>
              )}
              
              {!isEditMode && (
                   <div className="text-sm text-slate-500 italic mt-4">
                       Switch to Edit Mode to customize this connection.
                   </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
