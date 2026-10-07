import liquidjava.specification.Refinement;

public class FailingRefinement {
    @Refinement("_ > 0")
    int positive = -1;
}
