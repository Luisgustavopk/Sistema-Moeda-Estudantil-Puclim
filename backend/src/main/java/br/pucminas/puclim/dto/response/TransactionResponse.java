package br.pucminas.puclim.dto.response;

import java.time.Instant;

public record TransactionResponse(String id, Instant date, String kind, long amount, String description, String counterpart,
        String reason) {
}
