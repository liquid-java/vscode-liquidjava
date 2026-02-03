package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"initialized", "uninitialized", "error"})
public class MultipleInitialStates {

    @StateRefinement(to="uninitialized(this)")
    public MultipleInitialStates() {}

    @StateRefinement(to="initialized(this)")
    public MultipleInitialStates(int code) {}

    @StateRefinement(from="uninitialized(this)", to="initialized(this)")
    public void init(int code) {}
}
