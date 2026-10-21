package br.pucminas.puclim.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.config.GamificationPolicy;
import br.pucminas.puclim.dto.response.GamificationResponses.Badge;
import br.pucminas.puclim.dto.response.GamificationResponses.LevelChange;
import br.pucminas.puclim.dto.response.GamificationResponses.Notice;
import br.pucminas.puclim.dto.response.GamificationResponses.Profile;
import br.pucminas.puclim.dto.response.GamificationResponses.Rank;
import br.pucminas.puclim.dto.response.GamificationResponses.Ranking;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.Partner;
import br.pucminas.puclim.entity.BadgeAward;
import br.pucminas.puclim.entity.BadgeDefinition;
import br.pucminas.puclim.entity.InboxNotification;
import br.pucminas.puclim.entity.LevelHistory;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.entity.StudentProgress;
import br.pucminas.puclim.entity.Teacher;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class ProgressionService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final GamificationPolicy policy;
    private final Clock clock;
    private final ApplicationEventPublisher events;

    public ProgressionService(GamificationRepository db, AccountService identity, GamificationPolicy policy,
            Clock clock, ApplicationEventPublisher events) {
        this.db = db;
        this.identity = identity;
        this.policy = policy;
        this.clock = clock;
        this.events = events;
    }

    public LocalDate today() {
        return LocalDate.now(clock.withZone(ZoneId.of("America/Sao_Paulo")));
    }

    public String semester() {
        return GamificationPolicy.semester(today());
    }

    public StudentProgress progress(String id) {
        StudentProgress p = db.optional(StudentProgress.class, id);
        if (p == null) {
            p = new StudentProgress();
            p.student = db.get(Student.class, id);
            p.id = id;
            db.save(p);
        }
        return p;
    }

    public int activeStreak(StudentProgress p) {
        return p.lastQuiz != null && !p.lastQuiz.isBefore(today().minusDays(1)) ? p.streak : 0;
    }

    public long total(String id) {
        return db.first(Long.class,
                "select coalesce(sum(e.amount),0) from LedgerEntry e where e.account.id=:id and e.amount>0 and e.kind in ('RECEBIMENTO','MISSAO','BONUS','RECOMPENSA','PREMIO')",
                "id", id).orElse(0L);
    }

    public void notify(Account account, String type, String title, String message, String ref) {
        InboxNotification n = new InboxNotification();
        n.account = account;
        n.type = type;
        n.title = title;
        n.message = message;
        n.referenceId = ref;
        n.date = clock.instant();
        db.save(n);
    }

    public void recalculate(String studentId) {
        // The caller holds the student's account lock. Creation and awards are
        // serialized by that lock.
        StudentProgress p = progress(studentId);
        long total = total(studentId);
        int level = policy.level(total);
        while (p.level < level) {
            p.level++;
            LevelHistory h = new LevelHistory();
            h.student = p.student;
            h.level = p.level;
            h.total = total;
            h.date = clock.instant();
            db.save(h);
            events.publishEvent(new GamificationEvents.LevelReached(studentId, p.level));
        }
        for (BadgeDefinition badge : db.list(BadgeDefinition.class, "select b from BadgeDefinition b order by b.id")) {
            if (badgeProgress(p, badge.criterion, total) >= badge.target
                    && db.first(BadgeAward.class, "select a from BadgeAward a where a.student.id=:s and a.badge.id=:b",
                            "s", studentId, "b", badge.id).isEmpty()) {
                BadgeAward a = new BadgeAward();
                a.student = p.student;
                a.badge = badge;
                a.date = clock.instant();
                db.save(a);
                events.publishEvent(new GamificationEvents.BadgeUnlocked(studentId, badge.id));
            }
        }
    }

    private long badgeProgress(StudentProgress p, String criterion, long total) {
        return switch (criterion) {
            case "COINS" -> total;
            case "STREAK" -> p.bestStreak;
            case "REDEMPTIONS" ->
                db.first(Long.class, "select count(c) from Coupon c where c.student.id=:s", "s", p.id).orElse(0L);
            case "DONATIONS" ->
                db.first(Long.class, "select count(d) from CouponDonation d where d.coupon.student.id=:s", "s", p.id)
                        .orElse(0L);
            case "TOP3" ->
                db.first(Long.class, "select count(w) from SemesterWinner w where w.student.id=:s", "s", p.id)
                        .orElse(0L);
            default -> 0L;
        };
    }

    public Profile profile(String requested) {
        Account viewer = identity.current();
        if (!Set.of("ALUNO", "PROFESSOR").contains(viewer.role))
            throw ApiException.forbidden();
        String id = requested == null ? identity.require("ALUNO").id : requested;
        Student student = db.get(Student.class, id);
        if (!student.account.active)
            throw ApiException.missing();
        // Only authenticated students and teachers can view this allowlisted public projection.
        identity.locked(id);
        recalculate(id); // also brings legacy receipts into the new progression model
        StudentProgress p = progress(id);
        long total = total(id);
        int level = p.level;
        Long next = level < policy.getLevels().size() ? policy.getLevels().get(level) : null;
        long start = policy.getLevels().get(Math.min(level - 1, policy.getLevels().size() - 1));
        int percent = next == null ? 100 : (int) Math.min(100, (total - start) * 100 / (next - start));
        List<Badge> badges = db.list(BadgeDefinition.class, "select b from BadgeDefinition b order by b.target,b.id")
                .stream().map(b -> {
                    var award = db.first(BadgeAward.class,
                            "select a from BadgeAward a where a.student.id=:s and a.badge.id=:b", "s", id, "b", b.id);
                    return new Badge(b.id, b.name, b.description, b.criterion, b.rarity, b.icon, b.target,
                            Math.min(b.target, badgeProgress(p, b.criterion, total)),
                            award.map(a -> a.date).orElse(null));
                }).toList();
        List<Rank> coins = rankRows(student.institution.id, semester(), "MOEDAS");
        List<Rank> streak = rankRows(student.institution.id, semester(), "STREAK");
        return new Profile(id, student.account.name, student.course, student.institution.account.name, level, total,
                next, start, percent, activeStreak(p), p.bestStreak,
                position(coins, id), position(streak, id), badges,
                db.list(LevelHistory.class, "select h from LevelHistory h where h.student.id=:s order by h.level", "s",
                        id).stream().map(h -> new LevelChange(h.level, h.total, h.date)).toList());
    }

    private Integer position(List<Rank> rows, String id) {
        return rows.stream().filter(r -> r.studentId().equals(id)).map(rank -> rank.position()).findFirst()
                .orElse(null);
    }

    public Ranking ranking(String institution, String semester, String type, int page, int size) {
        Account a = identity.current();
        if (!Set.of("ALUNO", "PROFESSOR").contains(a.role))
            throw ApiException.forbidden();
        String ownInstitution = a.role.equals("ALUNO") ? db.get(Student.class, a.id).institution.id
                : db.get(Teacher.class, a.id).institution.id;
        if (institution == null || institution.isBlank())
            institution = ownInstitution;
        Partner selectedInstitution = db.get(Partner.class, institution);
        if (!selectedInstitution.kind.equals("ENSINO") || !selectedInstitution.account.active)
            throw ApiException.bad("Instituição de ensino inválida.");
        if (!Set.of("MOEDAS", "STREAK").contains(type) || page < 0 || size < 1 || size > 100)
            throw ApiException.bad("Filtro ou paginação inválidos.");
        List<Rank> all = rankRows(institution, semester, type);
        int from = (int) Math.min((long) page * size, all.size());
        return new Ranking(all.subList(from, Math.min(from + size, all.size())), page, size, all.size(),
                all.stream().filter(r -> r.studentId().equals(a.id)).findFirst().orElse(null), semester, type);
    }

    public List<Rank> rankRows(String institution, String semester, String type) {
        LocalDate start = GamificationPolicy.start(semester);
        ZoneId zone = ZoneId.of("America/Sao_Paulo");
        Instant from = start.atStartOfDay(zone).toInstant(), to = start.plusMonths(6).atStartOfDay(zone).toInstant();
        var amounts = db.list(Object[].class,
                "select e.account.id,sum(e.amount),min(e.date) from LedgerEntry e where e.date>=:f and e.date<:t and e.amount>0 and e.kind in ('RECEBIMENTO','MISSAO','BONUS','RECOMPENSA','PREMIO') group by e.account.id",
                "f", from, "t", to);
        Map<String, Object[]> totals = new HashMap<>();
        amounts.forEach(row -> totals.put((String) row[0], row));
        Map<String, Integer> streaks = new HashMap<>();
        db.list(Object[].class,
                "select q.student.id,max(q.streak) from QuizAttempt q where q.day>=:f and q.day<:t and q.completedAt is not null group by q.student.id",
                "f", start, "t", start.plusMonths(6))
                .forEach(row -> streaks.put((String) row[0], ((Number) row[1]).intValue()));
        List<Rank> result = new ArrayList<>();
        for (Student s : db.list(Student.class,
                "select s from Student s join fetch s.account where s.institution.id=:i and s.account.active=true", "i",
                institution)) {
            Object[] row = totals.get(s.id);
            long received = row == null ? 0 : ((Number) row[1]).longValue();
            result.add(new Rank(0, s.id, s.account.name, s.course, s.institution.account.name, received,
                    streaks.getOrDefault(s.id, 0), policy.level(total(s.id)), row == null ? null : (Instant) row[2]));
        }
        Comparator<Rank> comparator = type.equals("STREAK") ? Comparator.comparingInt((Rank rank) -> rank.streak()).reversed()
                : Comparator.comparingLong((Rank rank) -> rank.received()).reversed()
                        .thenComparing(Comparator.comparingInt((Rank rank) -> rank.streak()).reversed());
        result.sort(comparator.thenComparing(rank -> rank.firstCoin(), Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(rank -> rank.studentId()));
        List<Rank> positioned = new ArrayList<>();
        int pos = 1;
        for (Rank r : result)
            positioned.add(new Rank(pos++, r.studentId(), r.name(), r.course(), r.institution(), r.received(),
                    r.streak(), r.level(), r.firstCoin()));
        return positioned;
    }

    public List<Notice> notices() {
        Account a = identity.current();
        return db
                .list(InboxNotification.class,
                        "select n from InboxNotification n where n.account.id=:s order by n.date desc", "s", a.id)
                .stream().map(n -> new Notice(n.id, n.type, n.title, n.message, n.date, n.readAt, n.referenceId))
                .toList();
    }

    public void readNotice(String id) {
        Account a = identity.current();
        InboxNotification n = db.lock(InboxNotification.class, id);
        if (!n.account.id.equals(a.id))
            throw ApiException.forbidden();
        if (n.readAt == null)
            n.readAt = clock.instant();
    }
}
