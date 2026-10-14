package br.pucminas.puclim.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.pucminas.puclim.entity.LedgerEntry;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, String> {
    List<LedgerEntry> findByAccountIdOrderByDateDesc(String id);

    @Query("select coalesce(sum(e.amount),0) from LedgerEntry e where e.account.id = :id")
    long sum(@Param("id") String id);
}
