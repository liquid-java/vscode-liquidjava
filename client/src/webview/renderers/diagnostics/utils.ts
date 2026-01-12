import { LJDiagnostic } from "../../../types";

export const renderCustomSection = (title: string, body: string): string =>
    `<div class="section"><strong>${title}:</strong><div>${body}</div></div>`;

export const renderSection = (title: string, body: string): string =>
    renderCustomSection(title, `<pre>${body}</pre>`);

export const renderHeader = (diagnostic: LJDiagnostic): string => {
    return `<h3>${diagnostic.title}</h3><div class="diagnostic-header"><p>${diagnostic.message}</p></div>`;
};

export const renderLocation = (diagnostic: LJDiagnostic): string => {
    if (!diagnostic.position) return "";
    const line = diagnostic.position?.lineStart ?? 0;
    const column = diagnostic.position?.colStart ?? 0;
    const simpleFile = diagnostic.file.split('/').pop() || diagnostic.file;
    const link = `<a href="#" class="link location-link" data-file="${diagnostic.file}" data-line="${line}" data-column="${column}">${simpleFile}:${line}</a>`;
    return renderCustomSection("Location", `<pre>${link}</pre>`);
};
