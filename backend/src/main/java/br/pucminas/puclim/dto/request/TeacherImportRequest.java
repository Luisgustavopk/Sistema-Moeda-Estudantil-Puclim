package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record TeacherImportRequest(@NotNull @Size(min = 1, max = 500) List<@NotNull TeacherImportRowRequest> rows) {
}
