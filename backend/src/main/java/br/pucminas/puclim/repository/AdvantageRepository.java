package br.pucminas.puclim.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.pucminas.puclim.entity.Advantage;
import jakarta.persistence.LockModeType;

public interface AdvantageRepository extends JpaRepository<Advantage, String> {
    @Query("select v from Advantage v join fetch v.company p join fetch p.account where v.active = true and p.account.active = true order by v.name")
    List<Advantage> catalog();

    @Query("select v from Advantage v join fetch v.company p join fetch p.account where p.id = :id order by v.name")
    List<Advantage> own(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Advantage v where v.id = :id")
    Optional<Advantage> lock(@Param("id") String id);
}
