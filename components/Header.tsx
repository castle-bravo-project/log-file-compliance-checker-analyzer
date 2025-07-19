
import React from 'react';
import { DocumentTextIcon } from './icons';

interface HeaderProps {
  onReset: () => void;
}

const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="w-full text-center p-6 bg-white dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
      <button onClick={onReset} className="group flex items-center justify-center gap-4 mx-auto text-left" aria-label="Reset and go home">
        <DocumentTextIcon className="w-10 h-10 text-indigo-500 group-hover:text-indigo-600 transition-colors" />
        <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            Log File Compliance Checker
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
            Upload and analyze your software logs against predefined standards.
            </p>
        </div>
      </button>
    </header>
  );
};

export default Header;