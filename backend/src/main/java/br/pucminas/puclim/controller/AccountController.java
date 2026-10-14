package br.pucminas.puclim.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.dto.request.Requests.*;
import br.pucminas.puclim.dto.request.Requests.PartnerRegistration;
import br.pucminas.puclim.dto.request.Requests.Password;
import br.pucminas.puclim.dto.request.Requests.Profile;
import br.pucminas.puclim.dto.request.Requests.StudentRegistration;
import br.pucminas.puclim.dto.response.Responses.*;
import br.pucminas.puclim.dto.response.Responses.AccountView;
import br.pucminas.puclim.dto.response.Responses.Institution;
import br.pucminas.puclim.dto.response.Responses.NotificationView;
import br.pucminas.puclim.dto.response.Responses.StudentSummary;
import br.pucminas.puclim.dto.response.Responses.Transaction;
import br.pucminas.puclim.service.AccountService;
import br.pucminas.puclim.service.AuthService;
import br.pucminas.puclim.service.FinancialService;
import br.pucminas.puclim.service.OutboxService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class AccountController {
    private final AccountService accounts;
    private final AuthService auth;
    private final FinancialService finance;
    private final OutboxService outbox;

    public AccountController(AccountService a, AuthService b, FinancialService f, OutboxService n) {
        accounts = a;
        auth = b;
        finance = f;
        outbox = n;
    }

    @PostMapping("/alunos")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    AccountView student(@Valid @RequestBody StudentRegistration input) {
        return accounts.registerStudent(input);
    }

    @PostMapping("/empresas")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    AccountView partner(@Valid @RequestBody PartnerRegistration input) {
        return accounts.registerPartner(input);
    }

    @GetMapping("/instituicoes")
    List<Institution> institutions() {
        return accounts.institutions();
    }

    @GetMapping("/alunos/selecionaveis")
    List<StudentSummary> students() {
        return accounts.students();
    }

    @GetMapping("/conta/perfil")
    AccountView profile() {
        return accounts.view(accounts.current());
    }

    @PatchMapping("/conta/perfil")
    AccountView update(@Valid @RequestBody Profile input) {
        return accounts.profile(input);
    }

    @PatchMapping("/conta/senha")
    AccountView password(@Valid @RequestBody Password input, HttpServletRequest request, HttpServletResponse response) {
        return auth.password(input, request, response);
    }

    @DeleteMapping("/conta")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void delete(HttpServletRequest request, HttpServletResponse response) {
        accounts.deactivate();
        auth.logout(request, response);
    }

    @GetMapping("/conta/extrato")
    List<Transaction> transactions() {
        return finance.transactions();
    }

    @GetMapping("/conta/notificacoes")
    List<NotificationView> notifications() {
        return outbox.list(accounts.current().id);
    }
}
