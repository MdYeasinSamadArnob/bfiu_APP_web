import React, { memo } from 'react';
import { Handle, Position, NodeResizer, NodeProps } from 'reactflow';
import { ArrowRightCircle } from 'lucide-react';

interface GroupNodeData {
    label: string;
    isEditMode?: boolean;
    onEnterGroup?: (id: string, label: string) => void;
    color?: string;
    variant?: 'default' | 'solid' | 'glow' | 'dashed';
}

const ArchitectureGroupNode = ({ id, data, selected }: NodeProps<GroupNodeData>) => {
  const handleEnterGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onEnterGroup) {
      data.onEnterGroup(id, data.label);
    }
  };

  const getBorderColor = (colorName?: string) => {
      switch (colorName) {
          case 'blue': return 'indigo-500'; // Keep original indigo for default
          case 'red': return 'red-500';
          case 'orange': return 'orange-500';
          case 'purple': return 'purple-500';
          case 'green': return 'emerald-500';
          case 'yellow': return 'amber-500';
          case 'indigo': return 'indigo-500';
          case 'pink': return 'pink-500';
          case 'teal': return 'teal-500';
          case 'cyan': return 'cyan-500';
          case 'slate': return 'slate-500';
          default: return 'indigo-500';
      }
  };

  const color = data.color && data.color !== 'default' ? data.color : 'indigo'; // Default to indigo
  const borderColor = getBorderColor(color);
  
  // Determine border style and background based on variant
  const getStyleClasses = () => {
      // Base classes
      let classes = `border-${borderColor} `;

      if (data.variant === 'solid') {
          classes += `border-2 bg-${color}-50/10 `;
      } else if (data.variant === 'glow') {
          classes += `border-2 bg-${color}-50/5 shadow-lg shadow-${color}-500/20 ring-1 ring-${color}-400/50 `;
      } else {
          // Default / Dashed
          classes += `border-dashed border-2 bg-${color}-50/5 `;
      }

      return classes;
  };

  return (
    <>
      <NodeResizer 
        color="#6366f1" 
        isVisible={selected && data.isEditMode} 
        minWidth={100} 
        minHeight={100} 
      />
      <div 
        className="h-full w-full relative transition-all group"
        style={{
           width: '100%', 
           height: '100%',
           zIndex: -1
        }}
      >
        <div 
            className={`absolute -top-6 left-0 font-bold bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded backdrop-blur-sm transition-colors text-sm flex items-center gap-2 ${selected ? `text-${borderColor} dark:text-${borderColor}` : 'text-slate-500 dark:text-slate-400'}`}
        >
          {data.label}
          {!data.isEditMode && (
             <button 
                onClick={handleEnterGroup}
                className={`opacity-0 group-hover:opacity-100 transition-opacity hover:text-${borderColor} dark:hover:text-${borderColor}`}
                title="Enter Internal Architecture"
             >
                <ArrowRightCircle className="w-4 h-4" />
             </button>
          )}
        </div>
        
        <div className={`w-full h-full rounded-lg transition-all ${
            selected && data.isEditMode
                ? `${getStyleClasses()} !border-opacity-100` 
                : `${data.variant === 'glow' || data.variant === 'solid' ? getStyleClasses() : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20'}`
        }`} />

        <Handle 
            type="target" 
            position={Position.Top} 
            className={`w-5 h-5 -mt-2.5 !bg-indigo-500 hover:!bg-indigo-600 border-2 border-white dark:border-slate-900 transition-all z-50 ${data.isEditMode ? 'opacity-100 scale-100' : 'opacity-0'}`} 
        />
        <Handle 
            type="source" 
            position={Position.Right} 
            className={`w-5 h-5 -mr-2.5 !bg-indigo-500 hover:!bg-indigo-600 border-2 border-white dark:border-slate-900 transition-all z-50 ${data.isEditMode ? 'opacity-100 scale-100' : 'opacity-0'}`} 
        />
        <Handle 
            type="source" 
            position={Position.Bottom} 
            className={`w-5 h-5 -mb-2.5 !bg-indigo-500 hover:!bg-indigo-600 border-2 border-white dark:border-slate-900 transition-all z-50 ${data.isEditMode ? 'opacity-100 scale-100' : 'opacity-0'}`} 
        />
        <Handle 
            type="target" 
            position={Position.Left} 
            className={`w-5 h-5 -ml-2.5 !bg-indigo-500 hover:!bg-indigo-600 border-2 border-white dark:border-slate-900 transition-all z-50 ${data.isEditMode ? 'opacity-100 scale-100' : 'opacity-0'}`} 
        />
      </div>
    </>
  );
};

export default memo(ArchitectureGroupNode);