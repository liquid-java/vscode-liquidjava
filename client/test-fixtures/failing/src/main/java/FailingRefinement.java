import liquidjava.specification.Refinement;

public class FailingRefinement {
    void check() {
        @Refinement("_ > 0")
        int valid = 1;

        @Refinement("_ > 0")
        int positive = -1;
    }
}
