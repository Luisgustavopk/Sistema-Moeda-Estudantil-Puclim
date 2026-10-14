package br.pucminas.puclim.dto.response;

import java.util.List;

public record TeacherImportResponse(int created, List<TeacherImportErrorResponse> errors, List<TeacherInitialAccessResponse> access) {
}
