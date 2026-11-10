import type { LJStateMachine } from "../types/fsm";

/**
 * A condition of a transition on the state of a state set, as the states it allows
 */
export type StateCondition = {
    stateSet: LJStateMachine;
    states: string[];
};

// lockState(this) == unlocked, lockState(this) != locked
const STATE_SET_FIRST = /^(\w+)\(this\)\s*(==|!=)\s*(\w+)$/;
// unlocked == lockState(this)
const STATE_FIRST = /^(\w+)\s*(==|!=)\s*(\w+)\(this\)$/;
// unlocked(this), for a state set without a name
const STATE_ONLY = /^(\w+)\(this\)$/;

/**
 * Reads a transition's condition as the states it needs of the class's state sets
 * @param condition the condition as written in the spec, e.g. lockState(this) != locked && mode(this) == fast
 * @param sms the state machines of the class, one per state set
 * @returns the condition on each state set, or null when a part of it is not about a state
 */
export function parseStateConditions(condition: string, sms: LJStateMachine[]): StateCondition[] | null {
    if (condition.includes('||')) return null;
    const conditions = condition.split('&&').map(part => parseStateCondition(unwrap(part.trim()), sms));
    return conditions.every(Boolean) ? conditions as StateCondition[] : null;
}

function parseStateCondition(text: string, sms: LJStateMachine[]): StateCondition | null {
    const stateSetFirst = text.match(STATE_SET_FIRST);
    const stateFirst = text.match(STATE_FIRST);
    if (stateSetFirst) return getComparedStates(stateSetFirst[1], stateSetFirst[2], stateSetFirst[3], sms);
    if (stateFirst) return getComparedStates(stateFirst[3], stateFirst[2], stateFirst[1], sms);

    const state = text.match(STATE_ONLY)?.[1];
    const withState = state ? sms.filter(sm => sm.states.includes(state)) : [];
    return state && withState.length === 1 ? { stateSet: withState[0], states: [state] } : null;
}

// a != on a state set allows its other states
function getComparedStates(name: string, operator: string, state: string, sms: LJStateMachine[]): StateCondition | null {
    const stateSet = sms.find(sm => sm.stateSetName === name && sm.states.includes(state));
    if (!stateSet) return null;
    return { stateSet, states: operator === '==' ? [state] : stateSet.states.filter(other => other !== state) };
}

function unwrap(text: string): string {
    return text.replace(/^\((.*)\)$/, '$1').trim();
}
