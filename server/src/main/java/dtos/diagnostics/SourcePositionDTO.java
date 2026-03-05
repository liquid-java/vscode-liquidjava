package dtos.diagnostics;

import spoon.reflect.cu.SourcePosition;

/**
 * DTO for serializing Spoon SourcePosition to JSON
 */
public record SourcePositionDTO(String file, int line, int column) {

    public static SourcePositionDTO from(SourcePosition pos) {
        if (pos == null) return null;
        String file = pos.getFile() != null ? pos.getFile().getAbsolutePath() : null;
        return new SourcePositionDTO(file, pos.getLine() - 1, pos.getColumn() - 1);
    }
}
