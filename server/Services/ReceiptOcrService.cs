using Google.Api.Gax.Grpc;
using Google.Cloud.Vision.V1;

namespace server.Api.Services;

public sealed class ReceiptOcrService
{
    private readonly ImageAnnotatorClient _client;

    public ReceiptOcrService(ImageAnnotatorClient client)
    {
        _client = client;
    }

    public async Task<string> ExtractTextAsync(
        Stream imageStream,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(imageStream);

        await using var buffer = new MemoryStream();
        await imageStream.CopyToAsync(buffer, cancellationToken);

        if (buffer.Length == 0)
        {
            return string.Empty;
        }

        var image = Image.FromBytes(buffer.ToArray());

        var result = await _client.DetectDocumentTextAsync(
            image,
            context: null,
            callSettings: CallSettings.FromCancellationToken(cancellationToken));

        return result.Text ?? string.Empty;
    }
}