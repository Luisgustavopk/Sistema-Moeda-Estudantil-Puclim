package br.pucminas.puclim.controller;

import java.util.Map;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.dto.request.Requests.Login;
import br.pucminas.puclim.dto.response.Responses.AccountView;
import br.pucminas.puclim.service.AccountService;
import br.pucminas.puclim.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final AccountService accounts;

    public AuthController(AuthService a, AccountService s) {
        auth = a;
        accounts = s;
    }

    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @GetMapping("/session")
    AccountView session() {
        return accounts.view(accounts.current());
    }

    @PostMapping("/login")
    AccountView login(@Valid @RequestBody Login input, HttpServletRequest request, HttpServletResponse response) {
        return auth.login(input, request, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request, HttpServletResponse response) {
        auth.logout(request, response);
    }
}
