import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.eclipse.lsp4j.Diagnostic;
import org.eclipse.lsp4j.DiagnosticSeverity;
import org.eclipse.lsp4j.Position;
import org.eclipse.lsp4j.PublishDiagnosticsParams;
import org.eclipse.lsp4j.Range;

import liquidjava.api.CommandLineLauncher;
import liquidjava.diagnostics.Diagnostics;
import liquidjava.diagnostics.LJDiagnostic;
import liquidjava.diagnostics.errors.LJError;
import liquidjava.diagnostics.warnings.LJWarning;
import spoon.reflect.cu.SourcePosition;
import utils.PathUtils;

public class LJDiagnosticsHandler {

    private static final String SOURCE = "liquidjava";
    /**
     * Generates LJDiagnostics for the given URI
     * @param uri the document URI
     * @param path the file path
     * @return LJDiagnostics
     */
    public static LJDiagnostics getLJDiagnostics(String path) throws Exception {
        List<LJError> errors = new ArrayList<>();
        List<LJWarning> warnings = new ArrayList<>();

        CommandLineLauncher.cmdArgs.lspMode = true;
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
                    Range range = getRangeFromPosition(d.getPosition());
                    return new Diagnostic(range, diagnosticMessage(d), severity, SOURCE);
                }, Collectors.toList())
            ));
        
        // create a PublishDiagnosticsParams per file with all its diagnostics
        return diagnosticsByFile.entrySet().stream()
            .map(entry -> new PublishDiagnosticsParams(entry.getKey(), entry.getValue()))
            .toList();
    }

    /** A run of backticks, the code, and a run of the same length, as the verifier marks code in its messages */
    private static final Pattern CODE_SPAN = Pattern.compile("(`+)([\\s\\S]+?)(?<!`)\\1(?!`)");

    /**
     * The message of a diagnostic in the editor: its headline, which VS Code shows as plain text in the hover, the
     * Problems tab and the problem view, so the code it marks with backticks is written without them. The notes,
     * the counterexample and the hints are left to the extension's own part of the hover, in markdown, and to the
     * LiquidJava view
     * @param diagnostic the diagnostic
     * @return the message
     */
    static String diagnosticMessage(LJDiagnostic diagnostic) {
        return String.format("%s: %s", diagnostic.getTitle(), plainCode(diagnostic.getMessage()));
    }

    /** The text with the code it marks with backticks written without them */
    static String plainCode(String text) {
        if (text == null)
            return "";
        Matcher matcher = CODE_SPAN.matcher(text);
        StringBuilder plain = new StringBuilder();
        while (matcher.find())
            matcher.appendReplacement(plain, Matcher.quoteReplacement(unpad(matcher.group(2))));
        matcher.appendTail(plain);
        return plain.toString();
    }

    // the code without the space on each side that the verifier adds to code with a backtick or a space at an end
    private static String unpad(String code) {
        return code.length() >= 2 && code.startsWith(" ") && code.endsWith(" ") ? code.substring(1, code.length() - 1)
                : code;
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
     * Gets the Range from the given SourcePosition If the position is null, returns a default Range at (0,0)-(0,0)
     * @param pos the SourcePosition
     * @return Range
     */
    public static Range getRangeFromPosition(SourcePosition pos) {
        if (pos == null) {
            // no location information available
            return new Range(new Position(0, 0), new Position(0, 0));
        }
        return new Range(
            new Position(pos.getLine() - 1, pos.getColumn() - 1),
            new Position(pos.getEndLine() - 1, pos.getEndColumn() - 1)
        );
    }
}
