package br.pucminas.puclim.entity;

import java.time.Instant;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** Marks the one-time baseline separately from the reward grants. */
@Entity
@Table(name = "profile_reward_states")
public class ProfileRewardState {
    @Id @Column(name = "student_id") public String studentId;
    @Column(nullable = false) public Instant initializedAt;
}
