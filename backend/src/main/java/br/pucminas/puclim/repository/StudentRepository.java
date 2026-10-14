package br.pucminas.puclim.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import br.pucminas.puclim.entity.Student;

public interface StudentRepository extends JpaRepository<Student, String> {
    boolean existsByCpf(String cpf);

    boolean existsByInstitutionId(String id);

    @Query("select s from Student s join fetch s.account join fetch s.institution i join fetch i.account where s.account.active = true order by s.account.name")
    List<Student> selectable();
}
