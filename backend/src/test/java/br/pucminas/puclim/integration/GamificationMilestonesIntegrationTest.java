package br.pucminas.puclim.integration;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import br.pucminas.puclim.support.*;
import tools.jackson.databind.JsonNode;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class GamificationMilestonesIntegrationTest extends AbstractDatabaseTest {
    @Autowired JdbcTemplate jdbc;

    private Map<String,Object> appearance() {
        var p = new LinkedHashMap<String,Object>();
        p.put("displayName", "Explorador do campus"); p.put("bio", "Minha trajetória.");
        p.put("showRealName", false); p.put("avatar", "initials"); p.put("frame", "classic"); p.put("banner", "petroleum");
        p.put("featuredBadgeIds", List.of()); p.put("favoriteBadgeId", null); p.put("visibility", "all");
        p.put("showStats", true); p.put("showActivity", true); return p;
    }
    private JsonNode find(JsonNode rows, String id) {
        for (var row : rows) if (row.path("id").asString().equals(id)) return row;
        throw new AssertionError("Missing item " + id);
    }
    @Test void newCatalogRowWorksWithoutCodeOrFormWhitelistChanges() throws Exception {
        var f = data.academic(); data.transfer(f, 100, "Mérito para personalização");
        String code = "campus-" + UUID.randomUUID().toString().substring(0,8);
        String id = "frame-" + code;
        try {
            jdbc.update("insert into profile_rewards(id,code,kind,name,rule,required_level,icon,palette,variant,sort_order,asset_path,avatar_inset,avatar_shape,motion,cycle_ms) values(?,?,'FRAME','Moldura do campus','LEVEL',2,'BookOpen','TEAL','DOUBLE',999,'/images/rewards/campus.png',15,'CIRCLE','ORBIT',3600)", id, code);
            var reward = find(f.student().client().ok("GET", "/gamificacao/perfil/desbloqueios", null), code);
            assertTrue(reward.path("unlocked").asBoolean());
            assertEquals("BookOpen", reward.path("visual").path("icon").asString());
            var p = appearance(); p.put("frame", code);
            f.student().client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
            var publicProfile = f.teacher().client().ok("GET", "/gamificacao/perfis/" + f.student().id(), null);
            assertEquals(code, publicProfile.path("appearance").path("frame").asString());
            assertEquals("TEAL", publicProfile.path("appearance").path("visuals").path("frame").path("palette").asString());
            assertEquals("DOUBLE", publicProfile.path("appearance").path("visuals").path("frame").path("variant").asString());
            assertEquals("/images/rewards/campus.png", publicProfile.path("appearance").path("visuals").path("frame").path("assetUrl").asString());
            assertEquals("ORBIT", publicProfile.path("appearance").path("visuals").path("frame").path("motion").asString());
            assertEquals(3600, publicProfile.path("appearance").path("visuals").path("frame").path("cycleMs").asInt());
        } finally {
            jdbc.update("delete from profile_rewards where id=?", id);
        }
    }
    @Test void catalogHasThreeVerifiedStepsAndRejectsForgedCosmetics() throws Exception {
        var f = data.academic(); var client = f.student().client();
        var badges = client.ok("GET", "/gamificacao/perfil", null).path("badges");
        assertTrue(badges.size() >= 15);
        assertEquals("BRONZE", find(badges, "FIRST_COIN").path("tier").asString());
        assertEquals("SILVER", find(badges, "COINS_SILVER").path("tier").asString());
        assertEquals("GOLD", find(badges, "COINS_GOLD").path("tier").asString());
        var rewards = client.ok("GET", "/gamificacao/perfil/desbloqueios", null);
        assertTrue(rewards.size() >= 25);
        assertFalse(find(rewards, "explorer").path("unlocked").asBoolean());
        for (var selection : List.of(Map.entry("avatar", "explorer"), Map.entry("frame", "bronze"),
                Map.entry("banner", "library"), Map.entry("avatar", "scholar"), Map.entry("avatar", "unknown"))) {
            var p = appearance(); p.put(selection.getKey(), selection.getValue());
            client.expect("PUT", "/gamificacao/perfil/personalizacao", p, 400);
        }
        assertEquals("classic", client.ok("GET", "/gamificacao/perfil/personalizacao", null).path("frame").asString());
        f.teacher().client().expect("GET", "/gamificacao/perfil/desbloqueios", null, 403);
        data.anonymous().expect("GET", "/gamificacao/perfil/desbloqueios", null, 401);
    }
    @Test void receiptsUnlockRetroactiveStepsOnceAndSpendingPreservesThem() throws Exception {
        var f = data.academic(); var client = f.student().client();
        data.transfer(f, 100, "Reconhecimento verificado");
        String firstDate = find(client.ok("GET", "/gamificacao/perfil", null).path("badges"), "FIRST_COIN").path("unlockedAt").asString();
        var p = appearance(); p.put("avatar", "explorer"); p.put("frame", "bronze"); p.put("banner", "library");
        p.put("featuredBadgeIds", List.of("FIRST_COIN", "COINS_SILVER"));
        client.ok("PUT", "/gamificacao/perfil/personalizacao", p);
        var company = data.partner("EMPRESA"); var advantage = data.advantage(company, 20);
        for (int i = 0; i < 5; i++) data.redeem(f.student(), advantage);
        for (int i = 0; i < 2; i++) {
            var profile = client.ok("GET", "/gamificacao/perfil", null);
            assertEquals(2, profile.path("level").asInt());
            assertEquals(firstDate, find(profile.path("badges"), "FIRST_COIN").path("unlockedAt").asString());
            assertFalse(find(profile.path("badges"), "REDEMPTIONS_SILVER").path("unlockedAt").isNull());
        }
        assertEquals(1, jdbc.queryForObject("select count(*) from badge_awards where student_id=? and badge_id='COINS_SILVER'", Integer.class, f.student().id()));
        var rewards = client.ok("GET", "/gamificacao/perfil/desbloqueios", null);
        assertTrue(find(rewards, "explorer").path("unlocked").asBoolean());
        assertTrue(find(rewards, "library").path("unlocked").asBoolean());
        assertFalse(find(rewards, "astronaut").path("unlocked").asBoolean());
        var saved = client.ok("GET", "/gamificacao/perfil/personalizacao", null);
        assertEquals("explorer", saved.path("avatar").asString());
        assertEquals("bronze", saved.path("frame").asString());
        assertEquals("library", saved.path("banner").asString());
    }
    @Test void goldMedalsCountConfirmedRedemptionsAndDonationsOnly() throws Exception {
        var f = data.academic(); var client = f.student().client();
        data.transfer(f, 1000, "Mérito acumulado");
        var advantage = data.advantage(data.partner("EMPRESA"), 1);
        var beneficiary = data.partner("BENEFICIARIA");
        for (int i = 0; i < 15; i++) {
            var coupon = data.redeem(f.student(), advantage);
            if (i < 10) {
                String path = "/gamificacao/cupons/" + coupon.path("code").asString() + "/doar";
                client.ok("POST", path, Map.of("beneficiaryId", beneficiary.id()));
                client.ok("POST", path, Map.of("beneficiaryId", beneficiary.id()));
            }
        }
        var badges = client.ok("GET", "/gamificacao/perfil", null).path("badges");
        for (String id : List.of("COINS_GOLD", "REDEMPTIONS_GOLD", "DONATIONS_GOLD")) {
            assertFalse(find(badges, id).path("unlockedAt").isNull(), id);
            assertEquals("GOLD", find(badges, id).path("tier").asString());
        }
        var p = appearance(); p.put("avatar", "guardian"); p.put("frame", "solidarity"); p.put("banner", "garden");
        client.ok("PUT", "/gamificacao/perfil/personalizacao", p);
        assertEquals(10, jdbc.queryForObject("select count(*) from coupon_donations d join coupons c on c.id=d.coupon_id where c.student_id=?", Integer.class, f.student().id()));
    }
}
