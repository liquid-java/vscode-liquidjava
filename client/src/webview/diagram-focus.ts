import type { LJStateMachine } from "../types/fsm";

export const VALID_STATE_ICON = '✓';
export const INVALID_STATE_ICON = '✕';

/**
 * The selected state error of a single state machine, split by the possible states of the receiver
 */
export type StateErrorFocus = {
    calledMethod: string | null;
    receiver: string | null;
    // states the receiver may be in at the call
    possibleStates: string[];
    // possible states from which the call is accepted
    validStates: string[];
    // possible states from which the call is rejected
    invalidStates: string[];
    // states from which the call is accepted
    acceptedStates: string[];
    // whether nothing is known about the state of the receiver, so that every state is possible
    unknownState: boolean;
};

/**
 * Gets the state error to focus on from the error context of a state machine
 * @param sm
 * @returns the state error focus, or null when there is no error or the server reports no accepted states
 */
export function getStateErrorFocus(sm: LJStateMachine | undefined): StateErrorFocus | null {
    const context = sm?.errorContext;
    if (!sm || !context || context.acceptedStates.length === 0) return null;

    // marking every state as valid or invalid would only say that the state is unknown
    const unknownState = context.possibleStates.length === sm.states.length;
    return {
        calledMethod: context.calledMethod,
        receiver: context.receiver,
        possibleStates: context.possibleStates,
        validStates: unknownState ? [] : context.validStates,
        invalidStates: unknownState ? [] : context.invalidStates,
        acceptedStates: context.acceptedStates,
        unknownState,
    };
}

/**
 * Gets the states related to a state error: the possible states of the receiver and the accepted states
 * @param focus
 * @returns the related states
 */
export function getRelatedStates(focus: StateErrorFocus): string[] {
    return [...new Set([...focus.possibleStates, ...focus.acceptedStates])];
}

/**
 * Gets the text shown for the rejected call, e.g. root.getFirstChild()
 * @param call the called method and receiver of the state error
 * @returns the call text, or null when the called method is unknown
 */
export function getRejectedCallText(call: Pick<StateErrorFocus, 'calledMethod' | 'receiver'>): string | null {
    if (!call.calledMethod) return null;
    return `${call.receiver ? `${call.receiver}.` : ''}${call.calledMethod}()`;
}

/**
 * Orders the state machines of a class so that those of the state sets with the state error come first,
 * starting with those whose state does not allow the call
 * @param sms the state machines, one per state set, in declaration order
 * @returns the state machines in a wrong state, then the others with the state error, then the rest, each in declaration order
 */
export function orderStateMachines(sms: LJStateMachine[]): LJStateMachine[] {
    const rank = (sm: LJStateMachine) => hasWrongState(sm) ? 0 : sm.errorContext ? 1 : 2;
    return [...sms].sort((a, b) => rank(a) - rank(b));
}

/**
 * Whether the receiver may be in a state of this state set that does not allow the call
 */
function hasWrongState(sm: LJStateMachine): boolean {
    return (getStateErrorFocus(sm)?.invalidStates.length ?? 0) > 0;
}

/**
 * Gets the other state sets whose state rejects the call, when every possible state of this one allows it
 * @param sm the state machine of this state set
 * @param sms the state machines of the class, one per state set
 * @returns the state machines in a wrong state, empty when this one may be in a wrong state or its state is unknown
 */
export function getRejectingStateSets(sm: LJStateMachine, sms: LJStateMachine[]): LJStateMachine[] {
    const focus = getStateErrorFocus(sm);
    if (!focus || focus.unknownState || focus.invalidStates.length > 0) return [];
    return sms.filter(other => other !== sm && hasWrongState(other));
}

/**
 * Gets the state error to focus on in each state machine that has one
 * @param sms the state machines, one per state set
 * @returns the state error focus of each state set with the error
 */
export function getStateErrorFocuses(sms: LJStateMachine[]): StateErrorFocus[] {
    return sms.map(getStateErrorFocus).filter((focus): focus is StateErrorFocus => !!focus);
}
