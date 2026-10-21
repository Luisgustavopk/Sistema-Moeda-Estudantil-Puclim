package br.pucminas.puclim.controller;

import java.io.IOException;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.Valid;
import br.pucminas.puclim.dto.request.ProfileAppearanceRequest;
import br.pucminas.puclim.service.ProfileCustomizationService;
import br.pucminas.puclim.exception.ApiException;

@RestController
@RequestMapping("/api/gamificacao/perfil")
public class ProfileCustomizationController {
    private final ProfileCustomizationService profiles;
    public ProfileCustomizationController(ProfileCustomizationService profiles) { this.profiles = profiles; }
    @GetMapping("/personalizacao")
    public ProfileCustomizationService.Appearance own() { return profiles.own(); }
    @PutMapping("/personalizacao")
    public ProfileCustomizationService.Appearance save(@Valid @RequestBody ProfileAppearanceRequest input) {
        return profiles.save(input);
    }
    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ProfileCustomizationService.AvatarAsset upload(@RequestParam("file") MultipartFile file) {
        try { return profiles.upload(file); }
        catch (IOException ex) { throw ApiException.bad("Não foi possível ler a imagem. Envie um PNG ou JPEG válido."); }
    }
    @GetMapping("/avatar/{id}")
    public ResponseEntity<byte[]> avatar(@PathVariable String id) {
        return ResponseEntity.ok().contentType(MediaType.IMAGE_PNG).cacheControl(CacheControl.noStore())
            .header("X-Content-Type-Options", "nosniff").body(profiles.avatar(id));
    }
}
