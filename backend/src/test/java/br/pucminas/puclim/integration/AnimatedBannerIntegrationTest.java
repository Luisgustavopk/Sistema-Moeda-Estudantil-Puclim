package br.pucminas.puclim.integration;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

import br.pucminas.puclim.support.AbstractDatabaseTest;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class AnimatedBannerIntegrationTest extends AbstractDatabaseTest {
    @Autowired
    JdbcTemplate jdbc;

    private Map<String, Object> appearance(String banner) {
        var input = new LinkedHashMap<String, Object>();
        input.put("displayName", "Cenário do campus");
        input.put("bio", "");
        input.put("showRealName", false);
        input.put("avatar", "portrait");
        input.put("frame", "classic");
        input.put("banner", banner);
        input.put("featuredBadgeIds", List.of());
        input.put("favoriteBadgeId", null);
        input.put("visibility", "all");
        input.put("showStats", true);
        input.put("showActivity", true);
        return input;
    }

    @Test
    void levelAndBadgeGatesPersistAcrossOwnAndPublicProfile() throws Exception {
        var fixture = data.academic();
        var owner = fixture.student().client();
        owner.expect("PUT", "/gamificacao/perfil/personalizacao", appearance("aurora"), 400);
        owner.expect("PUT", "/gamificacao/perfil/personalizacao", appearance("meteors"), 400);
        data.transfer(fixture, 300, "Progresso para liberar Aurora");
        var saved = owner.ok("PUT", "/gamificacao/perfil/personalizacao", appearance("aurora"));
        assertEquals("AURORA", saved.path("visuals").path("banner").path("bannerMotion").asString());
        assertEquals(14000, saved.path("visuals").path("banner").path("cycleMs").asInt());
        var own = owner.ok("GET", "/gamificacao/perfil/personalizacao", null);
        assertEquals("aurora", own.path("banner").asString());
        var visible = owner.ok("GET", "/gamificacao/perfis/" + fixture.student().id(), null);
        assertEquals("AURORA",
                visible.path("appearance").path("visuals").path("banner").path("bannerMotion").asString());
        owner.expect("PUT", "/gamificacao/perfil/personalizacao", appearance("golden-waves"), 400);
        owner.expect("PUT", "/gamificacao/perfil/personalizacao", appearance("meteors"), 400);
        jdbc.update("UPDATE student_progress SET best_streak=30 WHERE id=?", fixture.student().id());
        owner.ok("GET", "/gamificacao/perfil", null);
        var meteors = owner.ok("PUT", "/gamificacao/perfil/personalizacao", appearance("meteors"));
        assertEquals("METEORS", meteors.path("visuals").path("banner").path("bannerMotion").asString());
        owner.ok("PUT", "/gamificacao/perfil/personalizacao", appearance("petroleum"));
    }

    @Test
    void catalogSeparatesFrameAndBannerEffectsAndRejectsFastBackgrounds() throws Exception {
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE profile_rewards SET banner_motion='WAVES' WHERE id='frame-classic'"));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE profile_rewards SET cycle_ms=2000 WHERE id='banner-aurora'"));
        assertThrows(DataIntegrityViolationException.class,
                () -> jdbc.update("UPDATE profile_rewards SET banner_motion='UNKNOWN' WHERE id='banner-aurora'"));
        var owner = data.student(data.partner("ENSINO")).client();
        var options = owner.ok("GET", "/gamificacao/perfil/desbloqueios", null);
        var effects = new HashSet<String>();
        for (var option : options)
            if (option.path("kind").asString().equals("BANNER")) {
                var motion = option.path("visual").path("bannerMotion").asString();
                if (!motion.equals("NONE")) {
                    effects.add(motion);
                    assertFalse(option.path("unlocked").asBoolean());
                }
            }
        assertEquals(Set.of("AURORA", "METEORS", "WAVES"), effects);
    }
}
