
/**
 * Generates the CSS styles for the webview
 * @returns CSS string
 */
export function getStyles(): string {
    return /*css*/`
        body {
            padding: 1rem;
            font-family: var(--vscode-font-family);
            overflow-y: scroll;
        }
        h2 {
            font-weight: bold;
            margin: 0;
        }
        p {
            word-wrap: break-word;
            overflow-wrap: break-word;
            margin: 0.5rem 0;
        }
        pre {
            word-wrap: break-word;
            overflow-wrap: break-word;
            white-space: pre-wrap;
            margin: 0.5rem 0;
            padding: 0.5rem;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            overflow-x: auto;
        }
        strong {
            display: inline;
            margin-bottom: 0.5rem;
        }
        nav ul {
            display: flex;
            gap: 1rem;
            padding: 0;
            margin: 0;
            justify-content: center;
        }
        nav ul li {
            padding-right: 1rem;
            border-right: 1px solid var(--vscode-panel-border);
        }
        nav ul li:last-child {
            border-right: none;
        }
        nav {
            padding-bottom: 1.5rem;
        }
        nav button {
            color: var(--vscode-foreground);
            background: none;
            border: none;
            text-decoration: none;
            cursor: pointer;
            padding: 0;
            opacity: 0.8;
            text-transform: uppercase;
            font-size: 11px;
        }
        nav .selected {
            opacity: 1;
            text-decoration: underline;
            text-decoration-color: var(--vscode-activityBar-activeBorder);
            text-underline-offset: 6px;
            text-decoration-thickness: 1px;
        }
        nav button:hover {
            opacity: 1;
            background: none;
        }
        .container {
            margin: 0;
            padding: 0.5rem;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            overflow-x: auto;
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            max-width: 100%;
            line-height: 1.6;
            overflow: visible;
            position: relative;
        }
        ul {
            list-style-type: none;
            padding: 0;
            margin: 0;
        }
        .diagnostic-header {
            margin: 1rem 0;
        }
        .diagnostic-item {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 0.5rem 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
        }
        .error-item {
            border-left: 4px solid var(--vscode-editorError-foreground);
        }
        .warning-item {
            border-left: 4px solid var(--vscode-editorWarning-foreground);
        }
        .section {
            margin-bottom: 1rem;
        }
        .section:last-child {
            margin-bottom: 0;
        }
        .link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            cursor: pointer;
            word-break: break-word;
            display: inline-block;
            max-width: 100%;
        }
        .link:hover {
            text-decoration: underline;
        }
        .node-var {
            color: #9CDCFE;
            position: relative;
        }
        .node-value {
            color: var(--vscode-editor-foreground);
        }
        .node-number {
            color: #B5CEA8;
        }
        .node-boolean {
            color: #569CD6;
        }
        .node-expand-indicator {
            opacity: 0.5;
            font-style: italic;
        }
        .clickable {
            cursor: pointer;
            text-decoration: underline;
            text-decoration-style: dotted;
        }
        .clickable:hover {
            font-weight: bold;
        }
        .derivation-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
        }
        .reset-btn {
            margin: 0;
            padding: 0.4rem 0.8rem;
            background-color: transparent;
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: larger;
            flex-shrink: 0;
            opacity: 0.7;
        }
        .reset-btn:hover {
            font-weight: bold;
            background-color: transparent;
        }
        .reset-btn:disabled {
            opacity: 0.5;
        }
        button {
            padding: 0.2rem 0.6rem;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            font-size: 0.9rem;
            transition: background-color 0.2s;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .show-more-button {
            display: block;
            width: 100%;
            margin: 0.5rem auto;
            padding: 0.5rem;
            background-color: transparent;
            border: none;
            color: var(--vscode-foreground);
            opacity: 0.7;
            font-size: 1rem;
        }
        .show-more-button:hover {
            background-color: var(--vscode-editor-background);
        }
        .underline-button {
            color: var(--vscode-foreground);
            text-align: center;
            font-size: 0.8rem;
            opacity: 0.6;
            margin-bottom: 1rem;
            padding: 0;
            background: none;
            display: flex;
            justify-content: center;
            border: none;
            text-decoration: underline;
        }
        .underline-button:hover {
            background: none;
        }
        .extra-content {
            margin-top: 1rem;
        }
        .tooltip:hover::after {
            content: attr(data-tooltip);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            padding: 0.5rem;
            background-color: var(--vscode-editorHoverWidget-background);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            color: var(--vscode-editorHoverWidget-foreground);
            border-radius: 4px;
            white-space: nowrap;
            z-index: 1000;
            margin-bottom: 0.25rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            pointer-events: none;
        }
        .tooltip:hover::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: var(--vscode-editorHoverWidget-border);
            margin-bottom: -0.25rem;
            z-index: 1000;
            pointer-events: none;
        }
        .info {
            margin: 1rem 0;
        }
        .more-indicator {
            text-align: center;
            font-size: 0.8rem;
            opacity: 0.6;
            margin-bottom: 1rem;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 0rem 0;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            overflow: visible;
        }
        th {
            text-align: left;
            padding: 0.75rem;
            font-weight: bold;
            border-bottom: 1px solid var(--vscode-panel-border);
            color: var(--vscode-foreground);
        }
        td {
            padding: 0.75rem;
            border-bottom: 1px solid var(--vscode-panel-border);
            color: var(--vscode-foreground);
        }
        tbody tr:last-child td {
            border-bottom: none;
        }
        td code {
            background-color: transparent;
            padding: 0;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
        .context-section {
            margin-bottom: 1rem;
        }
        .context-section table td:first-child {
            text-align: left;
            flex: 1;
            min-width: 0;
        }
        .context-section table td:last-child {
            text-align: right;
            flex-shrink: 0;
            white-space: nowrap;
        }
        .context-toggle-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            width: 100%;
            padding: 0;
            margin: 0 0 0.5rem 0;
            background: none;
            border: none;
            color: var(--vscode-foreground);
            cursor: pointer;
            font-size: 1rem;
            font-weight: bold;
            text-align: left;
        }
        .context-toggle-btn:hover {
            background: none;
        }
        .context-toggle-icon {
            width: 1rem;
            text-align: center;
            flex-shrink: 0;
            font-size: larger;
        }
        .context-section-content.collapsed {
            display: none;
        }
        .highlight-var-btn {
            background-color: transparent;
            border: none;
            transition: background-color 0.1s;
            text-align: left;
        }
        .highlight-var-btn code {
            pointer-events: none;
        }
        .highlight-var-btn.selected {
            background-color: var(--vscode-button-background);
        }
        .context-variable .failing-refinement {
            color: var(--vscode-editorError-foreground);
            position: relative;
        }
        .context-variable .failing-refinement::after {
            content: attr(data-tooltip);
            position: absolute;
            left: 0;
            bottom: calc(100% + 0.35rem);
            padding: 0.4rem 0.5rem;
            border-radius: 4px;
            background: var(--vscode-editorHoverWidget-background);
            border: 1px solid var(--vscode-editorHoverWidget-border);
            color: var(--vscode-editorHoverWidget-foreground);
            font-size: 0.8rem;
            line-height: 1.4;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            opacity: 0;
            visibility: hidden;
            pointer-events: none;
            transition: opacity 0.08s ease, visibility 0.08s ease;
            transition-delay: 0.08s;
            z-index: 10;
        }
        .context-variable .failing-refinement:hover::after {
            opacity: 1;
            visibility: visible;
        }
        .diagram-section {
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .diagram-section h2 {
            margin-bottom: 0.5rem;
        }
        .diagram-container {
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
            padding: 1rem;
            overflow: hidden;
            position: relative;
            cursor: grab;
            user-select: none;
        }
        .diagram-container:active {
            cursor: grabbing;
        }
        .diagram-wrapper {
            transition: transform 0.1s ease-out;
            transform-origin: 0 0;
            display: inline-block;
            min-width: 100%;
            pointer-events: none;
        }
        .diagram-wrapper * {
            pointer-events: auto;
        }
        .diagram-container .mermaid {
            display: flex;
            justify-content: center;
        }
        .diagram-container .mermaid svg {
            max-width: 100%;
            height: auto;
        }
        .diagram-controls {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            display: flex;
            gap: 0.5rem;
            z-index: 10;
        }
        .diagram-control-btn {
            font-size: clamp(0.75rem, 5vw, 1.5rem);
            padding: clamp(0.25rem, 1vw, 0.5rem);
            color: var(--vscode-foreground);
            background: none;
            border: none;
            font-family: 'Courier New', Courier, monospace;
            opacity: 0.7;
        }
        .diagram-control-btn:hover {
            background: none;
            opacity: 1;
        }
        .mermaid .statediagramTitleText {
            font-size: 30px!important;
        }
    `;
}