import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Formatter;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import liquidjava.diagnostics.TranslationTable;
import liquidjava.diagnostics.errors.CustomError;
import liquidjava.diagnostics.errors.LJError;
import liquidjava.diagnostics.errors.RefinementError;
import liquidjava.diagnostics.errors.StateRefinementError;
import liquidjava.processor.VCImplication;
import liquidjava.processor.context.PlacementInCode;
import spoon.reflect.cu.SourcePosition;

/**
 * Writes the errors of the current verifier the way the verifier of July 2025 wrote them (its ErrorHandler): one
 * text block with the code, the expected type, the refinement found as the whole verification condition, the instance
 * translation table and the location. The verifier itself is the released one; only the text is the old one. States
 * keep the current state-set notation, which the old verifier did not have.
 */
public final class BaselineMessages {

    private static final String SEPARATOR = "_".repeat(54);
    private static final String LINE = "-".repeat(130);

    /** The old verifier named every value it introduced {@code #fresh_N}; the current one says what the value is */
    private static final Pattern GENERATED_NAME = Pattern.compile("##\\w+?_(\\d+)(?!\\w)");

    private static final Pattern JAVA_KEYWORD_START = Pattern.compile(
            "^(return|new|throw|if|while|for|do|switch|case|else|try|catch|final|var|int|long|short|byte|char|boolean|float|double|void)\\b");

    private BaselineMessages() {
    }

    /** The one-line summary of the error, which the old extension showed before the block */
    public static String title(LJError error) {
        String title;
        if (error instanceof RefinementError refinement)
            title = "Type expected:" + expected(refinement);
        else if (error instanceof StateRefinementError state)
            title = "Failed to check state transitions. Expected possible states:" + expected(state);
        else if (error instanceof CustomError)
            title = "Found Error: " + error.getMessage();
        else
            title = error.getTitle() + ": " + error.getMessage();
        return oldNames(title);
    }

    /** The whole block */
    public static String full(LJError error) {
        StringBuilder sb = new StringBuilder();
        sb.append(SEPARATOR).append("\n");
        if (error instanceof RefinementError refinement)
            refinementBlock(sb, refinement);
        else if (error instanceof StateRefinementError state)
            stateBlock(sb, state);
        else
            otherBlock(sb, error);
        sb.append("Location: ").append(location(error.getPosition())).append("\n");
        sb.append(SEPARATOR).append("\n");
        return oldNames(sb.toString());
    }

    private static void refinementBlock(StringBuilder sb, RefinementError error) {
        String element = elementText(error.getPosition());
        sb.append("Failed to check refinement at: \n\n");
        String customMessage = error.getCustomMessage();
        if (customMessage != null && !customMessage.isBlank())
            sb.append(customMessage).append("\n");
        else {
            String invocation = invocationText(element);
            if (invocation != null)
                sb.append("Method invocation ").append(invocation).append(" in:\n");
        }
        sb.append(element).append("\n\n");
        sb.append("Type expected:").append(expected(error)).append("\n");
        sb.append("Refinement found:").append(found(error)).append("\n");
        sb.append(translationTable(error.getTranslationTable()));
    }

    private static void stateBlock(StringBuilder sb, StateRefinementError error) {
        String element = elementText(error.getPosition());
        sb.append("Failed to check state transitions when calling ").append(element).append(" in:\n\n");
        sb.append(element).append("\n\n");
        sb.append("Expected possible states:").append(expected(error)).append("\n");
        sb.append("\nState found:\n");
        sb.append(LINE).append("\n");
        sb.append(found(error)).append("\n");
        sb.append(LINE).append("\n\n");
        sb.append(translationTable(error.getTranslationTable()));
    }

    private static void otherBlock(StringBuilder sb, LJError error) {
        sb.append(title(error)).append("\n\n");
        sb.append(elementText(error.getPosition())).append("\n\n");
        sb.append(translationTable(error.getTranslationTable()));
    }

    // Type expected:(#ret_1 > 0)
    private static String expected(RefinementError error) {
        return "(" + error.getExpected().getExpression() + ")";
    }

    // Refinement found:true && #ret_1 == #x_0 / 2 && #x_0 == x && x > 0, from the verification condition as it was
    // before any simplification
    private static String found(RefinementError error) {
        VCImplication original = error.getFound().getOriginal().getImplication();
        if (!original.hasBinder() && !original.hasNext() && original.getRefinement().isBooleanTrue())
            return "true";
        StringBuilder sb = new StringBuilder("true");
        for (VCImplication row = original; row != null; row = row.getNext())
            if (row.getRefinement() != null)
                sb.append(" && ").append(row.getRefinement());
        return sb.toString();
    }

    // Expected possible states:Door.state(#d_10) == closed. The states are written as the current verifier writes
    // them, as values of their state set: the old verifier had no named state sets, so there is no old form for
    // them, and the spec files the participants read use the same notation
    private static String expected(StateRefinementError error) {
        return error.getExpected().getExpression().toString();
    }

    // ∀#d_10:Door, Door.state(#d_10) == open, the whole chain before any simplification
    private static String found(StateRefinementError error) {
        return error.getFoundSimplification().getOriginal().getImplication().toString();
    }

    private static String translationTable(TranslationTable table) {
        if (table == null || table.isEmpty())
            return "";
        StringBuilder sb = new StringBuilder();
        try (Formatter formatter = new Formatter(sb, Locale.US)) {
            formatter.format("\nInstance translation table:\n");
            formatter.format("%s", LINE);
            formatter.format("\n| %-32s | %-60s | %-1s \n", "Variable Name", "Created in", "File");
            formatter.format("%s\n", LINE);
            for (String name : table.keySet()) {
                PlacementInCode placement = table.get(name);
                String text = placement == null ? "" : firstLine(placement.getText());
                SourcePosition position = placement == null ? null : placement.getPosition();
                formatter.format("| %-32s | %-60s | %-1s \n", oldNames(name), oldNames(text),
                        simplePosition(position));
            }
            formatter.format("%s\n\n", LINE);
        }
        return sb.toString();
    }

    // The first line of the code that created a value: a branch value is created by a whole block, which the table
    // cannot hold
    private static String firstLine(String text) {
        if (text == null)
            return "";
        int newline = text.indexOf('\n');
        return newline < 0 ? text : text.substring(0, newline).stripTrailing() + " ...";
    }

    // Example.java:6, 16
    private static String simplePosition(SourcePosition position) {
        if (position == null || position.getFile() == null)
            return "No position provided. Possibly asking for generated code";
        return position.getFile().getName() + ":" + position.getLine() + ", " + position.getColumn();
    }

    // (/path/to/Example.java:6), as Spoon prints a position
    private static String location(SourcePosition position) {
        return position == null ? "(unknown)" : position.toString();
    }

    /** The code at the position, as written in the file */
    static String elementText(SourcePosition position) {
        if (position == null || position.getFile() == null)
            return "";
        try {
            List<String> lines = Files.readAllLines(position.getFile().toPath());
            int first = position.getLine(), last = position.getEndLine();
            if (first < 1 || last > lines.size() || last < first)
                return "";
            List<String> text = new ArrayList<>();
            for (int i = first; i <= last; i++) {
                String line = lines.get(i - 1);
                int from = i == first ? Math.max(0, Math.min(position.getColumn() - 1, line.length())) : 0;
                int to = i == last ? Math.max(from, Math.min(position.getEndColumn(), line.length()))
                        : line.length();
                text.add(line.substring(from, to));
            }
            String code = String.join("\n", text).strip();
            // a statement's position covers its semicolon, which the old verifier did not print
            return code.endsWith(";") ? code.substring(0, code.length() - 1).stripTrailing() : code;
        } catch (Exception e) {
            return "";
        }
    }

    /**
     * The invocation without its target, {@code read(buf)} for {@code in.read(buf)}, when the element is a method call
     * on a target, or null: the old verifier named the invocation before the code
     */
    static String invocationText(String element) {
        if (element.isEmpty() || element.contains("\n") || JAVA_KEYWORD_START.matcher(element).find()
                || !element.endsWith(")"))
            return null;
        int depth = 0, lastDot = -1;
        boolean inString = false;
        for (int i = 0; i < element.length(); i++) {
            char c = element.charAt(i);
            if (inString) {
                if (c == '\\')
                    i++;
                else if (c == '"')
                    inString = false;
            } else if (c == '"')
                inString = true;
            else if (c == '(')
                depth++;
            else if (c == ')')
                depth--;
            else if (c == '.' && depth == 0)
                lastDot = i;
        }
        if (depth != 0 || lastDot < 1)
            return null;
        String invocation = element.substring(lastDot + 1);
        return invocation.matches("[\\w$]+\\(.*\\)") ? invocation : null;
    }

    private static String oldNames(String text) {
        Matcher m = GENERATED_NAME.matcher(text);
        return m.replaceAll("#fresh_$1");
    }
}
