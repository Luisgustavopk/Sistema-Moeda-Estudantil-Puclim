package br.pucminas.puclim.entity;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "teacher_student_links")
public class TeacherStudentLink {
    @Id
    @Column(length = 36)
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "teacher_id")
    public Teacher teacher;
    @ManyToOne(optional = false)
    @JoinColumn(name = "student_id")
    public Student student;
    @Column(nullable = false)
    public boolean active = true;
}
