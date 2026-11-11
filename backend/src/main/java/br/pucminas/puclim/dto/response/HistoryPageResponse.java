package br.pucminas.puclim.dto.response;

import java.util.List;

public record HistoryPageResponse<T, S>(List<T> items, int page, int size, long total, int pages, S summary) {
    public static <T, S> HistoryPageResponse<T, S> of(List<T> items, int page, int size, long total, S summary) {
        return new HistoryPageResponse<>(items, page, size, total, (int) Math.min(Integer.MAX_VALUE,
                (total + size - 1) / size), summary);
    }
}
