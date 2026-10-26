import { describe, expect, it } from 'vitest';
import type { LJDiagnostic, StateRefinementError } from '../types/diagnostics';
import type { LJStateMachine } from '../types/fsm';
import { findStateError, getAllStateErrors, getStateErrorKey, getStateErrors } from './state-errors';

const refinementsFile = '/workspace/src/DefaultMutableTreeNodeRefinements.java';
const callerFile = '/workspace/src/OutlineBuilder.java';
const otherCallerFile = '/workspace/src/Another.java';

function machine(className = 'javax.swing.tree.DefaultMutableTreeNode'): LJStateMachine {
    return {
        className, states: ['childrenAllowed', 'maybeHasChildren'],
        initialTransitions: [{ to: 'childrenAllowed' }],
        transitions: [{ from: 'childrenAllowed', to: 'maybeHasChildren', label: 'add' }],
        errorContext: { calledMethod: 'getFirstChild', receiver: 'root', possibleStates: ['childrenAllowed'], acceptedStates: ['maybeHasChildren'], validStates: [], invalidStates: ['childrenAllowed'] },
    };
}

function stateError(line: number, overrides: Partial<StateRefinementError> = {}): StateRefinementError {
    const file = overrides.file ?? callerFile;
    return {
        category: 'error', type: 'state-refinement-error', title: 'State Refinement Error',
        message: 'found childrenAllowed(root¹⁸) but expected maybeHasChildren(root¹⁸)', hints: [],
        file, position: { file, lineStart: line, colStart: 15, lineEnd: line, colEnd: 35 },
        translationTable: {}, expected: 'maybeHasChildren(root¹⁸)',
        found: { implication: null as never, origin: null, simplification: null },
        customMessage: '',
        declarationPosition: { file: refinementsFile, lineStart: 21, colStart: 29, lineEnd: 21, colEnd: 51 },
        stateMachine: machine(),
        ...overrides,
    };
}

describe('state errors', () => {
    it('keeps only the state errors that carry a state machine', () => {
        const withMachine = stateError(10);
        const withoutMachine = stateError(14, { stateMachine: null });
        const refinementError = { ...stateError(16), type: 'custom-error' } as unknown as LJDiagnostic;

        expect(getAllStateErrors([withMachine, withoutMachine, refinementError])).toEqual([withMachine]);
        expect(getAllStateErrors(undefined)).toEqual([]);
    });

    it('lists the errors of the current file in source order', () => {
        const later = stateError(20);
        const earlier = stateError(10);
        const otherFile = stateError(5, { file: otherCallerFile });

        expect(getStateErrors([later, otherFile, earlier], callerFile)).toEqual([earlier, later]);
        expect(getStateErrors([later, otherFile], refinementsFile)).toEqual([]);
        expect(getStateErrors([later], undefined)).toEqual([]);
    });

    it('finds the selected error again after verification', () => {
        const selected = stateError(10);
        const moved = stateError(12);
        const otherCall = stateError(20, { declarationPosition: { file: refinementsFile, lineStart: 18, colStart: 29, lineEnd: 18, colEnd: 51 } });

        expect(findStateError([otherCall, stateError(10)], selected, [selected, otherCall])).toEqual(selected);
        // an edit moved the only error of this call
        expect(findStateError([otherCall, moved], selected, [selected, otherCall])).toBe(moved);
        expect(findStateError([otherCall, moved], selected)).toBeUndefined();
        expect(findStateError([otherCall], selected, [selected, otherCall])).toBeUndefined();
        expect(findStateError([moved, stateError(14)], selected, [selected])).toBeUndefined();
        expect(findStateError([selected], undefined)).toBeUndefined();
    });

    it('drops a fixed selection instead of moving it to a sibling for the same call', () => {
        const selected = stateError(10);
        const sibling = stateError(20);

        expect(findStateError([sibling], selected, [selected, sibling])).toBeUndefined();
    });

    it('keeps keys distinct for errors without a position', () => {
        const first = stateError(10, { position: null, title: 'State Refinement Error', message: 'a' });
        const second = stateError(10, { position: null, title: 'State Conflict', message: 'a' });

        expect(getStateErrorKey(first)).not.toBe(getStateErrorKey(second));
        expect(getStateErrorKey(first)).not.toMatch(/:\d+:\d+-\d+:\d+$/);
        expect(findStateError([second], first)).toBeUndefined();
    });
});
