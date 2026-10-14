package br.pucminas.puclim.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import br.pucminas.puclim.entity.Coupon;
import jakarta.persistence.LockModeType;

public interface CouponRepository extends JpaRepository<Coupon, String> {
    List<Coupon> findByStudentIdOrderByDateDesc(String id);
    List<Coupon> findByCompanyIdOrderByDateDesc(String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Coupon c where c.code = :code")
    Optional<Coupon> lockByCode(@Param("code") String code);

    Optional<Coupon> findByCode(String code);
}
