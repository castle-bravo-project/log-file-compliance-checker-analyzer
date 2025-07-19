import React from 'react';
import { FileSet, AllAnalysisResults } from '../types';
import { FolderIcon, DocumentTextIcon, CheckCircleIcon } from './icons';

interface FileDashboardProps {
  fileSets: Map<string, FileSet>;
  allResults: AllAnalysisResults;
  onRunBatchAnalysis: () => void;
}

const FilePill: React.FC<{ fileName: string | undefined | null }> = ({ fileName }) => {
    if (!fileName) return null;
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200">
            <DocumentTextIcon className="h-4 w-4" />
            {fileName.split('/').pop()}
        </span>
    );
};

const FileDashboard: React.FC<FileDashboardProps> = ({
  fileSets,
  allResults,
  onRunBatchAnalysis,
}) => {

  const canGenerateReport = Array.from(fileSets.values()).some(
    set => set.detailsFile || set.xmlFile
  );

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Batch Analysis Dashboard</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Review the detected file sets below and run the batch analysis.
        </p>
      </div>
      
      <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
          {Array.from(fileSets.values()).map((set) => {
            return (
              <li key={set.id} className="flex items-center justify-between gap-x-6 p-4">
                <div className="flex min-w-0 gap-x-4">
                  <FolderIcon className="h-10 w-10 flex-none text-slate-400" />
                  <div className="min-w-0 flex-auto">
                    <p className="text-sm font-semibold leading-6 text-slate-900 dark:text-slate-100">{set.id}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                        <FilePill fileName={set.detailsFile?.name} />
                        <FilePill fileName={set.xmlFile?.name} />
                        <FilePill fileName={set.netstatFile?.name} />
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          onClick={onRunBatchAnalysis}
          disabled={!canGenerateReport}
          className="w-full sm:w-auto rounded-md bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Run Batch Analysis & Generate Report
        </button>
      </div>
    </div>
  );
};

export default FileDashboard;