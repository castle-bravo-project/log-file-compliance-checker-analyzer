import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import FileUpload from './components/FileUpload';
import Spinner from './components/Spinner';
import { analyzeLog, analyzeLogWithAI } from './services/logAnalyzer';
import { calculateHashes } from './services/hashing';
import { AVAILABLE_STANDARDS } from './constants';
import { AnalysisResult, AnalysisStandard, AISummary, AllAnalysisResults, BatchFile, FileSet } from './types';
import FinalReport from './components/FinalReport';
import FileDashboard from './components/FileDashboard';

// --- Type guards for FileSystem API ---
interface FileSystemDirectoryReader {
  readEntries(callback: (entries: FileSystemEntry[]) => void, errorCallback?: (error: Error) => void): void;
}
interface FileSystemEntry {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
  fullPath: string;
  createReader?(): FileSystemDirectoryReader;
  file?(callback: (file: File) => void, errorCallback?: (error: Error) => void): void;
}

function App() {
  // Global App State
  const [fileSets, setFileSets] = useState<Map<string, FileSet>>(new Map());
  const [allAnalysisResults, setAllAnalysisResults] = useState<AllAnalysisResults>(new Map());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  
  // State for showing the final comprehensive report
  const [showFinalReport, setShowFinalReport] = useState<boolean>(false);

  // --- File Processing Logic ---

  const getFileFromFileEntry = (fileEntry: FileSystemEntry): Promise<File> => {
    return new Promise((resolve, reject) => {
        fileEntry.file?.(
            (file) => resolve(file),
            (err) => reject(err)
        );
    });
  };

  const readDirectoryEntries = (directoryReader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
          directoryReader.readEntries(
              (entries) => resolve(entries),
              (err) => reject(err)
          );
      });
  };

  const traverseFileTree = async (entry: FileSystemEntry, path: string, allFiles: BatchFile[]): Promise<void> => {
      if (entry.isFile) {
          const file = await getFileFromFileEntry(entry);
          const relevantFiles = ['details.txt', 'downloadstatus.xml', 'netstat.txt'];
          if (relevantFiles.includes(file.name.toLowerCase())) {
            setLoadingMessage(`Hashing ${file.name}...`);
            const hashes = await calculateHashes(file);
            const content = await file.text();
            allFiles.push({ file, name: file.name, content, hashes, relativePath: path + file.name });
          }
      } else if (entry.isDirectory) {
          const dirReader = entry.createReader!();
          let entries;
          do {
            entries = await readDirectoryEntries(dirReader);
            for (const subEntry of entries) {
                await traverseFileTree(subEntry, path + entry.name + '/', allFiles);
            }
          } while (entries.length > 0);
      }
  };

  const handleUpload = useCallback(async (entries: FileSystemEntry[]) => {
    setIsLoading(true);
    setLoadingMessage('Processing dropped files and folders...');
    const allFiles: BatchFile[] = [];

    await Promise.all(entries.map(entry => traverseFileTree(entry, '', allFiles)));

    const newFileSets = new Map<string, FileSet>();
    for (const file of allFiles) {
        const pathParts = file.relativePath.split('/');
        const folderName = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
        
        if (!newFileSets.has(folderName)) {
            newFileSets.set(folderName, { id: folderName, detailsFile: null, xmlFile: null, netstatFile: null });
        }
        const set = newFileSets.get(folderName)!;

        switch (file.name.toLowerCase()) {
            case 'details.txt':
                set.detailsFile = file;
                break;
            case 'downloadstatus.xml':
                set.xmlFile = file;
                break;
            case 'netstat.txt':
                set.netstatFile = file;
                break;
        }
    }
    
    setFileSets(newFileSets);
    setAllAnalysisResults(new Map()); // Clear old results
    setShowFinalReport(false);
    setIsLoading(false);
    setLoadingMessage('');
  }, []);

  const runBatchAnalysis = useCallback(async () => {
    setIsLoading(true);
    const newAllResults: AllAnalysisResults = new Map();
    const analysisPromises: Promise<void>[] = [];
    const standardsToRun = AVAILABLE_STANDARDS;
    
    let filesProcessed = 0;
    const totalFilesToProcess = Array.from(fileSets.values()).reduce((acc, set) => {
        if (set.detailsFile) acc++;
        if (set.xmlFile) acc++;
        return acc;
    }, 0);

    const runAndStoreAnalysis = async (file: BatchFile, standard: AnalysisStandard, netstatContent: string | null) => {
        let report;
        if (standard.id === 'ai') {
            report = await analyzeLogWithAI(file.content);
        } else {
            report = analyzeLog(file.content, standard.rules, netstatContent);
        }
        
        if (!newAllResults.has(file.name)) {
            newAllResults.set(file.name, new Map());
        }
        newAllResults.get(file.name)!.set(standard.id, report);
    };

    for (const fileSet of fileSets.values()) {
        if (fileSet.detailsFile) {
            const detailsFile = fileSet.detailsFile;
            const netstatContent = fileSet.netstatFile?.content || null;
            
            const detailsStandards = standardsToRun.filter(s => ['general', 'bittorrent', 'security', 'ai'].includes(s.id));
            
            analysisPromises.push(
                (async () => {
                     setLoadingMessage(`Analyzing ${detailsFile.name} (Set: ${fileSet.id})`);
                     await Promise.all(detailsStandards.map(std => runAndStoreAnalysis(detailsFile, std, netstatContent)));
                     filesProcessed++;
                     setLoadingMessage(`Analyzed ${filesProcessed}/${totalFilesToProcess} files...`);
                })()
            );
        }

        if (fileSet.xmlFile) {
            const xmlFile = fileSet.xmlFile;
            const xmlStandard = standardsToRun.find(s => s.id === 'xml-tdr');
            if (xmlStandard) {
                 analysisPromises.push(
                    (async () => {
                        setLoadingMessage(`Analyzing ${xmlFile.name} (Set: ${fileSet.id})`);
                        await runAndStoreAnalysis(xmlFile, xmlStandard, null);
                        filesProcessed++;
                        setLoadingMessage(`Analyzed ${filesProcessed}/${totalFilesToProcess} files...`);
                    })()
                );
            }
        }
    }

    await Promise.all(analysisPromises);
    
    setAllAnalysisResults(newAllResults);
    setShowFinalReport(true);
    setIsLoading(false);
    setLoadingMessage('');
  }, [fileSets]);


  // --- Navigation and Reset Handlers ---
  
  const handleReset = () => {
    setFileSets(new Map());
    setAllAnalysisResults(new Map());
    setIsLoading(false);
    setShowFinalReport(false);
    setLoadingMessage('');
  };

  const handleCloseReport = () => {
      setShowFinalReport(false);
  };
  
  // --- Render Logic ---

  const renderContent = () => {
    if (isLoading) {
        return (
          <div className='flex flex-col items-center justify-center bg-white dark:bg-slate-800/50 p-8 rounded-xl'>
            <Spinner />
            <p className="mt-4 text-lg font-medium text-slate-600 dark:text-slate-300">
              {loadingMessage || 'Processing...'}
            </p>
          </div>
        );
    }
    
    // Final Report View
    if (showFinalReport) {
      return (
        <FinalReport
          allResults={allAnalysisResults}
          fileSets={fileSets}
          standards={AVAILABLE_STANDARDS}
          onClose={handleCloseReport}
        />
      );
    }
    
    // File Dashboard (main screen after upload)
    if (fileSets.size > 0) {
        return (
            <FileDashboard
                fileSets={fileSets}
                allResults={allAnalysisResults}
                onRunBatchAnalysis={runBatchAnalysis}
            />
        );
    }

    // Initial File Upload screen
    return <FileUpload onUpload={handleUpload} disabled={isLoading} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 font-sans text-slate-800 dark:text-slate-200">
      <Header onReset={handleReset} />
      <main className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </main>
       <footer className="text-center p-4 mt-8 text-sm text-slate-500 dark:text-slate-400 no-print">
          <p>Built with React, TypeScript, and Tailwind CSS. AI features powered by Google Gemini.</p>
       </footer>
    </div>
  );
}

export default App;