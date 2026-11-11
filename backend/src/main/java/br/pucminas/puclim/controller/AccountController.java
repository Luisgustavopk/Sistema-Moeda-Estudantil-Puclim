package br.pucminas.puclim.controller;

import br.pucminas.puclim.dto.request.PartnerRegistrationRequest;
import br.pucminas.puclim.dto.request.PasswordChangeRequest;
import br.pucminas.puclim.dto.request.ProfileUpdateRequest;
import br.pucminas.puclim.dto.request.StudentRegistrationRequest;
import br.pucminas.puclim.dto.response.AccountResponse;
import br.pucminas.puclim.dto.response.InstitutionResponse;
import br.pucminas.puclim.dto.response.NotificationResponse;
import br.pucminas.puclim.dto.response.StudentSummaryResponse;
import br.pucminas.puclim.dto.response.TransactionResponse;
import br.pucminas.puclim.dto.response.HistoryPageResponse;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.service.AccountService;
import br.pucminas.puclim.service.AuthService;
import br.pucminas.puclim.service.HistoryService;
import br.pucminas.puclim.service.OutboxService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AccountController {
    private final AccountService accounts;
    private final AuthService auth;
    private final HistoryService history;
    private final OutboxService outbox;

    public AccountController(AccountService a, AuthService b, HistoryService h, OutboxService n) {
        accounts = a;
        auth = b;
        history = h;
        outbox = n;
    }

    @PostMapping("/alunos")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    AccountResponse student(@Valid @RequestBody StudentRegistrationRequest input) {
        return accounts.registerStudent(input);
    }

    @PostMapping("/empresas")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    AccountResponse partner(@Valid @RequestBody PartnerRegistrationRequest input) {
        return accounts.registerPartner(input);
    }

    @GetMapping("/instituicoes")
    List<InstitutionResponse> institutions() {
        return accounts.institutions();
    }

    @GetMapping("/alunos/selecionaveis")
    List<StudentSummaryResponse> students() {
        return accounts.students();
    }

    @GetMapping("/conta/perfil")
    AccountResponse profile() {
        return accounts.view(accounts.current());
    }

    @PatchMapping("/conta/perfil")
    AccountResponse update(@Valid @RequestBody ProfileUpdateRequest input) {
        return accounts.profile(input);
    }

    @PatchMapping("/conta/senha")
    AccountResponse password(@Valid @RequestBody PasswordChangeRequest input, HttpServletRequest request, HttpServletResponse response) {
        return auth.password(input, request, response);
    }

    @DeleteMapping("/conta")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void delete(HttpServletRequest request, HttpServletResponse response) {
        accounts.deactivate();
        auth.logout(request, response);
    }

    @GetMapping("/conta/extrato")
    HistoryPageResponse<TransactionResponse, HistoryService.StatementSummary> transactions(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "12") int size,
            @RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "") String kind,
            @RequestParam(defaultValue = "") String from, @RequestParam(defaultValue = "") String to,
            @RequestParam(defaultValue = "") String zone) {
        return history.transactions(page, size, q, kind, from, to, zone);
    }

    @GetMapping("/conta/extrato/exportar")
    void exportTransactions(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "") String kind,
            @RequestParam(defaultValue = "") String from, @RequestParam(defaultValue = "") String to,
            @RequestParam(defaultValue = "") String zone, HttpServletResponse response) throws java.io.IOException {
        var filter = history.statementFilter(q, kind, from, to, zone);
        response.setContentType("text/csv;charset=UTF-8");
        response.setHeader("Content-Disposition", "attachment; filename=\"extrato-puclim.csv\"");
        response.setHeader("Cache-Control", "no-store");
        history.exportStatement(filter, response.getWriter());
    }

    @GetMapping("/conta/notificacoes")
    List<NotificationResponse> notifications() {
        return outbox.list(accounts.current().id);
    }
}
