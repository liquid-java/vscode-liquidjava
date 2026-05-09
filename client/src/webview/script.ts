import { handleDerivableNodeClick, handleDerivationResetClick } from "./views/diagnostics/derivation-nodes";
import { renderLoading } from "./views/loading";
import { renderStateMachineView } from "./views/fsm/fsm";
import { createMermaidDiagram, renderMermaidDiagram, resetZoom, zoomIn, zoomOut, copyDiagramToClipboard } from "./diagram";
import type { LJDiagnostic, RefinementMismatchError } from "../types/diagnostics";
import type { Range } from "../types/context";
import type { LJStateMachine } from "../types/fsm";
import type { NavTab } from "./views/sections";
import { renderDiagnosticsView } from "./views/diagnostics/diagnostics";
import { LJContext } from "../types/context";
import { ContextSectionState, renderContextView } from "./views/context/context";

/**
 * Initializes the webview script
 * @param vscode
 * @param document
 * @param window
 */
export function getScript(vscode: any, document: any, window: any) {
    const root = document.getElementById('root');
    let diagnostics: LJDiagnostic[] = [];
    let showAllDiagnostics = false;
    let currentFile: string;
    let expandedErrors = new Set<number>();
    let stateMachine: LJStateMachine;
    let context: LJContext;
    let errorAtCursor: RefinementMismatchError;
    let selectedTab: NavTab = 'diagnostics';
    let diagramOrientation: "LR" | "TB" = "TB";
    let currentDiagram: string = '';
    const contextSectionState: ContextSectionState = {
        aliases: false,
        ghosts: false,
        vars: true,
    };

    // initial state
    root.innerHTML = renderLoading();
    vscode.postMessage({ type: 'ready' });    
    
    // on click
    root.addEventListener('click', (e: any) => {
        const target = e.target as any;
        if (!target) return;

        // context section toggle
        const contextToggleButton = target.closest?.('.context-toggle-btn');
        if (contextToggleButton) {
            e.preventDefault();
            e.stopPropagation();

            const sectionId = contextToggleButton.getAttribute('data-context-toggle');
            if (!sectionId) return;

            const content = document.getElementById(sectionId);
            if (!content) return;

            const isExpanded = contextToggleButton.getAttribute('aria-expanded') !== 'false';
            const nextExpanded = !isExpanded;
            if (sectionId === 'context-vars') contextSectionState.vars = nextExpanded;
            if (sectionId === 'context-ghosts') contextSectionState.ghosts = nextExpanded;
            if (sectionId === 'context-aliases') contextSectionState.aliases = nextExpanded;
            contextToggleButton.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
            content.classList.toggle('collapsed', !nextExpanded);

            const icon = contextToggleButton.querySelector('.context-toggle-icon');
            if (icon) {
                icon.textContent = nextExpanded ? '▾' : '▸';
            }

            return;
        }

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
        if (target.id === 'show-all-button') {
            e.stopPropagation();
            showAllDiagnostics = !showAllDiagnostics;
            updateView();
            return;
        }

        // toggle diagram orientation
        if (target.id === 'diagram-orientation-btn') {
            e.stopPropagation();
            diagramOrientation = diagramOrientation === "TB" ? "LR" : "TB";
            resetZoom(document);
            updateView();
            return;
        }

        // zoom in
        if (target.id === 'zoom-in-btn') {
            e.stopPropagation();
            zoomIn(document);
            return;
        }

        // zoom out
        if (target.id === 'zoom-out-btn') {
            e.stopPropagation();
            zoomOut(document);
            return;
        }

        // reset zoom
        if (target.id === 'zoom-reset-btn') {
            e.stopPropagation();
            resetZoom(document);
            return;
        }

        // copy diagram source
        if (target.id === 'copy-diagram-btn') {
            e.stopPropagation();
            if (!currentDiagram) return
            copyDiagramToClipboard(target, currentDiagram);
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

        // highlight variable 
        if (target.classList.contains('highlight-var-btn')) {
            e.stopPropagation();

            const previousSelected = root.querySelector('.highlight-var-btn.selected');        
            if (previousSelected) {
                // unselect previous
                previousSelected.classList.remove('selected');
                if (previousSelected === target) {
                    // remove highlight
                    vscode.postMessage({ type: 'highlight', range: null });
                    return;
                }
            }
            target.classList.add('selected');

            const file = target.getAttribute('data-file');
            const lineStart = parseInt(target.getAttribute('data-start-line') || '', 10);
            const colStart = parseInt(target.getAttribute('data-start-column') || '', 10);
            const lineEnd = parseInt(target.getAttribute('data-end-line') || '', 10);
            const colEnd = parseInt(target.getAttribute('data-end-column') || '', 10);
            if ([lineStart, colStart, lineEnd, colEnd].some(Number.isNaN)) return;

            const range: Range = { lineStart, colStart, lineEnd, colEnd };
            if (file !== currentFile) {
                vscode.postMessage({ type: 'openFile', filePath: file, line: lineStart, character: colStart, highlightRange: range });
            } else {
                vscode.postMessage({ type: 'highlight', range })
            }
            return;
        }

        // nav tab click
        if (target.classList.contains('nav-tab')) {
            e.stopPropagation();
            const tab = target.getAttribute('data-tab') as NavTab;
            if (tab && tab !== selectedTab) {
                vscode.postMessage({ type: 'highlight', range: null });
                selectedTab = tab;
                updateView();
            }
            return;
        }
    });
    
    // message event listener from extension
    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'diagnostics':
                diagnostics = msg.diagnostics as LJDiagnostic[];
                if (selectedTab === 'diagnostics') updateView();
                break;
            case 'file':
                currentFile = msg.file;
                if (!showAllDiagnostics && selectedTab === 'diagnostics') updateView();
                break;
            case 'fsm':
                stateMachine = msg.sm as LJStateMachine;
                if (selectedTab === 'fsm') updateView();
                break;
            case 'context':
                context = msg.context as LJContext;
                errorAtCursor = msg.errorAtCursor as RefinementMismatchError;
                if (selectedTab === 'context') updateView();
                break;
        }
    });

    /**
     * Updates the webview content based on the current state
     */
    function updateView() {
        switch (selectedTab) {
            case 'diagnostics':
                root.innerHTML = renderDiagnosticsView(diagnostics, showAllDiagnostics, currentFile, expandedErrors);
                break;
            case 'fsm':
                const diagram = createMermaidDiagram(stateMachine, diagramOrientation);
                currentDiagram = diagram;
                root.innerHTML = renderStateMachineView(stateMachine, diagram, diagramOrientation);
                if (stateMachine) renderMermaidDiagram(document, window);
                break;
            case 'context':
                root.innerHTML = renderContextView(context, currentFile, contextSectionState, errorAtCursor);
                break;
        }
    }
}
