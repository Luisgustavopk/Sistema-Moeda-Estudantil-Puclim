package br.pucminas.puclim.dto.request;

/** Secret fields are validated in the service, avoiding rejected values in binding error logs. */
public record PasswordResetInput(String token, String password) {
    @Override public String toString() { return "PasswordResetInput[dados protegidos]"; }
}
