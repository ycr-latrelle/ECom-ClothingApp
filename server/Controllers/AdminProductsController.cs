
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.OutputCaching;
using Npgsql;
using server.Api.Data;
using server.Api.Models;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/products")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminProductsController : ControllerBase
{
    private readonly ProductRepository _repository;
    private readonly ProductImageRepository _imageRepository;
    private readonly TelegramProductImageService _telegramService;
    private readonly IOutputCacheStore _outputCacheStore;
    private readonly ILogger<AdminProductsController> _logger;

    public AdminProductsController(
        ProductRepository repository,
        ProductImageRepository imageRepository,
        TelegramProductImageService telegramService,
        IOutputCacheStore outputCacheStore,
        ILogger<AdminProductsController> logger)
    {
        _repository = repository;
        _imageRepository = imageRepository;
        _telegramService = telegramService;
        _outputCacheStore = outputCacheStore;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminProductResponse>>> GetAll(
        CancellationToken cancellationToken)
    {
        var products = await _repository.GetAllAsync(cancellationToken);

        return Ok(products);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminProductResponse>> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var product = await _repository.GetByIdAsync(
            id,
            cancellationToken);

        if (product is null)
        {
            return NotFound(new
            {
                error = "Product not found."
            });
        }

        return Ok(product);
    }

    [HttpPost]
    public async Task<ActionResult<AdminProductResponse>> Create(
        [FromBody] ProductUpsertRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var product = await _repository.CreateAsync(
                request,
                cancellationToken);

            await InvalidatePublicProductsCacheAsync(cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = product.Id },
                product);
        }
        catch (PostgresException exception)
            when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new
            {
                error = "A product with this slug already exists."
            });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminProductResponse>> Update(
        Guid id,
        [FromBody] ProductUpsertRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var product = await _repository.UpdateAsync(
                id,
                request,
                cancellationToken);

            if (product is null)
            {
                return NotFound(new
                {
                    error = "Product not found."
                });
            }

            await InvalidatePublicProductsCacheAsync(cancellationToken);

            return Ok(product);
        }
        catch (PostgresException exception)
            when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            return Conflict(new
            {
                error = "A product with this slug already exists."
            });
        }
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<IActionResult> SetStatus(
        Guid id,
        [FromBody] UpdateProductStatusRequest request,
        CancellationToken cancellationToken)
    {
        var updated = await _repository.SetActiveAsync(
            id,
            request.IsActive,
            cancellationToken);

        if (!updated)
        {
            return NotFound(new
            {
                error = "Product not found."
            });
        }

        await InvalidatePublicProductsCacheAsync(cancellationToken);

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        // Retrieve image metadata before deleting the product.
        // The database cascade will remove these records.
        var images = await _imageRepository.GetByProductIdAsync(
            id,
            cancellationToken);

        try
        {
            var deleted = await _repository.DeleteAsync(
                id,
                cancellationToken);

            if (!deleted)
            {
                return NotFound(new
                {
                    error = "Product not found."
                });
            }
        }
        catch (PostgresException exception)
            when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation)
        {
            return Conflict(new
            {
                error = "This product is referenced by existing records and cannot be deleted."
            });
        }

        // Clean up Telegram messages after successful database deletion.
        var failedCleanupCount = 0;

        foreach (var image in images)
        {
            try
            {
                await _telegramService.DeleteMessageAsync(
                    image.TelegramMessageId,
                    CancellationToken.None);
            }
            catch (Exception exception)
            {
                failedCleanupCount++;

                _logger.LogError(
                    exception,
                    "Could not delete Telegram image message {MessageId} for product {ProductId}.",
                    image.TelegramMessageId,
                    id);
            }
        }

        await InvalidatePublicProductsCacheAsync(cancellationToken);

        return Ok(new
        {
            message = failedCleanupCount == 0
                ? "Product and associated images deleted successfully."
                : "Product deleted, but some Telegram images could not be cleaned up.",
            telegramCleanupPending = failedCleanupCount > 0,
            failedImageCount = failedCleanupCount
        });
    }

    private async Task InvalidatePublicProductsCacheAsync(
        CancellationToken cancellationToken)
    {
        await _outputCacheStore.EvictByTagAsync(
            "public-products",
            cancellationToken);
    }
}
