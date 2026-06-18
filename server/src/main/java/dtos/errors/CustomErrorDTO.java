package dtos.errors;

import liquidjava.diagnostics.errors.CustomError;

/**
 * DTO for serializing CustomError instances to JSON
 */
public class CustomErrorDTO extends LJErrorDTO {

    public CustomErrorDTO(CustomError error) {
        super("custom-error", error);
    }

    public static CustomErrorDTO from(CustomError error) {
        return new CustomErrorDTO(error);
    }
}
