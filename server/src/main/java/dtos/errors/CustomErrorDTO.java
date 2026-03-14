package dtos.errors;

import dtos.diagnostics.SourcePositionDTO;
import liquidjava.diagnostics.errors.CustomError;

/**
 * DTO for serializing CustomError instances to JSON
 */
public record CustomErrorDTO(String category, String type, String title, String message, String file, SourcePositionDTO position) {

    public static CustomErrorDTO from(CustomError error) {
        return new CustomErrorDTO("error", "custom-error", error.getTitle(), error.getMessage(), error.getFile(),
                SourcePositionDTO.from(error.getPosition()));
    }
}
