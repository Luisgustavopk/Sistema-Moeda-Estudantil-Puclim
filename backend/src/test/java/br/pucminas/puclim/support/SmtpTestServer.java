package br.pucminas.puclim.support;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UncheckedIOException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

/**
 * Servidor SMTP local: recebe mensagens de verdade sem dependência de provedor
 * externo.
 */
public final class SmtpTestServer implements AutoCloseable {
    private final ServerSocket server;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Future<List<String>> reception;

    public SmtpTestServer(int messages) throws IOException {
        server = new ServerSocket(0, 10, InetAddress.getLoopbackAddress());
        server.setSoTimeout(15000);
        reception = worker.submit(() -> {
            List<String> received = new ArrayList<>();
            for (int index = 0; index < messages; index++)
                receive(received);
            return received;
        });
    }

    public int port() {
        return server.getLocalPort();
    }

    public List<String> received() throws Exception {
        return reception.get(20, TimeUnit.SECONDS);
    }

    private void receive(List<String> received) {
        try (Socket socket = server.accept()) {
            socket.setSoTimeout(10000);
            var reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            var writer = new PrintWriter(socket.getOutputStream(), true);
            reply(writer, "220 localhost SMTP test");
            String line;
            boolean body = false;
            var message = new StringBuilder();
            while ((line = reader.readLine()) != null) {
                if (body) {
                    if (line.equals(".")) {
                        received.add(message.toString());
                        body = false;
                        reply(writer, "250 Accepted");
                    } else
                        message.append(line).append('\n');
                } else if (line.equalsIgnoreCase("DATA")) {
                    body = true;
                    reply(writer, "354 Send message");
                } else if (line.equalsIgnoreCase("QUIT")) {
                    reply(writer, "221 Bye");
                    break;
                } else
                    reply(writer, "250 OK");
            }
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    private void reply(PrintWriter writer, String text) {
        writer.print(text + "\r\n");
        writer.flush();
    }

    @Override
    public void close() throws IOException {
        server.close();
        worker.shutdownNow();
    }
}
