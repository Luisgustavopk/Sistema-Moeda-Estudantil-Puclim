package br.pucminas.puclim.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import br.pucminas.puclim.service.ImageService;

@RestController
@RequestMapping("/api/uploads/imagens")
public class ImageController {
    private final ImageService images;

    public ImageController(ImageService i) {
        images = i;
    }

    @PostMapping(consumes = "multipart/form-data")
    @ResponseStatus(HttpStatus.CREATED)
    Map<String, String> upload(@RequestParam MultipartFile file) throws IOException {
        return Map.of("url", images.upload(file));
    }

    @GetMapping("/{filename}")
    ResponseEntity<FileSystemResource> read(@PathVariable String filename) {
        var image = images.read(filename);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(image.contentType()))
                .header("X-Content-Type-Options", "nosniff").body(new FileSystemResource(image.path()));
    }
}
