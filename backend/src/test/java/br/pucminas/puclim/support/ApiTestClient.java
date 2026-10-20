package br.pucminas.puclim.support;

import java.io.ByteArrayOutputStream;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public final class ApiTestClient {
    public static final JsonMapper JSON = JsonMapper.builder().build();
    private final String baseUrl;
    private final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
    private final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies)
            .connectTimeout(Duration.ofSeconds(10)).build();

    public ApiTestClient(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public URI uri(String path) {
        return URI.create(baseUrl + path);
    }

    public String sessionId() {
        return cookie("JSESSIONID");
    }

    private String cookie(String name) {
        return cookies.getCookieStore().getCookies().stream()
                .filter(cookie -> cookie.getName().equals(name) && !cookie.hasExpired())
                .map(cookie -> cookie.getValue()).findFirst().orElseThrow();
    }

    public HttpResponse<String> send(HttpRequest request) throws Exception {
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    private void csrf() throws Exception {
        result(send(HttpRequest.newBuilder(uri("/auth/csrf")).GET().build()), 200);
    }

    public HttpResponse<String> call(String method, String path, Object body, String key) throws Exception {
        boolean mutation = !method.equals("GET");
        if (mutation)
            csrf();
        var request = HttpRequest.newBuilder(uri(path)).timeout(Duration.ofSeconds(20));
        if (mutation)
            request.header("X-XSRF-TOKEN", cookie("XSRF-TOKEN")).header("Content-Type", "application/json");
        if (key != null)
            request.header("Idempotency-Key", key);
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(JSON.writeValueAsString(body), StandardCharsets.UTF_8));
        return send(request.build());
    }

    public JsonNode result(HttpResponse<String> response, int status) {
        assertEquals(status, response.statusCode(), response.body());
        return response.body().isBlank() ? JSON.nullNode() : JSON.readTree(response.body());
    }

    public JsonNode expect(String method, String path, Object body, int status) throws Exception {
        return result(call(method, path, body, null), status);
    }

    public JsonNode ok(String method, String path, Object body) throws Exception {
        return expect(method, path, body, 200);
    }

    public JsonNode login(String login, String password) throws Exception {
        return ok("POST", "/auth/login", Map.of("login", login, "password", password));
    }

    public HttpResponse<String> upload(String path, String filename, byte[] bytes, String mime) throws Exception {
        csrf();
        String boundary = "Puclim-" + UUID.randomUUID();
        var payload = new ByteArrayOutputStream();
        payload.write(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\""
                + filename + "\"\r\nContent-Type: " + mime + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        payload.write(bytes);
        payload.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return send(HttpRequest.newBuilder(uri(path)).header("X-XSRF-TOKEN", cookie("XSRF-TOKEN"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(payload.toByteArray())).build());
    }
}
