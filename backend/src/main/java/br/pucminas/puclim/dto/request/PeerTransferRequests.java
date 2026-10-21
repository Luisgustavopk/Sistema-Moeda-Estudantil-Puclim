package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class PeerTransferRequests {
    private PeerTransferRequests() {
    }

    public record Policy(@NotBlank @Size(max = 2000) String criteria) {
    }

    public record Transfer(@NotBlank String teacherId, @NotBlank String recipientId,
            @NotNull @Positive @Max(9007199254740991L) Long amount,
            @NotBlank @Size(max = 1000) String reason,
            @NotBlank @Size(max = 2000) String criteria) {
    }

    public record Review(@NotNull Boolean approve, @NotBlank @Size(max = 1000) String feedback) {
    }
}
