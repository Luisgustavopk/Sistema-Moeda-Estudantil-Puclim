package br.pucminas.puclim.mail;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class CoinTransferEmailTemplates {
    public record Transfer(String teacherName, String studentName, long amount, String reason, Instant date,
            String operationId) {
    }

    private final TextEmailTemplate sent = TextEmailTemplate.load("Envio de moedas confirmado no Puclim",
            "mail/coin-transfer-sent.txt");
    private final TextEmailTemplate received = TextEmailTemplate.load("Você recebeu moedas no Puclim",
            "mail/coin-transfer-received.txt");
    private final DateTimeFormatter dates;

    public CoinTransferEmailTemplates(@Value("${puclim.mail.zone:America/Sao_Paulo}") String zone) {
        dates = DateTimeFormatter.ofPattern("dd/MM/uuuu 'às' HH:mm:ss XXX", Locale.forLanguageTag("pt-BR"))
                .withZone(ZoneId.of(zone));
    }

    public EmailContent sent(Transfer transfer) {
        return sent.render(values(transfer));
    }

    public EmailContent received(Transfer transfer) {
        return received.render(values(transfer));
    }

    private Map<String, String> values(Transfer transfer) {
        return Map.of("teacherName", transfer.teacherName(), "studentName", transfer.studentName(),
                "amount", Long.toString(transfer.amount()), "reason", transfer.reason(),
                "date", dates.format(transfer.date()), "operationId", transfer.operationId());
    }
}
