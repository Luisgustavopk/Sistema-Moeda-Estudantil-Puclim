package br.pucminas.puclim.dto.request;

import jakarta.validation.constraints.*;
import java.util.List;
import tools.jackson.databind.JsonNode;

public record ProfileAppearanceRequest(
    @NotBlank @Size(min = 2, max = 40) String displayName,
    @NotNull @Size(max = 240) String bio,
    @NotNull Boolean showRealName,
    @NotBlank @Size(max = 300) String avatar,
    @NotBlank @Size(max = 40) String frame,
    @NotBlank @Size(max = 40) String banner,
    @NotNull @Size(max = 3) List<@NotBlank @Size(max = 100) String> featuredBadgeIds,
    @Size(max = 100) String favoriteBadgeId,
    @NotBlank @Pattern(regexp = "all|institution|private") String visibility,
    @NotNull Boolean showStats, @NotNull Boolean showActivity,
    JsonNode title) {
    // Missing preserves an existing title for older clients; explicit null removes it.
    public boolean titleProvided() { return title != null; }
    public String titleValue() { return title == null || title.isNull() ? null : title.asString(); }
    @AssertTrue(message = "Título inválido.")
    public boolean isTitleValid() {
        return title == null || title.isNull() || title.isString() && title.asString().matches("[a-z][a-z0-9_-]{0,39}");
    }
}
