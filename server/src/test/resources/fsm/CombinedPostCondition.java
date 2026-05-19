package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"ready", "done"})
public class CombinedPostCondition {

    @StateRefinement(to="ready(this)")
    public CombinedPostCondition() {}

    @StateRefinement(from="x && ready(this)", to="done(this) && flag")
    public void finish(boolean x, boolean flag) {}
}
