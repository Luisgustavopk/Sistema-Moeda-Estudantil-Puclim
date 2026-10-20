package br.pucminas.puclim.service;

import br.pucminas.puclim.dto.request.TransferRequest;
import br.pucminas.puclim.dto.response.CouponResponse;
import br.pucminas.puclim.dto.response.TransactionResponse;

import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.repository.*;
import br.pucminas.puclim.mapper.DomainMapper;
import br.pucminas.puclim.exception.ApiException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.time.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
@Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class FinancialService {
    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;
    private final AccountService identity;
    private final StudentRepository students;
    private final TeacherRepository teachers;
    private final AdvantageRepository advantages;
    private final CouponRepository coupons;
    private final LedgerEntryRepository ledger;
    private final SemesterCreditRepository credits;
    private final OperationRepository operations;
    private final OutboxService outbox;
    private final org.springframework.context.ApplicationEventPublisher events;

    public FinancialService(AccountService i, StudentRepository s, TeacherRepository t, AdvantageRepository v,
            CouponRepository c, LedgerEntryRepository l, SemesterCreditRepository sc, OperationRepository o,
            OutboxService n, org.springframework.context.ApplicationEventPublisher events) {
        identity = i;
        students = s;
        teachers = t;
        advantages = v;
        coupons = c;
        ledger = l;
        credits = sc;
        operations = o;
        outbox = n;
        this.events = events;
    }

    public Map<String, Account> lockAccounts(String... ids) {
        Map<String, Account> result = new HashMap<>();
        Arrays.stream(ids).distinct().sorted().forEach(id -> result.put(id, identity.locked(id)));
        return result;
    }

    private void addBalance(Account account, long amount) {
        long value;
        try {
            value = Math.addExact(account.balance, amount);
        } catch (ArithmeticException e) {
            throw ApiException.bad("Saldo acima do limite suportado.");
        }
        if (value < 0)
            throw new ApiException(409, "Saldo insuficiente.");
        if (value > 9007199254740991L)
            throw new ApiException(409, "Saldo acima do limite suportado.");
        account.balance = value;
    }

    public LedgerEntry entry(Account account, String kind, long amount, String description, String counterpart,
            String reason, String operationId) {
        addBalance(account, amount);
        LedgerEntry e = new LedgerEntry();
        e.account = account;
        e.kind = kind;
        e.amount = amount;
        e.description = description;
        e.counterpart = counterpart;
        e.reason = reason;
        e.operationId = operationId;
        return ledger.save(e);
    }

    private String fingerprint(String... parts) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            for (String p : parts) {
                byte[] bytes = p.getBytes(StandardCharsets.UTF_8);
                digest.update(java.nio.ByteBuffer.allocate(4).putInt(bytes.length).array());
                digest.update(bytes);
            }
            return HexFormat.of().formatHex(digest.digest());
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private Operation existing(Account owner, String key, String fingerprint) {
        if (key == null || !key.matches("[a-zA-Z0-9._:-]{8,80}"))
            throw ApiException.bad("Envie uma Idempotency-Key válida (8 a 80 caracteres).");
        Operation operation = operations.findByAccountIdAndRequestKey(owner.id, key).orElse(null);
        if (operation != null && !operation.fingerprint.equals(fingerprint))
            throw new ApiException(409, "A chave já foi usada com dados diferentes.");
        return operation;
    }

    private void remember(Account owner, String key, String fingerprint, String kind, String id) {
        Operation o = new Operation();
        o.account = owner;
        o.requestKey = key;
        o.fingerprint = fingerprint;
        o.kind = kind;
        o.resultId = id;
        operations.save(o);
    }

    public TransactionResponse transfer(TransferRequest input, String key) {
        Account authenticated = identity.require("PROFESSOR");
        if (input.amount() == null || input.amount() <= 0 || input.reason() == null || input.reason().isBlank())
            throw ApiException.bad("Quantidade positiva e motivo são obrigatórios.");
        Student student = students.findById(input.studentId()).orElseThrow(ApiException::missing);
        var locked = lockAccounts(authenticated.id, student.id);
        Account source = locked.get(authenticated.id), target = locked.get(student.id);
        if (!source.active || !target.active)
            throw new ApiException(409, "Conta desativada.");
        String fp = fingerprint("TRANSFER", student.id, input.amount().toString(), input.reason().trim());
        Operation old = existing(source, key, fp);
        if (old != null)
            return DomainMapper.transaction(ledger.findById(old.resultId).orElseThrow(ApiException::missing));
        String operationId = UUID.randomUUID().toString();
        LedgerEntry sent = entry(source, "ENVIO", -input.amount(), "Reconhecimento enviado", target.name,
                input.reason().trim(), operationId);
        entry(target, "RECEBIMENTO", input.amount(), "Reconhecimento recebido", source.name, input.reason().trim(),
                operationId);
        outbox.enqueue(target, "Você recebeu moedas no Puclim",
                source.name + " enviou " + input.amount() + " moedas.\nMotivo: " + input.reason().trim());
        remember(source, key, fp, "TRANSFER", sent.id);
        events.publishEvent(new GamificationEvents.CoinsReceived(student.id, operationId, input.amount(), true));
        return DomainMapper.transaction(sent);
    }

    public CouponResponse redeem(String id, String key) {
        Account authenticated = identity.require("ALUNO");
        Advantage initial = advantages.findById(id).orElseThrow(ApiException::missing);
        var locked = lockAccounts(authenticated.id, initial.company.id);
        Account studentAccount = locked.get(authenticated.id), companyAccount = locked.get(initial.company.id);
        String fp = fingerprint("REDEEM", id);
        Operation old = existing(studentAccount, key, fp);
        if (old != null)
            return DomainMapper.coupon(coupons.findById(old.resultId).orElseThrow(ApiException::missing));
        Advantage advantage = advantages.lock(id).orElseThrow(ApiException::missing);
        entityManager.refresh(advantage, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!studentAccount.active || !companyAccount.active || !advantage.active)
            throw new ApiException(409, "Vantagem indisponível.");
        Student student = students.findById(studentAccount.id).orElseThrow(ApiException::missing);
        Coupon c = new Coupon();
        c.advantage = advantage;
        c.student = student;
        c.company = advantage.company;
        c.advantageName = advantage.name;
        c.companyName = companyAccount.name;
        c.studentName = studentAccount.name;
        c.cost = advantage.cost;
        entry(studentAccount, "RESGATE", -c.cost, c.advantageName, c.companyName, null, c.id);
        coupons.save(c);
        remember(studentAccount, key, fp, "REDEEM", c.id);
        String detail = "Vantagem: " + c.advantageName + "\nEmpresa: " + c.companyName + "\nCódigo: " + c.code
                + "\nData: " + c.date
                + "\nApresente este código no atendimento da empresa. O cupom pode ser utilizado uma única vez.";
        outbox.enqueue(studentAccount, "Seu cupom Puclim", detail);
        outbox.enqueue(companyAccount, "Novo resgate no Puclim", "Aluno: " + c.studentName + "\n" + detail);
        events.publishEvent(new GamificationEvents.AdvantageRedeemed(student.id, c.id));
        return DomainMapper.coupon(c);
    }

    public boolean creditSemester(String teacherId, String semester) {
        if (!semester.matches("[0-9]{4}-[12]"))
            throw ApiException.bad("Semestre inválido.");
        Account account = identity.locked(teacherId);
        Teacher teacher = teachers.findById(teacherId).orElseThrow(ApiException::missing);
        if (!account.active || credits.existsByTeacherIdAndSemester(teacherId, semester))
            return false;
        SemesterCredit credit = new SemesterCredit();
        credit.teacher = teacher;
        credit.semester = semester;
        credits.save(credit);
        entry(account, "COTA", 1000, "Cota semestral " + semester, null, null, credit.id);
        return true;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> transactions() {
        Account a = identity.current();
        if (a.role.equals("EMPRESA"))
            throw ApiException.forbidden();
        return ledger.findByAccountIdOrderByDateDesc(a.id).stream().map(DomainMapper::transaction).toList();
    }

    @Transactional(readOnly = true)
    public List<CouponResponse> coupons() {
        Account a = identity.current();
        if (a.role.equals("ALUNO"))
            return coupons.findByStudentIdOrderByDateDesc(a.id).stream().map(DomainMapper::coupon).toList();
        Partner p = identity.requirePartner("EMPRESA");
        return coupons.findByCompanyIdOrderByDateDesc(p.id).stream().map(DomainMapper::coupon).toList();
    }

    @Transactional(readOnly = true)
    public CouponResponse checkCoupon(String code) {
        Partner p = identity.requirePartner("EMPRESA");
        Coupon c = coupons.findByCode(code.toUpperCase(Locale.ROOT)).orElseThrow(ApiException::missing);
        if (!c.company.id.equals(p.id))
            throw ApiException.forbidden();
        return DomainMapper.coupon(c);
    }

    public CouponResponse useCoupon(String code) {
        Partner p = identity.requirePartner("EMPRESA");
        Coupon c = coupons.lockByCode(code.toUpperCase(Locale.ROOT)).orElseThrow(ApiException::missing);
        if (!c.company.id.equals(p.id))
            throw ApiException.forbidden();
        if (!c.status.equals("VALIDO"))
            throw new ApiException(409, "Cupom já utilizado.");
        c.status = "UTILIZADO";
        c.usedAt = Instant.now();
        return DomainMapper.coupon(c);
    }
}
