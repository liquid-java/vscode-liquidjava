import { ExternalClassNotFoundWarning, ExternalMethodNotFoundWarning, LJWarning } from "../../../types";
import { renderHeader, renderLocation, renderCustomSection } from "./utils";

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

export function renderWarning(warning: LJWarning): string {
    const header = renderHeader(warning);
    const location = renderLocation(warning);
    switch (warning.type) {
        case 'external-class-not-found-warning': {
            const e = warning as ExternalClassNotFoundWarning;
            return `${header}${renderCustomSection('Class Name', `<pre>${e.className}</pre>`)}${location}`;
        }
        case 'external-method-not-found-warning': {
            const e = warning as ExternalMethodNotFoundWarning;
            return `${header}${renderCustomSection('Method', `<pre>${e.methodName}</pre>`)}${e.overloads.length > 0 ? renderCustomSection("Overloads", `<pre>${e.overloads.join("\n")}</pre>`) : ""}${location}`;
        }
        case 'custom-warning': {
            return `${header}${location}`;
        }
    }
}
