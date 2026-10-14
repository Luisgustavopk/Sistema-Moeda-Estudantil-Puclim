package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PasswordChangeRequest(@NotBlank String currentPassword, @NotNull @Size(min = 8, max = 128) String password) {
    @Override public String toString() { return "PasswordChangeRequest[dados protegidos]"; }
}
