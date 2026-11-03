
namespace server.Api.Services;

public static class ProductImageValidationService
{
    public const long MaxFileSize = 20_000_000;

    public static async Task<string> ValidateAndGetContentTypeAsync(
        Stream stream,
        long fileSize,
        CancellationToken cancellationToken = default)
    {
        if (fileSize <= 0)
            throw new InvalidOperationException("The image file is empty.");

        if (fileSize > MaxFileSize)
            throw new InvalidOperationException(
                "The image exceeds the maximum allowed size of 20 MiB.");

        var header = new byte[12];

        stream.Position = 0;

        var bytesRead = await stream.ReadAsync(
            header.AsMemory(),
            cancellationToken);

        stream.Position = 0;

        if (bytesRead >= 3 &&
            header[0] == 0xFF &&
            header[1] == 0xD8 &&
            header[2] == 0xFF)
        {
            return "image/jpeg";
        }

        if (bytesRead >= 8 &&
            header[0] == 0x89 &&
            header[1] == 0x50 &&
            header[2] == 0x4E &&
            header[3] == 0x47 &&
            header[4] == 0x0D &&
            header[5] == 0x0A &&
            header[6] == 0x1A &&
            header[7] == 0x0A)
        {
            return "image/png";
        }

        if (bytesRead >= 6)
        {
            var signature = System.Text.Encoding.ASCII.GetString(
                header, 0, 6);

            if (signature is "GIF87a" or "GIF89a")
                return "image/gif";
        }

        if (bytesRead >= 12 &&
            header[0] == (byte)'R' &&
            header[1] == (byte)'I' &&
            header[2] == (byte)'F' &&
            header[3] == (byte)'F' &&
            header[8] == (byte)'W' &&
            header[9] == (byte)'E' &&
            header[10] == (byte)'B' &&
            header[11] == (byte)'P')
        {
            return "image/webp";
        }

        throw new InvalidOperationException(
            "Unsupported or invalid image. Use JPEG, PNG, WEBP, or GIF.");
    }

    public static string SanitizeFileName(string? fileName)
    {
        var normalized = (fileName ?? string.Empty)
            .Replace('\\', '/');

        var safeName = Path.GetFileName(normalized)
            .Replace("\r", "")
            .Replace("\n", "")
            .Trim();

        if (string.IsNullOrWhiteSpace(safeName))
            return "product-image";

        return safeName.Length > 255
            ? safeName[..255]
            : safeName;
    }
}
