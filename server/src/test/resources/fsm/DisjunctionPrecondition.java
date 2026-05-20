package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"ready", "waiting", "done"})
public class DisjunctionPrecondition {

    @StateRefinement(to="ready(this)")
    public DisjunctionPrecondition() {}

    @StateRefinement(from="flag || ready(this)", to="done(this)")
    public void action(boolean flag) {}
}
