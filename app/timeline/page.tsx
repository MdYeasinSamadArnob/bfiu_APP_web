import TimelineView from '@/components/TimelineView';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TimelinePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
       <header className="bg-white/80 dark:bg-slate-900/80 shadow-sm sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800 backdrop-blur-md">
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
           <div className="flex items-center gap-4">
             <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 group">
               <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400 group-hover:-translate-x-1 transition-transform" />
             </Link>
             <div>
               <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Project Timeline</h1>
               <p className="text-xs text-slate-500 font-medium">ERA AML GUARDIAN</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>
       
       <main className="py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <TimelineView />
       </main>
    </div>
  )
}
