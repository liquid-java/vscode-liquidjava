import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;

import org.junit.jupiter.api.Test;

import liquidjava.diagnostics.LJDiagnostic;
import liquidjava.diagnostics.hints.Hint;

class LJDiagnosticsHandlerTest {

    @Test
    void messageIsTheTitleAndTheHeadlineWithoutCodeFences() {
        LJDiagnostic diagnostic = new LJDiagnostic("Refinement Error", "found `x > 0` but expected `y == 1`", null, "",
                null) {
            @Override
            public List<String> getMessageNotes() {
                return List.of("where Positive(x) means x > 0");
            }
        };
        diagnostic.setCounterexampleStr("Counterexample: timeout == -1");
        diagnostic.addHint(Hint.general("Add a refinement"));
        assertEquals("Refinement Error: found x > 0 but expected y == 1", LJDiagnosticsHandler.diagnosticMessage(diagnostic));
    }
}
