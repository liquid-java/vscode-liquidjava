import liquidjava.specification.ExternalRefinementsFor;
import liquidjava.specification.StateRefinement;

// inherits the state set from Window's spec and setUndecorated from Frame's, which has no state set
@ExternalRefinementsFor("javax.swing.JFrame")
interface JFrameRefinements {
    @StateRefinement(to = "notDisplayable(this)")
    void JFrame(String title);

    @StateRefinement(from = "notDisplayable(this)")
    void setDefaultCloseOperation(int operation);
}
