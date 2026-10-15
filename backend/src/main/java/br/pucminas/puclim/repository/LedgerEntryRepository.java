package br.pucminas.puclim.repository;
import br.pucminas.puclim.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.*;
public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, String> {
    @Query("select l from LedgerEntry l where l.account.id = :accountId and (:from is null or l.date >= :from) and (:to is null or l.date < :to) and (:kind is null or l.kind = :kind) and (:incoming is null or (:incoming = true and l.amount > 0) or (:incoming = false and l.amount < 0)) and (:search is null or lower(concat(coalesce(l.description,''), ' ', coalesce(l.counterpart,''), ' ', coalesce(l.reason,''))) like lower(concat('%', :search, '%')) escape '\\') order by l.date desc")
    List<LedgerEntry> search(@Param("accountId") String accountId, @Param("from") Instant from, @Param("to") Instant to, @Param("kind") String kind, @Param("incoming") Boolean incoming, @Param("search") String search);
    @Query("select coalesce(sum(l.amount), 0) from LedgerEntry l where l.account.id = :accountId") long sum(@Param("accountId") String accountId);
}