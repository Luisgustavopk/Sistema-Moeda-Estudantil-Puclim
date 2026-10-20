package br.pucminas.puclim.entity;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;

@Entity
@Table(name = "quiz_items")
public class QuizItem {
    @Id
    public String id = UUID.randomUUID().toString();
    @ManyToOne(optional = false)
    @JoinColumn(name = "attempt_id")
    public QuizAttempt attempt;
    public int position;
    @Column(nullable = false, length = 2000)
    public String prompt;
    @Column(nullable = false, length = 100)
    public String area;
    @ElementCollection
    @CollectionTable(name = "quiz_item_options", joinColumns = @JoinColumn(name = "item_id"))
    @OrderColumn(name = "position")
    @Column(name = "label", nullable = false, length = 500)
    public List<String> options = new ArrayList<>();
    public int correctIndex;
    public Integer selectedIndex;
}
