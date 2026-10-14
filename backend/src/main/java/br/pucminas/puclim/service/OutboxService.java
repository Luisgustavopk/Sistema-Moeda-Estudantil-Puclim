package br.pucminas.puclim.service;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.dto.response.Responses.NotificationView;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.Notification;
import br.pucminas.puclim.repository.NotificationRepository;

@Service
public class OutboxService {
    private final NotificationRepository notifications;
    private final JavaMailSender sender;
    private final String from;

    public OutboxService(NotificationRepository n, JavaMailSender s, @Value("${puclim.mail.from}") String f) {
        notifications = n;
        sender = s;
        from = f;
    }

    @Transactional
    public void enqueue(Account account, String subject, String body) {
        Notification n = new Notification();
        n.account = account;
        n.recipient = account.email;
        n.subject = subject;
        n.body = body;
        notifications.save(n);
    }

    @Transactional(readOnly = true)
    public List<String> pending() {
        return notifications.due(Instant.now(), PageRequest.of(0, 50));
    }

    @Transactional
    public void deliver(String id) {
        Notification n = notifications.lock(id).orElseThrow();
        if (n.sentAt != null || n.nextAttempt.isAfter(Instant.now()))
            return;
        n.attempts++;
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(n.recipient);
            message.setSubject(n.subject);
            message.setText(n.body);
            sender.send(message);
            n.sentAt = Instant.now();
            n.lastError = null;
        } catch (org.springframework.mail.MailException e) {
            n.lastError = e.getClass().getSimpleName();
            n.nextAttempt = Instant.now().plusSeconds(Math.min(3600, 30L * (1L << Math.min(n.attempts, 7))));
        }
    }

    @Transactional(readOnly = true)
    public List<NotificationView> list(String accountId) {
        return notifications.findByAccountIdOrderByDateDesc(accountId).stream().map(n -> new NotificationView(n.id,
                n.subject, n.body, n.date, n.recipient, n.sentAt == null ? "PENDENTE" : "ENVIADO", n.attempts))
                .toList();
    }
}
