package br.pucminas.puclim.config;

import java.net.URI;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public record PasswordResetPolicy(Duration tokenTtl, Duration emailCooldown, Duration ipWindow, int ipLimit,
        String publicAppUrl) {
    public PasswordResetPolicy(
            @Value("${puclim.password-reset.token-ttl:30m}") Duration tokenTtl,
            @Value("${puclim.password-reset.email-cooldown:60s}") Duration emailCooldown,
            @Value("${puclim.password-reset.ip-window:15m}") Duration ipWindow,
            @Value("${puclim.password-reset.ip-limit:20}") int ipLimit,
            @Value("${puclim.public-app-url:http://localhost:5173}") String publicAppUrl) {
        if (tokenTtl.isNegative() || tokenTtl.isZero() || emailCooldown.isNegative() || emailCooldown.isZero()
                || ipWindow.isNegative() || ipWindow.isZero() || ipLimit < 1)
            throw new IllegalArgumentException("Configuração inválida de recuperação de senha.");
        var uri = URI.create(publicAppUrl);
        if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null)
            throw new IllegalArgumentException(
                    "PUBLIC_APP_URL deve ser uma URL HTTP(S) pública sem query ou fragmento.");
        this.tokenTtl = tokenTtl;
        this.emailCooldown = emailCooldown;
        this.ipWindow = ipWindow;
        this.ipLimit = ipLimit;
        this.publicAppUrl = publicAppUrl.replaceAll("/+$", "");
    }

    public String link(String token) {
        return publicAppUrl + "/redefinir-senha#token=" + token;
    }
}
