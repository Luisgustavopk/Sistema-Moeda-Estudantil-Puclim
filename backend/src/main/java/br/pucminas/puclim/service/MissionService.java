package br.pucminas.puclim.service;

import java.time.Clock;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.dto.request.GamificationRequests;
import br.pucminas.puclim.dto.response.GamificationResponses;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.Mission;
import br.pucminas.puclim.entity.MissionParticipation;
import br.pucminas.puclim.entity.MissionReview;
import br.pucminas.puclim.entity.Operation;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.entity.Teacher;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class MissionService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final FinancialService finance;
    private final ProgressionService progression;
    private final OutboxService outbox;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public MissionService(GamificationRepository db, AccountService identity, FinancialService finance,
            ProgressionService progression, OutboxService outbox, ApplicationEventPublisher events, Clock clock) {
        this.db = db;
        this.identity = identity;
        this.finance = finance;
        this.progression = progression;
        this.outbox = outbox;
        this.events = events;
        this.clock = clock;
    }

    public GamificationResponses.Mission create(GamificationRequests.Mission input, String key) {
        Account a = identity.require("PROFESSOR");
        a = identity.locked(a.id);
        if (key == null || !key.matches("[a-zA-Z0-9._:-]{8,80}"))
            throw ApiException.bad("Envie uma Idempotency-Key válida.");
        String fingerprint = input.title().trim() + "\n" + input.description().trim() + "\n" + input.reward() + ":"
                + input.capacity() + ":" + input.deadline();
        String fp;
        try {
            fp = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                    .digest(fingerprint.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
        Operation old = db.first(Operation.class, "select o from Operation o where o.account.id=:a and o.requestKey=:k",
                "a", a.id, "k", key).orElse(null);
        if (old != null) {
            if (!old.kind.equals("MISSION") || !old.fingerprint.equals(fp))
                throw new ApiException(409, "Chave já usada com dados diferentes.");
            return view(db.get(Mission.class, old.resultId), a);
        }
        if (!input.deadline().isAfter(clock.instant()))
            throw ApiException.bad("Prazo deve estar no futuro.");
        long reserved = Math.multiplyExact(input.reward(), input.capacity());
        Mission m = new Mission();
        m.teacher = db.get(Teacher.class, a.id);
        m.title = input.title().trim();
        m.description = input.description().trim();
        m.reward = input.reward();
        m.capacity = input.capacity();
        m.deadline = input.deadline();
        m.reserved = reserved;
        m.date = clock.instant();
        db.save(m);
        finance.entry(a, "RESERVA", -reserved, "Reserva da missão: " + m.title, null, null, m.id);
        Operation o = new Operation();
        o.account = a;
        o.requestKey = key;
        o.fingerprint = fp;
        o.kind = "MISSION";
        o.resultId = m.id;
        db.save(o);
        return view(m, a);
    }

    public List<GamificationResponses.Mission> list() {
        Account a = identity.current();
        List<Mission> rows;
        if (a.role.equals("PROFESSOR"))
            rows = db.list(Mission.class, "select m from Mission m where m.teacher.id=:t order by m.date desc", "t",
                    a.id);
        else if (a.role.equals("ALUNO")) {
            Student s = db.get(Student.class, a.id);
            rows = db.list(Mission.class,
                    "select m from Mission m where m.teacher.institution.id=:i and ((m.status='DISPONIVEL' and m.deadline>:now and m.teacher.account.active=true) or exists (select p.id from MissionParticipation p where p.mission=m and p.student.id=:s)) order by m.date desc",
                    "i", s.institution.id, "now", clock.instant(), "s", a.id);
        } else
            throw ApiException.forbidden();
        return rows.stream().map(m -> view(m, a)).toList();
    }

    private Mission lockMission(String id, Account viewer) {
        Mission initial = db.get(Mission.class, id);
        finance.lockAccounts(initial.teacher.id, viewer.id);
        return db.lock(Mission.class, id);
    }

    public GamificationResponses.Mission accept(String id) {
        Account a = identity.require("ALUNO");
        Mission m = lockMission(id, a);
        Student s = db.get(Student.class, a.id);
        if (!s.institution.id.equals(m.teacher.institution.id))
            throw ApiException.forbidden();
        MissionParticipation old = db.first(MissionParticipation.class,
                "select p from MissionParticipation p where p.mission.id=:m and p.student.id=:s", "m", id, "s", a.id)
                .orElse(null);
        if (old != null)
            return view(m, a);
        if (!m.teacher.account.active || !m.status.equals("DISPONIVEL") || !m.deadline.isAfter(clock.instant())
                || m.occupied >= m.capacity || m.reserved < m.reward)
            throw new ApiException(409, "Missão encerrada, sem vagas ou sem reserva.");
        MissionParticipation p = new MissionParticipation();
        p.mission = m;
        p.student = s;
        p.acceptedAt = clock.instant();
        db.save(p);
        m.occupied++;
        return view(m, a);
    }

    public GamificationResponses.Mission deliver(String id, GamificationRequests.Text input) {
        Account a = identity.require("ALUNO");
        MissionParticipation initial = db.get(MissionParticipation.class, id);
        if (!initial.student.id.equals(a.id))
            throw ApiException.forbidden();
        Mission m = lockMission(initial.mission.id, a);
        MissionParticipation p = db.lock(MissionParticipation.class, id);
        if (!Set.of("EM_ANDAMENTO", "DEVOLVIDA").contains(p.status))
            throw new ApiException(409, "Esta entrega não pode ser alterada.");
        if (m.status.equals("DISPONIVEL") && !m.deadline.isAfter(clock.instant()))
            expireLocked(m);
        // Submitted work remains an obligation after closure, including requests for
        // correction.
        if (!m.status.equals("DISPONIVEL") && !p.status.equals("DEVOLVIDA"))
            throw new ApiException(409, "Missão encerrada.");
        p.delivery = input.text().trim();
        p.status = "AGUARDANDO_APROVACAO";
        p.submittedAt = clock.instant();
        history(p, "ENTREGA", p.delivery);
        progression.notify(m.teacher.account, "MISSAO_ENTREGUE", "Entrega recebida",
                p.student.account.name + " enviou a missão " + m.title, p.id);
        return view(m, a);
    }

    public GamificationResponses.Mission review(String id, boolean approve, GamificationRequests.Text input) {
        Account a = identity.require("PROFESSOR");
        MissionParticipation initial = db.get(MissionParticipation.class, id);
        if (!initial.mission.teacher.id.equals(a.id))
            throw ApiException.forbidden();
        finance.lockAccounts(a.id, initial.student.id);
        Mission m = db.lock(Mission.class, initial.mission.id);
        MissionParticipation p = db.lock(MissionParticipation.class, id);
        if (approve && p.status.equals("CONCLUIDA"))
            return view(m, a);
        if (!p.status.equals("AGUARDANDO_APROVACAO"))
            throw new ApiException(409, "Não há entrega aguardando análise.");
        if (approve) {
            if (m.reserved < m.reward)
                throw new ApiException(409, "Reserva insuficiente.");
            m.reserved -= m.reward;
            p.status = "CONCLUIDA";
            p.approvedAt = clock.instant();
            finance.entry(p.student.account, "MISSAO", m.reward, "Missão: " + m.title, a.name,
                    m.description.substring(0, Math.min(1000, m.description.length())), p.id);
            progression.notify(p.student.account, "MISSAO_APROVADA", "Missão aprovada",
                    m.title + ": " + m.reward + " moedas creditadas.", p.id);
            outbox.enqueue(p.student.account, "Missão aprovada no Puclim",
                    a.name + " aprovou " + m.title + ". Recompensa: " + m.reward + " moedas.");
            events.publishEvent(new GamificationEvents.CoinsReceived(p.student.id, p.id, m.reward, true));
            events.publishEvent(new GamificationEvents.MissionApproved(p.student.id, p.id));
        } else {
            p.status = "DEVOLVIDA";
            progression.notify(p.student.account, "MISSAO_DEVOLVIDA", "Missão devolvida", input.text().trim(), p.id);
        }
        p.feedback = input.text().trim();
        history(p, approve ? "APROVACAO" : "DEVOLUCAO", p.feedback);
        return view(m, a);
    }

    private void history(MissionParticipation p, String action, String text) {
        MissionReview r = new MissionReview();
        r.participation = p;
        r.action = action;
        r.text = text;
        r.date = clock.instant();
        db.save(r);
    }

    public GamificationResponses.Mission deadline(String id, GamificationRequests.Deadline input) {
        Account a = identity.require("PROFESSOR");
        Mission m = lockMission(id, a);
        if (!m.teacher.id.equals(a.id))
            throw ApiException.forbidden();
        if (!m.status.equals("DISPONIVEL") || !m.deadline.isAfter(clock.instant()))
            throw new ApiException(409, "Missão encerrada.");
        if (!input.deadline().isAfter(clock.instant()))
            throw ApiException.bad("Prazo inválido.");
        m.deadline = input.deadline();
        return view(m, a);
    }

    public GamificationResponses.Mission closeOwn(String id) {
        Account a = identity.require("PROFESSOR");
        Mission m = lockMission(id, a);
        if (!m.teacher.id.equals(a.id))
            throw ApiException.forbidden();
        expireLocked(m);
        return view(m, a);
    }

    public void expire(String id) {
        Mission initial = db.get(Mission.class, id);
        identity.locked(initial.teacher.id);
        Mission m = db.lock(Mission.class, id);
        if (!m.deadline.isAfter(clock.instant()))
            expireLocked(m);
    }

    private void expireLocked(Mission m) {
        if (!m.status.equals("DISPONIVEL"))
            return;
        m.status = "ENCERRADA";
        long obligations = 0;
        for (MissionParticipation p : db.list(MissionParticipation.class,
                "select p from MissionParticipation p where p.mission.id=:m", "m", m.id)) {
            if (Set.of("AGUARDANDO_APROVACAO", "DEVOLVIDA").contains(p.status))
                obligations += m.reward;
            else if (p.status.equals("EM_ANDAMENTO")) {
                p.status = "CANCELADA";
                history(p, "CANCELAMENTO", "Missão encerrada antes da entrega.");
            }
        }
        long released = m.reserved - obligations;
        if (released > 0)
            finance.entry(m.teacher.account, "LIBERACAO", released, "Reserva liberada: " + m.title, null, null, m.id);
        m.reserved = obligations;
    }

    private GamificationResponses.Mission view(Mission m, Account viewer) {
        var participants = db
                .list(MissionParticipation.class,
                        "select p from MissionParticipation p where p.mission.id=:m order by p.acceptedAt", "m", m.id)
                .stream()
                .filter(p -> viewer.role.equals("PROFESSOR") || p.student.id.equals(viewer.id))
                .map(p -> new GamificationResponses.Participation(p.id, p.student.id, p.student.account.name, p.status,
                        p.delivery, p.feedback, p.acceptedAt, p.submittedAt, p.approvedAt,
                        db.list(MissionReview.class,
                                "select r from MissionReview r where r.participation.id=:p order by r.date", "p", p.id)
                                .stream().map(r -> new GamificationResponses.Review(r.action, r.text, r.date))
                                .toList()))
                .toList();
        return new GamificationResponses.Mission(m.id, m.teacher.account.name, m.title, m.description, m.reward,
                m.capacity, m.occupied, m.reserved, m.deadline, m.status, participants);
    }
}
