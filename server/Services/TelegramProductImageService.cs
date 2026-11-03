
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace server.Api.Services;

public sealed record TelegramProductImageUploadResult(
    string FileId,
    string ChatId,
    long MessageId,
    long FileSize,
    string ContentType,
    string FileName);

public sealed class TelegramProductImageService
{
    private readonly HttpClient _httpClient;
    private readonly string _botToken;
    private readonly string _chatId;

    public TelegramProductImageService(
        HttpClient httpClient,
        IConfiguration configuration)
    {
        _httpClient = httpClient;

        _botToken = configuration["Telegram:BotToken"]
            ?? throw new InvalidOperationException(
                "Telegram:BotToken is not configured.");

        _chatId = configuration["Telegram:ProductImagesChatId"]
            ?? throw new InvalidOperationException(
                "Telegram:ProductImagesChatId is not configured.");
    }

    public async Task<TelegramProductImageUploadResult> UploadAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        CancellationToken cancellationToken = default)
    {
        using var form = new MultipartFormDataContent();

        form.Add(new StringContent(_chatId), "chat_id");

        using var fileContent = new StreamContent(fileStream);
        fileContent.Headers.ContentType =
            new System.Net.Http.Headers.MediaTypeHeaderValue(contentType);

        form.Add(
            fileContent,
            "document",
            Path.GetFileName(fileName));

        using var response = await _httpClient.PostAsync(
            $"https://api.telegram.org/bot{_botToken}/sendDocument",
            form,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var result =
            await ReadTelegramResponseAsync<TelegramMessage>(
                response,
                cancellationToken);

        if (result.Document is null)
            throw new InvalidOperationException(
                "Telegram did not return document information.");

        return new TelegramProductImageUploadResult(
            result.Document.FileId,
            _chatId,
            result.MessageId,
            result.Document.FileSize,
            result.Document.MimeType ?? contentType,
            result.Document.FileName ?? Path.GetFileName(fileName));
    }

    public async Task<byte[]> DownloadAsync(
        string fileId,
        CancellationToken cancellationToken = default)
    {
        var getFileUrl =
            $"https://api.telegram.org/bot{_botToken}/getFile" +
            $"?file_id={Uri.EscapeDataString(fileId)}";

        using var response = await _httpClient.GetAsync(
            getFileUrl,
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var result =
            await ReadTelegramResponseAsync<TelegramFile>(
                response,
                cancellationToken);

        if (string.IsNullOrWhiteSpace(result.FilePath))
            throw new InvalidOperationException(
                "Telegram did not return a file path.");

        var downloadUrl =
            $"https://api.telegram.org/file/bot{_botToken}/{result.FilePath}";

        return await _httpClient.GetByteArrayAsync(
            downloadUrl,
            cancellationToken);
    }

    public async Task DeleteMessageAsync(
        long messageId,
        CancellationToken cancellationToken = default)
    {
        var url =
            $"https://api.telegram.org/bot{_botToken}/deleteMessage";

        using var response = await _httpClient.PostAsJsonAsync(
            url,
            new
            {
                chat_id = _chatId,
                message_id = messageId
            },
            cancellationToken);

        response.EnsureSuccessStatusCode();

        var result =
            await response.Content.ReadFromJsonAsync<TelegramApiResponse<bool>>(
                cancellationToken: cancellationToken);

        if (result is null || !result.Ok)
            throw new InvalidOperationException(
                result?.Description ?? "Telegram could not delete the image.");
    }

    private static async Task<T> ReadTelegramResponseAsync<T>(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        var result =
            await response.Content.ReadFromJsonAsync<TelegramApiResponse<T>>(
                cancellationToken: cancellationToken);

        if (result is null || !result.Ok || result.Result is null)
            throw new InvalidOperationException(
                result?.Description ?? "Telegram API request failed.");

        return result.Result;
    }

    private sealed class TelegramApiResponse<T>
    {
        [JsonPropertyName("ok")]
        public bool Ok { get; set; }

        [JsonPropertyName("result")]
        public T? Result { get; set; }

        [JsonPropertyName("description")]
        public string? Description { get; set; }
    }

    private sealed class TelegramMessage
    {
        [JsonPropertyName("message_id")]
        public long MessageId { get; set; }

        [JsonPropertyName("document")]
        public TelegramDocument? Document { get; set; }
    }

    private sealed class TelegramDocument
    {
        [JsonPropertyName("file_id")]
        public string FileId { get; set; } = string.Empty;

        [JsonPropertyName("file_size")]
        public long FileSize { get; set; }

        [JsonPropertyName("mime_type")]
        public string? MimeType { get; set; }

        [JsonPropertyName("file_name")]
        public string? FileName { get; set; }
    }

    private sealed class TelegramFile
    {
        [JsonPropertyName("file_path")]
        public string? FilePath { get; set; }
    }
}
