
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Models;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/products/{productId:guid}/images")]
public sealed class ProductImagesController : ControllerBase
{
    private readonly ProductImageRepository _repository;
    private readonly TelegramProductImageService _telegramService;
    private readonly ILogger<ProductImagesController> _logger;

    public ProductImagesController(
        ProductImageRepository repository,
        TelegramProductImageService telegramService,
        ILogger<ProductImagesController> logger)
    {
        _repository = repository;
        _telegramService = telegramService;
        _logger = logger;
    }

    [HttpGet("{imageId:guid}")]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetImage(
        Guid productId,
        Guid imageId,
        CancellationToken cancellationToken)
    {
        var image = await _repository.GetByIdAsync(
            imageId,
            cancellationToken);

        if (image is null || image.ProductId != productId)
            return NotFound();

        return await DownloadImageAsync(image, cancellationToken);
    }

    [HttpGet("primary")]
    [ResponseCache(Duration = 3600, Location = ResponseCacheLocation.Any)]
    public async Task<IActionResult> GetPrimaryImage(
        Guid productId,
        CancellationToken cancellationToken)
    {
        var image = await _repository.GetPrimaryAsync(
            productId,
            cancellationToken);

        if (image is null)
            return NotFound();

        return await DownloadImageAsync(image, cancellationToken);
    }

    private async Task<IActionResult> DownloadImageAsync(
        ProductImageRecord image,
        CancellationToken cancellationToken)
    {
        try
        {
            var imageBytes = await _telegramService.DownloadAsync(
                image.TelegramFileId,
                cancellationToken);

            return File(imageBytes, image.ContentType);
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
                "Could not retrieve product image {ImageId}.",
                image.Id);

            return StatusCode(502, new
            {
                error = "The product image is temporarily unavailable."
            });
        }
    }
}
