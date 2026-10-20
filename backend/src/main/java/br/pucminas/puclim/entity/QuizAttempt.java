package br.pucminas.puclim.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

@Entity
@Table(name = "quiz_attempts")
public class QuizAttempt {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    @Column(nullable = false)
    public LocalDate day;
    public Instant completedAt;
    public int correctCount;
    public int streak;
    @OneToMany(mappedBy = "attempt", cascade = CascadeType.ALL)
    @OrderBy("position")
    public List<QuizItem> items = new ArrayList<>();
}
