package br.pucminas.puclim.config;

import java.util.HashSet;
import java.util.Set;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import br.pucminas.puclim.service.MissionService;
import br.pucminas.puclim.service.CommunityService;
import br.pucminas.puclim.service.ProgressionService;
import br.pucminas.puclim.service.RewardService;

@Component
public class GamificationJobs {
    private final JdbcTemplate jdbc;
    private final MissionService missions;
    private final RewardService rewards;
    private final ProgressionService progression;
    private final CommunityService community;
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GamificationJobs.class);

    public GamificationJobs(JdbcTemplate j, MissionService m, RewardService r, ProgressionService p, CommunityService c) {
        jdbc = j;
        missions = m;
        rewards = r;
        progression = p;
        community = c;
    }

    @Scheduled(fixedDelayString = "${puclim.gamification.job-delay-ms:60000}")
    public void run() {
        // IDs only: each job item executes in its own service transaction and is safe
        // to retry after restart.
        for (String id : jdbc.queryForList("SELECT id FROM missions WHERE status='DISPONIVEL'", String.class))
            attempt(() -> missions.expire(id));
        for (String id : jdbc.queryForList("SELECT id FROM sponsored_challenges WHERE status IN ('PROPOSTA','PENDENTE_FINANCIAMENTO')", String.class))
            attempt(() -> community.expireChallenge(id));
        for (String id : jdbc.queryForList("SELECT id FROM reward_payments WHERE status='PENDENTE' ORDER BY date",
                String.class))
            attempt(() -> rewards.retryPayment(id));
        String previous = GamificationPolicy.semester(GamificationPolicy.start(progression.semester()).minusDays(1));
        for (String institution : jdbc.queryForList(
                "SELECT p.id FROM partners p JOIN accounts a ON a.id=p.id WHERE p.kind='ENSINO' AND a.active=1",
                String.class)) {
            Set<String> semesters = new HashSet<>(jdbc.queryForList(
                    "SELECT semester FROM institution_funds WHERE institution_id=?", String.class, institution));
            semesters.add(previous);
            for (String semester : semesters)
                if (GamificationPolicy.start(semester).plusMonths(6).isBefore(progression.today().plusDays(1)))
                    attempt(() -> rewards.close(institution, semester));
        }
    }

    private void attempt(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            log.warn("Gamificação: processamento pendente ({})", e.getClass().getSimpleName());
        }
    }
}
