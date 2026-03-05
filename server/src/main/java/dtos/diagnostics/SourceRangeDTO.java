package dtos.diagnostics;

import spoon.reflect.cu.SourcePosition;

public record SourceRangeDTO(String file, int lineStart, int colStart, int lineEnd, int colEnd) {

    public static SourceRangeDTO from(SourcePosition pos) {
        if (pos == null) return null;
        String file = pos.getFile() != null ? pos.getFile().getAbsolutePath() : null;
        return new SourceRangeDTO(file, pos.getLine() - 1, pos.getColumn() - 1, pos.getEndLine() - 1, pos.getEndColumn() - 1);
    }
}

