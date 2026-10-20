package br.pucminas.puclim.security;

import java.io.IOException;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.Pbkdf2PasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AnonymousAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.filter.OncePerRequestFilter;

import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.service.AccountService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
public class SecurityConfig {
    @Bean
    PasswordEncoder encoder() {
        return new DelegatingPasswordEncoder("pbkdf2", java.util.Map.of("pbkdf2", Pbkdf2PasswordEncoder.defaultsForSpringSecurity_v5_8()));
    }

    @Bean
    SecurityContextRepository contexts() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    CsrfTokenRepository csrfTokens() {
        return CookieCsrfTokenRepository.withHttpOnlyFalse();
    }

    @Bean
    SecurityFilterChain chain(HttpSecurity http, AccountService accounts, SecurityContextRepository contexts,
            CsrfTokenRepository tokens) throws Exception {
        http.csrf(csrf -> csrf.spa().csrfTokenRepository(tokens))
                .securityContext(context -> context.securityContextRepository(contexts))
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(auth -> auth
                        .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/auth/csrf", "/api/instituicoes")
                        .permitAll()
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/auth/login", "/api/alunos",
                                "/api/empresas")
                        .permitAll()
                        .requestMatchers("/api/auth/**", "/api/conta/**", "/api/uploads/imagens/**").authenticated()
                        .requestMatchers("/api/instituicao/**").hasRole("EMPRESA")
                        .requestMatchers("/api/alunos/selecionaveis", "/api/transferencias").hasRole("PROFESSOR")
                        .requestMatchers(org.springframework.http.HttpMethod.POST, "/api/vantagens/*/resgates")
                        .hasRole("ALUNO")
                        .requestMatchers("/api/vantagens/**", "/api/cupons/**").authenticated()
                        .requestMatchers("/api/gamificacao/**").authenticated()
                        .anyRequest().denyAll())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((req, res, e) -> error(res, 401, "Entre no sistema."))
                        .accessDeniedHandler(
                                (req, res, e) -> error(res, 403, "Você não tem permissão ou o token CSRF expirou.")))
                .logout(logout -> logout.disable())
                .addFilterAfter(new OncePerRequestFilter() {
                    @Override
                    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                            FilterChain chain) throws ServletException, IOException {
                        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext()
                                .getAuthentication();
                        if (auth != null && auth.getPrincipal() instanceof SessionPrincipal) {
                            try {
                                var account = accounts.current();
                                String path = request.getRequestURI();
                                if (account.mustChangePassword && !java.util.Set.of("/api/auth/csrf",
                                        "/api/auth/session", "/api/auth/logout", "/api/conta/senha").contains(path)) {
                                    error(response, 403, "Defina sua senha no primeiro acesso.");
                                    return;
                                }
                            } catch (ApiException e) {
                                if (request.getSession(false) != null)
                                    request.getSession(false).invalidate();
                                org.springframework.security.core.context.SecurityContextHolder.clearContext();
                                error(response, 401, "Sessão encerrada. Entre novamente.");
                                return;
                            }
                        }
                        chain.doFilter(request, response);
                    }
                }, AnonymousAuthenticationFilter.class);
        return http.build();
    }

    private static void error(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write("{\"message\":\"" + message + "\"}");
    }
}
