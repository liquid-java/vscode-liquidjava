import type { ValDerivationNode } from './derivation-nodes';

// Type definitions used for LiquidJava diagnostics

export type ErrorPosition = {
    lineStart: number;
    lineEnd: number;
    colStart: number;
    colEnd: number;
}

export type Position = {
    file: string;
    line: number;
    column: number;
}

export type PlacementInCode = {
    text: string;
    position: Position;
}

export type TranslationTable = Record<string, PlacementInCode>;

export type LJDiagnostic = LJError | LJWarning;

export type LJError = CustomError | IllegalConstructorTransitionError | 
    InvalidRefinementError | NotFoundError | RefinementError | StateConflictError | 
    StateRefinementError | SyntaxError | ArgumentMismatchError;

export type LJWarning = CustomWarning | ExternalClassNotFoundWarning | ExternalMethodNotFoundWarning;

type BaseDiagnostic = {
    title: string;
    message: string;
    file: string;
    position?: ErrorPosition;
}

export type CustomError = BaseDiagnostic & {
    category: 'error';
    type: 'custom-error';
}

export type IllegalConstructorTransitionError = BaseDiagnostic & {
    category: 'error';
    type: 'illegal-constructor-transition-error';
}

export type InvalidRefinementError = BaseDiagnostic & {
    category: 'error';
    type: 'invalid-refinement-error';
    refinement: string;
}

export type NotFoundError = BaseDiagnostic & {
    category: 'error';
    type: 'not-found-error';
    translationTable: TranslationTable;
    name: string;
    kind: string;
}

export type RefinementError = BaseDiagnostic & {
    category: 'error';
    type: 'refinement-error';
    translationTable: TranslationTable;
    expected: ValDerivationNode;
    found: ValDerivationNode;
}

export type StateConflictError = BaseDiagnostic & {
    category: 'error';
    type: 'state-conflict-error';
    translationTable: TranslationTable;
    state: string;
}

export type StateRefinementError = BaseDiagnostic & {
    category: 'error';
    type: 'state-refinement-error';
    translationTable: TranslationTable;
    expected: string;
    found: string;
}

export type ArgumentMismatchError = BaseDiagnostic & {
    category: 'error';
    type: 'argument-mismatch-error';
    refinement: string;
}

export type SyntaxError = BaseDiagnostic & {
    category: 'error';
    type: 'syntax-error';
    refinement: string;
}

export type CustomWarning = BaseDiagnostic & {
    category: 'warning';
    type: 'custom-warning';
}

export type ExternalClassNotFoundWarning = BaseDiagnostic & {
    category: 'warning';
    type: 'external-class-not-found-warning';
    className: string;
}

export type ExternalMethodNotFoundWarning = BaseDiagnostic & {
    category: 'warning';
    type: 'external-method-not-found-warning';
    methodName: string;
    className: string;
    overloads: string[];
}
