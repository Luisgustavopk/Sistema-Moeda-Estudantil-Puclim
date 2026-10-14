package br.pucminas.puclim.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import br.pucminas.puclim.entity.Operation;

public interface OperationRepository extends JpaRepository<Operation, String> {
    Optional<Operation> findByAccountIdAndRequestKey(String accountId, String requestKey);
}
