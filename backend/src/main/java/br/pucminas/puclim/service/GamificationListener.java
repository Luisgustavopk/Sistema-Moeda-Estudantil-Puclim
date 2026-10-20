package br.pucminas.puclim.service;

import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.entity.BadgeDefinition;
import br.pucminas.puclim.entity.Student;
import br.pucminas.puclim.repository.GamificationRepository;
import br.pucminas.puclim.service.GamificationEvents.AdvantageDonated;
import br.pucminas.puclim.service.GamificationEvents.AdvantageRedeemed;
import br.pucminas.puclim.service.GamificationEvents.BadgeUnlocked;
import br.pucminas.puclim.service.GamificationEvents.CoinsReceived;
import br.pucminas.puclim.service.GamificationEvents.LevelReached;
import br.pucminas.puclim.service.GamificationEvents.QuizCompleted;

/**
 * Synchronous listeners join the originating transaction. Any failure rolls
 * back the entire action.
 */
@Component
@Transactional(propagation = Propagation.MANDATORY)
public class GamificationListener {
    private final ProgressionService progression;
    private final RewardService rewards;
    private final GamificationRepository db;

    public GamificationListener(ProgressionService p, RewardService r, GamificationRepository db) {
        progression = p;
        rewards = r;
        this.db = db;
    }

    @EventListener
    public void coins(CoinsReceived e) {
        progression.recalculate(e.studentId());
        if (e.bonusEligible())
            rewards.bonus(e);
    }

    @EventListener
    public void redemption(AdvantageRedeemed e) {
        progression.recalculate(e.studentId());
    }

    @EventListener
    public void donation(AdvantageDonated e) {
        progression.progress(e.studentId()).donationDay = progression.today();
        progression.recalculate(e.studentId());
    }

    @EventListener
    public void quiz(QuizCompleted e) {
        progression.recalculate(e.studentId());
        rewards.weekly(e.studentId(), e.attemptId());
    }

    @EventListener
    public void level(LevelReached e) {
        progression.notify(db.get(Student.class, e.studentId()).account, "NIVEL", "Novo nível!",
                "Você alcançou o nível " + e.level() + ". Acompanhe o próximo marco no seu perfil.",
                Integer.toString(e.level()));
    }

    @EventListener
    public void badge(BadgeUnlocked e) {
        BadgeDefinition b = db.get(BadgeDefinition.class, e.badgeId());
        progression.notify(db.get(Student.class, e.studentId()).account, "BADGE", "Nova conquista: " + b.name,
                b.description, e.badgeId());
    }
}
