import React from 'react';

// A rule for checking the presence or absence of a pattern.
export interface RegexRule {
  type: 'regex';
  id: string;
  description: string;
  regex: RegExp;
  expected: boolean; // true if the pattern should be present, false if it should be absent
  level?: 'warning' | 'error'; // If a check fails, 'warning' level will not fail the compliance.
}

// A conditional rule that first checks for a condition before evaluating a target pattern.
export interface ConditionalRegexRule {
  type: 'conditional-regex';
  id: string;
  description: string;
  conditionRegex: RegExp; // If this pattern is found...
  targetRegex: RegExp;    // ...then evaluate this pattern.
  expected: boolean;      // Expected result for the target pattern evaluation.
  level?: 'warning' | 'error';
}

// A rule for checking if the number of occurrences of a pattern exceeds a limit.
export interface CountRule {
  type: 'count';
  id: string;
  description: string;
  regex: RegExp;
  maxOccurrences: number; // Non-compliant if findings > maxOccurrences
  sumCapturedGroup?: number; // Optional: if present, sum the integer value of this captured group instead of counting lines.
}

// A rule for checking for a sequence of patterns within a time window.
export interface SequenceRule {
  type: 'sequence';
  id: string;
  description: string;
  steps: RegExp[]; // An array of regex patterns that must occur in order
  maxTimeGap: number; // Maximum seconds allowed between consecutive steps
  maxOccurrences: number; // Non-compliant if the full sequence is found more than this many times
}

// A rule for checking if the remote peer is a full seed.
export interface CompletionCheckRule {
  type: 'completion';
  id:string;
  description: string;
  // Regex to find the remote peer's progress. Must have two capture groups: 1 for possessed, 2 for total.
  // The check fails if possessed < total.
  peerProgressRegex: RegExp;
}

// A rule that depends on the outcome of other rules.
export interface CompoundRule {
  type: 'compound';
  id: string;
  description: string;
  // The IDs of the rules this one depends on.
  ruleIds: string[];
  // 'OR': Compliant if at least one dependent rule is 'compliant'.
  operator: 'OR';
  level: 'error';
}

// A rule for validating start/end timestamps in an XML document.
export interface XMLTimestampRule {
  type: 'xml-timestamp';
  id: string;
  description: string;
  startTag: string; // e.g., 'started'
  endTag: string;   // e.g., 'ended'
}

export type StandardRule = RegexRule | CountRule | SequenceRule | CompletionCheckRule | CompoundRule | XMLTimestampRule | ConditionalRegexRule;

export interface AnalysisResult {
  rule: StandardRule;
  status: 'compliant' | 'non-compliant' | 'warning';
  findings: string[]; // Log lines that match the regex or are part of a sequence
  findingCount?: number; // Total number of findings for count or sequence rules
  completionDetails?: {
    total: number;
    possessed: number;
  };
}

export interface AnalysisStandard {
  id:string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  rules: StandardRule[];
}

// Defines the structure for the AI-powered analysis report.
export interface AISummary {
  errors: string[];
  warnings: string[];
  incompleteTransactions: string[];
}

// Defines the structure for a file uploaded by the user, including its content and hashes.
export interface UploadedFile {
    file: File;
    name: string;
    content: string;
    hashes: {
        md5: string;
        sha1: string;
        sha256: string;
    };
}

// Extends UploadedFile with context about its path within a directory structure.
export interface BatchFile extends UploadedFile {
  relativePath: string;
}

// Groups related files from a single uploaded folder for batch analysis.
export interface FileSet {
  id: string; // Typically the folder name
  detailsFile: BatchFile | null;
  xmlFile: BatchFile | null;
  netstatFile: BatchFile | null;
}


// Defines the structure for storing all analysis results, keyed by filename.
export type AllAnalysisResults = Map<string, Map<string, AnalysisResult[] | AISummary>>;