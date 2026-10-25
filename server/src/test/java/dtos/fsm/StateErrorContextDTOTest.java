package dtos.fsm;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

import liquidjava.diagnostics.errors.StateErrorContext;

class StateErrorContextDTOTest {

    @Test
    void marksThePossibleStatesThatAllowTheCall() {
        StateErrorContext context = new StateErrorContext("f", "example.File", "read(int)",
                List.of(List.of("closed"), List.of("open")), List.of(List.of("open")), true);
        assertEquals(new StateErrorContextDTO("read", "f", List.of("open", "closed"), List.of("open"),
                List.of("open"), List.of("closed")), StateErrorContextDTO.from(context, List.of("open", "closed")));
    }

    @Test
    void leavesAStateUnmarkedWhenTheCallIsAllowedInOnlySomeOfItsCombinations() {
        StateErrorContext context = new StateErrorContext("d", "example.Door", "open()",
                List.of(List.of("closed", "locked"), List.of("closed", "unlocked"), List.of("opened", "locked")),
                List.of(List.of("closed", "unlocked")), true);
        StateErrorContextDTO dto = StateErrorContextDTO.from(context, List.of("closed", "opened"));
        assertEquals(List.of("closed", "opened"), dto.possibleStates());
        assertEquals(List.of(), dto.validStates());
        assertEquals(List.of("opened"), dto.invalidStates());
    }

    @Test
    void acceptedStatesThatDependOnTheArgumentsMarkNothing() {
        StateErrorContext context = new StateErrorContext("f", "example.File", "reopen(int)",
                List.of(List.of("open")), null, false);
        StateErrorContextDTO dto = StateErrorContextDTO.from(context, List.of("open", "closed"));
        assertEquals(List.of(), dto.acceptedStates());
        assertEquals(List.of(), dto.validStates());
        assertEquals(List.of(), dto.invalidStates());
    }
}
