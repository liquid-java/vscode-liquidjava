package dtos.errors;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

import dtos.fsm.StateMachineDTO;
import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.fsm.StateMachineTransition;

class StateRefinementErrorDTOTest {

    private static final String WINDOW = file("WindowRefinements.java");
    private static final String FRAME = file("FrameRefinements.java");
    private static final StateErrorContext SET_UNDECORATED = new StateErrorContext("host", "java.awt.Frame",
            "setUndecorated(boolean)", List.of(List.of("displayable")), List.of(List.of("notDisplayable")), true);

    private static String file(String name) {
        return Path.of("src", "test", "resources", "inherited", name).toAbsolutePath().toString();
    }

    @Test
    void showsTheCallOnTheStateSetItsClassInheritsFromTheSuperclassSpec() {
        List<StateMachineDTO> dtos = StateRefinementErrorDTO.stateMachines(FRAME, List.of(WINDOW), SET_UNDECORATED);
        assertEquals(1, dtos.size());
        StateMachineDTO sm = dtos.get(0);
        assertEquals("java.awt.Frame", sm.className());
        assertEquals(List.of("displayable", "notDisplayable"), sm.states());
        assertEquals(List.of("setUndecorated", "dispose", "pack"),
                sm.transitions().stream().map(StateMachineTransition::label).distinct().toList());
        assertEquals(List.of("displayable"), sm.errorContext().invalidStates());
        assertEquals(List.of("notDisplayable"), sm.errorContext().acceptedStates());
    }

    @Test
    void showsTheDeclarationFilesFirstClassWithoutTheVerifiersStates() {
        List<StateMachineDTO> dtos = StateRefinementErrorDTO.stateMachines(WINDOW, List.of(FRAME), null);
        assertEquals(List.of("java.awt.Window"), dtos.stream().map(StateMachineDTO::className).toList());
        assertNull(dtos.get(0).errorContext());
    }
}
