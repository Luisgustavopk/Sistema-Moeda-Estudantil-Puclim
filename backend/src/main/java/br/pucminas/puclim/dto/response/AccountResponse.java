package br.pucminas.puclim.dto.response;

public record AccountResponse(String id, String role, String name, String email, String login, long balance,
        boolean active,
        String cpf, String rg, String address, String course, String institutionId, String department, String cnpj,
        String phone, String description, String partnerKind, boolean mustChangePassword) {
}
