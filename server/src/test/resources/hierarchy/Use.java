import java.awt.Frame;

class Use {
    static void borderless() {
        Frame host = new Frame("Playfield");
        host.pack();
        host.setUndecorated(true);
    }
}
