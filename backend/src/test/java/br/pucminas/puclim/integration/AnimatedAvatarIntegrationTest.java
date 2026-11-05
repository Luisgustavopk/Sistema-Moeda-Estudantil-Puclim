package br.pucminas.puclim.integration;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import br.pucminas.puclim.support.AbstractDatabaseTest;
import br.pucminas.puclim.support.AvatarGifFixture;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class AnimatedAvatarIntegrationTest extends AbstractDatabaseTest {
    @Autowired
    JdbcTemplate jdbc;

    private Map<String, Object> appearance(String avatar) {
        var input = new LinkedHashMap<String, Object>();
        input.put("displayName", "Avatar animado");
        input.put("bio", "");
        input.put("showRealName", false);
        input.put("avatar", avatar);
        input.put("frame", "classic");
        input.put("banner", "petroleum");
        input.put("featuredBadgeIds", List.of());
        input.put("favoriteBadgeId", null);
        input.put("visibility", "all");
        input.put("showStats", true);
        input.put("showActivity", true);
        return input;
    }

    @Test
    void unlocksAtExactLifetimeLevelBoundaryAndPreservesAccessRules() throws Exception {
        var fixture = data.academic();
        var owner = fixture.student();
        var secondTeacher = data.teacher(fixture.institution());
        var viewer = data.student(fixture.institution());
        data.transfer(fixture, 1000, "Primeiro reconhecimento");
        secondTeacher.client().result(secondTeacher.client().call("POST", "/transferencias",
                Map.of("studentId", owner.id(), "amount", 499, "reason", "Progresso"), UUID.randomUUID().toString()),
                200);
        assertEquals(4, owner.client().ok("GET", "/gamificacao/perfil", null).path("level").asInt());
        var policy = owner.client().ok("GET", "/gamificacao/perfil/personalizacao", null).path("uploadPolicy");
        assertEquals(5, policy.path("gifRequiredLevel").asInt());
        assertFalse(policy.path("gifUnlocked").asBoolean());
        byte[] gif = AvatarGifFixture.gif(64, 2);
        var denied = owner.client()
                .result(owner.client().upload("/gamificacao/perfil/avatar", "fake.png", gif, "image/png"), 400);
        assertTrue(denied.toString().contains("nível 5"));
        secondTeacher.client().result(secondTeacher.client().call("POST", "/transferencias",
                Map.of("studentId", owner.id(), "amount", 1, "reason", "Novo nível"), UUID.randomUUID().toString()),
                200);
        assertTrue(owner.client().ok("GET", "/gamificacao/perfil/personalizacao", null).path("uploadPolicy")
                .path("gifUnlocked").asBoolean());
        var uploaded = owner.client()
                .result(owner.client().upload("/gamificacao/perfil/avatar", "avatar.gif", gif, "image/gif"), 201);
        String avatar = uploaded.path("url").asString();
        assertTrue(avatar.endsWith(".gif"));
        assertEquals(64, uploaded.path("width").asInt());
        viewer.client().expect("GET", avatar.substring(4), null, 404);
        var input = appearance(avatar);
        owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", input);
        assertEquals(avatar,
                owner.client().ok("GET", "/gamificacao/perfil/personalizacao", null).path("avatar").asString());
        var animated = viewer.client().call("GET", avatar.substring(4), null, null);
        assertEquals(200, animated.statusCode());
        assertEquals("image/gif", animated.headers().firstValue("content-type").orElse(""));
        assertTrue(animated.body().startsWith("GIF"));
        var thumbnail = viewer.client().call("GET", avatar.substring(4) + "?static=true", null, null);
        assertEquals(200, thumbnail.statusCode());
        assertEquals("image/png", thumbnail.headers().firstValue("content-type").orElse(""));
        assertEquals("nosniff", thumbnail.headers().firstValue("x-content-type-options").orElse(""));
        assertArrayEquals(gif, jdbc.queryForObject("SELECT content FROM profile_avatars WHERE id=?", byte[].class,
                uploaded.path("assetId").asString()));
        viewer.client().expect("PUT", "/gamificacao/perfil/personalizacao", appearance(avatar), 403);
        input.put("visibility", "institution");
        owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", input);
        var outsider = data.student(data.partner("ENSINO"));
        outsider.client().expect("GET", avatar.substring(4), null, 404);
        outsider.client().expect("GET", avatar.substring(4) + "?static=true", null, 404);
        input.put("visibility", "private");
        owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", input);
        viewer.client().expect("GET", avatar.substring(4), null, 404);
        viewer.client().expect("GET", avatar.substring(4) + "?static=true", null, 404);
        assertEquals(200, owner.client().call("GET", avatar.substring(4), null, null).statusCode());
    }

    @Test
    void cannotEquipAnExistingGifBelowLevelEvenUsingThePngStyleUrl() throws Exception {
        var owner = data.student(data.partner("ENSINO"));
        String id = UUID.randomUUID().toString();
        byte[] gif = AvatarGifFixture.gif(64, 2);
        jdbc.update("INSERT INTO profile_avatars(id,student_id,content,content_type) VALUES (?,?,?,?)", id, owner.id(),
                gif, "image/gif");
        for (String suffix : List.of("", ".gif")) {
            var error = owner.client().expect("PUT", "/gamificacao/perfil/personalizacao",
                    appearance("/api/gamificacao/perfil/avatar/" + id + suffix), 400);
            assertTrue(error.toString().contains("nível 5"));
        }
    }
}
