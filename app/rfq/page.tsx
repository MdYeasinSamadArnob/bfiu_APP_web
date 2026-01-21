'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

const RFQViewer = dynamic(() => import('../../components/RFQViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-600 dark:text-slate-400 font-medium">Initializing Neural Document Reader...</p>
      </div>
    </div>
  ),
});

export default function RFQPage() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link 
            href="/"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              EFRM Tender Analytics
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              RFQ - EFRM Bank Asia Jan 2026 v0.9-final_v1.1.pdf
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-full border border-indigo-200 dark:border-indigo-800">
                Agentic AI Active
            </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        <RFQViewer pdfPath="/pdf/RFQ - EFRM Bank Asia Jan 2026 v0.9-final_v1.1.pdf" />
      </main>
    </div>
  );
}
