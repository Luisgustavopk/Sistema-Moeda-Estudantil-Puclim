package br.pucminas.puclim.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.pucminas.puclim.entity.Notification;
import jakarta.persistence.LockModeType;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByAccountIdOrderByDateDesc(String id);

    @Query("select n.id from Notification n where n.sentAt is null and n.nextAttempt <= :now order by n.date")
    List<String> due(@Param("now") Instant now, org.springframework.data.domain.Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select n from Notification n where n.id = :id")
    Optional<Notification> lock(@Param("id") String id);
}
