package dtos.diagnostics;

import liquidjava.diagnostics.ErrorPosition;

public record SourceRangeDTO(int lineStart, int colStart, int lineEnd, int colEnd) {

    public static SourceRangeDTO from(ErrorPosition pos) {
        if (pos == null) {
            // no location information available
            return new SourceRangeDTO(0, 0, 0, 0);
        }
        return new SourceRangeDTO(pos.lineStart() - 1, pos.colStart() - 1, pos.lineEnd() - 1, pos.colEnd() - 1);
    }
}
