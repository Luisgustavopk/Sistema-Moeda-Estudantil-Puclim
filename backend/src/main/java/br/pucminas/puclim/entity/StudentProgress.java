package br.pucminas.puclim.entity;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "student_progress")
public class StudentProgress {
    @Id
    @Column(length = 255)
    public String id;
    @OneToOne
    @MapsId
    @JoinColumn(name = "id")
    public Student student;
    public int level = 1;
    public int streak;
    public int bestStreak;
    public LocalDate lastQuiz;
    public LocalDate perfectQuiz;
    public LocalDate donationDay;
}
