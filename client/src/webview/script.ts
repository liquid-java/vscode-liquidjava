import { handleVCImplicationStepClick } from "./views/diagnostics/vc-implications";
import { renderLoading } from "./views/loading";
import { renderStopped } from "./views/stopped";
import { renderStateMachineView } from "./views/fsm/fsm";
import { createMermaidDiagram, renderMermaidDiagram, resetZoom, zoomIn, zoomOut, copyDiagramToClipboard } from "./diagram";
import type { LJDiagnostic, RefinementMismatchError } from "../types/diagnostics";
import type { Range } from "../types/context";
import type { LJStateMachine } from "../types/fsm";
import type { ExtensionStatus } from "../state";
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
    let diagnostics: LJDiagnostic[] | undefined;
    let showAllDiagnostics = false;
    let currentFile: string;
    let stateMachine: LJStateMachine | undefined;
    let diagnosticStateMachine: LJStateMachine | undefined;
    let context: LJContext;
    let errorAtCursor: RefinementMismatchError;
    let selectedTab: NavTab = 'diagnostics';
    let status: ExtensionStatus = 'loading';
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

        // location link click
        const locationTarget = target.closest?.('.location-link');
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

        const diagnosticContextButton = target.closest?.('.diagnostic-context-btn');
        if (diagnosticContextButton) {
            e.preventDefault();
            e.stopPropagation();

            const revealTarget = getDiagnosticRevealTargetFromKey(diagnosticContextButton.getAttribute('data-diagnostic-target'));
            if (!revealTarget) return;
            revealContextForDiagnostic(revealTarget);
            return;
        }

        const diagnosticStateMachineButton = target.closest?.('.diagnostic-state-machine-btn');
        if (diagnosticStateMachineButton) {
            e.preventDefault();
            e.stopPropagation();

            const errorIndex = parseInt(diagnosticStateMachineButton.getAttribute('data-error-index') || '-1', 10);
            const diagnostic = getDisplayDiagnostics(diagnostics ?? [], showAllDiagnostics, currentFile)
                .filter(d => d.category === 'error')[errorIndex];
            if (diagnostic?.type !== 'state-refinement-error' || !diagnostic.stateMachine) return;

            selectedTab = 'fsm';
            diagnosticStateMachine = diagnostic.stateMachine;
            showDiagramConditions = false;
            currentDiagram = '';
            updateView();
            return;
        }

        // VC implication simplification step buttons
        const vcImplicationStepButton = target.closest?.('.vc-step-btn');
        if (vcImplicationStepButton) {
            e.stopPropagation();
            handleVCImplicationStepClick(vcImplicationStepButton);
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

        // highlight variable 
        const highlightButton = target.closest?.('.highlight-var-btn');
        if (highlightButton) {
            e.stopPropagation();

            const previousSelected = root.querySelector<HTMLElement>('.highlight-var-btn.selected');
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
            (highlightButton as HTMLElement).focus();
            highlightButton.scrollIntoView({ block: 'nearest' });

            const file = highlightButton.getAttribute('data-file');
            const lineStart = parseInt(highlightButton.getAttribute('data-start-line') || '', 10);
            const colStart = parseInt(highlightButton.getAttribute('data-start-column') || '', 10);
            const lineEnd = parseInt(highlightButton.getAttribute('data-end-line') || '', 10);
            const colEnd = parseInt(highlightButton.getAttribute('data-end-column') || '', 10);
            if (!file || [lineStart, colStart, lineEnd, colEnd].some(Number.isNaN)) return;

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
                if (tab === 'fsm') diagnosticStateMachine = undefined;
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
            copyDiagnosticToClipboard(diagnosticCopyBtn, getDisplayDiagnostics(diagnostics || [], showAllDiagnostics, currentFile));
            return;
        }
    });

    // navigate context variables with the keyboard
    window.addEventListener('keydown', (e: KeyboardEvent) => {
        if (selectedTab !== 'context' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;

        const buttons = Array.from(root.querySelectorAll<HTMLElement>('#context-vars:not(.collapsed) .highlight-var-btn'));
        if (buttons.length === 0) return;

        const selected = root.querySelector<HTMLElement>('.highlight-var-btn.selected');
        const active = document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>('.highlight-var-btn') : null;
        const current = selected || active;
        const currentIndex = current ? buttons.indexOf(current) : -1;
        const fallbackIndex = e.key === 'ArrowDown' ? 0 : buttons.length - 1;
        const nextIndex = currentIndex === -1
            ? fallbackIndex
            : Math.max(0, Math.min(buttons.length - 1, currentIndex + (e.key === 'ArrowDown' ? 1 : -1)));

        e.preventDefault();
        e.stopPropagation();
        const highlightButton = buttons[nextIndex];
        const previousSelected = root.querySelector<HTMLElement>('.highlight-var-btn.selected');
        if (previousSelected) previousSelected.classList.remove('selected');

        highlightButton.classList.add('selected');
        highlightButton.focus();
        highlightButton.scrollIntoView({ block: 'nearest' });

        const file = highlightButton.getAttribute('data-file');
        const lineStart = parseInt(highlightButton.getAttribute('data-start-line') || '', 10);
        const colStart = parseInt(highlightButton.getAttribute('data-start-column') || '', 10);
        const lineEnd = parseInt(highlightButton.getAttribute('data-end-line') || '', 10);
        const colEnd = parseInt(highlightButton.getAttribute('data-end-column') || '', 10);
        if (!file || [lineStart, colStart, lineEnd, colEnd].some(Number.isNaN)) return;

        const range: Range = { lineStart, colStart, lineEnd, colEnd };
        if (file !== currentFile) {
            vscode.postMessage({ type: 'openFile', filePath: file, line: lineStart, character: colStart, highlightRange: range });
        } else {
            vscode.postMessage({ type: 'highlight', range })
        }
    });

    // message event listener from extension
    window.addEventListener('message', event => {
        const msg = event.data;
        switch (msg.type) {
            case 'status':
                status = msg.status as ExtensionStatus;
                updateView();
                break;
            case 'diagnostics':
                diagnostics = msg.diagnostics as LJDiagnostic[];
                if (selectedTab === 'diagnostics') updateView();
                break;
            case 'file':
                currentFile = msg.file;
                if (diagnostics && !showAllDiagnostics && selectedTab === 'diagnostics') updateView();
                diagnosticStateMachine = undefined;
                stateMachine = undefined;
                currentDiagram = '';
                if (selectedTab === 'fsm') updateView();
                break;
            case 'fsm':
                stateMachine = (msg.sm as LJStateMachine | null) ?? undefined;
                showDiagramConditions = false;
                if (selectedTab === 'fsm' && !diagnosticStateMachine) updateView();
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
        if (status === 'stopped' || status === 'crashed') {
            currentDiagram = '';
            root.innerHTML = renderStopped(status);
            return;
        }
        if (status === 'loading') {
            currentDiagram = '';
            root.innerHTML = renderLoading();
            return;
        }

        switch (selectedTab) {
            case 'diagnostics':
                root.innerHTML = diagnostics
                    ? renderDiagnosticsView(diagnostics, showAllDiagnostics, currentFile)
                    : renderLoading();
                break;
            case 'fsm': {
                const displayedStateMachine = diagnosticStateMachine ?? stateMachine;
                const diagram = createMermaidDiagram(displayedStateMachine, diagramOrientation, showDiagramConditions);
                currentDiagram = diagram;
                renderStateMachineView(root, displayedStateMachine, diagram, diagramOrientation, showDiagramConditions);
                if (displayedStateMachine) renderMermaidDiagram(document, window);
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

    function revealContextForDiagnostic(target: DiagnosticRevealTarget) {
        selectedTab = 'context';
        vscode.postMessage({
            type: 'openFile',
            filePath: target.file,
            line: target.position.lineEnd,
            character: target.position.colEnd,
        });
        updateView();
    }

}
