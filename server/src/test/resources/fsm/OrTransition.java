package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"a", "b", "c"})
public class OrTransition {

    @StateRefinement(to="a(this)")
    public OrTransition() {}

    // transition from both a and b to c
    @StateRefinement(from="a(this) || b(this)", to="c(this)")
    public void action() {}
}
