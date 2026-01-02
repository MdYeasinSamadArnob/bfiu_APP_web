import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';

const ArchitectureGroupNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  return (
    <>
      <NodeResizer 
        color="#6366f1" 
        isVisible={selected && data.isEditMode} 
        minWidth={100} 
        minHeight={100} 
      />
      <div 
        className="h-full w-full relative transition-all"
        style={{
           width: '100%', 
           height: '100%',
           zIndex: -1
        }}
      >
        <div 
            className={`absolute -top-6 left-0 font-bold bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded backdrop-blur-sm transition-colors text-sm ${selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
        >
          {data.label}
        </div>
        
        <div className={`w-full h-full rounded-lg border-2 transition-all ${
            selected && data.isEditMode
                ? 'border-indigo-500 border-dashed bg-indigo-50/10' 
                : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20'
        }`} />

        <Handle type="target" position={Position.Top} className={`w-3 h-3 bg-slate-400 ${data.isEditMode ? 'opacity-100' : 'opacity-0'}`} />
        <Handle type="source" position={Position.Bottom} className={`w-3 h-3 bg-slate-400 ${data.isEditMode ? 'opacity-100' : 'opacity-0'}`} />
      </div>
    </>
  );
};

export default memo(ArchitectureGroupNode);