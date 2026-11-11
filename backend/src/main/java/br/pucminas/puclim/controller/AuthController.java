package br.pucminas.puclim.controller;

import br.pucminas.puclim.dto.request.LoginRequest;
import br.pucminas.puclim.dto.request.PasswordRecoveryRequest;
import br.pucminas.puclim.dto.request.PasswordResetInput;
import br.pucminas.puclim.dto.response.AccountResponse;
import br.pucminas.puclim.dto.response.PasswordRecoveryResponse;

import java.util.Map;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import br.pucminas.puclim.service.AccountService;
import br.pucminas.puclim.service.AuthService;
import br.pucminas.puclim.service.PasswordResetService;
import br.pucminas.puclim.config.PasswordResetPolicy;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final AccountService accounts;
    private final PasswordResetService recovery;
    private final PasswordResetPolicy recoveryPolicy;

    public AuthController(AuthService a, AccountService s, PasswordResetService recovery,
            PasswordResetPolicy recoveryPolicy) {
        auth = a;
        accounts = s;
        this.recovery = recovery;
        this.recoveryPolicy = recoveryPolicy;
    }

    @GetMapping("/csrf")
    Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @GetMapping("/session")
    AccountResponse session() {
        return accounts.view(accounts.current());
    }

    @PostMapping("/login")
    AccountResponse login(@Valid @RequestBody LoginRequest input, HttpServletRequest request, HttpServletResponse response) {
        return auth.login(input, request, response);
    }

    @PostMapping("/logout")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request, HttpServletResponse response) {
        auth.logout(request, response);
    }

    @PostMapping("/recuperar-senha")
    @ResponseStatus(org.springframework.http.HttpStatus.ACCEPTED)
    PasswordRecoveryResponse recover(@Valid @RequestBody PasswordRecoveryRequest input, HttpServletRequest request) {
        // Remote address comes from the server connector; never trust arbitrary Forwarded headers.
        recovery.request(input.email(), request.getRemoteAddr());
        return new PasswordRecoveryResponse(PasswordResetService.ACCEPTED, recoveryPolicy.resendAfterSeconds());
    }

    @PostMapping("/redefinir-senha")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    void reset(@Valid @RequestBody PasswordResetInput input, HttpServletRequest request, HttpServletResponse response) {
        recovery.reset(input.token(), input.password());
        auth.logout(request, response);
    }
}
