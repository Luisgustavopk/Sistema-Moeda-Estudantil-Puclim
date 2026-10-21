package br.pucminas.puclim.integration;

import java.util.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;
import br.pucminas.puclim.support.*;

@EnabledIfEnvironmentVariable(named = "TEST_DB_URL", matches = "jdbc:(mysql|mariadb):.*")
class ProfileCustomizationIntegrationTest extends AbstractDatabaseTest {
    private Map<String,Object> appearance() {
        var p = new LinkedHashMap<String,Object>();
        p.put("displayName", "Estudante do campus"); p.put("bio", "Aprendendo em comunidade.");
        p.put("showRealName", false); p.put("avatar", "initials"); p.put("frame", "classic"); p.put("banner", "gold");
        p.put("featuredBadgeIds", List.of()); p.put("favoriteBadgeId", null); p.put("visibility", "all");
        p.put("showStats", true); p.put("showActivity", true); return p;
    }
    @Test void registrationAcceptsMissingBlankAndNullRg() throws Exception {
        var institution = data.partner("ENSINO");
        for (String kind : List.of("missing", "blank", "null")) {
            var p = new LinkedHashMap<>(TestPayloads.student(institution.id()));
            if (kind.equals("missing")) p.remove("rg"); else p.put("rg", kind.equals("blank") ? "   " : null);
            var account = data.anonymous().expect("POST", "/alunos", p, 201);
            assertTrue(account.path("rg").isNull());
        }
    }
    @Test void savesAppearanceAndProjectsAliasWithoutCadastralNameOrHiddenBlocks() throws Exception {
        var institution = data.partner("ENSINO"); var owner = data.student(institution); var viewer = data.student(institution);
        var p = appearance(); p.put("showStats", false); p.put("showActivity", false);
        owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
        assertEquals("gold", owner.client().ok("GET", "/gamificacao/perfil/personalizacao", null).path("banner").asString());
        var visible = viewer.client().ok("GET", "/gamificacao/perfis/" + owner.id(), null);
        assertEquals("Estudante do campus", visible.path("name").asString());
        assertTrue(visible.path("realName").isNull()); assertTrue(visible.path("stats").isNull()); assertTrue(visible.path("activity").isNull());
        assertFalse(visible.has("totalReceived")); assertFalse(visible.has("history"));
        assertFalse(visible.path("appearance").has("visibility"));
        assertFalse(visible.toString().contains(owner.registration().get("email").toString()));
        p.put("showRealName", true); owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
        assertEquals(owner.registration().get("name"), viewer.client().ok("GET", "/gamificacao/perfis/" + owner.id(), null).path("realName").asString());
    }
    @Test void enforcesInstitutionAndPrivateVisibilityForStudentsAndTeachers() throws Exception {
        var institution = data.partner("ENSINO"); var owner = data.student(institution); var peer = data.student(institution);
        var teacher = data.teacher(institution); var outsider = data.student(data.partner("ENSINO"));
        var p = appearance(); p.put("visibility", "institution"); owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
        peer.client().ok("GET", "/gamificacao/perfis/" + owner.id(), null); teacher.client().ok("GET", "/gamificacao/perfis/" + owner.id(), null);
        outsider.client().expect("GET", "/gamificacao/perfis/" + owner.id(), null, 404);
        p.put("visibility", "private"); owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
        owner.client().ok("GET", "/gamificacao/perfis/" + owner.id(), null);
        peer.client().expect("GET", "/gamificacao/perfis/" + owner.id(), null, 404);
        teacher.client().expect("GET", "/gamificacao/perfis/" + owner.id(), null, 404);
        teacher.client().expect("PUT", "/gamificacao/perfil/personalizacao", p, 403);
        data.anonymous().expect("GET", "/gamificacao/perfil/personalizacao", null, 401);
    }
    @Test void rejectsUnearnedBadgesFramesAndForeignAvatarsAndChecksAssetAccess() throws Exception {
        var institution = data.partner("ENSINO"); var owner = data.student(institution); var viewer = data.student(institution);
        var p = appearance(); p.put("featuredBadgeIds", List.of("TOP_3"));
        owner.client().expect("PUT", "/gamificacao/perfil/personalizacao", p, 400);
        p.put("featuredBadgeIds", List.of()); p.put("frame", "merit");
        owner.client().expect("PUT", "/gamificacao/perfil/personalizacao", p, 400); p.put("frame", "classic");
        var bytes = new ByteArrayOutputStream(); ImageIO.write(new BufferedImage(64,64,BufferedImage.TYPE_INT_RGB), "png", bytes);
        var asset = owner.client().result(owner.client().upload("/gamificacao/perfil/avatar", "avatar.png", bytes.toByteArray(), "image/png"), 201);
        String url = asset.path("url").asString().substring(4);
        viewer.client().expect("GET", url, null, 404);
        p.put("avatar", asset.path("url").asString()); viewer.client().expect("PUT", "/gamificacao/perfil/personalizacao", p, 403);
        owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
        var image = viewer.client().call("GET", url, null, null); assertEquals(200, image.statusCode());
        assertEquals("image/png", image.headers().firstValue("content-type").orElse(""));
        p.put("visibility", "private"); owner.client().ok("PUT", "/gamificacao/perfil/personalizacao", p);
        viewer.client().expect("GET", url, null, 404);
        assertEquals(200, owner.client().call("GET", url, null, null).statusCode());
        assertEquals(asset.path("url").asString(), owner.client().ok("GET", "/gamificacao/ranking", null).path("own").path("avatar").asString());
        var rows = viewer.client().ok("GET", "/gamificacao/ranking", null).path("content");
        for (var row : rows) if (row.path("studentId").asString().equals(owner.id())) assertEquals("initials", row.path("avatar").asString());
        owner.client().result(owner.client().upload("/gamificacao/perfil/avatar", "fake.png", new byte[]{1,2,3}, "image/png"), 400);
    }
}
