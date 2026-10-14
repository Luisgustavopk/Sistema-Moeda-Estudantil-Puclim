package br.pucminas.puclim.support;

import java.util.Map;

public record TestAccount(String id, String login, String password, ApiTestClient client,
        Map<String, Object> registration) {
    public String email() {
        return (String) registration.get("email");
    }

    public String name() {
        return (String) registration.get("name");
    }

    @Override
    public String toString() {
        return "TestAccount[id=" + id + ", login=" + login + "]";
    }
}
