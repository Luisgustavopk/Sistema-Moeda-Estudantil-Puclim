package br.pucminas.puclim.config;

import java.time.LocalDate;
import java.time.ZoneId;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import br.pucminas.puclim.repository.TeacherRepository;
import br.pucminas.puclim.service.FinancialService;
import br.pucminas.puclim.service.OutboxService;

@Component
@EnableScheduling
public class ScheduledJobs {
    private static final Logger log = LoggerFactory.getLogger(ScheduledJobs.class);
    private final TeacherRepository teachers;
    private final FinancialService finance;
    private final OutboxService outbox;
    private final ZoneId zone;

    public ScheduledJobs(TeacherRepository t, FinancialService f, OutboxService o,
            @Value("${puclim.semester.zone}") String z) {
        teachers = t;
        finance = f;
        outbox = o;
        zone = ZoneId.of(z);
    }

    public String currentSemester() {
        LocalDate d = LocalDate.now(zone);
        return d.getYear() + "-" + (d.getMonthValue() <= 6 ? 1 : 2);
    }

    @EventListener(ApplicationReadyEvent.class)
    @Scheduled(cron = "0 0 0 * * *", zone = "${puclim.semester.zone}")
    public void credits() {
        for (String id : teachers.activeIds())
            try {
                finance.creditSemester(id, currentSemester());
            } catch (RuntimeException e) {
                log.error("Crédito semestral pendente para {} ({})", id, e.getClass().getSimpleName());
            }
    }

    @Scheduled(fixedDelayString = "${puclim.mail.retry-delay-ms:30000}")
    public void deliver() {
        for (String id : outbox.pending())
            try {
                outbox.deliver(id);
            } catch (RuntimeException e) {
                log.warn("Notificação pendente {} ({})", id, e.getClass().getSimpleName());
            }
    }
}
