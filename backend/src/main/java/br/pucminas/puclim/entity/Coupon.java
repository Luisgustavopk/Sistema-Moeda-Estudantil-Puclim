package br.pucminas.puclim.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coupons", uniqueConstraints = @UniqueConstraint(name = "uk_coupons_code", columnNames = "code"), indexes = {
        @Index(name = "idx_coupons_student_date", columnList = "student_id,date"),
        @Index(name = "idx_coupons_company_date", columnList = "company_id,date")
})
public class Coupon {
    @Id @Column(length = 36) public String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "advantage_id", nullable = false) public Advantage advantage;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "student_id", nullable = false) public Account student;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "company_id", nullable = false) public Account company;
    @Column(nullable = false, length = 64) public String code;
    @Column(name = "student_name", nullable = false, length = 180) public String studentName;
    @Column(name = "company_name", nullable = false, length = 180) public String companyName;
    @Column(name = "advantage_name", nullable = false, length = 180) public String advantageName;
    @Column(nullable = false) public long cost;
    @Column(nullable = false) public Instant date = Instant.now();
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 12) public Status status = Status.VALIDO;
    @Column(name = "used_at") public Instant usedAt;
    public enum Status { VALIDO, UTILIZADO }
}