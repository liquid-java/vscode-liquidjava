package dtos.diagnostics;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import spoon.reflect.cu.SourcePosition;

public record SourcePositionDTO(String file, int lineStart, int colStart, int lineEnd, int colEnd) {

    public static SourcePositionDTO from(SourcePosition pos) {
        if (pos == null) return null;
        try {
            String file = pos.getFile() != null ? pos.getFile().getAbsolutePath() : null;
            return new SourcePositionDTO(file, pos.getLine() - 1, pos.getColumn() - 1, pos.getEndLine() - 1, pos.getEndColumn());
        } catch (UnsupportedOperationException e) {
            return null;
        }
    }

    public static SourcePositionDTO from(String pos) {
        if (pos == null) return null;
        Pattern p = Pattern.compile("(\\d+):(\\d+)-(\\d+):(\\d+)");
        Matcher m = p.matcher(pos);
        if (!m.matches()) return null;

        int line = Integer.parseInt(m.group(1));
        int column = Integer.parseInt(m.group(2));
        int endLine = Integer.parseInt(m.group(3));
        int endColumn = Integer.parseInt(m.group(4));
        return new SourcePositionDTO(null, line - 1, column - 1, endLine - 1, endColumn);
    }
}
