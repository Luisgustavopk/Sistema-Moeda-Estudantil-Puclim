package br.pucminas.puclim.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.pucminas.puclim.entity.Partner;

public interface PartnerRepository extends JpaRepository<Partner, String> {
    boolean existsByCnpj(String cnpj);

    @Query("select p from Partner p join fetch p.account where p.kind = 'ENSINO' and p.account.active = true order by p.account.name")
    List<Partner> institutions();
}
