package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"ready", "done"})
public class DisjunctionPostCondition {

    @StateRefinement(to="ready(this)")
    public DisjunctionPostCondition() {}

    @StateRefinement(from="ready(this)", to="done(this) || flag")
    public void finish(boolean flag) {}
}
