package fsm;

import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@StateSet({"open", "closed"})
public class Simple {

    @StateRefinement(to="open(this)")
    public Simple() {}
    
    @StateRefinement(from="open(this)")
    public void read() {}

    @StateRefinement(from="open(this)", to="closed(this)")
    public void close() {}
}
