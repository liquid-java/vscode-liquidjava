package dtos.diagnostics;

import spoon.reflect.cu.SourcePosition;

/**
 * DTO for serializing Spoon SourcePosition to JSON
 */
public record SourcePositionDTO(String file, int line, int column) {

    public static SourcePositionDTO from(SourcePosition position) {
        String file = position.getFile() != null ? position.getFile().getAbsolutePath() : "";
        return new SourcePositionDTO(file, position.getLine() - 1, position.getColumn() - 1);
    }
}
