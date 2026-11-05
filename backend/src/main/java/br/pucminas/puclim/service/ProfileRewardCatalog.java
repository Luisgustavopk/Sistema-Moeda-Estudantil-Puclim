package br.pucminas.puclim.service;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.pucminas.puclim.entity.ProfileReward;
import br.pucminas.puclim.entity.ProfileReward.Kind;
import br.pucminas.puclim.entity.ProfileReward.Motion;
import br.pucminas.puclim.entity.ProfileReward.Palette;
import br.pucminas.puclim.entity.ProfileReward.Shape;
import br.pucminas.puclim.entity.ProfileReward.Variant;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.ProfileRewardRepository;

/**
 * Evaluates catalog data; adding a reward does not require changing this
 * service.
 */
@Service
@Transactional(readOnly = true)
public class ProfileRewardCatalog {
    private final ProfileRewardRepository repository;

    public ProfileRewardCatalog(ProfileRewardRepository repository) {
        this.repository = repository;
    }

    public record Visual(String icon, Palette palette, Variant variant, String assetUrl, int avatarInset,
            Shape avatarShape, Motion motion, int cycleMs) {
    }

    public record Visuals(Visual avatar, Visual frame, Visual banner) {
    }

    public record Unlock(String id, Kind kind, String name, String requirement,
            Integer requiredLevel, String badgeId, boolean unlocked, Visual visual) {
    }

    public static boolean eligible(ProfileReward item, int level, Set<String> awards) {
        return switch (item.rule) {
            case DEFAULT -> true;
            case LEVEL -> item.requiredLevel != null && level >= item.requiredLevel;
            case BADGE -> item.badge != null && awards.contains(item.badge.id);
            case ANY_BADGE -> !awards.isEmpty();
        };
    }

    private String requirement(ProfileReward item) {
        return switch (item.rule) {
            case DEFAULT -> "Disponível desde o início";
            case LEVEL -> "Alcance o nível " + item.requiredLevel;
            case BADGE -> "Conquiste " + item.badge.name + ": " + item.badge.description;
            case ANY_BADGE -> "Desbloqueie sua primeira conquista";
        };
    }

    private Visual visual(ProfileReward item) {
        return new Visual(item.icon, item.palette, item.variant, item.assetPath, item.avatarInset, item.avatarShape,
                item.motion, item.cycleMs);
    }

    public List<Unlock> unlocks(int level, Set<String> awards) {
        return repository.findAllByOrderBySortOrderAscIdAsc().stream().map(i -> new Unlock(i.code, i.kind, i.name,
                requirement(i), i.requiredLevel, i.badge == null ? null : i.badge.id, eligible(i, level, awards),
                visual(i))).toList();
    }

    public void require(Kind kind, String code, int level, Set<String> awards) {
        requireAll(Map.of(kind, code), level, awards);
    }

    public void requireAll(Map<Kind, String> selections, int level, Set<String> awards) {
        var items = repository.findAllByOrderBySortOrderAscIdAsc();
        for (var selection : selections.entrySet()) {
            var item = items.stream()
                .filter(i -> i.kind == selection.getKey() && i.code.equals(selection.getValue())).findFirst()
                .orElseThrow(() -> ApiException.bad("Personalização inválida."));
            if (!eligible(item, level, awards))
                throw ApiException.bad(requirement(item) + " para usar " + item.name + ".");
        }
    }

    public Visuals visuals(String avatar, String frame, String banner) {
        var items = repository.findAllByOrderBySortOrderAscIdAsc();
        return new Visuals(findVisual(items, Kind.AVATAR, avatar), findVisual(items, Kind.FRAME, frame),
                findVisual(items, Kind.BANNER, banner));
    }

    private Visual findVisual(List<ProfileReward> items, Kind kind, String code) {
        return items.stream().filter(i -> i.kind == kind && i.code.equals(code)).findFirst().map(this::visual)
                .orElse(null);
    }

    public Map<String, Visual> avatarVisuals() {
        return repository.findAllByOrderBySortOrderAscIdAsc().stream().filter(i -> i.kind == Kind.AVATAR)
                .collect(Collectors.toMap(i -> i.code, this::visual));
    }
}
