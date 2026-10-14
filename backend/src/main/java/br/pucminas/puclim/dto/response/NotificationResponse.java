package br.pucminas.puclim.dto.response;

import java.time.Instant;

public record NotificationResponse(String id, String subject, String body, Instant date, String recipient,
        String deliveryStatus, int attempts) {
}
