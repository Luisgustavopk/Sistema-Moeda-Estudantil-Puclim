package br.pucminas.puclim.controller;

import java.io.IOException;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.pucminas.puclim.dto.request.Requests.*;
import br.pucminas.puclim.dto.request.Requests.ImportRow;
import br.pucminas.puclim.dto.response.Responses.*;
import br.pucminas.puclim.dto.response.Responses.ImportResult;
import br.pucminas.puclim.dto.response.Responses.TeacherSummary;
import br.pucminas.puclim.service.AccountService;
import br.pucminas.puclim.service.TeacherImportService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/instituicao/professores")
public class TeacherController {
    private final AccountService accounts;
    private final TeacherImportService imports;

    public TeacherController(AccountService a, TeacherImportService i) {
        accounts = a;
        imports = i;
    }

    @GetMapping
    List<TeacherSummary> list() {
        return accounts.teachers();
    }

    @PostMapping(value = "/preview", consumes = "multipart/form-data")
    List<ImportRow> preview(@RequestParam MultipartFile file) throws IOException {
        return imports.preview(file);
    }

    @PostMapping("/importar")
    ImportResult importRows(@Valid @RequestBody br.pucminas.puclim.dto.request.Requests.Import input) {
        return imports.importRows(input.rows());
    }
}
