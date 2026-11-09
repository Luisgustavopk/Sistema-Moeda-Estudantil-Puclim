package br.pucminas.puclim.dto.request;

import br.pucminas.puclim.entity.ProfileReward.Kind;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record ProfileRewardEquipRequest(@NotNull Kind kind,
        @JsonProperty(required = true) @Pattern(regexp = "[a-z][a-z0-9_-]{0,39}") String id) {}
