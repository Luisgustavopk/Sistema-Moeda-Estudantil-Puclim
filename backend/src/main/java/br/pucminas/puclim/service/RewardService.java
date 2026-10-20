package br.pucminas.puclim.service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.config.GamificationPolicy;
import br.pucminas.puclim.dto.request.GamificationRequests;
import br.pucminas.puclim.dto.response.GamificationResponses;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.FundMovement;
import br.pucminas.puclim.entity.InstitutionFund;
import br.pucminas.puclim.entity.Partner;
import br.pucminas.puclim.entity.RewardPayment;
import br.pucminas.puclim.entity.SemesterClosure;
import br.pucminas.puclim.entity.SemesterWinner;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.entity.StudentProgress;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class RewardService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final ProgressionService progression;
    private final FinancialService finance;
    private final GamificationPolicy policy;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public RewardService(GamificationRepository db, AccountService identity, ProgressionService progression,
            FinancialService finance, GamificationPolicy policy, ApplicationEventPublisher events, Clock clock) {
        this.db = db;
        this.identity = identity;
        this.progression = progression;
        this.finance = finance;
        this.policy = policy;
        this.events = events;
        this.clock = clock;
    }

    public void bonus(GamificationEvents.CoinsReceived e) {
        StudentProgress p = progression.progress(e.studentId());
        long amount = policy.bonus(e.amount(), progression.today().equals(p.perfectQuiz),
                progression.today().equals(p.donationDay), progression.activeStreak(p));
        if (amount > 0)
            request(p.student, "BONUS", "bonus:" + e.operationId(), amount, e.operationId(), progression.semester());
    }

    public void weekly(String studentId, String attemptId) {
        StudentProgress p = progression.progress(studentId);
        if (p.streak > 0 && p.streak % 7 == 0)
            request(p.student, "RECOMPENSA", "weekly:" + attemptId, policy.getWeeklyReward(), attemptId,
                    progression.semester());
    }

    public RewardPayment request(Student student, String kind, String key, long amount, String origin,
            String semester) {
        if (amount <= 0)
            throw ApiException.bad("Recompensa inválida.");
        identity.locked(student.id);
        RewardPayment old = db
                .first(RewardPayment.class, "select r from RewardPayment r where r.sourceKey=:k", "k", key)
                .orElse(null);
        if (old != null)
            return old;
        RewardPayment r = new RewardPayment();
        r.student = student;
        r.institution = student.institution;
        r.semester = semester;
        r.sourceKey = key;
        r.kind = kind;
        r.amount = amount;
        r.originOperationId = origin;
        r.date = clock.instant();
        db.save(r);
        pay(r);
        if (r.status.equals("PENDENTE")) {
            progression.notify(r.institution.account, "FUNDO_INSUFICIENTE", "Recompensa pendente",
                    "Saldo insuficiente para pagar " + amount + " moedas em " + semester + ".", r.id);
            progression.notify(student.account, "RECOMPENSA_PENDENTE", "Recompensa aguardando saldo",
                    "Sua recompensa de " + amount + " moedas está registrada e será paga quando houver saldo no Fundo.",
                    r.id);
        }
        return r;
    }

    private void pay(RewardPayment r) {
        if (r.status.equals("PAGO"))
            return;
        Account student = identity.locked(r.student.id);
        InstitutionFund fund = db.first(InstitutionFund.class,
                "select f from InstitutionFund f where f.institution.id=:i and f.semester=:s", "i", r.institution.id,
                "s", r.semester).orElse(null);
        if (fund == null)
            return;
        fund = db.lock(InstitutionFund.class, fund.id);
        if (fund.balance < r.amount)
            return;
        fund.balance -= r.amount;
        FundMovement m = new FundMovement();
        m.fund = fund;
        m.kind = r.kind;
        m.amount = -r.amount;
        m.sourceKey = r.sourceKey;
        m.date = clock.instant();
        db.save(m);
        finance.entry(student, r.kind, r.amount, "Recompensa institucional: " + r.kind, r.institution.account.name,
                "Origem: " + r.sourceKey, r.id);
        r.status = "PAGO";
        r.paidAt = clock.instant();
        progression.notify(student, "RECOMPENSA", "Recompensa recebida",
                "Você recebeu " + r.amount + " moedas (" + r.kind + ").", r.id);
        events.publishEvent(new GamificationEvents.CoinsReceived(student.id, r.id, r.amount, false));
    }

    public void retryPayment(String id) {
        RewardPayment initial = db.get(RewardPayment.class, id);
        identity.locked(initial.student.id);
        RewardPayment r = db.lock(RewardPayment.class, id);
        pay(r);
    }

    public GamificationResponses.Fund fund(String semester) {
        Partner p = identity.requirePartner("ENSINO");
        GamificationPolicy.start(semester);
        return fundView(p, semester);
    }

    private GamificationResponses.Fund fundView(Partner p, String semester) {
        InstitutionFund f = db.first(InstitutionFund.class,
                "select f from InstitutionFund f where f.institution.id=:i and f.semester=:s", "i", p.id, "s", semester)
                .orElse(null);
        var moves = f == null ? List.<GamificationResponses.Movement>of()
                : db.list(FundMovement.class, "select m from FundMovement m where m.fund.id=:f order by m.date desc",
                        "f", f.id).stream()
                        .map(m -> new GamificationResponses.Movement(m.kind, m.amount, m.sourceKey, m.date)).toList();
        var payments = db.list(RewardPayment.class,
                "select r from RewardPayment r where r.institution.id=:i and r.semester=:s order by r.date desc", "i",
                p.id, "s", semester).stream().map(this::paymentView).toList();
        var winners = db.list(SemesterWinner.class,
                "select w from SemesterWinner w where w.closure.institution.id=:i and w.closure.semester=:s order by w.position",
                "i", p.id, "s", semester).stream()
                .map(w -> new GamificationResponses.Winner(w.position, w.student.account.name, w.received, w.streak,
                        w.reward))
                .toList();
        return new GamificationResponses.Fund(semester, f == null ? 0 : f.allocation, f == null ? 0 : f.balance,
                f == null ? 0 : f.reserved, f == null ? null : f.origin, moves, payments, winners);
    }

    private GamificationResponses.Payment paymentView(RewardPayment r) {
        return new GamificationResponses.Payment(r.id, r.student.account.name, r.semester, r.kind, r.amount, r.status,
                r.sourceKey, r.originOperationId, r.date, r.paidAt);
    }

    public List<GamificationResponses.Payment> rewards() {
        Account a = identity.require("ALUNO");
        return db.list(RewardPayment.class, "select r from RewardPayment r where r.student.id=:s order by r.date desc",
                "s", a.id).stream().map(this::paymentView).toList();
    }

    public GamificationResponses.Fund allocate(String semester, GamificationRequests.Allocation input) {
        Partner p = identity.requirePartner("ENSINO");
        identity.locked(p.id);
        GamificationPolicy.start(semester);
        if (!semester.equals(progression.semester()))
            throw ApiException.bad("A dotação só pode ser definida para o semestre atual.");
        if (input.amount() > policy.getMaxAllocation())
            throw ApiException.bad("Valor acima do limite institucional de dotação.");
        InstitutionFund old = db.first(InstitutionFund.class,
                "select f from InstitutionFund f where f.institution.id=:i and f.semester=:s", "i", p.id, "s", semester)
                .orElse(null);
        if (old != null) {
            if (old.allocation != input.amount() || !old.origin.equals(input.origin().trim()))
                throw new ApiException(409, "A dotação deste semestre já foi definida e é imutável.");
            return fundView(p, semester);
        }
        InstitutionFund f = new InstitutionFund();
        f.institution = p;
        f.semester = semester;
        f.allocation = input.amount();
        f.balance = input.amount();
        f.origin = input.origin().trim();
        f.date = clock.instant();
        db.save(f);
        FundMovement m = new FundMovement();
        m.fund = f;
        m.kind = "DOTACAO";
        m.amount = input.amount();
        m.sourceKey = "allocation:" + p.id + ":" + semester;
        m.date = clock.instant();
        db.save(m);
        return fundView(p, semester);
    }

    public void retryOwn(String semester) {
        Partner p = identity.requirePartner("ENSINO");
        GamificationPolicy.start(semester);
        for (RewardPayment r : db.list(RewardPayment.class,
                "select r from RewardPayment r where r.institution.id=:i and r.semester=:s and r.status='PENDENTE' order by r.date",
                "i", p.id, "s", semester)) {
            identity.locked(r.student.id);
            pay(db.lock(RewardPayment.class, r.id));
        }
    }

    public void closeOwn(String semester) {
        Partner p = identity.requirePartner("ENSINO");
        close(p.id, semester);
    }

    public void close(String institutionId, String semester) {
        LocalDate end = GamificationPolicy.start(semester).plusMonths(6);
        if (end.isAfter(progression.today()))
            throw new ApiException(409, "O semestre ainda está em andamento.");
        identity.locked(institutionId);
        if (db.first(SemesterClosure.class,
                "select c from SemesterClosure c where c.institution.id=:i and c.semester=:s", "i", institutionId, "s",
                semester).isPresent())
            return;
        var ranking = progression.rankRows(institutionId, semester, "MOEDAS").stream().filter(r -> r.received() > 0)
                .limit(3).toList();
        SemesterClosure c = new SemesterClosure();
        c.institution = db.get(Partner.class, institutionId);
        c.semester = semester;
        c.date = clock.instant();
        db.save(c);
        // Freeze every winner before making any payment that could affect another
        // ranking.
        List<SemesterWinner> winners = new ArrayList<>();
        for (var r : ranking) {
            SemesterWinner w = new SemesterWinner();
            w.closure = c;
            w.student = db.get(Student.class, r.studentId());
            w.position = r.position();
            w.received = r.received();
            w.streak = r.streak();
            w.reward = policy.getPrizes().get(r.position() - 1);
            db.save(w);
            winners.add(w);
        }
        winners.stream().sorted(Comparator.comparing(w -> w.student.id)).forEach(w -> {
            identity.locked(w.student.id);
            if (w.reward > 0)
                request(w.student, "PREMIO", "prize:" + c.id + ":" + w.position, w.reward, c.id, semester);
            progression.recalculate(w.student.id);
            progression.notify(w.student.account, "PREMIACAO", "Destaque do semestre",
                    "Você terminou em " + w.position + "º lugar no semestre " + semester + ".", c.id);
        });
        events.publishEvent(new GamificationEvents.SemesterClosed(institutionId, semester));
    }
}
