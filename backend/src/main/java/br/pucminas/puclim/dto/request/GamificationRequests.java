package br.pucminas.puclim.dto.request;

import java.time.Instant;
import java.util.List;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class GamificationRequests {
    private GamificationRequests() {
    }

    public record Question(@NotBlank @Size(max = 2000) String prompt, @NotBlank @Size(max = 100) String area,
            @NotNull @Size(min = 2, max = 6) List<@NotBlank @Size(max = 500) String> options,
            @NotNull @Min(0) @Max(5) Integer correctIndex, boolean active) {
    }

    public record Answers(@NotNull @Size(min = 1, max = 30) List<@NotNull @Min(0) @Max(5) Integer> answers) {
    }

    public record Mission(@NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 2000) String description,
            @Min(1) @Max(1000000) long reward, @Min(1) @Max(1000) int capacity, @NotNull @Future Instant deadline) {
    }

    public record Deadline(@NotNull @Future Instant deadline) {
    }

    public record Text(@NotBlank @Size(max = 2000) String text) {
    }

    public record Allocation(@Min(1) @Max(1000000000) long amount, @NotBlank @Size(max = 500) String origin) {
    }

    public record Donation(@NotBlank String beneficiaryId) {
    }

    public record Challenge(@NotBlank @Size(max = 100) String title, @NotBlank @Size(max = 2000) String description,
            @Min(1) @Max(1000000) long reward, @Min(1) @Max(1000) int capacity,
            @Min(1) @Max(1000000000) long budget, @NotNull @Future Instant deadline) {
    }
}
