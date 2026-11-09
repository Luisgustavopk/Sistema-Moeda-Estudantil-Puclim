package br.pucminas.puclim.service;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import br.pucminas.puclim.dto.request.ProfileAppearanceRequest;
import br.pucminas.puclim.dto.response.GamificationResponses.Profile;
import br.pucminas.puclim.dto.response.GamificationResponses.Badge;
import br.pucminas.puclim.entity.*;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;
import br.pucminas.puclim.config.GamificationPolicy;
import br.pucminas.puclim.entity.ProfileReward.Kind;

@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class ProfileCustomizationService {
    private static final String AVATARS = "/api/gamificacao/perfil/avatar/";
    private final GamificationRepository db;
    private final AccountService identity;
    private final GamificationPolicy policy;
    private final ProfileRewardCatalog catalog;
    private final ProfileRewardUnlockService rewardUnlocks;
    public ProfileCustomizationService(GamificationRepository db, AccountService identity, GamificationPolicy policy, ProfileRewardCatalog catalog,
            ProfileRewardUnlockService rewardUnlocks) {
        this.db = db; this.identity = identity; this.policy = policy; this.catalog = catalog; this.rewardUnlocks = rewardUnlocks;
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
        String visibility, boolean showStats, boolean showActivity, ProfileRewardCatalog.Visuals visuals, UploadPolicy uploadPolicy,
        String title, String titleName) {}
    public record UploadPolicy(int gifRequiredLevel, boolean gifUnlocked, int maxBytes, int gifMaxDimension, int gifMaxFrames) {}
    public Appearance view(ProfileCustomization p) {
        return view(p, null);
    }
    private Appearance view(ProfileCustomization p, UploadPolicy uploadPolicy) {
        return new Appearance(p.displayName, p.bio, p.showRealName, p.avatar, p.frame, p.banner,
            p.featuredBadgeIds.isBlank() ? List.of() : List.of(p.featuredBadgeIds.split(",")),
            p.favoriteBadgeId, p.visibility, p.showStats, p.showActivity, catalog.visuals(p.avatar, p.frame, p.banner), uploadPolicy,
            p.title, catalog.titleName(p.title));
    }
    public Appearance own() {
        var owner = identity.require("ALUNO");
        return view(settings(owner.id, owner.name), uploadPolicy(level(owner.id)));
    }
    private int level(String studentId) {
        var progress = db.optional(StudentProgress.class, studentId);
        return Math.max(progress == null ? 1 : progress.level, policy.level(db.totalEligibleReceived(studentId)));
    }
    private UploadPolicy uploadPolicy(int level) {
        return new UploadPolicy(policy.getAnimatedAvatarLevel(), level >= policy.getAnimatedAvatarLevel(),
            ProfileAvatarImages.MAX_BYTES, ProfileAvatarImages.GIF_MAX_DIMENSION, ProfileAvatarImages.GIF_MAX_FRAMES);
    }
    private void requireGifLevel(int level) {
        if (level < policy.getAnimatedAvatarLevel()) throw ApiException.bad("Alcance o nível " + policy.getAnimatedAvatarLevel() + " para usar um GIF animado como avatar.");
    }
    private String avatarUrl(ProfileAvatar asset) {
        return AVATARS + asset.id + (asset.contentType.equals("image/gif") ? ".gif" : "");
    }
    private ProfileAvatar findAvatar(String id) {
        return db.get(ProfileAvatar.class, id.endsWith(".gif") ? id.substring(0, id.length() - 4) : id);
    }
    public List<ProfileRewardCatalog.Unlock> unlocks() {
        var owner = identity.require("ALUNO");
        var awards = db.list(BadgeAward.class, "select a from BadgeAward a join fetch a.badge where a.student.id=:s", "s", owner.id)
            .stream().map(a -> a.badge.id).collect(java.util.stream.Collectors.toSet());
        return rewardUnlocks.withState(owner.id, catalog.unlocks(level(owner.id), awards));
    }
    public Map<String, ProfileRewardCatalog.Visual> avatarVisuals() { return catalog.avatarVisuals(); }
    public Map<String, String> titleNames() { return catalog.titleNames(); }
    public boolean rankingAppearanceVisible(ProfileCustomization p, Student student) {
        if (p.visibility.equals("all")) return true;
        var viewer = identity.current();
        if (viewer.id.equals(student.id)) return true;
        if (p.visibility.equals("institution")) {
            String institution = viewer.role.equals("ALUNO") ? db.get(Student.class, viewer.id).institution.id
                : db.get(Teacher.class, viewer.id).institution.id;
            return institution.equals(student.institution.id);
        }
        return false;
    }
    public String rankingAvatar(ProfileCustomization p, Student student) {
        return rankingAppearanceVisible(p, student) ? p.avatar : "initials";
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
        int level = level(owner.id);
        var selections = new EnumMap<Kind, String>(Kind.class);
        selections.put(Kind.FRAME, input.frame());
        selections.put(Kind.BANNER, input.banner());
        if (input.titleProvided() && input.titleValue() != null) selections.put(Kind.TITLE, input.titleValue());
        String avatar = input.avatar();
        if (avatar.startsWith(AVATARS)) {
            var asset = findAvatar(avatar.substring(AVATARS.length()));
            if (!asset.studentId.equals(owner.id)) throw ApiException.forbidden();
            if (asset.contentType.equals("image/gif")) requireGifLevel(level);
            avatar = avatarUrl(asset);
        } else selections.put(Kind.AVATAR, avatar);
        catalog.requireAll(selections, level, unlocked);
        boolean fresh = db.optional(ProfileCustomization.class, owner.id) == null;
        var p = settings(owner.id, owner.name);
        p.displayName = input.displayName().trim(); p.bio = input.bio().trim();
        if (p.displayName.length() < 2) throw ApiException.bad("Use pelo menos 2 caracteres no nome de exibição.");
        p.showRealName = input.showRealName(); p.avatar = avatar;
        p.frame = input.frame(); p.banner = input.banner();
        if (input.titleProvided()) p.title = input.titleValue();
        p.featuredBadgeIds = String.join(",", input.featuredBadgeIds()); p.favoriteBadgeId = input.favoriteBadgeId();
        p.visibility = input.visibility(); p.showStats = input.showStats(); p.showActivity = input.showActivity();
        if (fresh) db.save(p);
        return view(p, uploadPolicy(level));
    }
    /** Applies only one earned cosmetic, preserving text, privacy and every other selection. */
    public Appearance equip(Kind kind, String code) {
        var owner = identity.require("ALUNO");
        identity.locked(owner.id);
        if (code == null && kind != Kind.TITLE) throw ApiException.bad("Escolha uma personalização válida.");
        int level = level(owner.id);
        if (code != null) {
            var awards = db.list(BadgeAward.class, "select a from BadgeAward a where a.student.id=:s", "s", owner.id)
                .stream().map(a -> a.badge.id).collect(java.util.stream.Collectors.toSet());
            catalog.require(kind, code, level, awards);
        }
        boolean fresh = db.optional(ProfileCustomization.class, owner.id) == null;
        var p = settings(owner.id, owner.name);
        switch (kind) {
            case AVATAR -> p.avatar = code;
            case FRAME -> p.frame = code;
            case BANNER -> p.banner = code;
            case TITLE -> p.title = code;
        }
        if (fresh) db.save(p);
        return view(p, uploadPolicy(level));
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
        boolean showStats, boolean showActivity, ProfileRewardCatalog.Visuals visuals, String title, String titleName) {}
    public record PublicProfile(String id, String name, String realName, String course, String institution,
        int level, int progressPercent, boolean maximumLevel, PublicAppearance appearance, Stats stats,
        List<Badge> badges, List<Activity> activity) {}
    public PublicProfile publicView(Profile profile, ProfileCustomization p) {
        var appearance = view(p);
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
                appearance.featuredBadgeIds(), p.favoriteBadgeId, p.showStats, p.showActivity, appearance.visuals(), p.title, appearance.titleName()), stats, profile.badges(), activity);
    }
    public record AvatarAsset(String assetId, String url, int width, int height) {}
    public AvatarAsset upload(MultipartFile file) throws IOException {
        var owner = identity.require("ALUNO");
        if (file.isEmpty() || file.getSize() > ProfileAvatarImages.MAX_BYTES) throw ApiException.bad("Envie uma imagem de até 2 MB.");
        byte[] bytes = file.getBytes();
        boolean gif = ProfileAvatarImages.isGif(bytes);
        if (gif) requireGifLevel(level(owner.id));
        var image = ProfileAvatarImages.decode(bytes);
        if (!gif && image.contentType().equals("image/gif")) requireGifLevel(level(owner.id));
        var asset = new ProfileAvatar();
        asset.studentId = owner.id; asset.content = image.content(); asset.contentType = image.contentType(); asset.staticContent = image.staticContent();
        db.save(asset);
        return new AvatarAsset(asset.id, avatarUrl(asset), image.width(), image.height());
    }
    public record StoredAvatar(byte[] content, String contentType) {}
    public StoredAvatar avatar(String id, boolean staticImage) {
        var asset = findAvatar(id);
        var p = assertCanView(asset.studentId);
        if (!identity.current().id.equals(asset.studentId) && !p.avatar.equals(avatarUrl(asset))) throw ApiException.missing();
        if (staticImage && asset.staticContent != null) return new StoredAvatar(asset.staticContent, "image/png");
        return new StoredAvatar(asset.content, asset.contentType);
    }
}
