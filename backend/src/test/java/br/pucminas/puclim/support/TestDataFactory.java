package br.pucminas.puclim.support;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import tools.jackson.databind.JsonNode;

/**
 * Cada cenário cria dados próprios pelos mesmos endpoints usados pelo frontend.
 */
public final class TestDataFactory {
    private final String baseUrl;

    public record AcademicFixture(TestAccount institution, TestAccount teacher, TestAccount student) {
    }

    public record TestAdvantage(String id, String photo, Map<String, Object> input) {
    }

    public TestDataFactory(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public ApiTestClient anonymous() {
        return new ApiTestClient(baseUrl);
    }

    public ApiTestClient authenticated(TestAccount account) throws Exception {
        ApiTestClient client = anonymous();
        client.login(account.login(), account.password());
        return client;
    }

    public TestAccount partner(String kind) throws Exception {
        var input = TestPayloads.partner(kind);
        var response = anonymous().expect("POST", "/empresas", input, 201);
        var client = anonymous();
        client.login((String) input.get("login"), TestPayloads.PASSWORD);
        return new TestAccount(response.path("id").asString(), (String) input.get("login"), TestPayloads.PASSWORD, client,
                input);
    }

    public TestAccount student(TestAccount institution) throws Exception {
        var input = TestPayloads.student(institution.id());
        var response = anonymous().expect("POST", "/alunos", input, 201);
        var client = anonymous();
        client.login((String) input.get("login"), TestPayloads.PASSWORD);
        return new TestAccount(response.path("id").asString(), (String) input.get("login"), TestPayloads.PASSWORD, client,
                input);
    }

    public TestAccount teacherFirstAccess(TestAccount institution) throws Exception {
        var row = TestPayloads.teacherRow();
        var result = institution.client().ok("POST", "/instituicao/professores/importar", Map.of("rows", List.of(row)));
        String password = result.path("access").get(0).path("temporaryPassword").asString();
        var client = anonymous();
        var account = client.login((String) row.get("login"), password);
        return new TestAccount(account.path("id").asString(), (String) row.get("login"), password, client, row);
    }

    public TestAccount teacher(TestAccount institution) throws Exception {
        var first = teacherFirstAccess(institution);
        first.client().ok("PATCH", "/conta/senha",
                Map.of("currentPassword", first.password(), "password", TestPayloads.PASSWORD));
        return new TestAccount(first.id(), first.login(), TestPayloads.PASSWORD, first.client(), first.registration());
    }

    public AcademicFixture academic() throws Exception {
        var institution = partner("ENSINO");
        return new AcademicFixture(institution, teacher(institution), student(institution));
    }

    public JsonNode transfer(AcademicFixture fixture, long amount, String reason) throws Exception {
        return fixture.teacher().client().result(fixture.teacher().client().call("POST", "/transferencias",
                Map.of("studentId", fixture.student().id(), "amount", amount, "reason", reason),
                UUID.randomUUID().toString()), 200);
    }

    public TestAdvantage advantage(TestAccount company, long cost) throws Exception {
        String photo = company.client()
                .result(company.client().upload("/uploads/imagens", "photo.png", TestPayloads.png(), "image/png"), 201)
                .path("url").asString();
        var input = TestPayloads.advantage(cost, photo);
        var response = company.client().expect("POST", "/vantagens", input, 201);
        return new TestAdvantage(response.path("id").asString(), photo, input);
    }

    public JsonNode redeem(TestAccount student, TestAdvantage advantage) throws Exception {
        return student.client().result(student.client().call("POST", "/vantagens/" + advantage.id() + "/resgates",
                Map.of(), UUID.randomUUID().toString()), 200);
    }
}
