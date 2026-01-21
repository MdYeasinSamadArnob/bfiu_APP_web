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
  EdgeChange,
  ReactFlowInstance,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import ArchitectureNode, { iconMap, getTypeColor } from '../../components/architecture/ArchitectureNode';
import ArchitectureGroupNode from '../../components/architecture/ArchitectureGroupNode';
import { initialNodes, initialEdges } from '../../data/architectureData';
import { ChevronLeft, Save, Plus, Layout, CornerUpLeft, ClipboardCopy, RotateCcw, Trash2, Info, X, ArrowRightCircle, Activity, History, Archive, FilePlus, Library, GripVertical } from 'lucide-react';
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
  
  // Library State
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<{id: string, name: string, nodes: Node[], edges: Edge[]}[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // Load library from localStorage
  React.useEffect(() => {
      const savedLib = localStorage.getItem('architecture_library');
      if (savedLib) {
          try {
              setLibraryItems(JSON.parse(savedLib));
          } catch (e) {
              console.error('Failed to load library:', e);
          }
      }
  }, []);

  // Save library to localStorage
  React.useEffect(() => {
      localStorage.setItem('architecture_library', JSON.stringify(libraryItems));
  }, [libraryItems]);
  
  // Versioning State
  const [versions, setVersions] = useState<{id: string, name: string, createdAt: string}[]>([]);
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null);
  const [showVersionMenu, setShowVersionMenu] = useState(false);
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');

  const currentView = viewStack[viewStack.length - 1];
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  const loadVersions = useCallback(() => {
      fetch('/api/architecture?action=list_versions')
          .then(res => res.json())
          .then(data => {
              if (Array.isArray(data)) {
                  setVersions(data);
              }
          })
          .catch(err => console.error('Failed to load versions:', err));
  }, []);

  // Load initial data
  const loadArchitecture = useCallback((viewId: string, versionId: string | null = null) => {
    const url = versionId 
        ? `/api/architecture?viewId=${viewId}&versionId=${versionId}`
        : `/api/architecture?viewId=${viewId}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.nodes && data.edges) {
          // If root view is empty (e.g. from accidental clear), restore factory defaults
          if (viewId === 'root' && data.nodes.length === 0 && !versionId) {
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
             if (viewId === 'root' && !versionId) {
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
        if (viewId === 'root' && !versionId) {
            setNodes(initialNodes);
            setEdges(initialEdges);
        } else {
            setNodes([]);
            setEdges([]);
        }
      });
  }, [setNodes, setEdges, isEditMode]);

  React.useEffect(() => {
    loadArchitecture(currentView.id, currentVersionId);
    loadVersions();
  }, [currentView.id, currentVersionId, loadArchitecture, loadVersions]);

  const saveArchitecture = useCallback(async () => {
    if (currentVersionId) {
        alert("You are viewing a historical version. Switch to 'Live Version' to make changes.");
        return;
    }
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
  }, [nodes, edges, currentView.id, currentVersionId]);

  const saveNewVersion = useCallback(async () => {
      if (!newVersionName.trim()) return;
      
      // First save current state to ensure version includes latest changes
      await saveArchitecture();

      try {
          const res = await fetch('/api/architecture?action=create_version', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: newVersionName }),
          });
          
          if (res.ok) {
              const data = await res.json();
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
  }, [newVersionName, saveArchitecture, loadVersions]);

  const deleteVersion = useCallback(async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!confirm('Are you sure you want to delete this version?')) return;
      
      try {
          await fetch('/api/architecture?action=delete_version', {
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
        await fetch('/api/architecture?action=restore_version', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
        });
        
        alert(`Version "${name}" is now LIVE!`);
        setCurrentVersionId(null); // Switch to Live
        setShowVersionMenu(false);
        loadVersions();
        loadArchitecture(currentView.id, null); // Reload live data
    } catch (err) {
        console.error(err);
        alert('Failed to restore version.');
    }
}, [loadArchitecture, loadVersions, currentView.id]);

  const resetArchitecture = useCallback(async () => {
      if (confirm('Are you sure you want to reset? This will revert to your last saved state.')) {
          loadArchitecture(currentView.id, currentVersionId);
          setHasUnsavedChanges(false);
      }
  }, [loadArchitecture, currentView.id, currentVersionId]);

  const factoryReset = useCallback(async () => {
      if (currentVersionId) return;
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
  }, [setNodes, setEdges, isEditMode, currentView.id, currentVersionId]);

  const handleNewDiagram = useCallback(() => {
      if (currentVersionId) {
          alert("Switch to Live Version to create a new diagram.");
          return;
      }
      
      const confirmMsg = "Start a NEW BLANK diagram?\n\nTip: You should save your current work as a Version first if you want to keep it.";
      if (confirm(confirmMsg)) {
          setNodes([]);
          setEdges([]);
          setHasUnsavedChanges(true);
      }
  }, [currentVersionId, setNodes, setEdges]);

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

  const saveToLibrary = useCallback(() => {
    const name = prompt("Enter a name for this template:");
    if (!name) return;

    let nodesToSave = nodes;
    let edgesToSave = edges;
    
    const selectedNodes = nodes.filter(n => n.selected);
    if (selectedNodes.length > 0) {
        nodesToSave = selectedNodes;
        const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
        edgesToSave = edges.filter(e => selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target));
    }

    const newItem = {
        id: `lib_${Date.now()}`,
        name,
        nodes: nodesToSave,
        edges: edgesToSave
    };
    
    setLibraryItems(prev => [...prev, newItem]);
    alert("Saved to Library!");
  }, [nodes, edges]);

  const onDragStart = (event: React.DragEvent, item: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
        event.preventDefault();

        const data = event.dataTransfer.getData('application/reactflow');
        if (!data || !reactFlowInstance) return;

        try {
            const item = JSON.parse(data);
            
            const position = reactFlowInstance.screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });

            if (!item.nodes || item.nodes.length === 0) return;

            const minX = Math.min(...item.nodes.map((n: Node) => n.position.x));
            const minY = Math.min(...item.nodes.map((n: Node) => n.position.y));
            
            const idMap = new Map<string, string>();
            const newNodes = item.nodes.map((n: Node) => {
                const newId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                idMap.set(n.id, newId);
                return {
                    ...n,
                    id: newId,
                    position: {
                        x: position.x + (n.position.x - minX),
                        y: position.y + (n.position.y - minY)
                    },
                    data: {
                        ...n.data,
                        isEditMode: isEditMode // Ensure new nodes respect current mode
                    },
                    selected: false
                };
            });

            const newEdges = item.edges.map((e: Edge) => ({
                ...e,
                id: `edge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                source: idMap.get(e.source) || e.source,
                target: idMap.get(e.target) || e.target,
                selected: false
            }));

            setNodes((nds) => nds.concat(newNodes));
            setEdges((eds) => eds.concat(newEdges));
            setHasUnsavedChanges(true);
        } catch (e) {
            console.error("Failed to drop item:", e);
        }
    },
    [reactFlowInstance, setNodes, setEdges, isEditMode]
  );
  
  const deleteLibraryItem = (id: string) => {
    if(confirm("Delete this template?")) {
        setLibraryItems(prev => prev.filter(item => item.id !== id));
    }
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

            {/* Version Control */}
            <div className="flex items-center">
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
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-50">
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

                {/* Quick Add Version Button */}
                {!currentVersionId && (
                    <div className="flex gap-2 ml-2">
                        <button
                            onClick={() => setShowSaveVersionModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors text-xs font-medium border border-indigo-200 dark:border-indigo-800"
                            title="Create New Version Snapshot"
                        >
                            <Plus className="w-3 h-3" />
                            Save Version
                        </button>
                        <button
                            onClick={handleNewDiagram}
                            className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors text-xs font-medium border border-slate-200 dark:border-slate-700"
                            title="Start Fresh (Blank Canvas)"
                        >
                            <FilePlus className="w-3 h-3" />
                            New Diagram
                        </button>
                    </div>
                )}
            </div>

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
                onClick={() => setShowLibrary(!showLibrary)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all mr-2 ${
                    showLibrary
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                }`}
                title="Architecture Library"
            >
                <Library className="w-4 h-4" />
                Library
            </button>
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
        {/* Library Sidebar */}
        <div 
          className={`absolute left-0 top-0 h-full w-64 bg-white dark:bg-slate-900 shadow-xl border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${
            showLibrary ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
             <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                 <Library className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                 Library
             </h2>
             <button onClick={() => setShowLibrary(false)}>
                 <X className="w-4 h-4 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" />
             </button>
          </div>
          
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
             <button
                 onClick={saveToLibrary}
                 className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30 rounded-lg transition-colors text-sm font-medium border border-indigo-200 dark:border-indigo-800"
             >
                 <Plus className="w-4 h-4" />
                 Save Current to Library
             </button>
             <p className="text-[10px] text-slate-400 mt-2 text-center">
                 Select nodes to save specific parts, or save entire diagram.
             </p>
          </div>

          <div className="flex-grow overflow-y-auto p-4 space-y-3">
             {libraryItems.length === 0 ? (
                 <div className="text-center py-8 text-slate-400 text-sm italic">
                     Library is empty. Save your common patterns here!
                 </div>
             ) : (
                 libraryItems.map((item) => (
                     <div 
                         key={item.id}
                         draggable
                         onDragStart={(e) => onDragStart(e, item)}
                         className="group relative p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all cursor-grab active:cursor-grabbing"
                     >
                         <div className="flex justify-between items-start">
                             <div className="flex items-center gap-2">
                                 <GripVertical className="w-4 h-4 text-slate-400" />
                                 <span className="font-medium text-sm text-slate-700 dark:text-slate-200">{item.name}</span>
                             </div>
                             <button
                                 onClick={(e) => { e.stopPropagation(); deleteLibraryItem(item.id); }}
                                 className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                 title="Delete Template"
                             >
                                 <Trash2 className="w-3 h-3" />
                             </button>
                         </div>
                         <div className="mt-2 text-[10px] text-slate-500 flex gap-2">
                             <span>{item.nodes.length} Nodes</span>
                             <span>•</span>
                             <span>{item.edges.length} Edges</span>
                         </div>
                     </div>
                 ))
             )}
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-grow h-full w-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeWithTrack}
            onEdgesChange={onEdgesChangeWithTrack}
            onConnect={isEditMode ? onConnect : undefined}
            onEdgeUpdate={isEditMode ? onEdgeUpdate : undefined}
            onInit={setReactFlowInstance}
            onDragOver={onDragOver}
            onDrop={onDrop}
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
      {/* Save Version Modal */}
      {showSaveVersionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 w-96 border border-slate-200 dark:border-slate-800">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Save Version</h3>
                  <input
                      type="text"
                      value={newVersionName}
                      onChange={(e) => setNewVersionName(e.target.value)}
                      placeholder="Version Name (e.g., v1.0 Stable)"
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
    </div>
  );
}
