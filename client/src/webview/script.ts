import type { LJError, LJWarning, LJDiagnostic } from "../types";
import { handleDerivableNodeClick, handleDerivationResetClick } from "./renderers/diagnostics/derivation-nodes";
import { getCorrectView } from "./renderers/correct";
import { getLoadingView } from "./renderers/loading";
import { getErrorsView } from "./renderers/diagnostics/errors";
import { getWarningsView } from "./renderers/diagnostics/warnings";

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
    let totalErrors = 0;
    let totalWarnings = 0;

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
        }
    });
    
    window.addEventListener('message', event => {
        const msg = event.data;
        if (msg.type === 'diagnostics') {
            const diagnostics = msg.diagnostics as LJDiagnostic[];
            const errors = diagnostics.filter((diag: LJDiagnostic) => diag.category === 'error') as LJError[];
            const warnings = diagnostics.filter((diag: LJDiagnostic) => diag.category === 'warning') as LJWarning[];

            totalErrors = errors.length;
            totalWarnings = warnings.length;

            fileErrors = errors.filter(error => error.file === msg.file || error.file === undefined);
            fileWarnings = warnings.filter(warning => warning.file === msg.file || warning.file === undefined);

            updateView();
        }
    });

    function updateView() {
        let mainView = totalErrors > 0 ? getErrorsView(fileErrors, totalErrors) : getCorrectView();
        let warningsView = totalWarnings > 0 ? getWarningsView(fileWarnings) : '';
        root.innerHTML = mainView + warningsView;
    }
}

