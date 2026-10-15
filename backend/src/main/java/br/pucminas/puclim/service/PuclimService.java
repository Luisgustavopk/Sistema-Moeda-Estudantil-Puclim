package br.pucminas.puclim.service;

import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.*;
import jakarta.servlet.http.HttpSession;
import jakarta.transaction.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PuclimService {
    private static final String SESSION_ACCOUNT = "puclim.account";
    private static final String ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    private final AccountRepository accounts;
    private final LedgerEntryRepository ledger;
    private final AdvantageRepository advantages;
    private final CouponRepository coupons;
    private final NotificationRepository notifications;
    private final PasswordEncoder encoder;

    public PuclimService(AccountRepository accounts, LedgerEntryRepository ledger, AdvantageRepository advantages,
                         CouponRepository coupons, NotificationRepository notifications, PasswordEncoder encoder) {
        this.accounts = accounts; this.ledger = ledger; this.advantages = advantages;
        this.coupons = coupons; this.notifications = notifications; this.encoder = encoder;
    }

    public Account current(HttpSession session, Account.Role... roles) {
        Object id = session.getAttribute(SESSION_ACCOUNT);
        if (id == null) throw new ApiException("Sua sessão expirou. Entre novamente.", 401);
        Account account = accounts.findById(id.toString()).filter(a -> a.active)
                .orElseThrow(() -> new ApiException("Sua sessão expirou. Entre novamente.", 401));
        if (roles.length > 0 && Arrays.stream(roles).noneMatch(r -> r == account.role))
            throw new ApiException("Você não tem permissão para esta operação.", 403);
        return account;
    }

    public void login(HttpSession session, String login, String password) {
        Account a = accounts.findByLoginIgnoreCaseOrEmailIgnoreCase(login.trim(), login.trim()).orElse(null);
        if (a == null || !a.active || !encoder.matches(password, a.passwordHash))
            throw new ApiException("Login ou senha inválidos.", 401);
        session.setAttribute(SESSION_ACCOUNT, a.id);
    }

    public Map<String, Object> account(Account a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.id); m.put("role", a.role); m.put("name", a.name); m.put("email", a.email);
        m.put("login", a.login); m.put("balance", a.balance); m.put("active", a.active);
        m.put("partnerKind", a.partnerKind); m.put("cpf", a.cpf); m.put("rg", a.rg); m.put("address", a.address);
        m.put("course", a.course); m.put("institutionId", a.institutionId); m.put("department", a.department);
        m.put("cnpj", a.cnpj); m.put("phone", a.phone); m.put("description", a.description);
        return m;
    }

    public Map<String, Object> transaction(LedgerEntry l) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", l.id); m.put("date", l.date); m.put("kind", l.kind); m.put("amount", l.amount);
        m.put("description", l.description); m.put("counterpart", Objects.toString(l.counterpart, ""));
        m.put("reason", Objects.toString(l.reason, "")); return m;
    }
    public Map<String, Object> advantage(Advantage a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", a.id); m.put("companyId", a.company.id); m.put("companyName", a.company.name);
        m.put("name", a.name); m.put("description", a.description); m.put("photo", a.photo);
        m.put("category", a.category); m.put("cost", a.cost); m.put("active", a.active); return m;
    }
    public Map<String, Object> coupon(Coupon c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.id); m.put("advantageId", c.advantage.id); m.put("code", c.code);
        m.put("studentId", c.student.id); m.put("studentName", c.studentName); m.put("companyId", c.company.id);
        m.put("companyName", c.companyName); m.put("advantageName", c.advantageName); m.put("cost", c.cost);
        m.put("date", c.date); m.put("status", c.status); m.put("usedAt", c.usedAt); return m;
    }

    @Transactional
    public Account register(Map<String, Object> input, Account.Role role) {
        Account a = new Account(); a.role = role; a.name = required(input, "name");
        a.email = required(input, "email").toLowerCase(Locale.ROOT); a.login = required(input, "login").toLowerCase(Locale.ROOT);
        a.passwordHash = encoder.encode(required(input, "password")); a.partnerKind = (String) input.get("partnerKind");
        a.cpf = (String) input.get("cpf"); a.rg = (String) input.get("rg"); a.address = (String) input.get("address");
        a.course = (String) input.get("course"); a.institutionId = (String) input.get("institutionId"); a.cnpj = (String) input.get("cnpj");
        a.phone = (String) input.get("phone"); a.description = (String) input.get("description"); return accounts.save(a);
    }
    private String required(Map<String, Object> m, String key) {
        String value = Objects.toString(m.get(key), "").trim();
        if (value.isBlank()) throw new ApiException("Preencha os campos obrigatórios."); return value;
    }

    public List<LedgerEntry> transactions(Account a, LocalDate from, LocalDate to, String type, String search) {
        Boolean incoming = null; String kind = null;
        if (type != null && !type.isBlank()) {
            String value = type.trim().toUpperCase(Locale.ROOT);
            if (value.equals("ENTRADAS")) incoming = true;
            else if (value.equals("SAIDAS")) incoming = false;
            else try { kind = LedgerEntryKind.valueOf(value).name(); }
            catch (Exception e) { throw new ApiException("Tipo de movimentação inválido."); }
        }
        if (from != null && to != null && from.isAfter(to))
            throw new ApiException("A data inicial deve ser anterior ou igual à data final.");
        ZoneId zone = ZoneId.of("America/Sao_Paulo");
        Instant start = from == null ? null : from.atStartOfDay(zone).toInstant();
        Instant end = to == null ? null : to.plusDays(1).atStartOfDay(zone).toInstant();
        String query = search == null || search.isBlank() ? null : search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_").toLowerCase(Locale.ROOT);
        return ledger.search(a.id, start, end, kind, incoming, query);
    }
    public List<Advantage> advantages(Account account) { return advantages.findByCompanyIdOrderByNameAsc(account.id); }
    public List<Advantage> advantagesPublic() { return advantages.findByActiveTrueOrderByNameAsc().stream().filter(a -> a.company.active).toList(); }
    public List<Account> students() { return accounts.findByRoleAndActiveTrue(Account.Role.ALUNO); }
    public List<Coupon> coupons(Account account) { return account.role == Account.Role.ALUNO ? coupons.findByStudentIdOrderByDateDesc(account.id) : coupons.findByCompanyIdOrderByDateDesc(account.id); }
    @Transactional public Account updateProfile(HttpSession session, Map<String, Object> input) {
        Account a = current(session); a.name = required(input, "name"); a.email = required(input, "email").toLowerCase(Locale.ROOT);
        if (a.role == Account.Role.ALUNO) { a.address = (String) input.get("address"); a.course = (String) input.get("course"); }
        if (a.role == Account.Role.EMPRESA) { a.phone = (String) input.get("phone"); a.description = (String) input.get("description"); }
        return accounts.save(a);
    }
    public List<Account> institutions() { return accounts.findByRoleAndActiveTrue(Account.Role.EMPRESA).stream().filter(a -> "ENSINO".equals(a.partnerKind)).toList(); }
    public List<Account> teachers(HttpSession session) { Account institution = current(session, Account.Role.EMPRESA); if (!"ENSINO".equals(institution.partnerKind)) throw new ApiException("Acesso disponível apenas à instituição de ensino.", 403); return accounts.findByRoleAndActiveTrue(Account.Role.PROFESSOR).stream().filter(a -> institution.id.equals(a.institutionId)).toList(); }
    public enum LedgerEntryKind { COTA, ENVIO, RECEBIMENTO, RESGATE }

    @Transactional
    public Coupon redeem(HttpSession session, String id, String expectedCost) {
        Account student = current(session, Account.Role.ALUNO);
        Advantage a = advantages.findById(id).filter(v -> v.active && v.company.active)
                .orElseThrow(() -> new ApiException("Esta vantagem não está mais disponível.", 404));
        if (expectedCost != null && !expectedCost.equals(Long.toString(a.cost)))
            throw new ApiException("O custo da vantagem mudou. Confirme novamente.", 409);
        Account locked = accounts.lockById(student.id).orElseThrow();
        if (locked.balance < a.cost) throw new ApiException("Saldo insuficiente.", 409);
        locked.balance -= a.cost;
        ledger.save(entry(locked, "RESGATE", -a.cost, a.name, a.company.name, null));
        Coupon c = new Coupon(); c.advantage = a; c.student = locked; c.company = a.company;
        c.studentName = locked.name; c.companyName = a.company.name; c.advantageName = a.name; c.cost = a.cost; c.code = code();
        coupons.save(c); notify(locked, "Seu cupom está pronto", a.name + " · " + a.company.name + " · Código: " + c.code + ". Apresente este código no atendimento.");
        notify(a.company, "Um novo resgate por aqui", locked.name + " resgatou " + a.name + ". Código: " + c.code + "."); return c;
    }
    private String code() {
        for (int i = 0; i < 20; i++) { StringBuilder b = new StringBuilder("PCL-"); for (int j = 0; j < 8; j++) b.append(ALPHABET.charAt(ThreadLocalRandom.current().nextInt(ALPHABET.length()))); if (coupons.findByCodeIgnoreCase(b.toString()).isEmpty()) return b.toString(); }
        throw new ApiException("Não foi possível gerar o código do cupom.", 409);
    }
    private LedgerEntry entry(Account a, String kind, long amount, String description, String counterpart, String reason) { LedgerEntry e = new LedgerEntry(); e.account = a; e.kind = kind; e.amount = amount; e.description = description; e.counterpart = counterpart; e.reason = reason; return e; }
    public void notify(Account a, String subject, String body) { Notification n = new Notification(); n.account = a; n.subject = subject; n.body = body; n.recipient = a.email; notifications.save(n); }

    @Transactional
    public LedgerEntry transfer(HttpSession session, String studentId, long amount, String reason) {
        Account teacher = current(session, Account.Role.PROFESSOR); if (amount <= 0 || reason == null || reason.isBlank()) throw new ApiException("Informe uma quantidade positiva e um motivo.");
        Account student = accounts.lockById(studentId).filter(a -> a.role == Account.Role.ALUNO && a.active).orElseThrow(() -> new ApiException("Aluno não encontrado.", 404));
        Account source = accounts.lockById(teacher.id).orElseThrow(); if (source.balance < amount) throw new ApiException("Saldo insuficiente.", 409);
        source.balance -= amount; student.balance += amount; ledger.save(entry(source, "ENVIO", -amount, "Reconhecimento para " + student.name, student.name, reason));
        LedgerEntry received = entry(student, "RECEBIMENTO", amount, "Reconhecimento recebido", source.name, reason); ledger.save(received); notify(student, "Você recebeu Pucoins", source.name + " enviou " + amount + " Pucoins. Motivo: " + reason); return received;
    }

    @Transactional
    public Advantage saveAdvantage(HttpSession session, Map<String, Object> input, String id) {
        Account company = current(session, Account.Role.EMPRESA); if (!"EMPRESA".equals(company.partnerKind)) throw new ApiException("Esta função é destinada às empresas que oferecem vantagens.", 403);
        Advantage a = id == null ? new Advantage() : advantages.findById(id).orElseThrow(() -> new ApiException("Vantagem não encontrada.", 404));
        if (id != null && !a.company.id.equals(company.id)) throw new ApiException("Você não tem permissão para esta operação.", 403);
        a.company = company; a.name = required(input, "name"); a.description = required(input, "description"); a.photo = required(input, "photo"); a.category = required(input, "category"); a.cost = Long.parseLong(Objects.toString(input.get("cost"), "0")); a.active = Boolean.parseBoolean(Objects.toString(input.getOrDefault("active", true))); if (a.cost <= 0) throw new ApiException("O custo deve ser maior que zero."); return advantages.save(a);
    }
    @Transactional public void deleteAdvantage(HttpSession s, String id) { Account c = current(s, Account.Role.EMPRESA); Advantage a = advantages.findById(id).orElseThrow(() -> new ApiException("Vantagem não encontrada.", 404)); if (!a.company.id.equals(c.id)) throw new ApiException("Você não tem permissão para esta operação.", 403); if (coupons.existsByAdvantageId(id)) a.active = false; else advantages.delete(a); }
    public Coupon check(HttpSession s, String raw) { Account c = current(s, Account.Role.EMPRESA); String code = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT); if (code.isBlank()) throw new ApiException("Informe o código do cupom."); Coupon x = coupons.findByCodeIgnoreCase(code).orElseThrow(() -> new ApiException("Cupom não encontrado.", 404)); if (!x.company.id.equals(c.id)) throw new ApiException("Este cupom pertence a outra empresa.", 403); return x; }
    @Transactional public Coupon use(HttpSession s, String raw) { Account c = current(s, Account.Role.EMPRESA); String code = raw == null ? "" : raw.trim().toUpperCase(Locale.ROOT); if (code.isBlank()) throw new ApiException("Informe o código do cupom."); Coupon x = coupons.lockByCode(code).orElseThrow(() -> new ApiException("Cupom não encontrado.", 404)); if (!x.company.id.equals(c.id)) throw new ApiException("Este cupom pertence a outra empresa.", 403); if (x.status == Coupon.Status.UTILIZADO) throw new ApiException("Cupom já utilizado.", 409); x.status = Coupon.Status.UTILIZADO; x.usedAt = Instant.now(); return x; }
    public List<Notification> notifications(Account a, int limit) { return notifications.findByAccountIdOrderByDateDesc(a.id, PageRequest.of(0, Math.min(Math.max(limit, 1), 200))).getContent(); }
}