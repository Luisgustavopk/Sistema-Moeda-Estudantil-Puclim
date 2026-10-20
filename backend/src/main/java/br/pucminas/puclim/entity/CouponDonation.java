package br.pucminas.puclim.entity;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "coupon_donations")
public class CouponDonation {
    @Id
    public String id = UUID.randomUUID().toString();
    @OneToOne(optional = false)
    @JoinColumn(name = "coupon_id", unique = true)
    public Coupon coupon;
    @ManyToOne(optional = false)
    @JoinColumn(name = "beneficiary_id")
    public Partner beneficiary;
    public Instant date = Instant.now();
}
