package dtos.errors;

import liquidjava.diagnostics.errors.IllegalConstructorTransitionError;

/**
 * DTO for serializing IllegalConstructorTransitionError instances to JSON
 */
public class IllegalConstructorTransitionErrorDTO extends LJErrorDTO {

    public IllegalConstructorTransitionErrorDTO(IllegalConstructorTransitionError error) {
        super("illegal-constructor-transition-error", error);
    }

    public static IllegalConstructorTransitionErrorDTO from(IllegalConstructorTransitionError error) {
        return new IllegalConstructorTransitionErrorDTO(error);
    }
}
