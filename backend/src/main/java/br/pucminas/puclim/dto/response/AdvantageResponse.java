package br.pucminas.puclim.dto.response;

public record AdvantageResponse(String id, String companyId, String companyName, String name, String description,
        String photo, String category, long cost, boolean active) {
}
