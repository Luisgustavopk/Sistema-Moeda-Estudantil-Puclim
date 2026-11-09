package br.pucminas.puclim.service;

import java.time.Clock;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.entity.BadgeAward;
import br.pucminas.puclim.entity.ProfileReward;
import br.pucminas.puclim.entity.ProfileRewardState;
import br.pucminas.puclim.entity.ProfileRewardUnlock;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.GamificationRepository;

/**
 * Durable cosmetic grants and acknowledgements; never creates financial
 * rewards.
 */
@Service
@Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
public class ProfileRewardUnlockService {
    private final GamificationRepository db;
    private final AccountService identity;
    private final ProfileRewardCatalog catalog;
    private final Clock clock;

    public ProfileRewardUnlockService(GamificationRepository db, AccountService identity,
            ProfileRewardCatalog catalog, Clock clock) {
        this.db = db;
        this.identity = identity;
        this.catalog = catalog;
        this.clock = clock;
    }

    /**
     * Called after level and medal recalculation, under the same owner
     * lock/transaction.
     */
    public void synchronize(String studentId, int level) {
        identity.locked(studentId);
        boolean baseline = db.optional(ProfileRewardState.class, studentId) == null;
        var now = clock.instant();
        if (baseline) {
            var state = new ProfileRewardState();
            state.studentId = studentId;
            state.initializedAt = now;
            db.save(state);
        }
        var awards = db.list(BadgeAward.class, "select a from BadgeAward a where a.student.id=:s", "s", studentId)
                .stream().map(a -> a.badge.id).collect(Collectors.toSet());
        var existing = new HashSet<>(grants(studentId).keySet());
        for (var item : catalog.items()) {
            if (!existing.contains(key(item.kind, item.code)) && ProfileRewardCatalog.eligible(item, level, awards)) {
                var grant = new ProfileRewardUnlock();
                grant.studentId = studentId;
                grant.reward = item;
                grant.unlockedAt = now;
                grant.seenAt = baseline ? now : null;
                db.save(grant);
            }
        }
    }

    private static String key(ProfileReward.Kind kind, String code) {
        return kind + ":" + code;
    }

    private Map<String, ProfileRewardUnlock> grants(String studentId) {
        return db.list(ProfileRewardUnlock.class,
                "select u from ProfileRewardUnlock u join fetch u.reward where u.studentId=:s", "s", studentId)
                .stream().collect(Collectors.toMap(u -> key(u.reward.kind, u.reward.code), u -> u));
    }

    public List<ProfileRewardCatalog.Unlock> withState(String studentId, List<ProfileRewardCatalog.Unlock> items) {
        var grants = grants(studentId);
        return items.stream().map(i -> {
            var grant = grants.get(key(i.kind(), i.id()));
            return new ProfileRewardCatalog.Unlock(i.id(), i.kind(), i.name(), i.requirement(), i.requiredLevel(),
                    i.badgeId(), i.unlocked(), i.visual(), grant == null ? null : grant.unlockedAt,
                    i.unlocked() && grant != null && grant.seenAt == null);
        }).toList();
    }

    public void acknowledge(ProfileReward.Kind kind, String code) {
        var owner = identity.require("ALUNO");
        identity.locked(owner.id);
        var grant = grants(owner.id).get(key(kind, code));
        if (grant == null)
            throw ApiException.bad("Essa personalização ainda não foi desbloqueada.");
        if (grant.seenAt == null)
            grant.seenAt = clock.instant();
    }
}
