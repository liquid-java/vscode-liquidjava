import { handleDerivableNodeClick, handleDerivationResetClick } from "./views/diagnostics/derivation-nodes";
import { renderLoading } from "./views/loading";
import { renderStateMachineView } from "./views/fsm/fsm";
import { createMermaidDiagram, renderMermaidDiagram, resetZoom, zoomIn, zoomOut, copyDiagramToClipboard } from "./diagram";
import type { LJDiagnostic, RefinementMismatchError } from "../types/diagnostics";
import type { Range } from "../types/context";
import type { LJStateMachine } from "../types/fsm";
import type { NavTab } from "./views/sections";
import { copyDiagnosticToClipboard, getDisplayDiagnostics, renderDiagnosticsView } from "./views/diagnostics/diagnostics";
import type { LJContext } from "../types/context";
import { ContextSectionState, renderContextView } from "./views/context/context";
import type { DiagnosticRevealTarget } from "../types/diagnostics";
import { getDiagnosticRevealTargetFromKey, getDiagnosticRevealTargetKey } from "./diagnostic-reveal";

type VSCodeApi = {
    postMessage(message: unknown): void;
};

/**
 * Initializes the webview script
 * @param vscode
 * @param document
 * @param window
 */
export function getScript(vscode: VSCodeApi, document: Document, window: Window) {
    const root = document.getElementById('root')!;
    if (!root) return;
    let diagnostics: LJDiagnostic[] = [];
    let showAllDiagnostics = false;
    let currentFile: string;
    const expandedErrors = new Set<number>();
    let stateMachine: LJStateMachine;
    let context: LJContext;
    let errorAtCursor: RefinementMismatchError;
    let selectedTab: NavTab = 'diagnostics';
    let diagramOrientation: "LR" | "TB" = "TB";
    let showDiagramConditions = false;
    let currentDiagram: string = '';
    let revealTimeout: ReturnType<typeof setTimeout> | undefined;
    const contextSectionState: ContextSectionState = {
        aliases: false,
        ghosts: false,
        vars: true,
    };

    // initial state
    root.innerHTML = renderLoading();
    vscode.postMessage({ type: 'ready' });    
    
    // on click
    root.addEventListener('click', (e: MouseEvent) => {
        const target = e.target instanceof Element ? e.target : null;
        if (!target) return;
        const iconButton = target.closest?.('.icon-button');
        if (iconButton && !(iconButton as HTMLButtonElement).disabled) {
            iconButton.classList.remove('icon-button-pop');
            void (iconButton as HTMLElement).offsetWidth;
            iconButton.classList.add('icon-button-pop');
        }

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
                icon.classList.toggle('codicon-triangle-down', nextExpanded);
                icon.classList.toggle('codicon-triangle-right', !nextExpanded);
            }

            return;
        }

        // location link or variable click
        const locationTarget = target.closest?.('.location-link, .node-var');
        if (locationTarget) {
            e.preventDefault();
            e.stopPropagation();

            const filePath = locationTarget.getAttribute('data-file');
            const lineAttr = locationTarget.getAttribute('data-line');
            const columnAttr = locationTarget.getAttribute('data-column');
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

        // reveal failing refinement diagnostic
        if (target.classList.contains('diagnostic-reveal-btn')) {
            e.preventDefault();
            e.stopPropagation();

            const revealTarget = getDiagnosticRevealTargetFromKey(target.getAttribute('data-diagnostic-target'));
            if (!revealTarget) return;
            revealDiagnostic(revealTarget);
            return;
        }

        // derivation expansion click
        const derivableNode = target.closest?.('.derivable-node');
        if (derivableNode) {
            e.stopPropagation();
            if (handleDerivableNodeClick(derivableNode)) {
                updateView();
            }
            return;
        }

        // derivation reset button
        const derivationResetButton = target.closest?.('.derivation-reset-btn');
        if (derivationResetButton) {
            e.stopPropagation();
            if (handleDerivationResetClick(derivationResetButton)) {
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
        if (target.closest?.('#diagram-orientation-btn')) {
            e.stopPropagation();
            diagramOrientation = diagramOrientation === "TB" ? "LR" : "TB";
            resetZoom(document);
            updateView();
            return;
        }

        // toggle diagram conditions
        const diagramConditionsButton = target.closest?.('#diagram-conditions-btn');
        if (diagramConditionsButton) {
            e.stopPropagation();
            if ((diagramConditionsButton as HTMLButtonElement).disabled) return;
            showDiagramConditions = !showDiagramConditions;
            updateView();
            return;
        }

        // zoom in
        if (target.closest?.('#zoom-in-btn')) {
            e.stopPropagation();
            zoomIn(document);
            return;
        }

        // zoom out
        if (target.closest?.('#zoom-out-btn')) {
            e.stopPropagation();
            zoomOut(document);
            return;
        }

        // reset zoom
        if (target.closest?.('#zoom-reset-btn')) {
            e.stopPropagation();
            resetZoom(document);
            return;
        }

        // copy diagram source
        const copyDiagramButton = target.closest?.('#copy-diagram-btn');
        if (copyDiagramButton) {
            e.stopPropagation();
            if (!currentDiagram) return
            copyDiagramToClipboard(copyDiagramButton, currentDiagram);
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
        const highlightButton = target.closest?.('.highlight-var-btn');
        if (highlightButton) {
            e.stopPropagation();

            const previousSelected = root.querySelector('.highlight-var-btn.selected');        
            if (previousSelected) {
                // unselect previous
                previousSelected.classList.remove('selected');
                if (previousSelected === highlightButton) {
                    // remove highlight
                    vscode.postMessage({ type: 'highlight', range: null });
                    return;
                }
            }
            highlightButton.classList.add('selected');

            const file = highlightButton.getAttribute('data-file');
            const lineStart = parseInt(highlightButton.getAttribute('data-start-line') || '', 10);
            const colStart = parseInt(highlightButton.getAttribute('data-start-column') || '', 10);
            const lineEnd = parseInt(highlightButton.getAttribute('data-end-line') || '', 10);
            const colEnd = parseInt(highlightButton.getAttribute('data-end-column') || '', 10);
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

        // copy diagnostic
        const diagnosticCopyBtn = target.closest?.('.copy-diagnostic-btn');
        if (diagnosticCopyBtn) {
            e.preventDefault();
            e.stopPropagation();
            copyDiagnosticToClipboard(diagnosticCopyBtn, getDisplayDiagnostics(diagnostics, showAllDiagnostics, currentFile));
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
                showDiagramConditions = false;
                if (selectedTab === 'fsm') updateView();
                break;
            case 'context':
                context = msg.context as LJContext;
                errorAtCursor = msg.errorAtCursor as RefinementMismatchError;
                if (selectedTab === 'context') updateView();
                break;
            case 'revealDiagnostic':
                revealDiagnostic(msg.diagnostic as DiagnosticRevealTarget);
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
            case 'fsm': {
                const diagram = createMermaidDiagram(stateMachine, diagramOrientation, showDiagramConditions);
                currentDiagram = diagram;
                root.innerHTML = renderStateMachineView(stateMachine, diagram, diagramOrientation, showDiagramConditions);
                if (stateMachine) renderMermaidDiagram(document, window);
                break;
            }
            case 'context':
                root.innerHTML = renderContextView(context, currentFile, contextSectionState, errorAtCursor);
                break;
        }
    }

    function revealDiagnostic(target: DiagnosticRevealTarget) {
        selectedTab = 'diagnostics';

        const isVisibleInCurrentFile = showAllDiagnostics || !target.file || target.file.toLowerCase() === currentFile?.toLowerCase();
        if (!isVisibleInCurrentFile) {
            showAllDiagnostics = true;
        }

        updateView();
        const element = Array.from(root.querySelectorAll<HTMLElement>('.diagnostic-item')).find(item =>
            item.getAttribute('data-diagnostic-target') === getDiagnosticRevealTargetKey(target)
        );
        if (!element) return;

        const previousRevealed = root.querySelector('.diagnostic-item.revealed');
        if (previousRevealed) previousRevealed.classList.remove('revealed');
        if (revealTimeout) clearTimeout(revealTimeout);

        element.classList.add('revealed');
        element.scrollIntoView({ block: 'center', behavior: 'smooth' });
        revealTimeout = setTimeout(() => {
            element.classList.remove('revealed');
            revealTimeout = undefined;
        }, 1800);
    }

}
