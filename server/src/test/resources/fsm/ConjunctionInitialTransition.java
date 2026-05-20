package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"on", "off"})
public class ConjunctionInitialTransition {

    @StateRefinement(to="flag && on(this)")
    public ConjunctionInitialTransition(boolean flag) {}

    @StateRefinement(from="on(this)", to="off(this)")
    public void turnOff() {}
}
