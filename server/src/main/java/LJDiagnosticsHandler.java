import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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

    /**
     * Runs the verifier and returns its errors.
     */
    public static LJDiagnostics getLJDiagnostics(String path) throws Exception {
        CommandLineLauncher.cmdArgs.lspMode = true;
        CommandLineLauncher.launch(path);
        Diagnostics diagnostics = Diagnostics.getInstance();
        List<LJError> errors = diagnostics.foundError()
                ? new ArrayList<>(diagnostics.getErrors())
                : Collections.emptyList();
        return new LJDiagnostics(errors);
    }

    /**
     * Converts verifier errors to standard LSP diagnostics.
     */
    public static List<PublishDiagnosticsParams> getNativeDiagnostics(LJDiagnostics diagnostics, String uri) {
        List<PublishDiagnosticsParams> errors = getDiagnostics(new ArrayList<>(diagnostics.errors()));
        return errors.isEmpty() ? List.of(getEmptyDiagnostics(uri)) : errors;
    }

    private static List<PublishDiagnosticsParams> getDiagnostics(List<LJError> diagnostics) {
        Map<String, List<Diagnostic>> diagnosticsByFile = diagnostics.stream()
                .collect(Collectors.groupingBy(
                        diagnostic -> PathUtils.toFileUri(diagnostic.getFile()),
                        Collectors.mapping(d -> {
                            Range range = getRangeFromPosition(d.getPosition());
                            String message = "Refinement Type Error";
                            String source = d.getTitleMessage() + "\n" + d.getFullMessage();
                            return new Diagnostic(range, message, DiagnosticSeverity.Error, source);
                        }, Collectors.toList())));

        return diagnosticsByFile.entrySet().stream()
                .map(entry -> new PublishDiagnosticsParams(entry.getKey(), entry.getValue()))
                .toList();
    }

    public static PublishDiagnosticsParams getEmptyDiagnostics(String uri) {
        return new PublishDiagnosticsParams(uri, Collections.emptyList());
    }

    private static Range getRangeFromPosition(SourcePosition position) {
        if (position == null) {
            return new Range(new Position(0, 0), new Position(0, 0));
        }
        return new Range(
                new Position(position.getLine() - 1, position.getColumn() - 1),
                new Position(position.getEndLine() - 1, position.getEndColumn() - 1));
    }
}
