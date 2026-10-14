package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record AdvantageRequest(@NotBlank @Size(min = 3, max = 100) String name,
        @NotBlank @Size(min = 10, max = 1000) String description,
        @NotBlank @Size(max = 300) String photo,
        @NotBlank @Pattern(regexp = "Alimentação|Material|Eventos|Descontos") String category,
        @NotNull @Positive @Max(9007199254740991L) Long cost, @NotNull Boolean active) {
}
