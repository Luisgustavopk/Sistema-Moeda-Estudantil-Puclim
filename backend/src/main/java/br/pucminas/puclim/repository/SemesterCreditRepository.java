package br.pucminas.puclim.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import br.pucminas.puclim.entity.SemesterCredit;

public interface SemesterCreditRepository extends JpaRepository<SemesterCredit, String> {
    boolean existsByTeacherIdAndSemester(String teacherId, String semester);
}
