package br.pucminas.puclim.dto.response;

public record TeacherInitialAccessResponse(String name, String login, String temporaryPassword) {
    @Override public String toString() { return "TeacherInitialAccessResponse[credencial protegida]"; }
}
