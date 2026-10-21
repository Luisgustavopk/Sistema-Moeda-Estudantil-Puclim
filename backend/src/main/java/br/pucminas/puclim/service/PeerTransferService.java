package br.pucminas.puclim.service;

import java.time.Clock;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.dto.request.PeerTransferRequests.Policy;
import br.pucminas.puclim.dto.request.PeerTransferRequests.Review;
import br.pucminas.puclim.dto.request.PeerTransferRequests.Transfer;
import br.pucminas.puclim.dto.response.PeerTransferResponses.Group;
import br.pucminas.puclim.dto.response.PeerTransferResponses.Member;
import br.pucminas.puclim.dto.response.PeerTransferResponses.Overview;
import br.pucminas.puclim.dto.response.PeerTransferResponses.Request;
import br.pucminas.puclim.entity.Account;
import br.pucminas.puclim.entity.PeerTransferPolicy;
import br.pucminas.puclim.entity.PeerTransferRequest;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.entity.Teacher;
import br.pucminas.puclim.entity.TeacherStudentLink;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

@Service
@Transactional(isolation = Isolation.READ_COMMITTED)
public class PeerTransferService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final FinancialService finance;
    private final ProgressionService notices;
    private final Clock clock;

    public PeerTransferService(GamificationRepository db, AccountService identity, FinancialService finance,
            ProgressionService notices, Clock clock) {
        this.db = db;
        this.identity = identity;
        this.finance = finance;
        this.notices = notices;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public Overview overview() {
        Account actor = academic();
        List<Group> groups;
        List<Member> available = List.of();
        List<PeerTransferRequest> requests;
        if (actor.role.equals("PROFESSOR")) {
            Teacher teacher = db.get(Teacher.class, actor.id);
            groups = List.of(group(teacher, false));
            available = db.list(Student.class,
                    "select s from Student s where s.institution.id=:i and s.account.active=true order by s.account.name, s.id",
                    "i", teacher.institution.id).stream().map(this::member).toList();
            requests = db.list(PeerTransferRequest.class,
                    "select r from PeerTransferRequest r where r.teacher.id=:id order by r.createdAt desc, r.id",
                    "id", actor.id);
        } else {
            groups = db.list(TeacherStudentLink.class,
                    "select l from TeacherStudentLink l where l.student.id=:id and l.active=true and l.teacher.account.active=true order by l.teacher.account.name, l.teacher.id",
                    "id", actor.id).stream().map(l -> group(l.teacher, true)).toList();
            requests = db.list(PeerTransferRequest.class,
                    "select r from PeerTransferRequest r where r.sender.id=:id or r.recipient.id=:id order by r.createdAt desc, r.id",
                    "id", actor.id);
        }
        return new Overview(groups, available, requests.stream().map(this::view).toList());
    }

    public void policy(Policy input) {
        Account teacher = identity.require("PROFESSOR");
        identity.locked(teacher.id);
        PeerTransferPolicy policy = db.optional(PeerTransferPolicy.class, teacher.id);
        if (policy == null) {
            policy = new PeerTransferPolicy();
            policy.teacherId = teacher.id;
            policy.criteria = input.criteria().trim();
            db.save(policy);
        } else {
            policy.criteria = input.criteria().trim();
        }
    }

    public void link(String studentId, boolean active) {
        Account actor = identity.require("PROFESSOR");
        finance.lockAccounts(actor.id, studentId);
        Teacher teacher = db.get(Teacher.class, actor.id);
        Student student = db.get(Student.class, studentId);
        if (!teacher.institution.id.equals(student.institution.id))
            throw ApiException.bad("O aluno deve pertencer à mesma instituição do professor.");
        if (active && !student.account.active)
            throw new ApiException(409, "Aluno desativado.");
        TeacherStudentLink link = linkFor(teacher.id, student.id);
        if (!active && !db.list(PeerTransferRequest.class,
                "select r from PeerTransferRequest r where r.teacher.id=:t and r.status='PENDENTE' and (r.sender.id=:s or r.recipient.id=:s)",
                "t", teacher.id, "s", student.id).isEmpty())
            throw new ApiException(409, "Analise as solicitações pendentes deste aluno antes de remover o vínculo.");
        if (link == null && active) {
            link = new TeacherStudentLink();
            link.teacher = teacher;
            link.student = student;
            db.save(link);
        } else if (link != null) {
            link.active = active;
        }
    }

    public Request request(Transfer input, String key) {
        Account actor = identity.require("ALUNO");
        if (key == null || !key.matches("[a-zA-Z0-9._:-]{8,80}"))
            throw ApiException.bad("Envie uma Idempotency-Key válida (8 a 80 caracteres).");
        if (actor.id.equals(input.recipientId()))
            throw ApiException.bad("Escolha outro aluno para receber as moedas.");
        // Every mutation locks accounts in the same order, before request/link rows.
        // The teacher lock also serializes criteria and membership changes.
        finance.lockAccounts(actor.id, input.recipientId(), input.teacherId());
        PeerTransferRequest old = db.first(PeerTransferRequest.class,
                "select r from PeerTransferRequest r where r.sender.id=:s and r.requestKey=:k",
                "s", actor.id, "k", key).orElse(null);
        if (old != null) {
            if (!old.teacher.id.equals(input.teacherId()) || !old.recipient.id.equals(input.recipientId())
                    || old.amount != input.amount() || !old.reason.equals(input.reason().trim())
                    || !old.criteria.equals(input.criteria().trim()))
                throw new ApiException(409, "A chave já foi usada com dados diferentes.");
            return view(old);
        }
        PeerTransferRequest request = new PeerTransferRequest();
        request.sender = db.get(Student.class, actor.id);
        request.recipient = db.get(Student.class, input.recipientId());
        request.teacher = db.get(Teacher.class, input.teacherId());
        validateMembers(request);
        PeerTransferPolicy policy = db.optional(PeerTransferPolicy.class, request.teacher.id);
        if (policy == null)
            throw new ApiException(409, "O professor precisa publicar os critérios antes de receber solicitações.");
        if (!policy.criteria.equals(input.criteria().trim()))
            throw new ApiException(409, "Os critérios foram atualizados. Leia os novos critérios e tente novamente.");
        if (request.sender.account.balance < input.amount())
            throw new ApiException(409, "Saldo insuficiente para solicitar esta transferência.");
        request.amount = input.amount();
        request.reason = input.reason().trim();
        request.criteria = policy.criteria;
        request.requestKey = key;
        request.createdAt = clock.instant();
        db.save(request);
        notices.notify(request.teacher.account, "TRANSFERENCIA_ALUNOS", "Transferência aguardando análise",
                request.sender.account.name + " solicitou enviar " + request.amount + " moedas para "
                        + request.recipient.account.name + ".",
                request.id);
        return view(request);
    }

    public Request review(String id, Review input) {
        Account actor = identity.require("PROFESSOR");
        PeerTransferRequest initial = db.get(PeerTransferRequest.class, id);
        if (!initial.teacher.id.equals(actor.id))
            throw ApiException.forbidden();
        var accounts = finance.lockAccounts(actor.id, initial.sender.id, initial.recipient.id);
        PeerTransferRequest request = db.lock(PeerTransferRequest.class, id);
        String status = input.approve() ? "APROVADA" : "REJEITADA";
        if (!request.status.equals("PENDENTE")) {
            if (request.status.equals(status) && Objects.equals(request.feedback, input.feedback().trim()))
                return view(request);
            throw new ApiException(409, "Esta solicitação já foi analisada.");
        }
        if (input.approve()) {
            validateMembers(request);
            Account sender = accounts.get(request.sender.id), recipient = accounts.get(request.recipient.id);
            // Separate kinds prevent circulating coins from generating merit, ranking or
            // bonus rewards.
            finance.entry(sender, "TRANSF_ENVIO", -request.amount, "Transferência para aluno",
                    recipient.name, request.reason, request.id);
            finance.entry(recipient, "TRANSF_ENTRADA", request.amount, "Transferência de aluno",
                    sender.name, request.reason, request.id);
        }
        request.status = status;
        request.feedback = input.feedback().trim();
        request.reviewedAt = clock.instant();
        for (Account student : List.of(request.sender.account, request.recipient.account))
            notices.notify(student, "TRANSFERENCIA_ALUNOS",
                    "Transferência " + status.toLowerCase(java.util.Locale.ROOT),
                    actor.name + ": " + request.feedback, request.id);
        return view(request);
    }

    private void validateMembers(PeerTransferRequest request) {
        Teacher teacher = request.teacher;
        if (!teacher.account.active || !request.sender.account.active || !request.recipient.account.active)
            throw new ApiException(409, "Todos os participantes devem estar ativos.");
        for (Student student : List.of(request.sender, request.recipient)) {
            TeacherStudentLink link = linkFor(teacher.id, student.id);
            if (!teacher.institution.id.equals(student.institution.id) || link == null || !link.active)
                throw ApiException
                        .bad("Os dois alunos precisam estar vinculados ao professor responsável na mesma instituição.");
        }
    }

    private TeacherStudentLink linkFor(String teacherId, String studentId) {
        return db.first(TeacherStudentLink.class,
                "select l from TeacherStudentLink l where l.teacher.id=:t and l.student.id=:s",
                "t", teacherId, "s", studentId).orElse(null);
    }

    private Account academic() {
        Account actor = identity.current();
        if (!List.of("ALUNO", "PROFESSOR").contains(actor.role))
            throw ApiException.forbidden();
        return actor;
    }

    private Group group(Teacher teacher, boolean activeOnly) {
        PeerTransferPolicy policy = db.optional(PeerTransferPolicy.class, teacher.id);
        var members = db.list(TeacherStudentLink.class,
                "select l from TeacherStudentLink l where l.teacher.id=:t and l.active=true order by l.student.account.name, l.student.id",
                "t", teacher.id).stream().map(l -> l.student)
                .filter(s -> !activeOnly || s.account.active).map(this::member).toList();
        return new Group(teacher.id, teacher.account.name, policy == null ? null : policy.criteria, members);
    }

    private Member member(Student student) {
        return new Member(student.id, student.account.name, student.course, student.account.active);
    }

    private Request view(PeerTransferRequest r) {
        return new Request(r.id, r.teacher.id, r.teacher.account.name, r.sender.id, r.sender.account.name,
                r.recipient.id, r.recipient.account.name, r.amount, r.reason, r.criteria, r.status, r.feedback,
                r.createdAt, r.reviewedAt);
    }
}
