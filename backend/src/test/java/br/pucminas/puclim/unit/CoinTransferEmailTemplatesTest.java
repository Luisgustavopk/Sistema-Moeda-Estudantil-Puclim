package br.pucminas.puclim.unit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import java.util.Map;

import org.junit.jupiter.api.Test;

import br.pucminas.puclim.mail.CoinTransferEmailTemplates;
import br.pucminas.puclim.mail.TextEmailTemplate;

class CoinTransferEmailTemplatesTest {
    private final CoinTransferEmailTemplates templates = new CoinTransferEmailTemplates("America/Sao_Paulo");
    private final CoinTransferEmailTemplates.Transfer transfer = new CoinTransferEmailTemplates.Transfer(
            "Professora Cláudia", "João", 200, "Ótima participação na atividade.",
            Instant.parse("2026-11-04T15:04:05Z"), "0d5c6ea1-7dab-456b-91fc-1e9d27281758");

    @Test
    void teacherReceivesASendConfirmationWithTheStudentAndOperationDetails() {
        var email = templates.sent(transfer);
        assertEquals("Envio de moedas confirmado no Puclim", email.subject());
        assertTrue(email.body().startsWith("Olá, Professora Cláudia!"));
        assertTrue(email.body().contains("Seu envio de moedas foi concluído com sucesso."));
        assertTrue(email.body().contains("Aluno destinatário: João"));
        assertTrue(email.body().contains("Quantidade: 200 moedas"));
        assertTrue(email.body().contains("Data: 04/11/2026 às 12:04:05 -03:00"));
        assertTrue(email.body().contains("Identificador da operação: " + transfer.operationId()));
        assertTrue(email.body().contains(transfer.reason()));
    }

    @Test
    void studentReceivesAReceiptWithTheTeacherAndTheSameOperationDetails() {
        var email = templates.received(transfer);
        assertEquals("Você recebeu moedas no Puclim", email.subject());
        assertTrue(email.body().startsWith("Olá, João!"));
        assertTrue(email.body().contains("Professor remetente: Professora Cláudia"));
        assertTrue(email.body().contains("Quantidade: 200 moedas"));
        assertTrue(email.body().contains("Data: 04/11/2026 às 12:04:05 -03:00"));
        assertTrue(email.body().contains("Identificador da operação: " + transfer.operationId()));
        assertTrue(email.body().contains(transfer.reason()));
        assertTrue(email.body().contains("As moedas já estão disponíveis na sua conta."));
    }

    @Test
    void userTextIsPreservedWithoutResolvingPlaceholdersOrReplacementCharactersInsideIt() {
        String reason = "Literal: {{studentName}}, $1, \\arquivo e 100% de dedicação.\nSegunda linha: ação.";
        var input = new CoinTransferEmailTemplates.Transfer(transfer.teacherName(), transfer.studentName(),
                transfer.amount(), reason, transfer.date(), transfer.operationId());
        assertTrue(templates.sent(input).body().contains(reason));
        assertTrue(templates.received(input).body().contains(reason));
    }

    @Test
    void configuredTimeZoneIsExplicitEvenWhenTheDateChanges() {
        var input = new CoinTransferEmailTemplates.Transfer(transfer.teacherName(), transfer.studentName(),
                transfer.amount(), transfer.reason(), Instant.parse("2026-11-04T01:04:05Z"), transfer.operationId());
        assertTrue(templates.sent(input).body().contains("Data: 03/11/2026 às 22:04:05 -03:00"));
        var utc = new CoinTransferEmailTemplates("UTC");
        assertTrue(utc.received(input).body().contains("Data: 04/11/2026 às 01:04:05 Z"));
    }

    @Test
    void missingTemplateValuesFailInsteadOfSendingAnIncompleteMessage() {
        var template = new TextEmailTemplate("Confirmação", "Olá, {{name}}! Operação: {{operationId}}");
        var error = assertThrows(IllegalArgumentException.class, () -> template.render(Map.of("name", "João")));
        assertTrue(error.getMessage().contains("operationId"));
    }
}
