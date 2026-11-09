package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordRecoveryRequest(@NotBlank @Email @Size(max = 254) String email) {
    @Override public String toString() { return "PasswordRecoveryRequest[dados protegidos]"; }
}
