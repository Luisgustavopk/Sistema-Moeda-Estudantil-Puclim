package br.pucminas.puclim.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Iterator;
import java.util.Locale;
import java.util.Set;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import br.pucminas.puclim.entity.ImageAsset;
import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.repository.ImageAssetRepository;

@Service
public class ImageService {
    public record StoredImage(Path path, String contentType) {
    }

    private final AccountService identity;
    private final ImageAssetRepository images;
    private final Path directory;

    public ImageService(AccountService i, ImageAssetRepository r, @Value("${puclim.images.directory}") String d) {
        identity = i;
        images = r;
        directory = Path.of(d).toAbsolutePath().normalize();
    }

    @Transactional
    public String upload(MultipartFile file) throws IOException {
        var company = identity.requirePartner("EMPRESA");
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024)
            throw ApiException.bad("Envie uma imagem de até 2 MB.");
        byte[] bytes = file.getBytes();
        String format;
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext())
                throw ApiException.bad("Formato inválido. Use JPEG ou PNG.");
            ImageReader reader = readers.next();
            try {
                reader.setInput(input);
                format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!Set.of("jpeg", "png").contains(format))
                    throw ApiException.bad("Use JPEG ou PNG.");
                if ((long) reader.getWidth(0) * reader.getHeight(0) > 20_000_000)
                    throw ApiException.bad("A imagem deve ter até 20 megapixels.");
                if (reader.read(0) == null)
                    throw ApiException.bad("Imagem inválida.");
            } finally {
                reader.dispose();
            }
        }
        ImageAsset image = new ImageAsset();
        image.owner = company.account;
        image.filename = image.id + (format.equals("jpeg") ? ".jpg" : ".png");
        image.contentType = format.equals("jpeg") ? "image/jpeg" : "image/png";
        Files.createDirectories(directory);
        Files.write(directory.resolve(image.filename), bytes, StandardOpenOption.CREATE_NEW);
        images.save(image);
        return "/api/uploads/imagens/" + image.filename;
    }

    @Transactional(readOnly = true)
    public StoredImage read(String filename) {
        identity.current();
        if (!filename.matches("[a-f0-9-]{36}\\.(jpg|png)"))
            throw ApiException.missing();
        ImageAsset image = images.findByFilename(filename).orElseThrow(ApiException::missing);
        Path path = directory.resolve(filename).normalize();
        if (!path.startsWith(directory) || !Files.isRegularFile(path))
            throw ApiException.missing();
        return new StoredImage(path, image.contentType);
    }
}
