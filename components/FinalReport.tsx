import React, { useState, useEffect } from 'react';
import { AISummary, AnalysisResult, AnalysisStandard, StandardRule, AllAnalysisResults, FileSet, BatchFile } from '../types';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, ClockIcon, FingerPrintIcon, FolderIcon } from './icons';
import { calculateTextHash } from '../services/hashing';
import ReportSummary from './ReportSummary';

interface FinalReportProps {
  allResults: AllAnalysisResults;
  fileSets: Map<string, FileSet>;
  standards: AnalysisStandard[];
  onClose: () => void;
}

const getStatusInfo = (status: AnalysisResult['status']) => {
  switch (status) {
    case 'compliant': return { Icon: CheckCircleIcon, color: 'text-green-500', text: 'Compliant' };
    case 'warning': return { Icon: ExclamationTriangleIcon, color: 'text-yellow-500', text: 'Warning' };
    case 'non-compliant': return { Icon: XCircleIcon, color: 'text-red-500', text: 'Non-Compliant' };
  }
};

const renderRuleLogic = (rule: StandardRule) => {
    let logicString = `Type: ${rule.type}\n`;
    switch (rule.type) {
        case 'regex':
            logicString += `Pattern: /${rule.regex.source}/${rule.regex.flags}\n`;
            logicString += `Condition: Must be ${rule.expected ? 'present' : 'absent'}`;
            break;
        case 'conditional-regex':
            logicString += `Condition Pattern: /${rule.conditionRegex.source}/${rule.conditionRegex.flags}\n`;
            logicString += `Target Pattern: /${rule.targetRegex.source}/${rule.targetRegex.flags}\n`;
            logicString += `Evaluation: If condition matches, target must be ${rule.expected ? 'present' : 'absent'}`;
            break;
        case 'count':
            logicString += `Pattern: /${rule.regex.source}/${rule.regex.flags}\n`;
            logicString += `Limit: Max ${rule.maxOccurrences} occurrences`;
            if (rule.sumCapturedGroup) {
                logicString += `\nMode: Sum capture group ${rule.sumCapturedGroup}`;
            }
            break;
        case 'sequence':
            logicString += `Steps:\n${rule.steps.map(r => `  - /${r.source}/`).join('\n')}\n`;
            logicString += `Time Limit: ${rule.maxTimeGap}s between steps`;
            break;
        case 'completion':
            logicString += `Peer Progress Pattern: /${rule.peerProgressRegex.source}/${rule.peerProgressRegex.flags}`;
            break;
        case 'compound':
            logicString += `Operator: ${rule.operator}\n`;
            logicString += `Dependencies: [${rule.ruleIds.join(', ')}]`;
            break;
        case 'xml-timestamp':
             logicString += `Start Tag: <${rule.startTag}>\n`;
             logicString += `End Tag: <${rule.endTag}>`;
             break;
    }
    return logicString;
};

const FinalReport: React.FC<FinalReportProps> = ({ allResults, fileSets, standards, onClose }) => {
  const [openDetails, setOpenDetails] = useState<Record<string, boolean>>({});
  const [reportHash, setReportHash] = useState<string>('Calculating...');

  useEffect(() => {
    // Generate a stable JSON representation of the report data to be hashed.
    const getSerializableReport = () => {
        const reportObject: any = {};
        const sortedFileSetEntries = [...fileSets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
        
        reportObject.fileSets = sortedFileSetEntries.map(([setName, fileSet]) => {
            const fileSetData: any = { name: setName };
            
            const processFile = (file: BatchFile | null) => {
                if (!file) return null;
                const fileAnalyses: any = {};
                const fileResults = allResults.get(file.name);
                if (fileResults) {
                     const sortedStandards = standards
                        .filter(s => fileResults.has(s.id))
                        .sort((a, b) => a.id.localeCompare(b.id));

                    for (const standard of sortedStandards) {
                        fileAnalyses[standard.id] = fileResults.get(standard.id);
                    }
                }
                return {
                    name: file.name,
                    relativePath: file.relativePath,
                    hashes: file.hashes,
                    analyses: fileAnalyses
                };
            };
            
            fileSetData.detailsFile = processFile(fileSet.detailsFile);
            fileSetData.xmlFile = processFile(fileSet.xmlFile);
            fileSetData.netstatFile = processFile(fileSet.netstatFile);
            
            return fileSetData;
        });

        // JSON.stringify with a replacer to handle Map serialization
        return JSON.stringify(reportObject, (key, value) => {
             if(value instanceof Map) {
                return Object.fromEntries(new Map(Array.from(value.entries()).sort()));
             }
             return value;
        }, 2);
    };

    calculateTextHash(getSerializableReport()).then(setReportHash);
  }, [allResults, fileSets, standards]);


  const toggleDetails = (id: string) => {
    setOpenDetails(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const analyzedFileSets = Array.from(fileSets.values()).filter(set => {
    const detailsAnalyses = set.detailsFile ? allResults.get(set.detailsFile.name)?.size || 0 : 0;
    const xmlAnalyses = set.xmlFile ? allResults.get(set.xmlFile.name)?.size || 0 : 0;
    return detailsAnalyses > 0 || xmlAnalyses > 0;
  });


  return (
    <>
      <style>{`
        @media print {
          body { 
            background-color: white !important;
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .print-break-before { break-before: page; }
          .print-shadow-none { box-shadow: none !important; }
          .print-border { border: 1px solid #e2e8f0; }
        }
      `}</style>
      <div className="w-full max-w-4xl mx-auto space-y-8">
        {/* --- Header --- */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg print-shadow-none print-border">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Comprehensive Analysis Report</h1>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Report Generated: {new Date().toLocaleString()}
              </p>
            </div>
            <div className="no-print flex gap-2">
              <button onClick={() => window.print()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">Print</button>
              <button onClick={onClose} className="rounded-md bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">Close</button>
            </div>
          </div>
        </div>

        {/* --- Summary Section --- */}
        <ReportSummary allResults={allResults} uploadedFiles={[]} fileSets={fileSets} />


        {/* --- Analysis Sections --- */}
        {analyzedFileSets.map((fileSet, index) => {
          const printClass = index > 0 ? 'print-break-before' : '';
          const allFilesInSet = [fileSet.detailsFile, fileSet.xmlFile, fileSet.netstatFile].filter((f): f is BatchFile => f !== null);

          return (
            <div key={fileSet.id} className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg print-shadow-none print-border ${printClass}`}>
                {/* File Set Header */}
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <FolderIcon className="w-8 h-8 text-indigo-500" />
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{fileSet.id}</h2>
                    </div>
                </div>
                
                {/* Analyses for each file in this set */}
                {allFilesInSet.map(file => {
                    const fileResults = allResults.get(file.name);
                    if (!fileResults || fileResults.size === 0) return null; // Only show files with results
                    const analyzedStandards = standards.filter(s => fileResults.has(s.id));

                    return (
                        <div key={file.name} className="border-t border-slate-200 dark:border-slate-700">
                            {/* File Header */}
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">{file.name}</h3>
                                <div className="mt-3">
                                    <h4 className="text-sm font-semibold text-slate-600 dark:text-slate-300">File Integrity Hashes</h4>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono space-y-1 mt-2">
                                        <p><span className="font-semibold w-16 inline-block">MD5:</span> {file.hashes.md5}</p>
                                        <p><span className="font-semibold w-16 inline-block">SHA-1:</span> {file.hashes.sha1}</p>
                                        <p><span className="font-semibold w-16 inline-block">SHA-256:</span> {file.hashes.sha256}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Analysis Results for this file */}
                            {analyzedStandards.map((standard) => {
                                const resultData = fileResults.get(standard.id);
                                if (!resultData) return null;
                                const isAI = standard.id === 'ai';
                                return(
                                    <div key={standard.id} className="px-6 pb-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <standard.icon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-100">{standard.name}</h4>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {isAI ? (
                                                <AIResultDisplay summary={resultData as AISummary} />
                                            ) : (
                                                (resultData as AnalysisResult[])?.map(res => (
                                                    <RuleResultDisplay key={res.rule.id} result={res} isOpen={!!openDetails[`${file.name}-${res.rule.id}`]} onToggle={() => toggleDetails(`${file.name}-${res.rule.id}`)} />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                })}
            </div>
          );
        })}
        
        {/* --- Footer --- */}
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-lg print-shadow-none print-border">
             <div className="flex items-start gap-3">
                <FingerPrintIcon className="w-6 h-6 text-slate-500 flex-shrink-0" />
                <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Report Integrity Hash (SHA-256)</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono break-all mt-1">{reportHash}</p>
                </div>
             </div>
        </div>
      </div>
    </>
  );
};

const AIResultDisplay: React.FC<{summary: AISummary}> = ({ summary }) => (
    <div className="space-y-6 pl-4">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <XCircleIcon className="w-6 h-6 text-red-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Errors</h3>
            </div>
            {summary.errors.length > 0 ? (
                <ul className="list-disc pl-12 text-slate-700 dark:text-slate-300 space-y-1">
                    {summary.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
            ) : <p className="pl-12 text-slate-500">No errors identified.</p>}
        </div>
        <div>
            <div className="flex items-center gap-3 mb-2">
                <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Warnings</h3>
            </div>
            {summary.warnings.length > 0 ? (
                <ul className="list-disc pl-12 text-slate-700 dark:text-slate-300 space-y-1">
                    {summary.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
            ) : <p className="pl-12 text-slate-500">No warnings identified.</p>}
        </div>
        <div>
            <div className="flex items-center gap-3 mb-2">
                <ClockIcon className="w-6 h-6 text-blue-500" />
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Incomplete Transactions</h3>
            </div>
            {summary.incompleteTransactions.length > 0 ? (
                <ul className="list-disc pl-12 text-slate-700 dark:text-slate-300 space-y-1">
                    {summary.incompleteTransactions.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
            ) : <p className="pl-12 text-slate-500">No incomplete transactions identified.</p>}
        </div>
    </div>
);


const RuleResultDisplay: React.FC<{ result: AnalysisResult; isOpen: boolean; onToggle: () => void }> = ({ result, isOpen, onToggle }) => {
    const statusInfo = getStatusInfo(result.status);
    const hasDetails = (result.status !== 'compliant' || result.findings.length > 0) && !(result.status === 'compliant' && result.findings[0]?.includes('not applicable'));
    
    return (
        <div className="bg-slate-50 dark:bg-slate-900/70 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <statusInfo.Icon className={`w-6 h-6 ${statusInfo.color} flex-shrink-0 mt-1`} />
                    <div>
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{result.rule.description}</p>
                        <span className={`text-sm font-bold ${statusInfo.color}`}>{statusInfo.text}</span>
                    </div>
                </div>
                {hasDetails && (
                    <button onClick={onToggle} className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400 no-print">
                        {isOpen ? 'Hide' : 'Details'}
                    </button>
                )}
            </div>
            {isOpen && hasDetails && (
                <div className="mt-4 pl-9 space-y-4">
                    <div>
                        <h4 className="font-semibold text-sm text-slate-600 dark:text-slate-300 mb-1">Analysis Logic</h4>
                        <pre className="bg-slate-200 dark:bg-slate-950 rounded-md p-3 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                            <code>{renderRuleLogic(result.rule)}</code>
                        </pre>
                    </div>
                    {result.findings.length > 0 && (
                        <div>
                            <h4 className="font-semibold text-sm text-slate-600 dark:text-slate-300 mb-1">Findings</h4>
                            <pre className="bg-slate-200 dark:bg-slate-950 rounded-md p-3 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                                <code>{result.findings.join('\n').replace(/---/g, '\n— sequence boundary —\n')}</code>
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export default FinalReport;