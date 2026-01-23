import type { LJError, LJWarning, LJDiagnostic } from "../types";
import { handleDerivableNodeClick, handleDerivationResetClick } from "./views/derivation-nodes";
import { getCorrectView } from "./views/correct";
import { getLoadingView } from "./views/loading";
import { getErrorsView } from "./views/errors";
import { getWarningsView } from "./views/warnings";
import { renderStateMachineView } from "./views/diagram";
import { StateMachine } from "../types/fsm";
import { createMermaidDiagram } from "./mermaid";

/**
 * Initializes the webview script
 * @param vscode
 * @param document
 * @param window
 */
export function getScript(vscode: any, document: any, window: any) {
    const root = document.getElementById('root');
    let fileErrors: LJError[] = [];
    let fileWarnings: LJWarning[] = [];
    let showAllDiagnostics = false;
    let currentFile: string | undefined;
    let expandedErrors = new Set<number>();
    let stateMachineView = '';

    // initial state
    root.innerHTML = getLoadingView();
    vscode.postMessage({ type: 'ready' });    
    
    // on click
    root.addEventListener('click', (e: any) => {
        const target = e.target as any;
        if (!target) return;

        // location link or variable click
        if (target.classList.contains('location-link') || target.classList.contains('node-var')) {
            e.preventDefault();
            e.stopPropagation();

            const filePath = target.getAttribute('data-file');
            const lineAttr = target.getAttribute('data-line');
            const columnAttr = target.getAttribute('data-column');
            if (filePath && lineAttr !== null && columnAttr !== null) {
                vscode.postMessage({
                    type: 'openFile',
                    filePath,
                    line: parseInt(lineAttr, 10),
                    character: parseInt(columnAttr, 10)
                });
            }
            return;
        }

        // derivation expansion click
        if (target.classList.contains('derivable-node')) {
            e.stopPropagation();
            if (handleDerivableNodeClick(target)) {
                updateView();
            }
            return;
        }

        // derivation reset button
        if (target.classList.contains('derivation-reset-btn')) {
            e.stopPropagation();
            if (handleDerivationResetClick(target)) {
                updateView();
            }
            return;
        }

        // toggle show all diagnostics
        if (target.classList.contains('show-all-button')) {
            e.stopPropagation();
            showAllDiagnostics = !showAllDiagnostics;
            updateView();
            return;
        }

        // toggle show more/less for errors
        if (target.classList.contains('show-more-button')) {
            e.stopPropagation();
            const errorIndex = parseInt(target.getAttribute('data-error-index') || '-1', 10);
            if (errorIndex >= 0) {
                if (expandedErrors.has(errorIndex)) {
                    expandedErrors.delete(errorIndex);
                } else {
                    expandedErrors.add(errorIndex);
                }
                updateView();
            }
            return;
        }
    });
    
    window.addEventListener('message', event => {
        const msg = event.data;
        if (msg.type === 'diagnostics') {
            const diagnostics = msg.diagnostics as LJDiagnostic[];
            const errors = diagnostics.filter((d: LJDiagnostic) => d.category === 'error') as LJError[];
            const warnings = diagnostics.filter((d: LJDiagnostic) => d.category === 'warning') as LJWarning[];

            fileErrors = errors;
            fileWarnings = warnings;
    
            updateView();
        } else if (msg.type === 'file') {
            currentFile = msg.file;
            if (!showAllDiagnostics) updateView();
        } else if (msg.type === 'fsm') {
            if (!msg.sm) {
                stateMachineView = '';
                updateView();
                return;
            }
            const sm = msg.sm as StateMachine;
            const diagram = createMermaidDiagram(sm);
            stateMachineView = renderStateMachineView(sm, diagram);
            updateView();
        }
    });  

    async function renderMermaidDiagram() {
        const mermaid = (window as any).mermaid;
        if (!mermaid) return;

        const mermaidElements = document.querySelectorAll('.mermaid');
        if (mermaidElements.length === 0) return;

        try {
            await mermaid.run({ nodes: mermaidElements });
        } catch (e) {
            console.error('Failed to render Mermaid diagram:', e);
        }
    }

    function updateView() {
        let mainView = fileErrors.length > 0 ? getErrorsView(fileErrors, showAllDiagnostics, currentFile, expandedErrors) : getCorrectView(showAllDiagnostics);
        let warningsView = fileWarnings.length > 0 ? getWarningsView(fileWarnings, showAllDiagnostics, currentFile) : '';
        root.innerHTML = mainView + warningsView + stateMachineView;
        
        // re-render mermaid diagram after DOM update
        if (stateMachineView) renderMermaidDiagram();
    }
}

