package dev.relay.core.engine;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.io.OutputStream;
import java.net.Socket;
import java.util.concurrent.atomic.AtomicLong;

public class SocketPumper implements Runnable {
    private static final Logger log = LoggerFactory.getLogger(SocketPumper.class);
    private static final int BUFFER_SIZE = 8192;

    private final InputStream in;
    private final OutputStream out;
    private final Socket targetSocket;
    private final AtomicLong byteCounter;
    private final String description;
    private volatile boolean completed = false;

    public SocketPumper(InputStream in, OutputStream out, Socket targetSocket, AtomicLong byteCounter, String description) {
        this.in = in;
        this.out = out;
        this.targetSocket = targetSocket;
        this.byteCounter = byteCounter != null ? byteCounter : new AtomicLong(0);
        this.description = description;
    }

    @Override
    public void run() {
        byte[] buffer = new byte[BUFFER_SIZE];
        int bytesRead;
        try {
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
                out.flush();
                byteCounter.addAndGet(bytesRead);
            }
        } catch (Exception e) {
            // Expected when either end closes or resets connection
            log.trace("Pipe closed for {}: {}", description, e.getMessage());
        } finally {
            completed = true;
            try {
                if (targetSocket != null && !targetSocket.isClosed() && !targetSocket.isOutputShutdown()) {
                    targetSocket.shutdownOutput();
                }
            } catch (Exception ignored) {}
        }
    }

    public boolean isCompleted() {
        return completed;
    }

    public long getBytesTransferred() {
        return byteCounter.get();
    }
}
