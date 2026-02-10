import { LJDiagnostic, LJError, LJWarning } from "../../../types/diagnostics";
import { renderErrors } from "./errors";
import { NavTab, renderMainHeader } from "../sections";
import { renderWarnings } from "./warnings";

export function renderVerificationView(
    diagnostics: LJDiagnostic[],
    showAll: boolean,
    currentFile: string,
    expandedErrors: Set<number>,
    selectedTab: NavTab
): string {
    const fileDiagnostics = diagnostics.filter(diagnostic => diagnostic.file?.toLowerCase() === currentFile?.toLowerCase() || !diagnostic.file);
    const displayDiagnostics = showAll ? diagnostics : fileDiagnostics;
    const errors = displayDiagnostics.filter(d => d.category === 'error') as LJError[];
    const warnings = displayDiagnostics.filter(d => d.category === 'warning') as LJWarning[];
    const totalErrors = diagnostics.filter(d => d.category === 'error').length;
    const hasErrors = totalErrors > 0;
    const hiddenErrors = totalErrors - errors.length;
    const titleMessage = hasErrors ? "Failed Verification" : "Passed Verification";
    const infoMessage = hasErrors ? 
        `${totalErrors} error${totalErrors !== 1 ? 's were' : ' was'} found by the LiquidJava verifier` :
        "No errors were found by the LiquidJava verifier.";
    
    return /*html*/`
        <div>
            ${renderMainHeader(titleMessage, selectedTab)}
            <p class="info">${infoMessage}</p>
            ${
                diagnostics.length === 0 ? '' : /*html*/`
                    <button id="show-all-button" class="underline-button">
                        ${showAll ? `Show file diagnostics` : `Show all diagnostics`}
                    </button>
                `
            }
            <div class="content">
                ${renderErrors(errors, expandedErrors)}
                ${renderWarnings(warnings)}
                ${displayDiagnostics.length > 0 && hiddenErrors > 0 ? /*html*/`
                    <p class="more-indicator">(+${hiddenErrors} error${hiddenErrors !== 1 ? 's' : ''})</p>
                ` : ''}
            </div>
        </div>
    `;
}