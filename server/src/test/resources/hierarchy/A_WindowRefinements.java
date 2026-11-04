import liquidjava.specification.ExternalRefinementsFor;
import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

// the files are named so that the verifier reads the superclasses' specs first (liquidjava#461)
@StateSet({"displayable", "notDisplayable"})
@ExternalRefinementsFor("java.awt.Window")
interface WindowRefinements {
    @StateRefinement(to = "notDisplayable(this)")
    void dispose();

    @StateRefinement(to = "displayable(this)")
    void pack();
}
