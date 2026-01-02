import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { 
  Database, Shield, RefreshCw, Server, Activity, 
  BarChart, ClipboardList, Bot, Search, Monitor, 
  Cpu, Network, BookOpen, Brain, Settings, Zap, 
  Briefcase, FileText, Globe, Layers 
} from 'lucide-react';

const iconMap: Record<string, React.FC<any>> = {
  Database, Shield, RefreshCw, Server, Activity,
  BarChart, ClipboardList, Bot, Search, Monitor,
  Cpu, Network, BookOpen, Brain, Settings, Zap,
  Briefcase, FileText, Globe
};

const ArchitectureNode = ({ data, selected }: { data: any; selected?: boolean }) => {
  const Icon = iconMap[data.icon] || Layers;
  
  const getNodeColor = (type: string) => {
    switch (type) {
      case 'database': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      case 'security': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'integration': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'interface': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
      default: return 'border-slate-300 bg-white dark:bg-slate-800 dark:border-slate-600';
    }
  };

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
        className={`px-4 py-3 shadow-md rounded-lg border-l-4 h-full w-full transition-all overflow-hidden flex flex-col ${data.isEditMode ? '' : 'hover:shadow-xl hover:scale-105'} ${getNodeColor(data.type)}`}
      >
        <Handle type="target" position={Position.Top} className={`w-3 h-3 bg-slate-400 ${data.isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
        
        <div className="flex items-start gap-3 h-full overflow-hidden">
          <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 shrink-0 flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </div>
          <div className="flex-grow min-w-0 flex flex-col justify-center h-full">
            <div className="font-bold text-slate-900 dark:text-slate-100 leading-tight break-words text-sm">{data.label}</div>
            {data.subLabel && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 break-words leading-tight">{data.subLabel}</div>
            )}
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} className={`w-3 h-3 bg-slate-400 ${data.isEditMode ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
      </div>
    </>
  );
};

export default memo(ArchitectureNode);
