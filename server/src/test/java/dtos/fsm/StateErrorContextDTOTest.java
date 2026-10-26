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
                List.of("open"), List.of("closed")), StateErrorContextDTO.from(context, List.of("open", "closed"), 0));
    }

    @Test
    void leavesAStateUnmarkedWhenTheCallIsAllowedInOnlySomeOfItsCombinations() {
        StateErrorContext context = new StateErrorContext("d", "example.Door", "open()",
                List.of(List.of("closed", "locked"), List.of("closed", "unlocked"), List.of("opened", "locked")),
                List.of(List.of("closed", "unlocked")), true);
        StateErrorContextDTO dto = StateErrorContextDTO.from(context, List.of("closed", "opened"), 0);
        assertEquals(List.of("closed", "opened"), dto.possibleStates());
        assertEquals(List.of(), dto.validStates());
        assertEquals(List.of("opened"), dto.invalidStates());
    }

    @Test
    void marksTheStatesOfTheGivenStateSet() {
        // setCompressionType is only allowed in compressionExplicit, whatever the tiling state
        StateErrorContext context = new StateErrorContext("p", "javax.imageio.ImageWriteParam",
                "setCompressionType(String)", List.of(List.of("tilingExplicit", "startCompression")),
                List.of(List.of("startTiling", "compressionExplicit"), List.of("tilingExplicit", "compressionExplicit")),
                true);
        assertEquals(new StateErrorContextDTO("setCompressionType", "p", List.of("startCompression"),
                List.of("compressionExplicit"), List.of(), List.of("startCompression")),
                StateErrorContextDTO.from(context, List.of("startCompression", "compressionExplicit"), 1));
    }

    @Test
    void doesNotBlameAStateForACallRejectedBecauseOfAnotherStateSet() {
        // write needs tilingSet and compressionSet, the receiver only has the compression state right
        StateErrorContext context = new StateErrorContext("p", "example.Params", "write()",
                List.of(List.of("tilingExplicit", "compressionSet")), List.of(List.of("tilingSet", "compressionSet")),
                true);
        StateErrorContextDTO tiling = StateErrorContextDTO.from(context, List.of("tilingExplicit", "tilingSet"), 0);
        assertEquals(List.of("tilingExplicit"), tiling.invalidStates());
        StateErrorContextDTO compression = StateErrorContextDTO.from(context,
                List.of("compressionExplicit", "compressionSet"), 1);
        assertEquals(List.of("compressionSet"), compression.possibleStates());
        assertEquals(List.of("compressionSet"), compression.acceptedStates());
        assertEquals(List.of(), compression.validStates());
        assertEquals(List.of(), compression.invalidStates());
    }

    @Test
    void acceptedStatesThatDependOnTheArgumentsMarkNothing() {
        StateErrorContext context = new StateErrorContext("f", "example.File", "reopen(int)",
                List.of(List.of("open")), null, false);
        StateErrorContextDTO dto = StateErrorContextDTO.from(context, List.of("open", "closed"), 0);
        assertEquals(List.of(), dto.acceptedStates());
        assertEquals(List.of(), dto.validStates());
        assertEquals(List.of(), dto.invalidStates());
    }
}
