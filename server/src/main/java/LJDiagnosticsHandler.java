import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.DiagnosticSeverity;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.PublishDiagnosticsParams;
import org.eclipse.lsp4j.Range;

import liquidjava.api.CommandLineLauncher;
import liquidjava.diagnostics.Diagnostics;
import liquidjava.diagnostics.errors.LJError;
import spoon.reflect.cu.SourcePosition;
import utils.PathUtils;

public class LJDiagnosticsHandler {

    /** The source every LiquidJava diagnostic carries, which tells it apart from Java's own */
    private static final String SOURCE = "liquidjava";

    /** What the old extension called every error, whatever its kind */
    private static final String MESSAGE = "Refinement Type Error";

    /**
     * Runs the verifier and returns its errors. Warnings are left out: the old verifier had none.
     */
    public static LJDiagnostics getLJDiagnostics(String path) throws Exception {
        CommandLineLauncher.cmdArgs.lspMode = true;
        CommandLineLauncher.launch(path);
        Diagnostics diagnostics = Diagnostics.getInstance();
        List<LJError> errors = diagnostics.foundError() ? new ArrayList<>(diagnostics.getErrors())
                : Collections.emptyList();
        return new LJDiagnostics(errors);
    }

    /**
     * Converts verifier errors to standard LSP diagnostics, one per error, with the old text block as the message. An
     * error without a position goes to the verified document.
     */
    public static List<PublishDiagnosticsParams> getNativeDiagnostics(LJDiagnostics diagnostics, String uri) {
        Map<String, List<Diagnostic>> byFile = new LinkedHashMap<>();
        for (LJError error : diagnostics.errors()) {
            String file = error.getFile() == null ? uri : PathUtils.toFileUri(error.getFile());
            Range range = getRangeFromPosition(error.getPosition());
            String message = MESSAGE + "\n" + BaselineMessages.title(error) + "\n" + BaselineMessages.full(error);
            byFile.computeIfAbsent(file, k -> new ArrayList<>())
                    .add(new Diagnostic(range, message, DiagnosticSeverity.Error, SOURCE));
        }
        if (byFile.isEmpty())
            return List.of(getEmptyDiagnostics(uri));
        return byFile.entrySet().stream().map(e -> new PublishDiagnosticsParams(e.getKey(), e.getValue())).toList();
    }

    public static PublishDiagnosticsParams getEmptyDiagnostics(String uri) {
        return new PublishDiagnosticsParams(uri, Collections.emptyList());
    }

    private static Range getRangeFromPosition(SourcePosition position) {
        if (position == null || position.getFile() == null) {
            return new Range(new Position(0, 0), new Position(0, 0));
        }
        return new Range(new Position(position.getLine() - 1, position.getColumn() - 1),
                new Position(position.getEndLine() - 1, position.getEndColumn() - 1));
    }
}
