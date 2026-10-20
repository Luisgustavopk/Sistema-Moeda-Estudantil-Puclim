package br.pucminas.puclim.entity;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "semester_winners")
public class SemesterWinner {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "closure_id")
    public SemesterClosure closure;
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    public int position;
    public long received;
    public int streak;
    public long reward;
}
