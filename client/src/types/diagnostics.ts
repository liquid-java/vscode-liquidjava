import type { Range } from './context';
import type { LJStateMachine } from './fsm';
import type { VCSimplificationResult } from './vc-implications';

// Type definitions used for LiquidJava diagnostics

export type SourcePosition = Range & {
    file: string | null;
}

export type PlacementInCode = {
    text: string;
    position: SourcePosition | null;
}

export type TranslationTable = Record<string, PlacementInCode>;

export type LJDiagnostic = LJError | LJWarning;

export type LJError = CustomError | IllegalConstructorTransitionError | 
    InvalidRefinementError | NotFoundError | RefinementError | StateConflictError | 
    StateRefinementError | SyntaxError | ArgumentMismatchError;

export type LJWarning = CustomWarning | ExternalClassNotFoundWarning | ExternalMethodNotFoundWarning | UnsatisfiableRefinementWarning;

type BaseDiagnostic = {
    title: string;
    message: string;
    hint: string;
    file: string;
    position: SourcePosition | null;
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
    expected: string;
    found: VCSimplificationResult;
    customMessage: string;
    counterexample: Counterexample;
    declarationPosition: SourcePosition | null;
}

export type Counterexample = {
    assignments: CounterexampleAssignment[];
}

export type CounterexampleAssignment = {
    variable: string;
    value: string;
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
    found: VCSimplificationResult;
    customMessage: string;
    declarationPosition: SourcePosition | null;
    stateMachine: LJStateMachine | null;
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
    signature: string;
    className: string;
    overloads: string[];
}

export type UnsatisfiableRefinementWarning = BaseDiagnostic & {
    category: 'warning';
    type: 'unsatisfiable-refinement-warning';
    refinement: string;
}

export type RefinementMismatchError = RefinementError | StateRefinementError;

export type DiagnosticRevealTarget = {
    file: string;
    position: SourcePosition;
}
