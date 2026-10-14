package br.pucminas.puclim.support;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import javax.imageio.ImageIO;

public final class TestPayloads {
    public static final String PASSWORD = "Seguro@2026";

    private TestPayloads() {
    }

    public static String unique(String prefix) {
        return prefix + "." + UUID.randomUUID().toString().replace("-", "").substring(0, 16);
    }

    public static Map<String, Object> partner(String kind) {
        String login = unique("parceiro");
        return Map.of("name", "Parceiro " + login, "email", login + "@example.test", "login", login,
                "password", PASSWORD, "cnpj", TestDocuments.cnpj(), "phone", "31999999999",
                "description", "Parceiro de integração", "partnerKind", kind);
    }

    public static Map<String, Object> student(String institutionId) {
        String login = unique("aluno");
        return Map.of("name", "Aluno " + login, "email", login + "@example.test", "login", login,
                "password", PASSWORD, "cpf", TestDocuments.cpf(), "rg", "MG123456", "address", "Rua de Teste, 123",
                "course", "Engenharia", "institutionId", institutionId);
    }

    public static Map<String, Object> teacherRow() {
        String login = unique("professor");
        return Map.of("line", 2, "name", "Professor " + login, "cpf", TestDocuments.cpf(),
                "department", "Computação", "email", login + "@example.test", "login", login);
    }

    public static Map<String, Object> advantage(long cost, String photo) {
        return Map.of("name", "Vantagem " + unique("teste"), "description", "Uma vantagem real para testar o resgate",
                "photo", photo, "category", "Descontos", "cost", cost, "active", true);
    }

    public static byte[] png() throws IOException {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(10, 10, BufferedImage.TYPE_INT_RGB), "png", output);
        return output.toByteArray();
    }
}
