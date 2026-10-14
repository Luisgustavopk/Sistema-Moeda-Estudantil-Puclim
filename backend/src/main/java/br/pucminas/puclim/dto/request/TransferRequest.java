package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record TransferRequest(@NotBlank String studentId, @NotNull @Positive @Max(9007199254740991L) Long amount,
        @NotBlank @Size(max = 1000) String reason) {
}
