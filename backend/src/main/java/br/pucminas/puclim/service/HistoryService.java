package br.pucminas.puclim.service;

import java.io.IOException;
import java.io.Writer;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.dto.response.CouponResponse;
import br.pucminas.puclim.dto.response.HistoryPageResponse;
import br.pucminas.puclim.dto.response.TransactionResponse;
import br.pucminas.puclim.entity.Coupon;
import br.pucminas.puclim.entity.LedgerEntry;
import br.pucminas.puclim.exception.ApiException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class HistoryService {
    private static final Set<String> KINDS = Set.of("COTA", "RECEBIMENTO", "ENVIO", "RESGATE", "MISSAO",
            "RESERVA", "LIBERACAO", "BONUS", "RECOMPENSA", "PREMIO", "DOACAO", "TRANSF_ENVIO", "TRANSF_ENTRADA");
    private final AccountService accounts;
    private final EntityManager entities;
    private final ZoneId defaultZone;

    public HistoryService(AccountService accounts, EntityManager entities,
            @Value("${puclim.semester.zone:America/Sao_Paulo}") String zone) {
        this.accounts = accounts;
        this.entities = entities;
        defaultZone = ZoneId.of(zone);
    }

    public record StatementSummary(long incoming, long outgoing, long recognizedStudents) {
    }

    public record CouponSummary(long available, long used, long donated) {
    }

    public record StatementFilter(String accountId, String q, String kind, Instant from, Instant until, ZoneId zone) {
    }

    public StatementFilter statementFilter(String q, String kind, String from, String to, String zone) {
        var account = accounts.current();
        if (!Set.of("ALUNO", "PROFESSOR").contains(account.role))
            throw ApiException.forbidden();
        String normalizedKind = kind == null || kind.isBlank() || kind.equals("all") ? "" : kind;
        if (!normalizedKind.isEmpty() && !Set.of("in", "out").contains(normalizedKind)
                && !KINDS.contains(normalizedKind))
            throw ApiException.bad("Tipo de movimentação inválido.");
        try {
            ZoneId selectedZone = zone == null || zone.isBlank() ? defaultZone : ZoneId.of(zone);
            LocalDate start = from == null || from.isBlank() ? null : LocalDate.parse(from);
            LocalDate end = to == null || to.isBlank() ? null : LocalDate.parse(to);
            if (start != null && end != null && start.isAfter(end))
                throw ApiException.bad("A data inicial deve ser anterior ou igual à data final.");
            return new StatementFilter(account.id, search(q), normalizedKind,
                    start == null ? null : start.atStartOfDay(selectedZone).toInstant(),
                    end == null ? null : end.plusDays(1).atStartOfDay(selectedZone).toInstant(), selectedZone);
        } catch (DateTimeException e) {
            throw ApiException.bad("Período ou fuso horário inválido.");
        }
    }

    public HistoryPageResponse<TransactionResponse, StatementSummary> transactions(int page, int size,
            String q, String kind, String from, String to, String zone) {
        bounds(page, size);
        var filter = statementFilter(q, kind, from, to, zone);
        var cb = entities.getCriteriaBuilder();
        var query = cb.createTupleQuery();
        var row = query.from(LedgerEntry.class);
        var amount = row.<Long>get("amount");
        query.multiselect(cb.count(row),
                cb.coalesce(cb.sum(cb.<Long>selectCase().when(cb.gt(amount, 0), amount).otherwise(0L)), 0L),
                cb.coalesce(cb.sum(cb.<Long>selectCase().when(cb.lt(amount, 0), cb.neg(amount)).otherwise(0L)), 0L),
                cb.countDistinct(cb.<String>selectCase().when(cb.equal(row.get("kind"), "ENVIO"),
                        row.<String>get("counterpart")).otherwise(cb.nullLiteral(String.class))))
                .where(statementWhere(cb, row, filter));
        Tuple totals = entities.createQuery(query).getSingleResult();
        return HistoryPageResponse.of(statementItems(filter, page * size, size, null), page, size,
                totals.get(0, Long.class), new StatementSummary(totals.get(1, Long.class),
                        totals.get(2, Long.class), totals.get(3, Long.class)));
    }

    public HistoryPageResponse<CouponResponse, CouponSummary> coupons(int page, int size, String q, String status) {
        bounds(page, size);
        var account = accounts.current();
        boolean student = account.role.equals("ALUNO");
        String owner = student ? account.id : accounts.requirePartner("EMPRESA").id;
        String text = search(q);
        String state = status == null || status.isBlank() || status.equals("all") ? "" : status;
        if (!state.isEmpty() && !Set.of("VALIDO", "UTILIZADO", "DOADO").contains(state))
            throw ApiException.bad("Status de cupom inválido.");
        var cb = entities.getCriteriaBuilder();
        var totalsQuery = cb.createTupleQuery();
        var root = totalsQuery.from(Coupon.class);
        totalsQuery.multiselect(cb.count(root),
                cb.coalesce(
                        cb.sum(cb.<Long>selectCase().when(cb.equal(root.get("status"), "VALIDO"), 1L).otherwise(0L)),
                        0L),
                cb.coalesce(
                        cb.sum(cb.<Long>selectCase().when(cb.equal(root.get("status"), "UTILIZADO"), 1L).otherwise(0L)),
                        0L),
                cb.coalesce(cb.sum(cb.<Long>selectCase().when(cb.equal(root.get("status"), "DOADO"), 1L).otherwise(0L)),
                        0L))
                .where(couponWhere(cb, root, owner, student, text, state));
        Tuple totals = entities.createQuery(totalsQuery).getSingleResult();
        var query = cb.createQuery(CouponResponse.class);
        var row = query.from(Coupon.class);
        query.select(cb.construct(CouponResponse.class, row.get("id"), row.get("advantage").get("id"),
                row.get("code"), row.get("student").get("id"), row.get("studentName"), row.get("company").get("id"),
                row.get("companyName"), row.get("advantageName"), row.get("cost"), row.get("date"),
                row.get("status"), row.get("usedAt")))
                .where(couponWhere(cb, row, owner, student, text, state))
                .orderBy(cb.desc(row.get("date")), cb.desc(row.get("id")));
        var items = entities.createQuery(query).setFirstResult(page * size).setMaxResults(size).getResultList();
        return HistoryPageResponse.of(items, page, size, totals.get(0, Long.class),
                new CouponSummary(totals.get(1, Long.class), totals.get(2, Long.class), totals.get(3, Long.class)));
    }

    /**
     * Export uses the same filters, a consistent snapshot and bounded keyset
     * batches.
     */
    public void exportStatement(StatementFilter filter, Writer writer) throws IOException {
        var formatter = DateTimeFormatter.ofPattern("dd/MM/uuuu, HH:mm", Locale.forLanguageTag("pt-BR"))
                .withZone(filter.zone());
        writer.write("\uFEFFData;Tipo;Descrição;Pessoa ou empresa;Motivo;Pucoins\r\n");
        TransactionResponse cursor = null;
        while (true) {
            var items = statementItems(filter, 0, 100, cursor);
            if (items.isEmpty())
                break;
            for (var item : items) {
                writer.write(csv(formatter.format(item.date())) + ";" + csv(item.kind()) + ";" + csv(item.description())
                        + ";" + csv(item.counterpart()) + ";" + csv(item.reason()) + ";" + item.amount() + "\r\n");
            }
            writer.flush();
            cursor = items.getLast();
        }
    }

    private List<TransactionResponse> statementItems(StatementFilter filter, int offset, int size,
            TransactionResponse cursor) {
        var cb = entities.getCriteriaBuilder();
        var query = cb.createQuery(TransactionResponse.class);
        var row = query.from(LedgerEntry.class);
        Predicate where = statementWhere(cb, row, filter);
        if (cursor != null)
            where = cb.and(where, cb.or(cb.lessThan(row.get("date"), cursor.date()),
                    cb.and(cb.equal(row.get("date"), cursor.date()), cb.lessThan(row.get("id"), cursor.id()))));
        query.select(cb.construct(TransactionResponse.class, row.get("id"), row.get("date"), row.get("kind"),
                row.get("amount"), row.get("description"), row.get("counterpart"), row.get("reason")))
                .where(where).orderBy(cb.desc(row.get("date")), cb.desc(row.get("id")));
        return entities.createQuery(query).setFirstResult(offset).setMaxResults(size).getResultList();
    }

    private Predicate statementWhere(CriteriaBuilder cb, Root<LedgerEntry> row, StatementFilter filter) {
        var conditions = new ArrayList<Predicate>();
        conditions.add(cb.equal(row.get("account").get("id"), filter.accountId()));
        if (filter.from() != null)
            conditions.add(cb.greaterThanOrEqualTo(row.get("date"), filter.from()));
        if (filter.until() != null)
            conditions.add(cb.lessThan(row.get("date"), filter.until()));
        if (filter.kind().equals("in"))
            conditions.add(cb.gt(row.get("amount"), 0));
        else if (filter.kind().equals("out"))
            conditions.add(cb.lt(row.get("amount"), 0));
        else if (!filter.kind().isEmpty())
            conditions.add(cb.equal(row.get("kind"), filter.kind()));
        if (!filter.q().isEmpty())
            conditions.add(cb.or(
                    contains(cb, row.get("description"), filter.q()), contains(cb, row.get("counterpart"), filter.q()),
                    contains(cb, row.get("reason"), filter.q())));
        return cb.and(conditions.toArray(Predicate[]::new));
    }

    private Predicate couponWhere(CriteriaBuilder cb, Root<Coupon> row, String owner, boolean student, String text,
            String status) {
        var conditions = new ArrayList<Predicate>();
        conditions.add(cb.equal(row.get(student ? "student" : "company").get("id"), owner));
        if (!status.isEmpty())
            conditions.add(cb.equal(row.get("status"), status));
        if (!text.isEmpty()) {
            var visible = new ArrayList<Predicate>();
            for (String field : student ? List.of("code", "advantageName", "companyName")
                    : List.of("code", "advantageName", "studentName"))
                visible.add(contains(cb, row.get(field), text));
            conditions.add(cb.or(visible.toArray(Predicate[]::new)));
        }
        return cb.and(conditions.toArray(Predicate[]::new));
    }

    private Predicate contains(CriteriaBuilder cb, jakarta.persistence.criteria.Expression<String> field, String text) {
        String literal = text.replace("!", "!!").replace("%", "!%").replace("_", "!_");
        return cb.like(cb.lower(field), "%" + literal + "%", '!');
    }

    private String search(String value) {
        if (value != null && value.length() > 200)
            throw ApiException.bad("A busca deve ter até 200 caracteres.");
        return value == null ? "" : value.strip().toLowerCase(Locale.ROOT);
    }

    private void bounds(int page, int size) {
        if (page < 0 || size < 1 || size > 100 || (long) page * size > Integer.MAX_VALUE)
            throw ApiException.bad("Use página a partir de zero e tamanho entre 1 e 100.");
    }

    private String csv(String value) {
        if (value == null)
            value = "";
        String leading = value.stripLeading();
        if (!leading.isEmpty() && "=+-@".indexOf(leading.charAt(0)) >= 0) value = "'" + value;
        return "\"" + value.replace("\"", "\"\"") + "\"";
    }
}
