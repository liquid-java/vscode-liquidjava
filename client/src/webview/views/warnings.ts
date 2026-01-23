import { ExternalClassNotFoundWarning, ExternalMethodNotFoundWarning, LJWarning } from "../../types";
import { renderHeader, renderLocation, renderSection } from "./sections";

export function getWarningsView(warnings: LJWarning[], showAllDiagnostics: boolean, currentFile: string | undefined): string {
    return /*html*/`
        <div>
            <div class="content">
                <ul>
                    ${warnings.filter(warning => showAllDiagnostics || warning.file === currentFile).map((warning) => /*html*/`
                        <li class="diagnostic-item warning-item">
                            ${renderWarning(warning)}
                        </li>
                    `).join("")}
                </ul>
            </div>
        </div>
    `;
}

const warningContentRenderers: Partial<Record<LJWarning['type'], (warning: LJWarning) => string>> = {
    'external-class-not-found-warning': (w: ExternalClassNotFoundWarning) => /*html*/`
        ${renderSection('Class Name', w.className)}
    `,
    'external-method-not-found-warning': (w: ExternalMethodNotFoundWarning) => /*html*/`
        ${renderSection('Method', w.methodName)}
        ${w.overloads.length > 0 ? renderSection('Overloads', w.overloads.join('\n')) : ''}
    `
};

export function renderWarning(warning: LJWarning): string {
    const header = renderHeader(warning);
    const content = warningContentRenderers[warning.type]?.(warning) ?? '';
    const location = renderLocation(warning);
    return /*html*/`${header}${content}${location}`;
}
