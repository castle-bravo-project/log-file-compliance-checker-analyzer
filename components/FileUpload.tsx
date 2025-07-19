import React, { useState, useCallback } from 'react';
import { FileUploadIcon } from './icons';

// Extend FileSystemEntry to include the webkitGetAsEntry method
declare global {
  interface DataTransferItem {
    webkitGetAsEntry(): FileSystemEntry | null;
  }
}

interface FileUploadProps {
  onUpload: (entries: FileSystemEntry[]) => void;
  disabled: boolean;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUpload, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleEntries = useCallback((items: DataTransferItemList | null) => {
    if (items && items.length > 0) {
      const entries = Array.from(items)
        .map(item => item.webkitGetAsEntry())
        .filter((entry): entry is FileSystemEntry => entry !== null);
      if (entries.length > 0) {
        onUpload(entries);
      }
    }
  }, [onUpload]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      handleEntries(e.dataTransfer.items);
    }
  };

  const borderStyle = isDragging 
    ? 'border-indigo-500' 
    : 'border-slate-300 dark:border-slate-600';

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto p-8 border-2 border-dashed rounded-xl transition-colors duration-300 ${borderStyle} ${disabled ? 'bg-slate-100 dark:bg-slate-800' : 'bg-white dark:bg-slate-800/50'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center justify-center space-y-4 text-center">
        <FileUploadIcon className="w-16 h-16 text-slate-400 dark:text-slate-500" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          Drag & drop folder(s) containing log files here
        </p>
        <p className="text-slate-500 dark:text-slate-400">
          The application will automatically find and group relevant files.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 pt-4">
            Supported files: details.txt, downloadstatus.xml, netstat.txt
        </p>
      </div>
    </div>
  );
};

export default FileUpload;