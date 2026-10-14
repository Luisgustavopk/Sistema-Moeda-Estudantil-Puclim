package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(@NotBlank @Size(min = 3, max = 100) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @Size(max = 250) String address, @Size(max = 100) String course, @Size(max = 20) String phone,
        @Size(max = 500) String description) {
}
