
# Log File Compliance Checker & Analyzer

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Badge"/>
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript Badge"/>
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS Badge"/>
  <img src="https://img.shields.io/badge/Google_Gemini-8E75B1?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Google Gemini Badge"/>
  <img src="https://img.shields.io/badge/Platform-Web%2FBrowser-blue?style=for-the-badge" alt="Platform Badge"/>
  <img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License Badge"/>
</p>

An advanced, client-side log analysis tool designed for performance, security, and integrity. This application allows users to perform batch analysis on folders of log files, assessing them against multiple predefined standards and generating a comprehensive, verifiable report.

## Key Features

- **Batch Folder Upload**: Simply drag and drop folders containing `details.txt`, `downloadstatus.xml`, and `netstat.txt` files. The app intelligently groups them into file sets for analysis.
- **Multi-Standard Analysis**: Runs a suite of analyses on each file type, including checks for general log health, BitTorrent protocol events, security anomalies, and XML data integrity.
- **AI-Powered Insights**: Leverages the Google Gemini API to provide a high-level, human-readable summary of errors, warnings, and incomplete transactions within log files.
- **Comprehensive & Secure Reporting**: Generates a detailed report with an executive summary, per-file analysis breakdowns, and a cryptographic integrity hash.
- **100% Client-Side Processing**: All hashing and rule-based analysis occurs directly in your browser. Files are **never** uploaded to a server, ensuring data privacy and security (only the AI analysis sends log content to the Google API).

---

## Technical Deep Dive

This application employs a sophisticated, multi-stage pipeline to process files and generate reports, all within the user's browser.

### Processing & Analysis Pipeline

The journey from raw files to a final report follows a clear, automated sequence.

```mermaid
graph TD
    subgraph "1. Upload & Hashing"
        A[/"Drag & Drop Folders"/] --> B{Traverse Directories};
        B --> C{Filter for <br>details.txt, <br>downloadstatus.xml, <br>netstat.txt};
        C --> D[Read File Contents];
        D --> E[Calculate MD5, SHA-1, SHA-256 <br> for each file];
    end

    subgraph "2. File Set Grouping"
        E --> F[Group Files by <br> Parent Folder];
        F --> G[Create File Sets <br> e.g., {folder: "Case123", <br> detailsFile: {...}, <br> xmlFile: {...}}];
    end

    subgraph "3. Batch Analysis"
        G --> H(Display Dashboard & <br> User Clicks "Run Batch Analysis");
        H --> I{Iterate Each File Set};
        I -- details.txt --> J[Run General, BitTorrent, Security, AI Analyses];
        J -- Has netstat.txt? --> K[Enrich Security Analysis <br>with Netstat Data];
        I -- downloadstatus.xml --> L[Run XML TDR Analysis];
    end

    subgraph "4. Report Generation"
        K --> M{Aggregate All Results};
        L --> M;
        M --> N[Generate Comprehensive <br> HTML Report];
        N --> O[Generate Canonical JSON <br> of Report Data];
        O --> P[Calculate SHA-256 <br> Report Integrity Hash];
        P --> Q[/Display Final Report <br> with Integrity Hash/];
    end

    style A fill:#D6BCFA,stroke:#333,stroke-width:2px
    style Q fill:#A2D2FF,stroke:#333,stroke-width:2px
```

**Key Stages Explained:**

1.  **File Ingestion**: The user drops folders. The app recursively scans them, looking for files with specific names (`details.txt`, etc.).
2.  **Hashing**: Before any analysis, the content of each identified file is cryptographically hashed using MD5, SHA-1, and SHA-256. This creates a unique fingerprint for each file, which is included in the final report.
3.  **File Set Grouping**: Files are grouped by their parent directory, creating logical "File Sets." This ensures that a `netstat.txt` file is correctly associated with the `details.txt` from the same case/folder.
4.  **Batch Analysis**: With a single click, the application iterates through every file set and applies the appropriate analysis standards:
    - **Security Standard Enrichment**: If a `netstat.txt` is present in a file set, its content is passed to the Security standard when analyzing the corresponding `details.txt`. This allows the analyzer to corroborate log-based findings (like high peer churn) with network-level evidence (like an imbalanced number of `ESTABLISHED` vs. `CLOSE_WAIT` connections), providing a much higher-fidelity analysis.
    - **AI Analysis**: For `details.txt` files, the content is sent to the Google Gemini model with a structured prompt and schema, requesting a JSON object detailing errors, warnings, and incomplete transactions.
5.  **Report Generation**: All individual results are compiled into a final report, complete with file hashes, rule-by-rule results, and the AI summary. A final **Report Integrity Hash** is calculated and displayed.

### Hashing and Report Integrity

Cryptographic hashing is a cornerstone of this application, providing confidence and verifiability.

**1. Per-File Hashes**

-   **What**: MD5, SHA-1, and SHA-256 hashes are calculated for every analyzed file.
-   **Why**: These hashes act as a unique digital fingerprint. They guarantee that the version of the file analyzed by the tool is identical to any other copy of the file that produces the same hash values. This is essential for chain of custody and evidence validation.

**2. Report Integrity Hash (SHA-256)**

-   **What**: A single SHA-256 hash that represents the *entirety of the analysis data*.
-   **Why**: This is the ultimate proof of the report's integrity. It confirms that the findings have not been altered or tampered with in any way after the report was generated.
-   **How It's Calculated**: It is **critically important** to note that this hash is **NOT** calculated on the visual HTML of the report. Instead, it is calculated on a **canonical JSON string representation of the analysis results**. This process involves:
    1.  Aggregating all analysis results into a structured JavaScript object.
    2.  Sorting all keys and array elements deterministically. This ensures that the structure is always identical for the same data, regardless of processing order.
    3.  Serializing this sorted object into a JSON string.
    4.  Calculating the SHA-256 hash of this final string.

This method makes the hash robust against cosmetic changes. The report's font size, colors, or layout can be updated in the future without invalidating the integrity hash of a past report, because the underlying *data* remains the same.

#### How to Manually Verify the Report Integrity Hash

Any third party can independently verify the report without needing this application.

**Prerequisites**: A tool capable of generating a SHA-256 hash. This can be done online (e.g., search "sha256 hash generator") or via a command-line terminal.

**Steps:**
1. Open the generated HTML report in a browser.
2. Select and copy the entire block of text that represents the structured report data. (A future feature could be to add a "Copy Report Data" button). *Note: For this to be implemented, the canonical JSON data used for hashing needs to be made accessible to the user in the UI.*
3. Paste this text into your chosen SHA-256 hash generator tool. Ensure no extra spaces or characters were added.
4. Calculate the hash.
5. Compare the newly generated hash with the "Report Integrity Hash" displayed at the bottom of the original report. **They must match exactly.**

---

## Build and Run Instructions

### Prerequisites

-   A modern web browser (Chrome, Firefox, Edge).
-   A text editor (like VS Code).
-   A simple web server to serve the `index.html` file. `Node.js` and `npm` can provide this easily.

### Environment Variables

The AI-powered analysis requires a Google Gemini API key.

1.  Create a file named `.env` in the root of the project directory.
2.  Add your API key to this file:
    ```
    API_KEY=YOUR_GEMINI_API_KEY_HERE
    ```
    The application is hard-coded to load the key from `process.env.API_KEY`. The build tool used in the development environment will make this available to the application.

### Running Locally

This project is a static web application and can be run with any simple HTTP server.

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install a simple server (if you don't have one):**
    ```bash
    npm install -g serve
    ```

3.  **Serve the project root:**
    ```bash
    serve .
    ```

4.  Open your browser and navigate to the local address provided by the server (e.g., `http://localhost:3000`).

---

## Technology Stack

-   **Frontend**: React 19, TypeScript
-   **Styling**: Tailwind CSS
-   **AI**: Google Gemini API (`@google/genai`)
-   **Hashing**: Native Web Crypto API (`crypto.subtle`) for SHA, custom JS implementation for MD5.

