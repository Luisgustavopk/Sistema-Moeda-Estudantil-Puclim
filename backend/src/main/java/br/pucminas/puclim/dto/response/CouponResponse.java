package br.pucminas.puclim.dto.response;

import java.time.Instant;

public record CouponResponse(String id, String advantageId, String code, String studentId, String studentName,
        String companyId, String companyName, String advantageName, long cost, Instant date, String status,
        Instant usedAt) {
}
