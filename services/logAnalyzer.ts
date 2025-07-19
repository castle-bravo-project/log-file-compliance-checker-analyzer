

import { GoogleGenAI, Type } from '@google/genai';
import { StandardRule, AnalysisResult, SequenceRule, AISummary, CompoundRule, CompletionCheckRule, XMLTimestampRule, ConditionalRegexRule } from '../types';

const parseTimestamp = (line: string): Date | null => {
  const match = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  if (match) {
    return new Date(match[1]);
  }
  return null;
};

export const analyzeLog = (logContent: string, rules: StandardRule[], netstatContent: string | null = null): AnalysisResult[] => {
  const logLines = logContent.split('\n');
  const resultsById: Map<string, AnalysisResult> = new Map();

  const nonCompoundRules = rules.filter(rule => rule.type !== 'compound');

  for (const rule of nonCompoundRules) {
      let result: AnalysisResult | null = null;
      // Handle regex presence/absence rules
      if (rule.type === 'regex') {
        const searchRegex = new RegExp(rule.regex.source, rule.regex.flags);
        const findings = logContent.match(searchRegex) || [];
        const isPresent = findings.length > 0;
        const pass = rule.expected ? isPresent : !isPresent;
        
        const level = rule.level ?? 'error';
        const status = pass ? 'compliant' : (level === 'warning' ? 'warning' : 'non-compliant');

        result = { rule, status, findings: findings.map(f => f.trim()) };
      }

      // Handle conditional regex rules
      else if (rule.type === 'conditional-regex') {
        const condRule = rule as ConditionalRegexRule;
        const conditionMet = condRule.conditionRegex.test(logContent);

        if (!conditionMet) {
            // If the condition isn't met, the rule is not applicable, which we'll treat as compliant.
            result = {
                rule,
                status: 'compliant',
                findings: ['Condition for this check was not met (e.g., FOI option disabled); check is not applicable.'],
            };
        } else {
            // Condition is met, so we proceed with the target regex check.
            const searchRegex = new RegExp(condRule.targetRegex.source, condRule.targetRegex.flags);
            const findings = logContent.match(searchRegex) || [];
            const isPresent = findings.length > 0;
            const pass = condRule.expected ? isPresent : !isPresent;

            const level = condRule.level ?? 'error';
            const status = pass ? 'compliant' : (level === 'warning' ? 'warning' : 'non-compliant');

            result = {
                rule,
                status,
                findings: findings.map(f => f.trim()),
            };
        }
      }

      // Handle count-based rules
      else if (rule.type === 'count') {
        const searchRegex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
        let findings: string[] = [];
        let findingCount = 0;

        if (rule.sumCapturedGroup && rule.sumCapturedGroup > 0) {
          let match;
          while ((match = searchRegex.exec(logContent)) !== null) {
            findings.push(match[0].trim());
            if (match[rule.sumCapturedGroup]) {
              const capturedValue = parseInt(match[rule.sumCapturedGroup], 10);
              if (!isNaN(capturedValue)) {
                findingCount += capturedValue;
              }
            }
          }
        } else {
          findings = (logContent.match(searchRegex) || []).map(f => f.trim());
          findingCount = findings.length;
        }

        let compliant = findingCount <= rule.maxOccurrences;
        let finalFindings = findings;
        
        // --- Special logic for 'rapid-peer-churn' with netstat data ---
        if (rule.id === 'rapid-peer-churn' && netstatContent) {
          // Count different connection states from netstat. Regex accounts for leading spaces.
          const establishedCount = (netstatContent.match(/^ *tcp.*ESTABLISHED/gim) || []).length;
          const closingCount = (netstatContent.match(/^ *tcp.*(TIME_WAIT|CLOSE_WAIT|FIN_WAIT_1|FIN_WAIT_2)/gim) || []).length;
          const totalConnections = establishedCount + closingCount;

          const logChurnCount = findingCount; // 'findingCount' is already the log's churn count

          // Define anomaly conditions
          const highLogChurn = logChurnCount > 100;
          // Anomaly if closing connections outnumber established ones and there's a significant number of total connections.
          const unhealthyNetstatState = closingCount > establishedCount && totalConnections > 20;

          let isNonCompliant = false;
          let summaryMessage = "";

          if (highLogChurn && unhealthyNetstatState) {
            isNonCompliant = true;
            summaryMessage = `Critical churn detected. The log shows ${logChurnCount} connection events, and the netstat data reveals an unstable network state with ${closingCount} connections closing and only ${establishedCount} fully established. This strongly indicates rapid, failed connection cycling.`;
          } else if (unhealthyNetstatState) {
            isNonCompliant = true;
            summaryMessage = `Unstable network state detected. The netstat data shows a high number of closing connections (${closingCount}) compared to established ones (${establishedCount}). This is a strong indicator of connection churn.`;
          } else if (highLogChurn && establishedCount < 5 && closingCount === 0) {
            // Original logic is still valid for cases of high churn but few connections overall.
            isNonCompliant = true;
            summaryMessage = `High peer churn detected. The log shows ${logChurnCount} connection events, while the netstat snapshot shows only ${establishedCount} established connections. This suggests highly unstable or brief sessions.`;
          }
          
          if (isNonCompliant) {
            compliant = false;
            finalFindings = [summaryMessage];
          }
        }


        result = {
          rule,
          status: compliant ? 'compliant' : 'non-compliant',
          findings: finalFindings,
          findingCount,
        };
      }

      // Handle sequence-based rules
      else if (rule.type === 'sequence') {
          let sequenceCount = 0;
          const allFindings: string[] = [];
          let currentStep = 0;
          let lastTimestamp: Date | null = null;
          let currentSequenceFindings: string[] = [];

          for (const line of logLines) {
              const lineTimestamp = parseTimestamp(line);
              if (rule.steps[currentStep].test(line)) {
                  if (currentStep > 0 && lineTimestamp && lastTimestamp) {
                      const timeDiff = (lineTimestamp.getTime() - lastTimestamp.getTime()) / 1000;
                      if (timeDiff > rule.maxTimeGap) {
                          currentStep = 0;
                          currentSequenceFindings = [];
                      }
                  }
                  if (currentStep === 0 && rule.steps[0].test(line)) {
                      currentSequenceFindings.push(line.trim());
                      lastTimestamp = lineTimestamp;
                      currentStep++;
                  } else if (currentStep > 0) {
                      currentSequenceFindings.push(line.trim());
                      lastTimestamp = lineTimestamp;
                      currentStep++;
                  }
                  if (currentStep === rule.steps.length) {
                      sequenceCount++;
                      allFindings.push(...currentSequenceFindings, '---');
                      currentStep = 0;
                      currentSequenceFindings = [];
                  }
              }
          }
          const compliant = sequenceCount <= rule.maxOccurrences;
          result = {
              rule,
              status: compliant ? 'compliant' : 'non-compliant',
              findings: allFindings.length > 0 ? allFindings.slice(0, -1) : [],
              findingCount: sequenceCount,
          };
      }

      // Handle completion check rules
      else if (rule.type === 'completion') {
        const completionRule = rule as CompletionCheckRule;
        
        let status: 'compliant' | 'non-compliant' | 'warning' = 'compliant';
        let findings: string[] = [];
        let completionDetails: { possessed: number; total: number } | undefined;
        
        const peerProgressRegex = new RegExp(completionRule.peerProgressRegex.source, completionRule.peerProgressRegex.flags.includes('g') ? completionRule.peerProgressRegex.flags : completionRule.peerProgressRegex.flags + 'g');
        let match;
        
        // The goal is to find any explicit report from the remote peer that it is NOT a full seed.
        // If no such report is found, the check is considered compliant per the requirements.
        while ((match = peerProgressRegex.exec(logContent)) !== null) {
            if (match[1] && match[2]) {
                const possessed = parseInt(match[1], 10);
                const total = parseInt(match[2], 10);
                
                if (possessed < total) {
                    // This is explicit evidence that the remote peer is not a full seed.
                    status = 'non-compliant';
                    findings = [`Remote peer is not a full seed. It reported possessing ${possessed} of ${total} pieces.`];
                    completionDetails = { possessed, total };
                    break; // One failed report is sufficient to fail the check.
                }
            }
        }
        
        result = {
          rule,
          status,
          findings,
          completionDetails,
        };
      }

      // Handle XML Timestamp rules
      else if (rule.type === 'xml-timestamp') {
        const tsRule = rule as XMLTimestampRule;
        const startRegex = new RegExp(`<${tsRule.startTag}>(.*?)</${tsRule.startTag}>`);
        const endRegex = new RegExp(`<${tsRule.endTag}>(.*?)</${tsRule.endTag}>`);

        const startMatch = logContent.match(startRegex);
        const endMatch = logContent.match(endRegex);

        let status: 'compliant' | 'non-compliant' = 'non-compliant';
        let findings: string[] = [];

        if (startMatch && startMatch[1] && endMatch && endMatch[1]) {
            const startStr = startMatch[1];
            const endStr = endMatch[1];
            
            try {
                const startNanos = BigInt(startStr);
                const endNanos = BigInt(endStr);

                // Convert to Date objects for human-readable output
                const startDate = new Date(Number(startNanos / 1_000_000n));
                const endDate = new Date(Number(endNanos / 1_000_000n));
                
                // Duration can be negative if clocks are skewed, but it should be a valid number.
                const durationNanos = endNanos - startNanos;
                const durationSeconds = Number(durationNanos) / 1_000_000_000;

                status = 'compliant';
                findings.push(`Start time: ${startDate.toLocaleString()} (${startStr})`);
                findings.push(`End time: ${endDate.toLocaleString()} (${endStr})`);
                findings.push(`Calculated duration: ${durationSeconds.toFixed(3)} seconds`);

            } catch (e) {
                status = 'non-compliant';
                findings.push('Failed to parse one or more timestamps as a valid number.');
                if (!startMatch || !startMatch[1]) findings.push(`Could not parse value from tag: <${tsRule.startTag}>`);
                if (!endMatch || !endMatch[1]) findings.push(`Could not parse value from tag: <${tsRule.endTag}>`);
            }
        } else {
            status = 'non-compliant';
            if (!startMatch || !startMatch[1]) findings.push(`Required tag <${tsRule.startTag}> not found or is empty.`);
            if (!endMatch || !endMatch[1]) findings.push(`Required tag <${tsRule.endTag}> not found or is empty.`);
        }

        result = {
            rule,
            status,
            findings,
        };
      }

      if (result) {
        resultsById.set(rule.id, result);
      } else {
         resultsById.set(rule.id, {
            rule,
            status: 'non-compliant',
            findings: [`Rule type '${(rule as any).type}' not implemented`],
        });
      }
  }

  const compoundRules = rules.filter(rule => rule.type === 'compound') as CompoundRule[];
  for (const rule of compoundRules) {
    let isCompliant = false;
    if (rule.operator === 'OR') {
      isCompliant = rule.ruleIds.some(id => resultsById.get(id)?.status === 'compliant');
    }
    
    const result: AnalysisResult = {
      rule,
      status: isCompliant ? 'compliant' : 'non-compliant',
      findings: isCompliant ? [] : ['This critical combination check failed because the client could not connect using any of the required methods.'],
    };
    resultsById.set(rule.id, result);
  }

  return rules.map(rule => resultsById.get(rule.id)).filter((r): r is AnalysisResult => !!r);
};

// --- AI Analysis ---

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const summarySchema = {
    type: Type.OBJECT,
    properties: {
        errors: {
            type: Type.ARRAY,
            description: "A list of all critical error messages, exceptions, or failures found in the log. Each item should be a direct quote or a concise summary of one error.",
            items: { type: Type.STRING }
        },
        warnings: {
            type: Type.ARRAY,
            description: "A list of all non-critical warnings or potential issues found in the log. Each item should summarize one warning.",
            items: { type: Type.STRING }
        },
        incompleteTransactions: {
            type: Type.ARRAY,
            description: "A list of any multi-step operations or transactions that were started but do not appear to have a corresponding completion, success, or resolution message in the log. For example, a 'session started' without a 'session ended'.",
            items: { type: Type.STRING }
        }
    },
    required: ["errors", "warnings", "incompleteTransactions"]
};

export const analyzeLogWithAI = async (logContent: string): Promise<AISummary> => {
    // Truncate very large logs to avoid hitting model input limits
    const maxLogLength = 100000; // Character limit
    const truncatedLog = logContent.length > maxLogLength ? logContent.substring(0, maxLogLength) : logContent;

    const prompt = `
        You are an expert log file analysis system.
        Your task is to thoroughly analyze the following log file content and identify three distinct categories of issues:
        1.  **Errors**: Find all explicit error messages, stack traces, fatal errors, or messages indicating a definitive failure.
        2.  **Warnings**: Find all messages that indicate a potential problem but are not critical failures. This includes deprecation notices, performance warnings, or unusual but non-failing states.
        3.  **Incomplete Transactions**: Identify any processes, sessions, handshakes, or data transfers that are initiated but do not have a corresponding success, completion, or termination message within the provided log. For example, a 'session started' without a 'session ended'.

        Review the entire log and extract these items. Present your findings in the requested JSON format. If a category has no items, return an empty array for it.

        Log Content to Analyze:
        """
        ${truncatedLog}
        """
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: summarySchema,
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as AISummary;

    } catch (error) {
        console.error("Error analyzing log with AI:", error);
        let errorMessage = "The AI analysis failed. This could be due to a network issue or an API error. Please check the browser console for technical details.";
        if (error instanceof Error && error.message.includes('API key')) {
          errorMessage = "The AI analysis failed. The Google AI API key is not configured correctly."
        }
        return {
            errors: [errorMessage],
            warnings: [],
            incompleteTransactions: [],
        };
    }
};