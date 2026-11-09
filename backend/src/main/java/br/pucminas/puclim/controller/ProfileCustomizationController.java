package br.pucminas.puclim.controller;

import java.io.IOException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;
import br.pucminas.puclim.dto.request.ProfileAppearanceRequest;
import br.pucminas.puclim.dto.request.ProfileRewardEquipRequest;
import br.pucminas.puclim.entity.ProfileReward.Kind;
import br.pucminas.puclim.service.ProfileCustomizationService;
import br.pucminas.puclim.service.ProfileRewardCatalog;
import br.pucminas.puclim.service.ProgressionService;
import br.pucminas.puclim.service.ProfileRewardUnlockService;
import java.util.List;
import br.pucminas.puclim.exception.ApiException;

@RestController
@RequestMapping("/api/gamificacao/perfil")
public class ProfileCustomizationController {
    private final ProfileCustomizationService profiles;
    private final ProgressionService progression;
    private final ProfileRewardUnlockService rewardUnlocks;
    public ProfileCustomizationController(ProfileCustomizationService profiles, ProgressionService progression, ProfileRewardUnlockService rewardUnlocks) {
        this.profiles = profiles; this.progression = progression; this.rewardUnlocks = rewardUnlocks;
    }
    @GetMapping("/personalizacao")
    public ProfileCustomizationService.Appearance own() { return profiles.own(); }
    @GetMapping("/desbloqueios")
    public List<ProfileRewardCatalog.Unlock> unlocks() {
        progression.refreshOwn();
        return profiles.unlocks();
    }
    @PutMapping("/personalizacao")
    public ProfileCustomizationService.Appearance save(@Valid @RequestBody ProfileAppearanceRequest input) {
        progression.refreshOwn();
        return profiles.save(input);
    }
    @PatchMapping("/personalizacao/recompensa")
    public ProfileCustomizationService.Appearance equip(@Valid @RequestBody ProfileRewardEquipRequest input) {
        progression.refreshOwn();
        return profiles.equip(input.kind(), input.id());
    }
    @PostMapping("/desbloqueios/{kind}/{code}/visualizado")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acknowledge(@PathVariable Kind kind, @PathVariable String code) {
        progression.refreshOwn();
        rewardUnlocks.acknowledge(kind, code);
    }
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ProfileCustomizationService.AvatarAsset upload(@RequestParam("file") MultipartFile file) {
        try { return profiles.upload(file); }
        catch (IOException ex) { throw ApiException.bad("Não foi possível ler a imagem. Envie um PNG, JPEG ou GIF válido."); }
    }
    @GetMapping("/avatar/{id}")
    public ResponseEntity<byte[]> avatar(@PathVariable String id, @RequestParam(defaultValue = "false", name = "static") boolean staticImage) {
        var asset = profiles.avatar(id, staticImage);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(asset.contentType())).cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff").body(asset.content());
    }
}
