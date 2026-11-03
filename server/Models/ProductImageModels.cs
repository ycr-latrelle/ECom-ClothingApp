
using System.ComponentModel.DataAnnotations;

namespace server.Api.Models;

public sealed record ProductImageRecord(
    Guid Id,
    Guid ProductId,
    string TelegramFileId,
    string TelegramChatId,
    long TelegramMessageId,
    string ContentType,
    long FileSize,
    string Sha256,
    int DisplayOrder,
    bool IsPrimary,
    string FileName,
    DateTime CreatedAt);

public sealed record ProductImageResponse(
    Guid Id,
    Guid ProductId,
    string FileName,
    string ContentType,
    long FileSize,
    int DisplayOrder,
    bool IsPrimary,
    string Url);

public sealed class ReorderProductImagesRequest
{
    [Required]
    [MinLength(1)]
    public Guid[] ImageIds { get; set; } = [];
}
