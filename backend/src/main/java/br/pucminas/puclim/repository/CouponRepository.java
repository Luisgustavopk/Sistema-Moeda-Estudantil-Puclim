package br.pucminas.puclim.repository;
import br.pucminas.puclim.entity.Coupon;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface CouponRepository extends JpaRepository<Coupon, String> { boolean existsByAdvantageId(String id); List<Coupon> findByStudentIdOrderByDateDesc(String id); List<Coupon> findByCompanyIdOrderByDateDesc(String id); Optional<Coupon> findByCodeIgnoreCase(String code); @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select c from Coupon c where upper(c.code) = upper(:code)") Optional<Coupon> lockByCode(@Param("code") String code); }