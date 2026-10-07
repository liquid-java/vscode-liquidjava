import liquidjava.specification.Refinement;

public class PassingRefinement {
    @Refinement("_ > 0")
    int positive = 1;
}
