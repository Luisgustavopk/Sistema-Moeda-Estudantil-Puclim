package br.pucminas.puclim.repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import br.pucminas.puclim.entity.PasswordResetRequest;

public interface PasswordResetRepository extends JpaRepository<PasswordResetRequest, String> {
    Optional<PasswordResetRequest> findByTokenHash(String tokenHash);

    @Query("select r.id from PasswordResetRequest r where r.sentAt is null and r.invalidatedAt is null and r.consumedAt is null and r.nextAttempt <= :now and r.expiresAt > :now order by r.requestedAt")
    List<String> due(Instant now, Pageable page);

    @Modifying
    @Query("update PasswordResetRequest r set r.invalidatedAt = :now, r.tokenHash = null where r.account.id = :accountId and r.invalidatedAt is null and r.consumedAt is null")
    void invalidateForAccount(String accountId, Instant now);
}
