package br.pucminas.puclim.repository;
import br.pucminas.puclim.entity.Account;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface AccountRepository extends JpaRepository<Account, String> {
    Optional<Account> findByLoginIgnoreCaseOrEmailIgnoreCase(String login, String email);
    List<Account> findByRoleAndActiveTrue(Account.Role role);
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select a from Account a where a.id = :id") Optional<Account> lockById(@Param("id") String id);
}