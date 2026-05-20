package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"ready", "done"})
public class GuardedSelfLoop {

    @StateRefinement(to="ready(this)")
    public GuardedSelfLoop() {}

    @StateRefinement(from="flag && ready(this)")
    public void poll(boolean flag) {}
}
