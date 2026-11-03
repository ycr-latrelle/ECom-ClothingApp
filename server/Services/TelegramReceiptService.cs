
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;

namespace server.Api.Services;

public sealed class TelegramReceiptService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
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
        CancellationToken cancellationToken = default)
    {
        var (botToken, chatId) = GetTelegramSettings();

        using var form = new MultipartFormDataContent();

        form.Add(new StringContent(chatId), "chat_id");

        await using var photoStream = photo.OpenReadStream();
        using var photoContent = new StreamContent(photoStream);

        if (MediaTypeHeaderValue.TryParse(
                photo.ContentType,
                out var mediaType))
        {
            photoContent.Headers.ContentType = mediaType;
        }

        // Deliberately no caption or customer information.
        form.Add(photoContent, "photo", "payment-receipt");

        using var response = await _httpClient.PostAsync(
            $"https://api.telegram.org/bot{botToken}/sendPhoto",
            form,
            cancellationToken);

        var result = await ReadResponseAsync(
            response,
            cancellationToken);

        if (!response.IsSuccessStatusCode ||
            result?.Ok != true ||
            result.Result.ValueKind != JsonValueKind.Object)
        {
            throw new HttpRequestException(
                $"Telegram photo upload failed: " +
                $"{result?.Description ?? response.StatusCode.ToString()}");
        }

        var message = result.Result.Deserialize<TelegramMessage>(
            JsonOptions);

        var largestPhoto = message?.Photo?.LastOrDefault();

        if (message is null ||
            largestPhoto is null ||
            string.IsNullOrWhiteSpace(largestPhoto.FileId))
        {
            throw new HttpRequestException(
                "Telegram did not return a usable receipt image reference.");
        }

        return new TelegramReceiptReference(
            chatId,
            message.MessageId,
            largestPhoto.FileId);
    }

    public async Task<bool> DeleteReceiptMessageAsync(
        TelegramReceiptReference receipt,
        CancellationToken cancellationToken = default)
    {
        var (botToken, _) = GetTelegramSettings();

        using var content = new FormUrlEncodedContent(
        [
            new KeyValuePair<string, string>(
                "chat_id",
                receipt.ChatId),

            new KeyValuePair<string, string>(
                "message_id",
                receipt.MessageId.ToString())
        ]);

        using var response = await _httpClient.PostAsync(
            $"https://api.telegram.org/bot{botToken}/deleteMessage",
            content,
            cancellationToken);

        var result = await ReadResponseAsync(
            response,
            cancellationToken);

        return response.IsSuccessStatusCode &&
               result?.Ok == true &&
               result.Result.ValueKind == JsonValueKind.True;
    }

    private (string BotToken, string ChatId) GetTelegramSettings()
    {
        var botToken = _configuration["Telegram:BotToken"];

        var chatId =
            _configuration["Telegram:PaymentReceiptsChatId"] ??
            _configuration["Telegram:ChatId"];

        if (string.IsNullOrWhiteSpace(botToken))
        {
            throw new InvalidOperationException(
                "Telegram:BotToken is missing.");
        }

        if (string.IsNullOrWhiteSpace(chatId))
        {
            throw new InvalidOperationException(
                "Telegram:PaymentReceiptsChatId is missing.");
        }

        return (botToken, chatId);
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
        public JsonElement Result { get; init; }
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
