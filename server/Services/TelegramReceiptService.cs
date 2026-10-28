using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;

namespace server.Api.Services;

public sealed class TelegramReceiptService
{
    private const int MaxPhotoCaptionLength = 1024;
    private const int MessageChunkLength = 3900;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public TelegramReceiptService(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<TelegramReceiptReference> SendReceiptPhotoAsync(
        IFormFile photo,
        string caption,
        CancellationToken cancellationToken = default)
    {
        var (botToken, chatId) = GetTelegramSettings();
        var captionIsLong = caption.Length > MaxPhotoCaptionLength;
        var photoCaption = captionIsLong
            ? BuildShortCaption(caption)
            : caption;

        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(chatId), "chat_id");
        form.Add(new StringContent(photoCaption), "caption");

        await using var photoStream = photo.OpenReadStream();
        using var photoContent = new StreamContent(photoStream);

        if (MediaTypeHeaderValue.TryParse(photo.ContentType, out var mediaType))
        {
            photoContent.Headers.ContentType = mediaType;
        }

        form.Add(photoContent, "photo", "payment-receipt");

        using var response = await _httpClient.PostAsync(
            $"https://api.telegram.org/bot{botToken}/sendPhoto",
            form,
            cancellationToken);

        var telegramResponse = await ReadResponseAsync(response, cancellationToken);

        if (!response.IsSuccessStatusCode ||
            telegramResponse?.Ok != true ||
            telegramResponse.Result is null)
        {
            throw new HttpRequestException(
                $"Telegram photo upload failed: " +
                $"{telegramResponse?.Description ?? response.StatusCode.ToString()}");
        }

        var largestPhoto = telegramResponse.Result.Photo?.LastOrDefault();
        if (largestPhoto is null)
        {
            throw new HttpRequestException(
                "Telegram accepted the receipt but returned no photo reference.");
        }

        if (captionIsLong)
        {
            await SendFullReceiptTextAsync(
                botToken,
                chatId,
                caption,
                cancellationToken);
        }

        return new TelegramReceiptReference(
            chatId,
            telegramResponse.Result.MessageId,
            largestPhoto.FileId);
    }

    private (string BotToken, string ChatId) GetTelegramSettings()
    {
        var botToken = _configuration["Telegram:BotToken"];
        var chatId = _configuration["Telegram:ChatId"];

        if (string.IsNullOrWhiteSpace(botToken))
        {
            throw new InvalidOperationException("Telegram:BotToken is missing.");
        }

        if (string.IsNullOrWhiteSpace(chatId))
        {
            throw new InvalidOperationException("Telegram:ChatId is missing.");
        }

        return (botToken, chatId);
    }

    private static string BuildShortCaption(string caption)
    {
        var lines = caption
            .Replace("\r\n", "\n")
            .Split('\n');

        // The receipt begins with RECEIPT, order ID, and transaction ID.
        return string.Join("\n", lines.Take(5)).Trim();
    }

    private async Task SendFullReceiptTextAsync(
        string botToken,
        string chatId,
        string receiptText,
        CancellationToken cancellationToken)
    {
        foreach (var chunk in SplitText(receiptText, MessageChunkLength))
        {
            using var content = new FormUrlEncodedContent(
            [
                new KeyValuePair<string, string>("chat_id", chatId),
                new KeyValuePair<string, string>("text", chunk),
            ]);

            using var response = await _httpClient.PostAsync(
                $"https://api.telegram.org/bot{botToken}/sendMessage",
                content,
                cancellationToken);

            var telegramResponse = await ReadResponseAsync(
                response,
                cancellationToken);

            if (!response.IsSuccessStatusCode || telegramResponse?.Ok != true)
            {
                throw new HttpRequestException(
                    $"Telegram receipt details failed: " +
                    $"{telegramResponse?.Description ?? response.StatusCode.ToString()}");
            }
        }
    }

    private static IEnumerable<string> SplitText(string text, int chunkLength)
    {
        for (var offset = 0; offset < text.Length; offset += chunkLength)
        {
            var length = Math.Min(chunkLength, text.Length - offset);
            yield return text.Substring(offset, length);
        }
    }

    private static async Task<TelegramApiResponse?> ReadResponseAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var responseBody = await response.Content.ReadAsStringAsync(
            cancellationToken);

        try
        {
            return JsonSerializer.Deserialize<TelegramApiResponse>(
                responseBody,
                JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed class TelegramApiResponse
    {
        [JsonPropertyName("ok")]
        public bool Ok { get; init; }

        [JsonPropertyName("description")]
        public string? Description { get; init; }

        [JsonPropertyName("result")]
        public TelegramMessage? Result { get; init; }
    }

    private sealed class TelegramMessage
    {
        [JsonPropertyName("message_id")]
        public long MessageId { get; init; }

        [JsonPropertyName("photo")]
        public List<TelegramPhotoSize>? Photo { get; init; }
    }

    private sealed class TelegramPhotoSize
    {
        [JsonPropertyName("file_id")]
        public string FileId { get; init; } = string.Empty;
    }
}

public sealed record TelegramReceiptReference(
    string ChatId,
    long MessageId,
    string FileId);