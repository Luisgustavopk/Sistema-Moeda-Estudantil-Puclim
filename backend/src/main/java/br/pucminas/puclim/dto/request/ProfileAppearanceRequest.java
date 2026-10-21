package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;

public record ProfileAppearanceRequest(
    @NotBlank @Size(min = 2, max = 40) String displayName,
    @NotNull @Size(max = 240) String bio,
    @NotNull Boolean showRealName,
    @NotBlank @Size(max = 300) String avatar,
    @NotBlank @Pattern(regexp = "classic|merit") String frame,
    @NotBlank @Pattern(regexp = "petroleum|cream|gold") String banner,
    @NotNull @Size(max = 3) List<@NotBlank @Size(max = 100) String> featuredBadgeIds,
    @Size(max = 100) String favoriteBadgeId,
    @NotBlank @Pattern(regexp = "all|institution|private") String visibility,
    @NotNull Boolean showStats, @NotNull Boolean showActivity) {}
