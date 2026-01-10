import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.DiagnosticSeverity;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.PublishDiagnosticsParams;
import org.eclipse.lsp4j.Range;
import liquidjava.api.CommandLineLauncher;
import liquidjava.diagnostics.Diagnostics;
import liquidjava.diagnostics.ErrorPosition;
import liquidjava.diagnostics.LJDiagnostic;
import liquidjava.diagnostics.errors.LJError;
import liquidjava.diagnostics.warnings.LJWarning;
import utils.PathUtils;

public class LJDiagnosticsHandler {

    private static final String SOURCE = "liquidjava";

    /**
     * Generates LJDiagnostics for the given URI
     * @param uri the document URI
     * @param path the file path
     * @return LJDiagnostics
     */
    public static LJDiagnostics getLJDiagnostics(String path) {
        List<LJError> errors = new ArrayList<>();
        List<LJWarning> warnings = new ArrayList<>();
    
        CommandLineLauncher.launch(path);
        Diagnostics diagnostics = Diagnostics.getInstance();
        if (diagnostics.foundWarning()) {
            warnings.addAll(diagnostics.getWarnings());
        }
        if (diagnostics.foundError()) {
            System.out.println("Failed verification");
            errors.addAll(diagnostics.getErrors());
        } else {
            System.out.println("Passed verification");
        }
        return new LJDiagnostics(errors, warnings);
    }

    /**
     * Generates VS Code diagnostics for the given LJDiagnostics and URI
     * @param diagnostics
     * @param uri
     * @return List of PublishDiagnosticsParams
     */
    public static List<PublishDiagnosticsParams> getNativeDiagnostics(LJDiagnostics diagnostics, String uri) {
        List<PublishDiagnosticsParams> errors = getDiagnostics(new ArrayList<>(diagnostics.errors()), DiagnosticSeverity.Error);
        List<PublishDiagnosticsParams> warnings = getDiagnostics(new ArrayList<>(diagnostics.warnings()), DiagnosticSeverity.Warning);
        List<PublishDiagnosticsParams> combined = Stream.concat(errors.stream(), warnings.stream()).collect(Collectors.toList());
        return combined.isEmpty() ? List.of(getEmptyDiagnostics(uri)) : combined;
    }

    /**
     * Generates error and warning diagnostics
     * @return diagnostics
     */
    public static List<PublishDiagnosticsParams> getDiagnostics(List<LJDiagnostic> diagnostics,
            DiagnosticSeverity severity) {
        // group diagnostics by file
        Map<String, List<Diagnostic>> diagnosticsByFile = diagnostics.stream()
            .collect(Collectors.groupingBy(
                d -> PathUtils.toFileUri(d.getFile()),
                Collectors.mapping(d -> {
                    Range range = getRangeFromErrorPosition(d.getPosition());
                    String message = String.format("%s: %s", d.getTitle(), d.getMessage());
                    return new Diagnostic(range, message, severity, SOURCE);
                }, Collectors.toList())
            ));
        
        // create a PublishDiagnosticsParams per file with all its diagnostics
        return diagnosticsByFile.entrySet().stream()
            .map(entry -> new PublishDiagnosticsParams(entry.getKey(), entry.getValue()))
            .toList();
    }

    /**
     * Generates empty diagnostics for the given URI
     * @param uri the uri used for the verification
     * @return PublishDiagnosticsParams
     */
    public static PublishDiagnosticsParams getEmptyDiagnostics(String uri) {
        return new PublishDiagnosticsParams(uri, Collections.emptyList());
    }

    /**
     * Gets the Range from the given ErrorPosition If the position is null, returns a default Range at (0,0)-(0,0)
     * @param pos the ErrorPosition
     * @return Range
     */
    private static Range getRangeFromErrorPosition(ErrorPosition pos) {
        if (pos == null) {
            // no location information available
            return new Range(new Position(0, 0), new Position(0, 0));
        }
        return new Range(new Position(pos.lineStart() - 1, pos.colStart() - 1),
                new Position(pos.lineEnd() - 1, pos.colEnd() - 1));
    }
}
