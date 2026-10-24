import javax.swing.tree.MutableTreeNode;
import javax.swing.tree.TreeNode;

import liquidjava.specification.ExternalRefinementsFor;
import liquidjava.specification.StateRefinement;
import liquidjava.specification.StateSet;

@ExternalRefinementsFor("javax.swing.tree.DefaultMutableTreeNode")
@StateSet({"childrenAllowed", "maybeHasChildren"})
public interface TreeNodeRefinements {
    @StateRefinement(to = "childrenAllowed(this)")
    void DefaultMutableTreeNode(Object userObject);

    @StateRefinement(from = "childrenAllowed(this)", to = "maybeHasChildren(this)")
    void add(MutableTreeNode newChild);

    @StateRefinement(from = "maybeHasChildren(this)", to = "childrenAllowed(this)")
    void removeAllChildren();

    @StateRefinement(from = "maybeHasChildren(this)")
    TreeNode getFirstChild();
}
