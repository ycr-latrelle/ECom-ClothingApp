
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Models;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/products/{productId:guid}/images")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminProductImagesController : ControllerBase
{
    private readonly ProductImageRepository _repository;
    private readonly TelegramProductImageService _telegramService;
    private readonly ILogger<AdminProductImagesController> _logger;

    public AdminProductImagesController(
        ProductImageRepository repository,
        TelegramProductImageService telegramService,
        ILogger<AdminProductImagesController> logger)
    {
        _repository = repository;
        _telegramService = telegramService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ProductImageResponse>>> GetImages(
        Guid productId,
        CancellationToken cancellationToken)
    {
        var images = await _repository.GetByProductIdAsync(
            productId,
            cancellationToken);

        return Ok(images.Select(MapResponse).ToList());
    }

    [HttpPost]
    [RequestSizeLimit(22 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 22 * 1024 * 1024)]
    public async Task<ActionResult<ProductImageResponse>> Upload(
        Guid productId,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new
            {
                error = "Please select an image to upload."
            });
        }

        if (file.Length > ProductImageValidationService.MaxFileSize)
        {
            return BadRequest(new
            {
                error = "The maximum image size is 20,000,000 bytes."
            });
        }

        string contentType;
        string sha256;
        string fileName;

        await using var stream = file.OpenReadStream();

        try
        {
            contentType =
                await ProductImageValidationService
                    .ValidateAndGetContentTypeAsync(
                        stream,
                        file.Length,
                        cancellationToken);

            var hash = await SHA256.HashDataAsync(
                stream,
                cancellationToken);

            sha256 = Convert.ToHexString(hash).ToLowerInvariant();

            fileName = ProductImageValidationService.SanitizeFileName(
                file.FileName);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }

        stream.Position = 0;

        TelegramProductImageUploadResult telegramImage;

        try
        {
            telegramImage = await _telegramService.UploadAsync(
                stream,
                fileName,
                contentType,
                cancellationToken);
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Telegram upload failed for product {ProductId}.",
                productId);

            return StatusCode(502, new
            {
                error = "The image could not be uploaded to Telegram."
            });
        }

        try
        {
            var image = await _repository.AddAsync(
                productId,
                telegramImage.FileId,
                telegramImage.ChatId,
                telegramImage.MessageId,
                contentType,
                file.Length,
                sha256,
                fileName,
                cancellationToken);

            return Ok(MapResponse(image));
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            await TryDeleteTelegramMessageAsync(
                telegramImage.MessageId, productId);
            throw;
        }
        catch (KeyNotFoundException)
        {
            await TryDeleteTelegramMessageAsync(
                telegramImage.MessageId, productId);

            return NotFound(new { error = "Product not found." });
        }
        catch (InvalidOperationException exception)
        {
            await TryDeleteTelegramMessageAsync(
                telegramImage.MessageId, productId);

            return Conflict(new { error = exception.Message });
        }
        catch (Exception exception)
        {
            await TryDeleteTelegramMessageAsync(
                telegramImage.MessageId, productId);

            _logger.LogError(
                exception,
                "Could not save image metadata for product {ProductId}.",
                productId);

            return StatusCode(500, new
            {
                error = "The image was uploaded but could not be saved."
            });
        }
    }

    [HttpDelete("{imageId:guid}")]
    public async Task<IActionResult> DeleteImage(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        var deletedImage = await _repository.DeleteAsync(
            productId,
            imageId,
            cancellationToken);

        if (deletedImage is null)
        {
            return NotFound(new
            {
                error = "Product or image not found."
            });
        }

        var telegramDeleted = await TryDeleteTelegramMessageAsync(
            deletedImage.TelegramMessageId,
            productId);

        return Ok(new
        {
            message = telegramDeleted
                ? "Image deleted successfully."
                : "Image removed from the product, but Telegram cleanup is pending.",
            telegramCleanupPending = !telegramDeleted
        });
    }

    [HttpPatch("{imageId:guid}/primary")]
    public async Task<IActionResult> SetPrimaryImage(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        var updated = await _repository.SetPrimaryAsync(
            productId,
            imageId,
            cancellationToken);

        if (!updated)
        {
            return NotFound(new
            {
                error = "Product or image not found."
            });
        }

        return Ok(new
        {
            message = "Primary image updated successfully."
        });
    }

    [HttpPut("order")]
    public async Task<IActionResult> ReorderImages(
        Guid productId,
        [FromBody] ReorderProductImagesRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var updated = await _repository.ReorderAsync(
                productId,
                request.ImageIds,
                cancellationToken);

            if (!updated)
            {
                return NotFound(new
                {
                    error = "Product not found."
                });
            }

            return Ok(new
            {
                message = "Image order updated successfully."
            });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { error = exception.Message });
        }
    }

    private async Task<bool> TryDeleteTelegramMessageAsync(
        long messageId,
        Guid productId)
    {
        try
        {
            await _telegramService.DeleteMessageAsync(
                messageId,
                CancellationToken.None);

            return true;
        }
        catch (Exception exception)
        {
            _logger.LogError(
                exception,
                "Could not delete Telegram image message {MessageId} for product {ProductId}.",
                messageId,
                productId);

            return false;
        }
    }

    private static ProductImageResponse MapResponse(
        ProductImageRecord image)
    {
        return new ProductImageResponse(
            image.Id,
            image.ProductId,
            image.FileName,
            image.ContentType,
            image.FileSize,
            image.DisplayOrder,
            image.IsPrimary,
            $"/api/products/{image.ProductId}/images/{image.Id}");
    }
}
