package br.pucminas.puclim.service;

import br.pucminas.puclim.dto.request.LoginRequest;
import br.pucminas.puclim.dto.request.PasswordChangeRequest;
import br.pucminas.puclim.dto.response.AccountResponse;

import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.security.SessionPrincipal;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Service
@Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class AuthService {
    private final AccountService accounts;
    private final SecurityContextRepository contexts;
    private final CsrfTokenRepository tokens;

    public AuthService(AccountService a, SecurityContextRepository c, CsrfTokenRepository t) {
        accounts = a;
        contexts = c;
        tokens = t;
    }

    public AccountResponse login(LoginRequest input, HttpServletRequest request, HttpServletResponse response) {
        Account a = accounts.authenticate(input);
        request.getSession();
        request.changeSessionId();
        authenticate(a, request, response);
        tokens.saveToken(null, request, response);
        return accounts.view(a);
    }

    public void authenticate(Account account, HttpServletRequest request, HttpServletResponse response) {
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                new SessionPrincipal(account.id, account.credentialVersion), null,
                List.of(new SimpleGrantedAuthority("ROLE_" + account.role))));
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
    }

    public AccountResponse password(PasswordChangeRequest input, HttpServletRequest request, HttpServletResponse response) {
        Account a = accounts.changePassword(input);
        request.changeSessionId();
        authenticate(a, request, response);
        tokens.saveToken(null, request, response);
        return accounts.view(a);
    }

    public void logout(HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null)
            request.getSession(false).invalidate();
        SecurityContextHolder.clearContext();
        tokens.saveToken(null, request, response);
        Cookie cookie = new Cookie("JSESSIONID", "");
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
