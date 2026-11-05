package br.pucminas.puclim.unit;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import br.pucminas.puclim.entity.BadgeDefinition;
import br.pucminas.puclim.entity.ProfileReward;
import br.pucminas.puclim.entity.ProfileReward.Kind;
import br.pucminas.puclim.entity.ProfileReward.Palette;
import br.pucminas.puclim.entity.ProfileReward.Rule;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.ProfileRewardRepository;
import br.pucminas.puclim.service.ProfileRewardCatalog;

class ProfileRewardCatalogTest {
    private ProfileReward item(Kind kind, String code, Rule rule) {
        var item = new ProfileReward();
        item.kind = kind;
        item.code = code;
        item.name = code;
        item.rule = rule;
        item.palette = Palette.GOLD;
        return item;
    }

    @Test
    void levelRulesRespectBoundariesAndDoNotChangeDefaultOptionsWithTheSameCode() {
        var background = item(Kind.BANNER, "gold", Rule.DEFAULT);
        var frame = item(Kind.FRAME, "gold", Rule.LEVEL);
        frame.requiredLevel = 5;
        var repository = mock(ProfileRewardRepository.class);
        when(repository.findAllByOrderBySortOrderAscIdAsc()).thenReturn(List.of(background, frame));
        var catalog = new ProfileRewardCatalog(repository);
        catalog.require(Kind.BANNER, "gold", 1, Set.of());
        assertThrows(ApiException.class, () -> catalog.require(Kind.FRAME, "gold", 4, Set.of()));
        catalog.require(Kind.FRAME, "gold", 5, Set.of());
        assertThrows(ApiException.class, () -> catalog.require(Kind.FRAME, "unknown", 5, Set.of()));
    }

    @Test
    void badgeRulesRequireTheExactAwardEvenAtMaximumLevel() {
        var reward = item(Kind.AVATAR, "custom-code", Rule.BADGE);
        reward.badge = new BadgeDefinition();
        reward.badge.id = "STREAK_SILVER";
        assertFalse(ProfileRewardCatalog.eligible(reward, 5, Set.of("STREAK_7")));
        assertTrue(ProfileRewardCatalog.eligible(reward, 1, Set.of("STREAK_SILVER")));
        reward.rule = Rule.ANY_BADGE;
        assertFalse(ProfileRewardCatalog.eligible(reward, 5, Set.of()));
        assertTrue(ProfileRewardCatalog.eligible(reward, 1, Set.of("FIRST_COIN")));
    }
}
