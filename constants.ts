

import { AnalysisStandard, StandardRule } from './types';
import { DocumentTextIcon, ShareIcon, ShieldCheckIcon, SparklesIcon, CodeBracketIcon } from './components/icons';

const GENERAL_LOG_STANDARD: StandardRule[] = [
  {
    type: 'regex',
    id: 'startup-initiated',
    description: 'Log must contain a system startup sequence initiation message.',
    regex: /System startup sequence initiated/i,
    expected: true,
  },
  {
    type: 'regex',
    id: 'license-check',
    description: 'A valid license check must be present in the log.',
    regex: /License check: VALID/i,
    expected: true,
  },
  {
    type: 'regex',
    id: 'services-started',
    description: 'Log must indicate that all services started successfully.',
    regex: /All services started successfully/i,
    expected: true,
  },
  {
    type: 'regex',
    id: 'no-errors',
    description: 'Log must not contain any "ERROR:" level messages.',
    regex: /^ERROR:/im,
    expected: false,
  },
  {
    type: 'regex',
    id: 'no-fatal-errors',
    description: 'Log must not contain any "FATAL:" level messages.',
    regex: /FATAL:/i,
    expected: false,
  },
  {
    type: 'regex',
    id: 'shutdown-complete',
    description: 'Log must contain a clean shutdown completion message.',
    regex: /Shutdown sequence complete/i,
    expected: true,
  },
];

const BITTORRENT_LOG_STANDARD: StandardRule[] = [
  {
    type: 'regex',
    id: 'bep-03-handshake',
    description: 'Must show successful peer handshakes.',
    regex: /(?:Handshake with peer [a-fA-F0-9:.]+ successful|Successfully exchanged handshakes)/i,
    expected: true,
  },
  {
    type: 'completion',
    id: 'download-complete',
    description: 'The connected remote peer must be a full seed. This check fails if the remote client explicitly reports possessing fewer pieces than the total required.',
    // This regex finds the remote peer's self-reported progress. It fails if possessed < total.
    peerProgressRegex: /Remote client acknowledges that it has piece: .*?\(possesses (\d+) of (\d+) pieces\)/ig,
  },
  {
    type: 'regex',
    id: 'bep-15-tracker-announce',
    description: 'Should show successful tracker announce requests. Absence may indicate a DHT-only session.',
    regex: /Tracker announce successful/i,
    expected: true,
    level: 'warning',
  },
  {
    type: 'regex',
    id: 'bep-05-dht-bootstrap',
    description: 'Should show successful DHT bootstrap. Absence may indicate a tracker-only session.',
    regex: /(?:DHT bootstrap successful|DHT node is now bootstrapped|DHT bootstrap complete)/i,
    expected: true,
    level: 'warning',
  },
   {
    type: 'compound',
    id: 'critical-connection-established',
    description: 'Client must establish a connection via Tracker OR DHT. Log indicates failure for both methods.',
    ruleIds: ['bep-15-tracker-announce', 'bep-05-dht-bootstrap'],
    operator: 'OR',
    level: 'error',
  },
  {
    type: 'regex',
    id: 'uninitialized-file-creation',
    description: 'Logs show creation of uninitialized files. This is normal behavior for pre-allocating storage space.',
    regex: /Created uninitialized file for index/i,
    expected: true,
  },
  {
    type: 'regex',
    id: 'error-peer-connection',
    description: 'Log must not contain peer connection errors.',
    regex: /Failed to connect to peer/i,
    expected: false,
  },
  {
    type: 'regex',
    id: 'error-tracker-timeout',
    description: 'Log should not contain tracker timeout errors. These indicate network issues or tracker unavailability when a tracker is in use.',
    regex: /Tracker request timed out/i,
    expected: false,
    level: 'warning',
  },
];

const SECURITY_ANOMALY_STANDARD: StandardRule[] = [
    {
      type: 'count',
      id: 'excessive-piece-requests',
      description: 'Checks for an abnormally high number of piece requests by summing requests from log lines. High totals can indicate a denial-of-service or buffer overrun attempt.',
      // Matches lines like "Sent 16 requests for data" or "Sent 1 piece request..."
      regex: /Sent (\d+) (?:piece request|requests for data)/ig,
      maxOccurrences: 10000,
      sumCapturedGroup: 1,
    },
    {
      type: 'count',
      id: 'rapid-peer-churn',
      description: 'Monitors for rapid connection/disconnection cycles with peers, a potential sign of network scanning or protocol abuse.',
      regex: /peer session (started|ended)/ig,
      maxOccurrences: 100,
    },
    {
      type: 'regex',
      id: 'malformed-message',
      description: 'Detects logs of malformed or unexpected messages received from peers, which can be an attack vector.',
      regex: /malformed message received/i,
      expected: false,
    },
    {
      type: 'count',
      id: 'choke-unchoke-spam',
      description: 'Flags excessive choke/unchoke state changes, which could be used to disrupt download/upload performance.',
      regex: /Received (a|an) (un)?choke message/ig,
      maxOccurrences: 200,
    },
    {
      type: 'sequence',
      id: 'suspicious-state-cycling',
      description: 'Detects rapid interested/not-interested cycles, which can indicate an inefficient client or a protocol manipulation attack.',
      steps: [
        /Sent a not interested message/i,
        /Sent an interested message/i,
        /Sent \d+ requests for data/i,
      ],
      maxTimeGap: 5, // Max 5 seconds between steps
      maxOccurrences: 50,
    }
  ];

const XML_TDR_STANDARD: StandardRule[] = [
    {
        type: 'xml-timestamp',
        id: 'xml-timestamps-valid',
        description: 'Validates the presence of start/end timestamps and calculates the duration.',
        startTag: 'started',
        endTag: 'ended',
    },
    {
        type: 'regex',
        id: 'xml-netstat-enabled',
        description: 'The \'netstat\' option must be enabled (`<netstat>true</netstat>`).',
        regex: /<netstat>true<\/netstat>/i,
        expected: true,
    },
    {
        type: 'regex',
        id: 'xml-foi-enabled',
        description: 'The \'File of Interest\' (foi) option must be enabled (`<foi>true</foi>`).',
        regex: /<foi>true<\/foi>/i,
        expected: true,
    },
    {
        type: 'conditional-regex',
        id: 'xml-all-files-are-foi',
        description: 'If the FOI option is enabled, all described files must also be classified as FOI. This check fails if any file is explicitly marked otherwise.',
        conditionRegex: /<foi>true<\/foi>/i,
        targetRegex: /<file>.*?\((?:not a FOI|FOI-false)\).*?<\/file>/ig,
        expected: false, // Fails if it finds any non-FOI files.
    },
    {
        type: 'regex',
        id: 'xml-location-uncertainty',
        description: 'Location data must include area or uncertainty values for accuracy.',
        regex: /<location>[\s\S]*?(?:<area>|<uncertainty>)[\s\S]*?<\/location>/i,
        expected: true,
    },
];

export const AVAILABLE_STANDARDS: AnalysisStandard[] = [
  {
    id: 'general',
    name: 'General Purpose Log',
    description: 'Analyze generic application logs for startup, shutdown, and error messages.',
    icon: DocumentTextIcon,
    rules: GENERAL_LOG_STANDARD,
  },
  {
    id: 'bittorrent',
    name: 'BitTorrent Client Log',
    description: 'Analyze a BitTorrent client log against common BEP compliance points.',
    icon: ShareIcon,
    rules: BITTORRENT_LOG_STANDARD,
  },
  {
    id: 'xml-tdr',
    name: 'XML TDR Report',
    description: 'Analyzes a Torrent Data Record (TDR) XML file for correctness and completeness.',
    icon: CodeBracketIcon,
    rules: XML_TDR_STANDARD,
  },
  {
    id: 'security',
    name: 'Security & Anomaly Detection',
    description: 'Analyzes logs for patterns suggesting protocol manipulation or malicious activity.',
    icon: ShieldCheckIcon,
    rules: SECURITY_ANOMALY_STANDARD,
  },
  {
    id: 'ai',
    name: 'AI-Powered Analysis',
    description: 'Use a generative model for an open-ended analysis of errors, warnings, and incomplete transactions.',
    icon: SparklesIcon,
    rules: [], // No rules needed for AI mode
  },
];