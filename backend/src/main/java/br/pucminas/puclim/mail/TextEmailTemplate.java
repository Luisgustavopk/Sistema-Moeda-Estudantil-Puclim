package br.pucminas.puclim.mail;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.core.io.ClassPathResource;

/** Named placeholders are resolved once; values are always treated as literal text. */
public record TextEmailTemplate(String subject, String body) {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{([a-zA-Z][a-zA-Z0-9]*)\\}\\}");

    public static TextEmailTemplate load(String subject, String resource) {
        try {
            return new TextEmailTemplate(subject,
                    new ClassPathResource(resource).getContentAsString(StandardCharsets.UTF_8));
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível carregar o template de e-mail: " + resource, e);
        }
    }

    public EmailContent render(Map<String, String> values) {
        String text = PLACEHOLDER.matcher(body).replaceAll(match -> {
            String name = match.group(1);
            String value = values.get(name);
            if (value == null)
                throw new IllegalArgumentException("Variável ausente no template de e-mail: " + name);
            return Matcher.quoteReplacement(value);
        });
        return new EmailContent(subject, text);
    }
}
