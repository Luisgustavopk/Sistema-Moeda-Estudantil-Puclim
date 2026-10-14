package br.pucminas.puclim.dto.request;

public record TeacherImportRowRequest(int line, String name, String cpf, String department, String email, String login,
        String error) {
}
