package br.pucminas.puclim.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.pucminas.puclim.entity.Account;

public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByLoginOrEmail(String login, String email);

    boolean existsByLogin(String login);

    boolean existsByEmail(String email);

    @Query(value="SELECT id FROM accounts WHERE id = :id FOR UPDATE", nativeQuery=true)
    Optional<String> lockId(@Param("id") String id);
}
