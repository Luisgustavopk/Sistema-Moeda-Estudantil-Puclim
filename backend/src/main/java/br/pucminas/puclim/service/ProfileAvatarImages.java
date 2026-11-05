package br.pucminas.puclim.service;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Locale;
import java.util.Set;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;

import org.w3c.dom.Node;

import br.pucminas.puclim.exception.ApiException;

/**
 * Validates every GIF frame without flattening its timing, transparency or
 * disposal.
 */
public final class ProfileAvatarImages {
    public static final int MAX_BYTES = 2 * 1024 * 1024;
    public static final int GIF_MAX_DIMENSION = 512;
    public static final int GIF_MAX_FRAMES = 100;

    private ProfileAvatarImages() {
    }

    public record Decoded(byte[] content, String contentType, byte[] staticContent, int width, int height) {
    }

    public static boolean isGif(byte[] bytes) {
        return bytes.length >= 6 && bytes[0] == 'G' && bytes[1] == 'I' && bytes[2] == 'F';
    }

    public static Decoded decode(byte[] bytes) throws IOException {
        if (bytes.length == 0 || bytes.length > MAX_BYTES)
            throw ApiException.bad("Envie uma imagem de até 2 MB.");
        try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext())
                throw ApiException.bad("Envie uma imagem PNG, JPEG ou GIF válida.");
            var reader = readers.next();
            try {
                reader.setInput(input);
                reader.addIIOReadWarningListener((source, warning) -> {
                    throw ApiException.bad("Imagem incompleta ou inválida.");
                });
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                if (!Set.of("png", "jpeg", "jpg", "gif").contains(format))
                    throw ApiException.bad("Envie o recorte em PNG, JPEG ou o GIF original.");
                if (format.equals("gif"))
                    return decodeGif(reader, bytes);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width < 64 || height < 64 || width > 8192 || height > 8192 || (long) width * height > 20_000_000)
                    throw ApiException.bad("Dimensões da imagem inválidas.");
                byte[] png = png(reader.read(0));
                return new Decoded(png, "image/png", null, 256, 256);
            } finally {
                reader.dispose();
            }
        }
    }

    private static Decoded decodeGif(ImageReader reader, byte[] bytes) throws IOException {
        if (bytes[bytes.length - 1] != 0x3b)
            throw ApiException.bad("GIF incompleto ou inválido.");
        var tree = reader.getStreamMetadata().getAsTree("javax_imageio_gif_stream_1.0");
        var screen = child(tree, "LogicalScreenDescriptor");
        int width = attribute(screen, "logicalScreenWidth"), height = attribute(screen, "logicalScreenHeight");
        if (width < 64 || height < 64 || width > GIF_MAX_DIMENSION || height > GIF_MAX_DIMENSION)
            throw ApiException.bad("Use um GIF entre 64 e " + GIF_MAX_DIMENSION + " pixels por lado.");
        int frames = reader.getNumImages(true);
        if (frames < 1 || frames > GIF_MAX_FRAMES || (long) width * height * frames > 25_000_000)
            throw ApiException
                    .bad("Use um GIF com até " + GIF_MAX_FRAMES + " quadros e até 25 milhões de pixels no total.");
        BufferedImage first = null;
        for (int i = 0; i < frames; i++) {
            var descriptor = child(reader.getImageMetadata(i).getAsTree("javax_imageio_gif_image_1.0"),
                    "ImageDescriptor");
            int x = attribute(descriptor, "imageLeftPosition"), y = attribute(descriptor, "imageTopPosition");
            int w = reader.getWidth(i), h = reader.getHeight(i);
            if (w < 1 || h < 1 || x < 0 || y < 0 || x + w > width || y + h > height)
                throw ApiException.bad("Quadro GIF fora das dimensões da imagem.");
            var frame = reader.read(i);
            if (frame == null)
                throw ApiException.bad("Quadro GIF inválido.");
            if (i == 0) {
                first = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
                var graphics = first.createGraphics();
                try {
                    graphics.drawImage(frame, x, y, null);
                } finally {
                    graphics.dispose();
                }
            }
        }
        return new Decoded(bytes, "image/gif", png(first), width, height);
    }

    private static Node child(Node parent, String name) {
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling())
            if (node.getNodeName().equals(name))
                return node;
        throw ApiException.bad("Metadados da imagem inválidos.");
    }

    private static int attribute(Node node, String name) {
        var value = node.getAttributes().getNamedItem(name);
        if (value == null)
            throw ApiException.bad("Metadados da imagem inválidos.");
        return Integer.parseInt(value.getNodeValue());
    }

    private static byte[] png(BufferedImage image) throws IOException {
        if (image == null)
            throw ApiException.bad("Imagem inválida.");
        var normalized = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
        var graphics = normalized.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            int side = Math.min(image.getWidth(), image.getHeight());
            int x = (image.getWidth() - side) / 2, y = (image.getHeight() - side) / 2;
            graphics.drawImage(image, 0, 0, 256, 256, x, y, x + side, y + side, null);
        } finally {
            graphics.dispose();
        }
        var output = new ByteArrayOutputStream();
        ImageIO.write(normalized, "png", output);
        return output.toByteArray();
    }
}
