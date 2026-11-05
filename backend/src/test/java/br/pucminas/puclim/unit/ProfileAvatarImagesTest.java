package br.pucminas.puclim.unit;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Arrays;

import javax.imageio.ImageIO;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import org.junit.jupiter.api.Test;

import br.pucminas.puclim.exception.ApiException;
import br.pucminas.puclim.service.ProfileAvatarImages;
import br.pucminas.puclim.support.AvatarGifFixture;

class ProfileAvatarImagesTest {
    @Test
    void preservesAnimatedBytesAndProvidesStaticThumbnail() throws Exception {
        byte[] gif = AvatarGifFixture.gif(64, 2);
        var decoded = ProfileAvatarImages.decode(gif);
        assertEquals("image/gif", decoded.contentType());
        assertArrayEquals(gif, decoded.content());
        assertEquals(64, decoded.width());
        var thumbnail = ImageIO.read(new ByteArrayInputStream(decoded.staticContent()));
        assertEquals(256, thumbnail.getWidth());
        assertEquals(256, thumbnail.getHeight());
        try (var stream = ImageIO.createImageInputStream(new ByteArrayInputStream(decoded.content()))) {
            var reader = ImageIO.getImageReaders(stream).next();
            try {
                reader.setInput(stream);
                assertEquals(2, reader.getNumImages(true));
            } finally {
                reader.dispose();
            }
        }
    }

    @Test
    void normalizesStaticImagesAsBefore() throws Exception {
        var output = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(128, 64, BufferedImage.TYPE_INT_RGB), "png", output);
        var decoded = ProfileAvatarImages.decode(output.toByteArray());
        assertEquals("image/png", decoded.contentType());
        assertNull(decoded.staticContent());
        assertEquals(256, ImageIO.read(new ByteArrayInputStream(decoded.content())).getWidth());
    }

    @Test
    void rejectsInvalidOversizedTruncatedAndExcessiveFrameFiles() throws Exception {
        assertThrows(ApiException.class, () -> ProfileAvatarImages.decode(new byte[] { 1, 2, 3 }));
        assertThrows(ApiException.class, () -> ProfileAvatarImages.decode(new byte[ProfileAvatarImages.MAX_BYTES + 1]));
        var gif = AvatarGifFixture.gif(64, 2);
        assertThrows(ApiException.class, () -> ProfileAvatarImages.decode(Arrays.copyOf(gif, gif.length - 1)));
        var tooLarge = AvatarGifFixture.gif(513, 2);
        assertThrows(ApiException.class, () -> ProfileAvatarImages.decode(tooLarge));
        var tooMany = AvatarGifFixture.gif(64, 101);
        assertThrows(ApiException.class, () -> ProfileAvatarImages.decode(tooMany));
    }
}
