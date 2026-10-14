package br.pucminas.puclim.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.pucminas.puclim.entity.Teacher;

public interface TeacherRepository extends JpaRepository<Teacher, String> {
    boolean existsByCpf(String cpf);

    boolean existsByInstitutionId(String id);

    @Query("select t from Teacher t join fetch t.account where t.institution.id = :id and t.account.active = true order by t.account.name")
    List<Teacher> forInstitution(@Param("id") String id);

    @Query("select t.id from Teacher t where t.account.active = true")
    List<String> activeIds();
}
