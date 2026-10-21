package br.pucminas.puclim.service;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import javax.imageio.ImageIO;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import br.pucminas.puclim.dto.request.ProfileAppearanceRequest;
import br.pucminas.puclim.dto.response.GamificationResponses.Profile;
import br.pucminas.puclim.dto.response.GamificationResponses.Badge;
import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class ProfileCustomizationService {
    private static final String AVATARS = "/api/gamificacao/perfil/avatar/";
    private final GamificationRepository db;
    private final AccountService identity;
    public ProfileCustomizationService(GamificationRepository db, AccountService identity) {
        this.db = db; this.identity = identity;
    }
    public ProfileCustomization settings(String id, String name) {
        var found = db.optional(ProfileCustomization.class, id);
        if (found != null) return found;
        var defaults = new ProfileCustomization();
        defaults.studentId = id;
        defaults.displayName = name.substring(0, Math.min(name.length(), 40));
        return defaults;
    }
    public record Appearance(String displayName, String bio, boolean showRealName, String avatar,
        String frame, String banner, List<String> featuredBadgeIds, String favoriteBadgeId,
        String visibility, boolean showStats, boolean showActivity) {}
    public Appearance view(ProfileCustomization p) {
        return new Appearance(p.displayName, p.bio, p.showRealName, p.avatar, p.frame, p.banner,
            p.featuredBadgeIds.isBlank() ? List.of() : List.of(p.featuredBadgeIds.split(",")),
            p.favoriteBadgeId, p.visibility, p.showStats, p.showActivity);
    }
    public Appearance own() {
        var owner = identity.require("ALUNO");
        return view(settings(owner.id, owner.name));
    }
    public String rankingAvatar(ProfileCustomization p, Student student) {
        if (p.visibility.equals("all")) return p.avatar;
        var viewer = identity.current();
        if (viewer.id.equals(student.id)) return p.avatar;
        if (p.visibility.equals("institution")) {
            String institution = viewer.role.equals("ALUNO") ? db.get(Student.class, viewer.id).institution.id
                : db.get(Teacher.class, viewer.id).institution.id;
            if (institution.equals(student.institution.id)) return p.avatar;
        }
        return "initials";
    }
    public Appearance save(ProfileAppearanceRequest input) {
        var owner = identity.require("ALUNO");
        identity.locked(owner.id);
        var awards = db.list(BadgeAward.class, "select a from BadgeAward a where a.student.id=:s", "s", owner.id);
        var unlocked = new HashSet<String>();
        awards.forEach(a -> unlocked.add(a.badge.id));
        if (new HashSet<>(input.featuredBadgeIds()).size() != input.featuredBadgeIds().size()
            || !unlocked.containsAll(input.featuredBadgeIds())
            || input.favoriteBadgeId() != null && !unlocked.contains(input.favoriteBadgeId()))
            throw ApiException.bad("Escolha conquistas próprias e desbloqueadas, sem repetições.");
        if (input.frame().equals("merit") && unlocked.isEmpty())
            throw ApiException.bad("Desbloqueie uma conquista para usar a moldura Mérito.");
        String avatar = input.avatar();
        if (!Set.of("initials", "graduate", "portrait").contains(avatar)) {
            if (!avatar.startsWith(AVATARS)) throw ApiException.bad("Avatar inválido.");
            var asset = db.get(ProfileAvatar.class, avatar.substring(AVATARS.length()));
            if (!asset.studentId.equals(owner.id)) throw ApiException.forbidden();
        }
        boolean fresh = db.optional(ProfileCustomization.class, owner.id) == null;
        var p = settings(owner.id, owner.name);
        p.displayName = input.displayName().trim(); p.bio = input.bio().trim();
        if (p.displayName.length() < 2) throw ApiException.bad("Use pelo menos 2 caracteres no nome de exibição.");
        p.showRealName = input.showRealName(); p.avatar = avatar;
        p.frame = input.frame(); p.banner = input.banner();
        p.featuredBadgeIds = String.join(",", input.featuredBadgeIds()); p.favoriteBadgeId = input.favoriteBadgeId();
        p.visibility = input.visibility(); p.showStats = input.showStats(); p.showActivity = input.showActivity();
        if (fresh) db.save(p);
        return view(p);
    }
    public ProfileCustomization assertCanView(String id) {
        var viewer = identity.current();
        if (!Set.of("ALUNO", "PROFESSOR").contains(viewer.role)) throw ApiException.forbidden();
        var student = db.get(Student.class, id);
        if (!student.account.active) throw ApiException.missing();
        var p = settings(id, student.account.name);
        if (viewer.id.equals(id)) return p;
        if (p.visibility.equals("private")) throw ApiException.missing();
        if (p.visibility.equals("institution")) {
            String institution = viewer.role.equals("ALUNO") ? db.get(Student.class, viewer.id).institution.id
                : db.get(Teacher.class, viewer.id).institution.id;
            if (!institution.equals(student.institution.id)) throw ApiException.missing();
        }
        return p;
    }
    public record Stats(long totalReceived, Long nextLevelAt, long levelStart, int streak, int bestStreak,
        Integer coinPosition, Integer streakPosition) {}
    public record Activity(String id, String title, Instant date, Integer level, String badgeId) {}
    public record PublicAppearance(String displayName, String bio, boolean showRealName, String avatar,
        String frame, String banner, List<String> featuredBadgeIds, String favoriteBadgeId,
        boolean showStats, boolean showActivity) {}
    public record PublicProfile(String id, String name, String realName, String course, String institution,
        int level, int progressPercent, boolean maximumLevel, PublicAppearance appearance, Stats stats,
        List<Badge> badges, List<Activity> activity) {}
    public PublicProfile publicView(Profile profile, ProfileCustomization p) {
        List<Activity> activity = null;
        if (p.showActivity) {
            var events = new ArrayList<Activity>();
            profile.badges().stream().filter(b -> b.unlockedAt() != null)
                .forEach(b -> events.add(new Activity("badge-" + b.id(), b.name(), b.unlockedAt(), null, b.id())));
            profile.history().forEach(h -> events.add(new Activity("level-" + h.level(), "Alcançou o nível " + h.level(), h.date(), h.level(), null)));
            activity = events.stream().sorted(Comparator.comparing(Activity::date).reversed()).limit(4).toList();
        }
        var stats = p.showStats ? new Stats(profile.totalReceived(), profile.nextLevelAt(), profile.levelStart(),
            profile.streak(), profile.bestStreak(), profile.coinPosition(), profile.streakPosition()) : null;
        // Never copy the cadastral name into the public name field when the student chose an alias.
        return new PublicProfile(profile.id(), p.displayName, p.showRealName ? profile.name() : null,
            profile.course(), profile.institution(), profile.level(), profile.progressPercent(), profile.nextLevelAt() == null,
            new PublicAppearance(p.displayName, p.bio, p.showRealName, p.avatar, p.frame, p.banner,
                view(p).featuredBadgeIds(), p.favoriteBadgeId, p.showStats, p.showActivity), stats, profile.badges(), activity);
    }
    public record AvatarAsset(String assetId, String url, int width, int height) {}
    public AvatarAsset upload(MultipartFile file) throws IOException {
        var owner = identity.require("ALUNO");
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024) throw ApiException.bad("Envie uma imagem de até 2 MB.");
        BufferedImage image;
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(file.getBytes()))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw ApiException.bad("Envie uma imagem PNG ou JPEG válida.");
            var reader = readers.next();
            try {
                reader.setInput(input);
                if (!Set.of("png", "jpeg", "jpg").contains(reader.getFormatName().toLowerCase(Locale.ROOT)))
                    throw ApiException.bad("Envie o recorte em PNG ou JPEG.");
                int w = reader.getWidth(0), h = reader.getHeight(0);
                if (w < 64 || h < 64 || w > 8192 || h > 8192 || (long) w * h > 20_000_000)
                    throw ApiException.bad("Dimensões da imagem inválidas.");
                image = reader.read(0);
            } finally { reader.dispose(); }
        }
        if (image == null) throw ApiException.bad("Imagem inválida.");
        var normalized = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
        var graphics = normalized.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            int side = Math.min(image.getWidth(), image.getHeight());
            int x = (image.getWidth() - side) / 2, y = (image.getHeight() - side) / 2;
            graphics.drawImage(image, 0, 0, 256, 256, x, y, x + side, y + side, null);
        } finally { graphics.dispose(); }
        var bytes = new ByteArrayOutputStream(); ImageIO.write(normalized, "png", bytes);
        var asset = new ProfileAvatar(); asset.studentId = owner.id; asset.content = bytes.toByteArray(); db.save(asset);
        return new AvatarAsset(asset.id, AVATARS + asset.id, 256, 256);
    }
    public byte[] avatar(String id) {
        var asset = db.get(ProfileAvatar.class, id);
        var p = assertCanView(asset.studentId);
        if (!identity.current().id.equals(asset.studentId) && !p.avatar.equals(AVATARS + id)) throw ApiException.missing();
        return asset.content;
    }
}
