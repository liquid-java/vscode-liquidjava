
/**
 * Generates the CSS styles for the webview
 * @returns CSS string
 */
export function getStyles(): string {
    return /*css*/`
        html,
        body {
            width: 100%;
            height: 100%;
            margin: 0;
            box-sizing: border-box;
            scrollbar-gutter: stable both-edges;
        }
        #root {
            width: 100%;
            min-height: 100%;
            margin: 0;
            box-sizing: border-box;
        }
        *,
        *::before,
        *::after {
            box-sizing: inherit;
        }
        body {
            height: 100%;
            padding: 1rem;
            font-family: var(--vscode-font-family);
            overflow-x: hidden;
            overflow-y: auto;
            --lj-token-keyword: var(--vscode-symbolIcon-keywordForeground, var(--vscode-editor-foreground));
            --lj-token-control: var(--vscode-debugTokenExpression-name, var(--vscode-symbolIcon-keywordForeground, var(--vscode-editor-foreground)));
            --lj-token-function: var(--vscode-symbolIcon-functionForeground, var(--vscode-editor-foreground));
            --lj-token-operator: var(--vscode-editor-foreground);
            --lj-token-type: var(--vscode-symbolIcon-classForeground, var(--vscode-editor-foreground));
            --lj-token-string: var(--vscode-debugTokenExpression-string, var(--vscode-editor-foreground));
            --lj-token-number: var(--vscode-debugTokenExpression-number, var(--vscode-editor-foreground));
            --lj-token-boolean: var(--vscode-debugTokenExpression-boolean, var(--vscode-symbolIcon-booleanForeground, var(--vscode-editor-foreground)));
            --lj-token-identifier: var(--vscode-debugTokenExpression-name, var(--vscode-editor-foreground));
            --lj-token-punctuation: var(--vscode-editor-foreground);
            --lj-state-cond-pre: var(--lj-token-identifier);
            --lj-state-cond-post: var(--lj-token-type);
        }
        body.vscode-light {
            --lj-token-keyword: #0000FF;
            --lj-token-function: #795E26;
            --lj-token-operator: #000000;
            --lj-token-type: #267F99;
            --lj-token-string: #A31515;
            --lj-token-number: #098658;
            --lj-token-boolean: #0000FF;
            --lj-token-identifier: #001080;
            --lj-token-punctuation: #000000;
        }
        body.vscode-dark {
            --lj-token-keyword: #569CD6;
            --lj-token-function: #DCDCAA;
            --lj-token-operator: #D4D4D4;
            --lj-token-type: #4EC9B0;
            --lj-token-string: #CE9178;
            --lj-token-number: #B5CEA8;
            --lj-token-boolean: #569CD6;
            --lj-token-identifier: #9CDCFE;
            --lj-token-punctuation: #D4D4D4;
        }
        body.vscode-high-contrast,
        body.vscode-high-contrast-light {
            --lj-token-keyword: var(--vscode-editor-foreground);
            --lj-token-function: var(--vscode-textLink-foreground);
            --lj-token-operator: var(--vscode-editor-foreground);
            --lj-token-type: var(--vscode-textLink-foreground);
            --lj-token-string: var(--vscode-editor-foreground);
            --lj-token-number: var(--vscode-editor-foreground);
            --lj-token-boolean: var(--vscode-editor-foreground);
            --lj-token-identifier: var(--vscode-editor-foreground);
            --lj-token-punctuation: var(--vscode-editor-foreground);
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
            padding: 0.5rem 5rem 0.5rem 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
            position: relative;
        }
        .codicon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1em;
            height: 1em;
            font-size: 1rem;
            line-height: 1;
            pointer-events: none;
        }
        .copy-diagnostic-btn,
        .diagnostic-context-btn {
            position: absolute;
            top: 0.5rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.75rem;
            height: 1.75rem;
            padding: 0;
            color: var(--vscode-foreground);
            background: transparent;
            border: 1px solid transparent;
            border-radius: 4px;
            opacity: 0.65;
            transition: background-color 0.16s ease, border-color 0.16s ease, opacity 0.16s ease, transform 0.16s ease;
        }
        .copy-diagnostic-btn {
            right: 0.5rem;
        }
        .diagnostic-context-btn {
            right: 2.5rem;
        }
        .copy-diagnostic-btn:hover,
        .diagnostic-context-btn:hover {
            background: var(--vscode-editor-background);
            border-color: var(--vscode-widget-border);
            opacity: 1;
        }
        .copy-diagnostic-btn:disabled,
        .diagnostic-context-btn:disabled {
            opacity: 0.8;
            cursor: default;
        }
        .icon-button-pop {
            animation: icon-button-pop 0.28s ease-out;
        }
        @keyframes icon-button-pop {
            0% {
                transform: scale(0.96);
            }
            55% {
                transform: scale(1.05);
            }
            100% {
                transform: scale(1);
            }
        }
        .diagnostic-item.revealed {
            outline: 2px solid var(--vscode-focusBorder);
            animation: diagnostic-reveal-flash 1.8s ease-out;
        }
        @keyframes diagnostic-reveal-flash {
            0% {
                box-shadow: 0 0 0 0 var(--vscode-focusBorder);
                transform: translateX(0);
            }
            12% {
                box-shadow: 0 0 0 3px var(--vscode-focusBorder);
                transform: translateX(3px);
            }
            24% {
                transform: translateX(0);
            }
            55% {
                box-shadow: 0 0 0 2px var(--vscode-focusBorder);
            }
            100% {
                box-shadow: 0 0 0 0 transparent;
                transform: translateX(0);
            }
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
        .lj-expression,
        .lj-expression-code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            white-space: pre-wrap;
        }
        .lj-expression-block {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }
        .lj-expression-block code,
        code.lj-expression-code {
            background: transparent !important;
            background-color: transparent !important;
        }
        .lj-token-keyword {
            color: var(--lj-token-keyword);
        }
        .lj-token-function {
            color: var(--lj-token-function);
        }
        .lj-token-operator {
            color: var(--lj-token-operator);
        }
        .lj-token-type {
            color: var(--lj-token-type);
        }
        .lj-token-string {
            color: var(--lj-token-string);
        }
        .lj-token-number {
            color: var(--lj-token-number);
        }
        .lj-token-boolean {
            color: var(--lj-token-boolean);
        }
        .lj-token-identifier {
            color: var(--lj-token-identifier);
        }
        .lj-token-punctuation {
            color: var(--lj-token-punctuation);
            opacity: 0.8;
        }
        .clickable {
            cursor: pointer;
            text-decoration: underline;
            text-decoration-style: dotted;
        }
        .clickable:hover {
            font-weight: bold;
        }
        .vc-container {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
            margin: 0.5rem 0;
        }
        .vc-step-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.75rem;
            min-width: 0;
            padding-bottom: 0.25rem;
            border-bottom: 1px solid var(--vscode-widget-border, var(--vscode-panel-border));
            font-family: var(--vscode-font-family);
            font-size: 0.8rem;
            line-height: 1.25rem;
        }
        .vc-step-name {
            min-width: 0;
            overflow: hidden;
            color: var(--vscode-descriptionForeground);
            font-weight: 600;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .vc-step-navigation {
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
            flex-shrink: 0;
        }
        .vc-step-position {
            min-width: 2.5rem;
            color: var(--vscode-descriptionForeground);
            font-variant-numeric: tabular-nums;
            text-align: right;
        }
        .vc-chain {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            min-width: 0;
        }
        .vc-line {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            min-width: 0;
        }
        .vc-line-content {
            flex: 0 1 auto;
            min-width: 0;
            overflow-wrap: anywhere;
        }
        .vc-node {
            display: inline;
            padding: 0;
            border: none;
            background: none;
            color: var(--vscode-editor-foreground);
            font: inherit;
            text-align: left;
        }
        .vc-node:hover {
            background: none;
        }
        .vc-binder {
            color: var(--vscode-descriptionForeground);
        }
        .vc-step-controls {
            display: inline-flex;
            align-items: center;
            gap: 0.125rem;
            flex-shrink: 0;
        }
        .vc-step-btn {
            margin: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.5rem;
            height: 1.25rem;
            padding: 0;
            background-color: transparent;
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-family: var(--vscode-font-family);
            flex-shrink: 0;
            opacity: 0.7;
        }
        .vc-step-btn .codicon {
            font-size: 1.5rem;
        }
        .vc-step-btn:hover {
            font-weight: bold;
            background-color: transparent;
            opacity: 1;
        }
        .vc-step-btn:disabled {
            cursor: default;
            opacity: 0.35;
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
            box-shadow: 0 2px 8px var(--vscode-widget-shadow);
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
        .stopped-view {
            display: flex;
            position: relative;
            min-height: calc(100vh - 2rem);
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            gap: 0.75rem;
            padding-top: 2rem;
            text-align: center;
            color: var(--vscode-foreground);
        }
        .stopped-view h2 {
            margin: 0;
        }
        .stopped-view .info {
            max-width: 28rem;
            color: var(--vscode-descriptionForeground);
        }
        .stopped-status-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2.25rem;
            height: 2.25rem;
            border: 1px solid var(--vscode-errorForeground);
            border-radius: 50%;
            color: var(--vscode-errorForeground);
            font-weight: 700;
            font-size: 1.35rem;
            line-height: 1;
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
        .context-section table {
            width: 100%;
            table-layout: fixed;
            margin-bottom: 1rem;
        }

        .context-variables-table .context-variables-column {
            width: 33.33%;
        }

        .context-variables-table .context-refinement-column {
            width: 66.67%;
        }

        .context-aliases-table td:first-child,
        .context-ghosts-table td:first-child {
            width: 80%;
        }

        .context-aliases-table td:last-child,
        .context-ghosts-table td:last-child {
            width: 20%;
        }

        .context-variables-table th:first-child,
        .context-section table td:first-child {
            text-align: left;
        }

        .context-variables-table td:first-child {
            overflow: hidden;
        }

        .context-variables-table td:first-child .highlight-var-btn {
            max-width: 100%;
            overflow: hidden;
        }

        .context-variables-table td:first-child .highlight-var-btn code {
            display: block;
            overflow: hidden;
            white-space: normal;
            overflow-wrap: normal;
            word-break: normal;
        }

        .context-variable-relevant td:first-child {
            border-left: 2px solid var(--vscode-errorForeground);
        }
        .context-variables-table th:first-child {
            padding-left: calc(0.75rem + 0.8rem);
        }
        .context-aliases-table td:last-child,
        .context-ghosts-table td:last-child {
            text-align: right;
        }
        .context-variables-table td.failing-refinement {
            text-align: center;
        }
        .failing-refinement .highlight-var-btn,
        .failing-refinement .diagnostic-reveal-btn {
            display: flex;
            justify-content: center;
            width: 100%;
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
        }
        .context-section-content.collapsed {
            display: none;
        }
        .highlight-var-btn,
        .diagnostic-reveal-btn {
            background-color: transparent;
            border: none;
            transition: background-color 0.1s;
            text-align: left;
            padding: 0.2rem 0.8rem;
        }
        .highlight-var-btn code,
        .diagnostic-reveal-btn code {
            pointer-events: none;
        }
        .highlight-var-btn.selected {
            background-color: var(--vscode-button-background);
        }
        .highlight-var-btn.error,
        .diagnostic-reveal-btn.error {
            background-color: color-mix(in srgb, var(--vscode-errorForeground) 80%, transparent);
            color: var(--vscode-editor-foreground);
        }
        .highlight-var-btn.error.selected,
        .diagnostic-reveal-btn.error.selected {
            background-color: color-mix(in srgb, var(--vscode-errorForeground) 90%, transparent);
        }
        .highlight-var-btn.error:hover,
        .diagnostic-reveal-btn.error:hover {
            background-color: var(--vscode-errorForeground);
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
            top: 1rem;
            right: 1rem;
            display: flex;
            gap: 0.5rem;
            z-index: 10;
        }
        .diagram-condition-legend {
            position: absolute;
            bottom: 1rem;
            right: 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
            font-size: 0.8rem;
            z-index: 10;
            pointer-events: none;
            font-weight: 500;
        }
        .diagram-condition-legend-pre {
            color: var(--lj-state-cond-pre);
        }
        .diagram-condition-legend-post {
            color: var(--lj-state-cond-post);
        }
        .diagram-control-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.75rem;
            height: 1.75rem;
            padding: 0;
            color: var(--vscode-foreground);
            background: none;
            border: none;
            opacity: 0.7;
        }
        .diagram-control-btn:hover {
            background: none;
            opacity: 1;
        }
        .diagram-control-btn.active {
            opacity: 1;
        }
        .diagram-control-btn:disabled {
            cursor: default;
            opacity: 0.35;
        }
        .mermaid .statediagramTitleText {
            font-size: 30px!important;
        }
        .diagram-container .mermaid svg,
        .diagram-container .mermaid svg * {
            color: var(--vscode-foreground) !important;
        }
        .diagram-container .mermaid svg text,
        .diagram-container .mermaid svg tspan,
        .diagram-container .mermaid svg .label,
        .diagram-container .mermaid svg .label text,
        .diagram-container .mermaid svg .edgeLabel text {
            fill: var(--vscode-foreground) !important;
        }
        .diagram-container .mermaid svg .edgeLabel rect,
        .diagram-container .mermaid svg .labelBkg {
            fill: var(--vscode-editor-background) !important;
            stroke: var(--vscode-panel-border) !important;
        }
        .diagram-container .mermaid .edgeLabel,
        .diagram-container .mermaid .edgeLabel *,
        .diagram-container .mermaid .edgeLabel p,
        .diagram-container .mermaid .edgeLabel span,
        .diagram-container .mermaid .edgeLabel div {
            color: var(--vscode-foreground) !important;
            background: var(--vscode-editor-background) !important;
        }
        .diagram-container .mermaid .edgeLabel .state-cond {
            color: var(--vscode-descriptionForeground) !important;
            display: inline-block !important;
            font-size: 0.76em !important;
            line-height: 1.2 !important;
        }
        .diagram-container .mermaid .edgeLabel .state-cond-pre {
            color: var(--lj-state-cond-pre) !important;
        }
        .diagram-container .mermaid .edgeLabel .state-cond-post {
            color: var(--lj-state-cond-post) !important;
        }
        .diagram-container .mermaid svg rect,
        .diagram-container .mermaid svg circle,
        .diagram-container .mermaid svg ellipse,
        .diagram-container .mermaid svg polygon {
            fill: var(--vscode-editor-background) !important;
            stroke: var(--vscode-foreground) !important;
        }
        .diagram-container .mermaid svg path,
        .diagram-container .mermaid svg line {
            stroke: var(--vscode-foreground) !important;
        }
        .diagram-container .mermaid svg marker path {
            fill: var(--vscode-foreground) !important;
            stroke: var(--vscode-foreground) !important;
        }
    `;
}
