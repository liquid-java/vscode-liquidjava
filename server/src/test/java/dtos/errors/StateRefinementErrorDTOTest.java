package dtos.errors;

import static org.junit.jupiter.api.Assertions.*;

import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

import dtos.fsm.StateMachineDTO;
import liquidjava.api.CommandLineLauncher;
import liquidjava.diagnostics.errors.StateErrorContext;
import liquidjava.fsm.StateMachineTransition;

class StateRefinementErrorDTOTest {

    private static final Path HIERARCHY = Path.of("src", "test", "resources", "hierarchy").toAbsolutePath();
    private static final String WINDOW = file("A_WindowRefinements.java");
    private static final String FRAME = file("B_FrameRefinements.java");
    private static final String JFRAME = file("C_JFrameRefinements.java");

    private static String file(String name) {
        return HIERARCHY.resolve(name).toString();
    }

    private static StateErrorContext call(String receiverClass, String method) {
        return new StateErrorContext("host", receiverClass, method, List.of(List.of("displayable")),
                List.of(List.of("notDisplayable")), true);
    }

    private static List<String> methods(StateMachineDTO sm) {
        return sm.transitions().stream().map(StateMachineTransition::label).distinct().toList();
    }

    @Test
    void showsTheCallOnTheStateSetItsClassInheritsFromTheSuperclassSpec() {
        List<StateMachineDTO> dtos = StateRefinementErrorDTO.stateMachines(FRAME, List.of(WINDOW),
                call("java.awt.Frame", "setUndecorated(boolean)"));
        assertEquals(1, dtos.size());
        StateMachineDTO sm = dtos.get(0);
        assertEquals("java.awt.Frame", sm.className());
        assertEquals(List.of("displayable", "notDisplayable"), sm.states());
        assertEquals(List.of("setUndecorated", "dispose", "pack"), methods(sm));
        assertEquals(List.of("displayable"), sm.errorContext().invalidStates());
        assertEquals(List.of("notDisplayable"), sm.errorContext().acceptedStates());
    }

    @Test
    void showsTheMethodsOfASuperclassSpecWithoutStateSet() {
        List<StateMachineDTO> dtos = StateRefinementErrorDTO.stateMachines(JFRAME, List.of(WINDOW, FRAME),
                call("javax.swing.JFrame", "setDefaultCloseOperation(int)"));
        assertEquals(List.of("setDefaultCloseOperation", "setUndecorated", "dispose", "pack"), methods(dtos.get(0)));
    }

    @Test
    void showsTheDeclarationFilesFirstClassWithoutTheVerifiersStates() {
        List<StateMachineDTO> dtos = StateRefinementErrorDTO.stateMachines(WINDOW, List.of(FRAME), null);
        assertEquals(List.of("java.awt.Window"), dtos.stream().map(StateMachineDTO::className).toList());
        assertNull(dtos.get(0).errorContext());
    }

    @Test
    void readsTheSpecsOfTheStateSetsAndOfTheMethodsWithoutStateSet() {
        CommandLineLauncher.cmdArgs.lspMode = true;
        CommandLineLauncher.launch(HIERARCHY.toString());
        assertTrue(StateRefinementErrorDTO.specFiles().containsAll(List.of(WINDOW, FRAME, JFRAME)),
                StateRefinementErrorDTO.specFiles().toString());
    }
}
