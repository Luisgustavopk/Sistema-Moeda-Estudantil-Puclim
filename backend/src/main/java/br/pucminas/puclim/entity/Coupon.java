package br.pucminas.puclim.entity;

import java.time.Instant;
import java.util.Locale;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "coupons")
public class Coupon {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "advantage_id")
    public Advantage advantage;
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    @ManyToOne(optional = false)
    @JoinColumn(name = "company_id")
    public Partner company;
    @Column(nullable = false, unique = true, length = 40)
    public String code = UUID.randomUUID().toString().toUpperCase(Locale.ROOT);
    @Column(nullable = false, length = 100)
    public String advantageName;
    @Column(nullable = false, length = 100)
    public String companyName;
    @Column(nullable = false, length = 100)
    public String studentName;
    public long cost;
    @Column(nullable = false)
    public Instant date = Instant.now();
    @Column(nullable = false, length = 20)
    public String status = "VALIDO";
    public Instant usedAt;
}
