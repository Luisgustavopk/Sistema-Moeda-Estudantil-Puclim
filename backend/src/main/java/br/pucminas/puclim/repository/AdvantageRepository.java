package br.pucminas.puclim.repository;
import br.pucminas.puclim.entity.Advantage;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface AdvantageRepository extends JpaRepository<Advantage, String> { List<Advantage> findByActiveTrueOrderByNameAsc(); List<Advantage> findByCompanyIdOrderByNameAsc(String companyId); }