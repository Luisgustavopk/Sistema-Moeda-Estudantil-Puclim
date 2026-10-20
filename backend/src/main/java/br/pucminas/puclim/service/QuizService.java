package br.pucminas.puclim.service;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.config.GamificationPolicy;
import br.pucminas.puclim.dto.request.GamificationRequests;
import br.pucminas.puclim.dto.response.GamificationResponses;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.QuizAttempt;
import br.pucminas.puclim.entity.QuizItem;
import br.pucminas.puclim.entity.QuizQuestion;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.entity.StudentProgress;
import br.pucminas.puclim.entity.Teacher;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class QuizService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final ProgressionService progression;
    private final GamificationPolicy policy;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    public QuizService(GamificationRepository db, AccountService identity, ProgressionService progression,
            GamificationPolicy policy, ApplicationEventPublisher events, Clock clock) {
        this.db = db;
        this.identity = identity;
        this.progression = progression;
        this.policy = policy;
        this.events = events;
        this.clock = clock;
    }

    public List<GamificationResponses.Question> questions() {
        Account a = identity.require("PROFESSOR");
        return db.list(QuizQuestion.class, "select q from QuizQuestion q where q.teacher.id=:t order by q.area,q.id",
                "t", a.id).stream().map(this::questionView).toList();
    }

    private GamificationResponses.Question questionView(QuizQuestion q) {
        return new GamificationResponses.Question(q.id, q.prompt, q.area, List.copyOf(q.options), q.correctIndex,
                q.active);
    }

    public GamificationResponses.Question saveQuestion(String id, GamificationRequests.Question input) {
        Account a = identity.require("PROFESSOR");
        identity.locked(a.id);
        if (input.correctIndex() >= input.options().size()
                || input.options().stream().map(option -> option.trim()).distinct().count() != input.options().size())
            throw ApiException.bad("Informe alternativas distintas e uma única resposta correta.");
        QuizQuestion q;
        if (id == null) {
            q = new QuizQuestion();
            q.teacher = db.get(Teacher.class, a.id);
        } else {
            q = db.lock(QuizQuestion.class, id);
            if (!q.teacher.id.equals(a.id))
                throw ApiException.forbidden();
        }
        q.prompt = input.prompt().trim();
        q.area = input.area().trim();
        q.options.clear();
        q.options.addAll(input.options().stream().map(option -> option.trim()).toList());
        q.correctIndex = input.correctIndex();
        q.active = input.active();
        if (id == null) db.save(q);
        return questionView(q);
    }

    public void deleteQuestion(String id) {
        Account a = identity.require("PROFESSOR");
        identity.locked(a.id);
        QuizQuestion q = db.lock(QuizQuestion.class, id);
        if (!q.teacher.id.equals(a.id))
            throw ApiException.forbidden();
        q.active = false;
    }

    public GamificationResponses.Quiz start() {
        Account a = identity.require("ALUNO");
        identity.locked(a.id);
        Student student = db.get(Student.class, a.id);
        LocalDate today = progression.today();
        QuizAttempt old = db.first(QuizAttempt.class, "select q from QuizAttempt q where q.student.id=:s and q.day=:d",
                "s", a.id, "d", today).orElse(null);
        if (old != null)
            return quizView(old);
        var available = new ArrayList<>(db.list(QuizQuestion.class,
                "select q from QuizQuestion q where q.active=true and q.teacher.account.active=true and q.teacher.institution.id=:i",
                "i", student.institution.id));
        Collections.shuffle(available);
        if (available.size() < policy.getQuizSize())
            throw new ApiException(409, "A instituição ainda não tem perguntas suficientes para o quiz diário.");
        var selected = available.subList(0, policy.getQuizSize()).stream().sorted(Comparator.comparing(q -> q.id))
                .toList();
        QuizAttempt attempt = new QuizAttempt();
        attempt.student = student;
        attempt.day = today;
        db.save(attempt);
        int position = 0;
        for (QuizQuestion chosen : selected) {
            QuizQuestion q = db.lock(QuizQuestion.class, chosen.id);
            if (!q.active)
                throw new ApiException(409, "O banco de perguntas mudou. Tente iniciar novamente.");
            QuizItem item = new QuizItem();
            item.attempt = attempt;
            item.position = position++;
            item.prompt = q.prompt;
            item.area = q.area;
            item.options.addAll(q.options);
            item.correctIndex = q.correctIndex;
            attempt.items.add(item);
            db.save(item);
        }
        return quizView(attempt);
    }

    public GamificationResponses.Quiz submit(String id, GamificationRequests.Answers input) {
        Account a = identity.require("ALUNO");
        identity.locked(a.id);
        QuizAttempt q = db.lock(QuizAttempt.class, id);
        if (!q.student.id.equals(a.id))
            throw ApiException.forbidden();
        if (input.answers().size() != q.items.size())
            throw ApiException.bad("Responda todas as perguntas.");
        if (q.completedAt != null) {
            for (int i = 0; i < q.items.size(); i++)
                if (!Objects.equals(q.items.get(i).selectedIndex, input.answers().get(i)))
                    throw new ApiException(409, "O quiz já foi concluído com outras respostas.");
            return quizView(q);
        }
        if (!q.day.equals(progression.today()))
            throw new ApiException(409, "Este quiz expirou. Inicie o quiz de hoje.");
        int correct = 0;
        for (int i = 0; i < q.items.size(); i++) {
            QuizItem item = q.items.get(i);
            int answer = input.answers().get(i);
            if (answer < 0 || answer >= item.options.size())
                throw ApiException.bad("Alternativa inválida.");
            item.selectedIndex = answer;
            if (answer == item.correctIndex)
                correct++;
        }
        q.correctCount = correct;
        q.completedAt = clock.instant().truncatedTo(java.time.temporal.ChronoUnit.MICROS);
        StudentProgress p = progression.progress(a.id);
        p.streak = q.day.minusDays(1).equals(p.lastQuiz) ? p.streak + 1 : 1;
        p.bestStreak = Math.max(p.bestStreak, p.streak);
        p.lastQuiz = q.day;
        q.streak = p.streak;
        if (correct == q.items.size())
            p.perfectQuiz = q.day;
        events.publishEvent(new GamificationEvents.StreakUpdated(a.id, p.streak));
        events.publishEvent(new GamificationEvents.QuizCompleted(a.id, q.id));
        return quizView(q);
    }

    public GamificationResponses.QuizStatus status() {
        Account a = identity.require("ALUNO");
        identity.locked(a.id);
        StudentProgress p = progression.progress(a.id);
        List<QuizAttempt> all = db.list(QuizAttempt.class,
                "select q from QuizAttempt q where q.student.id=:s order by q.day desc", "s", a.id);
        QuizAttempt today = all.stream().filter(q -> q.day.equals(progression.today())).findFirst().orElse(null);
        int streak = progression.activeStreak(p);
        Instant next = today != null && today.completedAt != null
                ? progression.today().plusDays(1).atStartOfDay(ZoneId.of("America/Sao_Paulo")).toInstant()
                : clock.instant();
        return new GamificationResponses.QuizStatus(streak, p.bestStreak, 7 - streak % 7, next,
                today == null ? null : quizView(today),
                all.stream().filter(q -> q.completedAt != null).map(this::quizView).toList());
    }

    private GamificationResponses.Quiz quizView(QuizAttempt q) {
        boolean done = q.completedAt != null;
        return new GamificationResponses.Quiz(q.id, q.day, q.completedAt, q.correctCount,
                done ? q.items.size() - q.correctCount : 0, done ? 10.0 * q.correctCount / q.items.size() : 0, q.streak,
                q.items.stream().map(i -> new GamificationResponses.Item(i.id, i.prompt, i.area, List.copyOf(i.options),
                        done ? i.correctIndex : null, done ? i.selectedIndex : null)).toList());
    }
}
