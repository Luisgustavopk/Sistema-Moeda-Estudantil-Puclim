package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record StudentRegistrationRequest(@NotBlank @Size(min = 3, max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Pattern(regexp = "[a-zA-Z0-9._-]{3,40}") String login,
        @NotNull @Size(min = 8, max = 128) String password,
        @NotBlank @Size(max = 20) String cpf, @NotBlank @Size(min = 3, max = 30) String rg,
        @NotBlank @Size(min = 8, max = 250) String address,
        @NotBlank @Size(min = 2, max = 100) String course, @NotBlank String institutionId) {
    @Override public String toString() { return "StudentRegistrationRequest[dados protegidos]"; }
}
