package dtos.fsm;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

import org.junit.jupiter.api.Test;

import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.fsm.StateMachine;
import liquidjava.fsm.StateMachineInitialTransition;
import liquidjava.fsm.StateMachineTransition;

class StateMachineDTOTest {

    private static final StateMachine TILING = new StateMachine("example.Params", 0,
            List.of("startTiling", "tilingSet"),
            List.of(new StateMachineTransition("startTiling", "tilingSet", "setTiling"),
                    new StateMachineTransition("tilingSet", "tilingSet", "write", "compressionSet(this)", null)),
            List.of(new StateMachineInitialTransition("startTiling")));
    private static final StateMachine COMPRESSION = new StateMachine("example.Params", 1,
            List.of("startCompression", "compressionSet"),
            List.of(new StateMachineTransition("startCompression", "compressionSet", "setCompressionType"),
                    new StateMachineTransition("compressionSet", "compressionSet", "write", "tilingSet(this)", null)),
            List.of(new StateMachineInitialTransition("startCompression")));

    private static StateErrorContext call(String method) {
        return new StateErrorContext("p", "example.Params", method, List.of(List.of("startTiling", "startCompression")),
                List.of(List.of("tilingSet", "compressionSet")), true);
    }

    @Test
    void showsTheErrorOnlyOnTheStateSetsOfTheCalledMethod() {
        List<StateMachineDTO> dtos = StateMachineDTO.from(List.of(TILING, COMPRESSION), call("setTiling(int)"));
        assertEquals(List.of(0, 1), dtos.stream().map(StateMachineDTO::stateSet).toList());
        assertEquals(List.of("startTiling"), dtos.get(0).errorContext().invalidStates());
        assertNull(dtos.get(1).errorContext());
    }

    @Test
    void showsTheErrorOnEveryStateSetTheCalledMethodRequires() {
        List<StateMachineDTO> dtos = StateMachineDTO.from(List.of(TILING, COMPRESSION), call("write()"));
        assertEquals(List.of("startTiling"), dtos.get(0).errorContext().invalidStates());
        assertEquals(List.of("startCompression"), dtos.get(1).errorContext().invalidStates());
    }

    @Test
    void showsTheErrorOnEveryStateSetWhenNoneHasTheCalledMethod() {
        List<StateMachineDTO> dtos = StateMachineDTO.from(List.of(TILING, COMPRESSION), call("close()"));
        assertNotNull(dtos.get(0).errorContext());
        assertNotNull(dtos.get(1).errorContext());
    }

    @Test
    void hasNoErrorWithoutAContext() {
        List<StateMachineDTO> dtos = StateMachineDTO.from(List.of(TILING, COMPRESSION), null);
        assertNull(dtos.get(0).errorContext());
        assertNull(dtos.get(1).errorContext());
    }
}
