package br.pucminas.puclim.integration;

import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.TestDataFactory.AcademicFixture;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class ElementalFrameIntegrationTest extends AbstractDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    private static final String EQUIP = "/gamificacao/perfil/personalizacao/recompensa";

    @Test
    void elementalFramesRequireTheirRealLevelAndPersistPublicVisualsWithoutFinancialEffects() throws Exception {
        var fixture = data.academic();
        var owner = fixture.student().client();
        owner.expect("PATCH", EQUIP, Map.of("kind", "FRAME", "id", "lightning"), 400);
        owner.expect("PATCH", EQUIP, Map.of("kind", "FRAME", "id", "black-hole"), 400);
        data.transfer(fixture, 700, "Reconhecimento para nível quatro");
        var lightning = owner.ok("PATCH", EQUIP, Map.of("kind", "FRAME", "id", "lightning"));
        assertEquals("LIGHTNING", lightning.path("visuals").path("frame").path("motion").asString());
        assertEquals("CIRCLE", lightning.path("visuals").path("frame").path("avatarShape").asString());
        assertEquals(8000, lightning.path("visuals").path("frame").path("cycleMs").asInt());
        owner.expect("PATCH", EQUIP, Map.of("kind", "FRAME", "id", "black-hole"), 400);
        var secondTeacher = data.teacher(fixture.institution());
        data.transfer(new AcademicFixture(fixture.institution(), secondTeacher, fixture.student()),
                800, "Reconhecimento para nível cinco");
        var before = owner.ok("GET", "/conta/extrato", null);
        var blackHole = owner.ok("PATCH", EQUIP, Map.of("kind", "FRAME", "id", "black-hole"));
        assertEquals("BLACK_HOLE", blackHole.path("visuals").path("frame").path("motion").asString());
        assertEquals(16000, blackHole.path("visuals").path("frame").path("cycleMs").asInt());
        var saved = owner.ok("GET", "/gamificacao/perfil/personalizacao", null);
        assertEquals("black-hole", saved.path("frame").asString());
        var visible = fixture.teacher().client().ok("GET", "/gamificacao/perfis/" + fixture.student().id(), null);
        assertEquals("BLACK_HOLE", visible.path("appearance").path("visuals").path("frame").path("motion").asString());
        assertEquals(before, owner.ok("GET", "/conta/extrato", null));
        assertEquals(1500L, jdbc.queryForObject("SELECT balance FROM accounts WHERE id=?", Long.class, fixture.student().id()));
        assertEquals(5, owner.ok("GET", "/gamificacao/perfil", null).path("level").asInt());
    }

    @Test
    void databaseKeepsUnknownAndNonFrameEffectsOutOfTheCatalog() {
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE profile_rewards SET motion='LIGHTNING' WHERE id='banner-cream'"));
        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update(
                "UPDATE profile_rewards SET motion='INVENTED' WHERE id='frame-lightning'"));
    }
}
