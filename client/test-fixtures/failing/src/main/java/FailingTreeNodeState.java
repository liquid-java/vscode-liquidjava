import javax.swing.tree.DefaultMutableTreeNode;
import javax.swing.tree.TreeNode;

public class FailingTreeNodeState {
    TreeNode rebuild() {
        DefaultMutableTreeNode root = new DefaultMutableTreeNode("root");
        root.add(new DefaultMutableTreeNode("first"));
        root.removeAllChildren();
        return root.getFirstChild();
    }
}
