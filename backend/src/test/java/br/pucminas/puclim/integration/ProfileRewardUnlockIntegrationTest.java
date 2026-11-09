package br.pucminas.puclim.integration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.ConcurrentTestActions;
import tools.jackson.databind.JsonNode;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class ProfileRewardUnlockIntegrationTest extends AbstractDatabaseTest {
    @Autowired JdbcTemplate jdbc;
    private static final String APPEARANCE = "/gamificacao/perfil/personalizacao";
    private static final String EQUIP = APPEARANCE + "/recompensa";
    private static final String UNLOCKS = "/gamificacao/perfil/desbloqueios";

    private Map<String, Object> appearance() {
        var input = new LinkedHashMap<String, Object>();
        input.put("displayName", "Identidade escolhida"); input.put("bio", "Meu perfil no campus.");
        input.put("showRealName", false); input.put("avatar", "initials"); input.put("frame", "classic");
        input.put("banner", "cream"); input.put("featuredBadgeIds", List.of()); input.put("favoriteBadgeId", null);
        input.put("visibility", "institution"); input.put("showStats", false); input.put("showActivity", false);
        return input;
    }

    private JsonNode reward(JsonNode options, String kind, String code) {
        for (var option : options)
            if (option.path("kind").asString().equals(kind) && option.path("id").asString().equals(code)) return option;
        throw new AssertionError("Missing reward " + kind + ":" + code);
    }

    @Test
    void equipsOnlyOneEarnedRewardAndSupportsClearingTitlesWithoutChangingOtherSettings() throws Exception {
        var fixture = data.academic(); var owner = fixture.student().client();
        var original = owner.ok("PUT", APPEARANCE, appearance());
        assertTrue(original.path("title").isNull());
        owner.expect("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "campus-explorer"), 400);
        owner.expect("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "semester-highlight"), 400);
        owner.expect("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "invented"), 400);
        owner.expect("PATCH", EQUIP, Map.of("kind", "TITLE"), 400);
        owner.expect("PATCH", EQUIP, Map.of("kind", "BANNER", "id", "cosmos"), 400);
        var missingSelection = new LinkedHashMap<String, Object>(); missingSelection.put("kind", "AVATAR"); missingSelection.put("id", null);
        owner.expect("PATCH", EQUIP, missingSelection, 400);
        data.transfer(fixture, 100, "Reconhecimento para título de explorador");
        var equipped = owner.ok("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "campus-explorer"));
        assertEquals("campus-explorer", equipped.path("title").asString());
        assertEquals("Explorador do campus", equipped.path("titleName").asString());
        for (String field : List.of("displayName", "bio", "showRealName", "avatar", "frame", "banner", "featuredBadgeIds", "favoriteBadgeId", "visibility", "showStats", "showActivity"))
            assertEquals(original.path(field), equipped.path(field), "Equip must preserve " + field);
        var framed = owner.ok("PATCH", EQUIP, Map.of("kind", "FRAME", "id", "bronze"));
        assertEquals("bronze", framed.path("frame").asString());
        assertEquals("campus-explorer", framed.path("title").asString());
        assertEquals("cream", framed.path("banner").asString());
        assertEquals(100L, jdbc.queryForObject("SELECT balance FROM accounts WHERE id=?", Long.class, fixture.student().id()));
        missingSelection.put("kind", "TITLE");
        var cleared = owner.ok("PATCH", EQUIP, missingSelection);
        assertTrue(cleared.path("title").isNull()); assertTrue(cleared.path("titleName").isNull());
        assertEquals("bronze", cleared.path("frame").asString());
        fixture.teacher().client().expect("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "campus-explorer"), 403);
        data.anonymous().expect("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "campus-explorer"), 401);
    }

    @Test
    void fullSaveValidatesTitlesPreservesOmittedLegacyFieldAndClearsExplicitNull() throws Exception {
        var fixture = data.academic(); var owner = fixture.student().client(); var input = appearance();
        input.put("title", "campus-explorer"); owner.expect("PUT", APPEARANCE, input, 400);
        input.put("title", 123); owner.expect("PUT", APPEARANCE, input, 400);
        input.put("title", Map.of("id", "campus-explorer")); owner.expect("PUT", APPEARANCE, input, 400);
        data.transfer(fixture, 100, "Progresso para salvar um título");
        input.put("title", "campus-explorer");
        assertEquals("Explorador do campus", owner.ok("PUT", APPEARANCE, input).path("titleName").asString());
        input.remove("title");
        assertEquals("campus-explorer", owner.ok("PUT", APPEARANCE, input).path("title").asString());
        input.put("title", null);
        assertTrue(owner.ok("PUT", APPEARANCE, input).path("title").isNull());
    }

    @Test
    void titlesFollowPublicProfileAndRankingAppearancePrivacy() throws Exception {
        var fixture = data.academic(); var owner = fixture.student().client();
        var peer = data.student(fixture.institution()); var outsider = data.student(data.partner("ENSINO"));
        data.transfer(fixture, 100, "Progresso para título público");
        var input = appearance(); input.put("title", "campus-explorer");
        owner.ok("PUT", APPEARANCE, input);
        var visible = peer.client().ok("GET", "/gamificacao/perfis/" + fixture.student().id(), null);
        assertEquals("campus-explorer", visible.path("appearance").path("title").asString());
        assertEquals("Explorador do campus", visible.path("appearance").path("titleName").asString());
        assertTrue(visible.path("realName").isNull()); assertTrue(visible.path("stats").isNull());
        String ranking = "/gamificacao/ranking?institution=" + fixture.institution().id();
        assertEquals("Explorador do campus", rankingRow(peer.client().ok("GET", ranking, null), fixture.student().id()).path("titleName").asString());
        assertTrue(rankingRow(outsider.client().ok("GET", ranking, null), fixture.student().id()).path("titleName").isNull());
        input.put("visibility", "private"); owner.ok("PUT", APPEARANCE, input);
        peer.client().expect("GET", "/gamificacao/perfis/" + fixture.student().id(), null, 404);
        assertTrue(rankingRow(peer.client().ok("GET", ranking, null), fixture.student().id()).path("titleName").isNull());
        assertEquals("Explorador do campus", owner.ok("GET", ranking, null).path("own").path("titleName").asString());
        input.put("visibility", "all"); owner.ok("PUT", APPEARANCE, input);
        assertEquals("Explorador do campus", rankingRow(outsider.client().ok("GET", ranking, null), fixture.student().id()).path("titleName").asString());
    }

    private JsonNode rankingRow(JsonNode ranking, String id) {
        for (var row : ranking.path("content")) if (row.path("studentId").asString().equals(id)) return row;
        throw new AssertionError("Missing ranking row");
    }

    @Test
    void existingEligibleRewardsFormASilentBaselineThenNewUnlocksPersistAcrossSessionsAndAcknowledgeIdempotently() throws Exception {
        var fixture = data.academic(); var owner = fixture.student().client();
        var baseline = owner.ok("GET", UNLOCKS, null);
        for (var option : baseline) {
            assertFalse(option.path("newlyUnlocked").asBoolean());
            assertEquals(option.path("unlocked").asBoolean(), !option.path("unlockedAt").isNull());
        }
        owner.expect("POST", UNLOCKS + "/TITLE/campus-explorer/visualizado", null, 400);
        data.transfer(fixture, 100, "Desbloqueio verificável após a linha de base");
        var unlocked = reward(owner.ok("GET", UNLOCKS, null), "TITLE", "campus-explorer");
        assertTrue(unlocked.path("unlocked").asBoolean()); assertTrue(unlocked.path("newlyUnlocked").asBoolean());
        assertFalse(unlocked.path("unlockedAt").isNull());
        var anotherDevice = data.authenticated(fixture.student());
        assertEquals(unlocked, reward(anotherDevice.ok("GET", UNLOCKS, null), "TITLE", "campus-explorer"));
        anotherDevice.expect("POST", UNLOCKS + "/TITLE/campus-explorer/visualizado", null, 204);
        anotherDevice.expect("POST", UNLOCKS + "/TITLE/campus-explorer/visualizado", null, 204);
        var acknowledged = reward(owner.ok("GET", UNLOCKS, null), "TITLE", "campus-explorer");
        assertFalse(acknowledged.path("newlyUnlocked").asBoolean());
        assertEquals(unlocked.path("unlockedAt"), acknowledged.path("unlockedAt"));
        var stranger = data.student(fixture.institution()).client();
        stranger.expect("POST", UNLOCKS + "/TITLE/campus-explorer/visualizado", null, 400);
        assertTrue(reward(owner.ok("GET", UNLOCKS, null), "FRAME", "bronze").path("newlyUnlocked").asBoolean(), "Acknowledging a title must preserve other new rewards");
    }

    @Test
    void recalculationCreatesBadgeLinkedUnlocksAndConcurrentReadsDoNotDuplicateGrants() throws Exception {
        var fixture = data.academic(); var owner = fixture.student().client();
        var anotherDevice = data.authenticated(fixture.student());
        ConcurrentTestActions.together(() -> owner.ok("GET", UNLOCKS, null), () -> anotherDevice.ok("GET", UNLOCKS, null));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM profile_reward_states WHERE student_id=?", Integer.class, fixture.student().id()));
        owner.ok("GET", "/gamificacao/perfil", null);
        jdbc.update("UPDATE student_progress SET best_streak=30 WHERE id=?", fixture.student().id());
        var options = owner.ok("GET", UNLOCKS, null);
        var title = reward(options, "TITLE", "constancy-master");
        assertTrue(title.path("unlocked").asBoolean()); assertTrue(title.path("newlyUnlocked").asBoolean());
        assertEquals("Mestre da constância", owner.ok("PATCH", EQUIP, Map.of("kind", "TITLE", "id", "constancy-master")).path("titleName").asString());
        ConcurrentTestActions.together(() -> owner.ok("GET", UNLOCKS, null), () -> anotherDevice.ok("GET", UNLOCKS, null));
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM profile_reward_unlocks WHERE student_id=? AND reward_id='title-constancy-master'", Integer.class, fixture.student().id()));
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM (SELECT reward_id FROM profile_reward_unlocks WHERE student_id=? GROUP BY reward_id HAVING COUNT(*)>1) duplicates", Integer.class, fixture.student().id()));
    }
}
