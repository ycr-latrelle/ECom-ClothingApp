
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    private readonly ILogger<AdminProductsController> _logger;

    public AdminProductsController(
        ProductRepository repository,
        ProductImageRepository imageRepository,
        TelegramProductImageService telegramService,
        ILogger<AdminProductsController> logger)
    {
        _repository = repository;
        _imageRepository = imageRepository;
        _telegramService = telegramService;
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
    [ProducesResponseType<AdminProductResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminProductResponse>> Create(
        [FromBody] ProductUpsertRequest request,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized(new
            {
                error = "Unable to identify the authenticated administrator."
            });
        }

        try
        {
            var product = await _repository.CreateAsync(
                request,
                firebaseUid,
                cancellationToken);

            return CreatedAtAction(
                nameof(GetById),
                new { id = product.Id },
                product);
        }
        catch (InventoryValidationException exception)
        {
            return BadRequest(new
            {
                error = exception.Message
            });
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
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized(new
            {
                error = "Unable to identify the authenticated administrator."
            });
        }

        try
        {
            var product = await _repository.UpdateAsync(
                id,
                request,
                firebaseUid,
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
        catch (InventoryValidationException exception)
        {
            return BadRequest(new
            {
                error = exception.Message
            });
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

        return Ok(new
        {
            message = failedCleanupCount == 0
                ? "Product and associated images deleted successfully."
                : "Product deleted, but some Telegram images could not be cleaned up.",
            telegramCleanupPending = failedCleanupCount > 0,
            failedImageCount = failedCleanupCount
        });
    }

}
