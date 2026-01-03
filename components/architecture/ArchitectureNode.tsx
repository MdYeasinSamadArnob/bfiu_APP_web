import React, { memo } from 'react';
import { Handle, Position, NodeResizer, NodeProps } from 'reactflow';
import { 
  Database, Shield, RefreshCw, Server, Activity, 
  BarChart, ClipboardList, Bot, Search, Monitor, 
  Cpu, Network, BookOpen, Brain, Settings, Zap, 
  Briefcase, FileText, Globe, Layers, ArrowRightCircle, LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Database, Shield, RefreshCw, Server, Activity,
  BarChart, ClipboardList, Bot, Search, Monitor,
  Cpu, Network, BookOpen, Brain, Settings, Zap,
  Briefcase, FileText, Globe
};

export { iconMap };

export const getTypeColor = (type: string): string => {
  switch (type) {
    case 'database': return 'blue';
    case 'security': return 'red';
    case 'integration': return 'orange';
    case 'interface': return 'purple';
    case 'service':
    default: return 'slate';
  }
};

interface ArchitectureNodeData {
    icon: string;
    label: string;
    subLabel?: string;
    type: string;
    color?: string;
    variant?: 'default' | 'solid' | 'glow' | 'dashed';
    isEditMode?: boolean;
    onEnterGroup?: (id: string, label: string) => void;
}

const ArchitectureNode = ({ id, data, selected }: NodeProps<ArchitectureNodeData>) => {
  const Icon = iconMap[data.icon] || Layers;
  
  const handleEnterGroup = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (data.onEnterGroup) {
      data.onEnterGroup(id, data.label);
    }
  };

  const getNodeColorClasses = (colorName: string) => {
      switch (colorName) {
          case 'blue': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
          case 'red': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
          case 'orange': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
          case 'purple': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
          case 'green': return 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20';
          case 'yellow': return 'border-amber-500 bg-amber-50 dark:bg-amber-900/20';
          case 'indigo': return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20';
          case 'pink': return 'border-pink-500 bg-pink-50 dark:bg-pink-900/20';
          case 'teal': return 'border-teal-500 bg-teal-50 dark:bg-teal-900/20';
          case 'cyan': return 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20';
          case 'slate': return 'border-slate-500 bg-slate-50 dark:bg-slate-900/20';
          default: return 'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600';
      }
  };

  const getVariantClasses = (variant?: string, colorName?: string) => {
      if (variant === 'glow') {
          const glowColor = colorName === 'blue' ? 'shadow-blue-500/50' :
                            colorName === 'red' ? 'shadow-red-500/50' :
                            colorName === 'purple' ? 'shadow-purple-500/50' :
                            colorName === 'orange' ? 'shadow-orange-500/50' :
                            colorName === 'green' ? 'shadow-emerald-500/50' :
                            colorName === 'indigo' ? 'shadow-indigo-500/50' :
                            'shadow-slate-500/50';
          return `shadow-lg ${glowColor} ring-1 ring-offset-2 ring-offset-transparent ring-${colorName === 'default' ? 'slate' : colorName}-400`;
      }
      return '';
  };

  const effectiveColor = (data.color && data.color !== 'default') ? data.color : getTypeColor(data.type);
  const colorClasses = getNodeColorClasses(effectiveColor);
  const variantClasses = getVariantClasses(data.variant, effectiveColor);

  return (
    <>
      <NodeResizer 
        color="#6366f1" 
        isVisible={selected && data.isEditMode} 
        minWidth={100} 
        minHeight={50}
        handleStyle={{ width: 12, height: 12, borderRadius: '50%' }}
      />
      <div 
        className={`px-4 py-3 shadow-md rounded-lg border-l-4 h-full w-full transition-all flex flex-col group relative ${data.isEditMode ? '' : 'hover:shadow-xl hover:scale-105'} ${colorClasses} ${variantClasses}`}
      >
        {!data.isEditMode && (
             <button 
                onClick={handleEnterGroup}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 z-10 bg-white/80 dark:bg-black/20 rounded-full p-0.5 backdrop-blur-sm"
                title="Drill Down / Enter Internal Architecture"
             >
                <ArrowRightCircle className="w-4 h-4" />
             </button>
        )}

        {/* Handles - Larger and on all sides for easier connection */}
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
        
        <div className="flex items-start gap-3 h-full overflow-hidden">
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 shrink-0 flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </div>
          <div className="flex-grow min-w-0 flex flex-col justify-center h-full">
            <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight break-words text-sm pr-4">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words leading-tight">{data.subLabel}</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(ArchitectureNode);
