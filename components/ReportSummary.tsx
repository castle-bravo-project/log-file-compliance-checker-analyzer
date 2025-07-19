import React, { useMemo } from 'react';
import { AllAnalysisResults, UploadedFile, AnalysisResult, AISummary, FileSet } from '../types';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, DocumentTextIcon, CodeBracketIcon, FolderIcon } from './icons';

interface ReportSummaryProps {
  allResults: AllAnalysisResults;
  uploadedFiles: UploadedFile[]; // Kept for potential future use, but logic now favors fileSets
  fileSets: Map<string, FileSet>;
}

const StatCard: React.FC<{ icon: React.FC<{ className?: string }>, title: string; value: number | string; color: string }> = ({ icon: Icon, title, value, color }) => (
    <div className="bg-slate-50 dark:bg-slate-900/70 p-4 rounded-lg flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color.replace('text-', 'bg-').replace('500', '100')} dark:${color.replace('text-', 'bg-').replace('500', '900/50')}`}>
            <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        </div>
    </div>
);


const ReportSummary: React.FC<ReportSummaryProps> = ({ allResults, fileSets }) => {
    const metrics = useMemo(() => {
        let compliantCount = 0;
        let warningCount = 0;
        let nonCompliantCount = 0;
        let totalAnalysesRun = 0;
        let aiAnalysesRun = 0;

        for (const fileResults of allResults.values()) {
            totalAnalysesRun += fileResults.size;
            for (const [standardId, results] of fileResults.entries()) {
                if (standardId === 'ai') {
                    aiAnalysesRun++;
                    const summary = results as AISummary;
                    if (summary.errors?.length > 0) nonCompliantCount++;
                    if (summary.warnings?.length > 0) warningCount++;
                } else {
                    const analysisResults = results as AnalysisResult[];
                    analysisResults.forEach(result => {
                        if (result.status === 'compliant') compliantCount++;
                        else if (result.status === 'warning') warningCount++;
                        else if (result.status === 'non-compliant') nonCompliantCount++;
                    });
                }
            }
        }

        return {
            totalFileSets: fileSets.size,
            totalAnalysesRun,
            compliantCount,
            warningCount,
            nonCompliantCount,
        };
    }, [allResults, fileSets]);

    const totalRulesChecked = metrics.compliantCount + metrics.warningCount + metrics.nonCompliantCount;

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg print-shadow-none print-border">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">Executive Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <StatCard icon={FolderIcon} title="File Sets" value={metrics.totalFileSets} color="text-slate-500" />
                <StatCard icon={CodeBracketIcon} title="Analyses Run" value={metrics.totalAnalysesRun} color="text-indigo-500" />
                <StatCard icon={CheckCircleIcon} title="Compliant" value={metrics.compliantCount} color="text-green-500" />
                <StatCard icon={ExclamationTriangleIcon} title="Warnings" value={metrics.warningCount} color="text-yellow-500" />
                <StatCard icon={XCircleIcon} title="Non-Compliant" value={metrics.nonCompliantCount} color="text-red-500" />
            </div>
            {totalRulesChecked > 0 && (
                 <div className="mt-6 flex items-center justify-center gap-6 text-center">
                    <div>
                        <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                           {((metrics.compliantCount / totalRulesChecked) * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Rule Compliance</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportSummary;