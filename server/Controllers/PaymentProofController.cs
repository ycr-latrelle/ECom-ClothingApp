using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Models;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public sealed class PaymentProofController : ControllerBase
{
    private const long MaxImageBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedImageTypes =
        new(StringComparer.OrdinalIgnoreCase)
        {
            "image/jpeg",
            "image/png",
        };

    private readonly PaymentSubmissionRepository _repository;
    private readonly TelegramReceiptService _telegram;
    private readonly ILogger<PaymentProofController> _logger;

    public PaymentProofController(
        PaymentSubmissionRepository repository,
        TelegramReceiptService telegram,
        ILogger<PaymentProofController> logger)
    {
        _repository = repository;
        _telegram = telegram;
        _logger = logger;
    }

    [HttpPost("{orderId:guid}/payment-proof")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(5_500_000)]
    public async Task<IActionResult> Submit(
        Guid orderId,
        [FromForm] PaymentProofRequest request,
        CancellationToken cancellationToken)
    {
        var firebaseUid = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(firebaseUid))
        {
            return Unauthorized();
        }

        var image = request.ProofImage;
        if (image is null || image.Length == 0)
        {
            return BadRequest(new { error = "Choose a receipt image." });
        }

        if (image.Length > MaxImageBytes)
        {
            return BadRequest(new { error = "The receipt image must be 5 MB or smaller." });
        }

        if (!AllowedImageTypes.Contains(image.ContentType))
        {
            return BadRequest(new { error = "Upload a JPEG or PNG receipt image." });
        }

        var order = await _repository.GetOrderForPaymentAsync(
            orderId,
            firebaseUid,
            cancellationToken);

        if (order is null)
        {
            return NotFound();
        }

        if (!string.Equals(
                order.PaymentStatus,
                "awaiting_submission",
                StringComparison.Ordinal))
        {
            return Conflict(new
            {
                error = "This order is not awaiting a payment submission.",
            });
        }

        var method = request.PaymentMethod.Trim();
        var senderName = request.SenderName.Trim();
        var paymentReference = request.PaymentReferenceNumber.Trim();

        var address = string.Join(
            ", ",
            new[]
            {
                order.StreetAddress,
                $"Barangay {order.Barangay}",
                order.CityMunicipality,
                order.Province,
                order.PostalCode,
            });

        var latitude = order.DeliveryLatitude.ToString(
            "R",
            CultureInfo.InvariantCulture);
        var longitude = order.DeliveryLongitude.ToString(
            "R",
            CultureInfo.InvariantCulture);
        var mapLink = $"https://maps.google.com/?q={latitude},{longitude}";

        var productDetails = string.Join(
            "\n",
            order.Products.Select(product =>
                $"PRODUCT ID: {product.ProductId}\n" +
                $"PRODUCT NAME: {product.Name}\n" +
                $"PRODUCT QUANTITY: {product.Quantity}\n" +
                $"PRODUCT SIZE: {product.Size ?? "N/A"}"));

        var caption = $"""
            RECEIPT
            ___________________________
            ORDER ID: {order.OrderCode}
            DATABASE ORDER ID: {order.Id}
            TRANSACTION ID: {paymentReference}

            FULL NAME: {order.CustomerFullName}
            EMAIL ADDRESS: {order.CustomerEmail}
            MOBILE NUMBER: {order.MobileNumber}

            DELIVERY ADDRESS: {address}
            EXACT LOCATION: {mapLink}

            {productDetails}

            PAYMENT DETAILS
            [-----{method.ToUpperInvariant()}-----]
            SENDER NAME: {senderName}
            PAYMENT REFERENCE NUMBER: {paymentReference}
            AMOUNT DUE: PHP {order.DueToday.ToString("N2", CultureInfo.InvariantCulture)}
            """;

        TelegramReceiptReference telegramReceipt;

        try
        {
            telegramReceipt = await _telegram.SendReceiptPhotoAsync(
                image,
                caption,
                cancellationToken);
        }
        catch (Exception exception) when (
            exception is HttpRequestException ||
            exception is InvalidOperationException)
        {
            _logger.LogError(
                exception,
                "Could not send payment proof for order {OrderId} to Telegram.",
                orderId);

            return StatusCode(502, new
            {
                error = "The receipt could not be sent to Telegram. The order is still awaiting submission; try again.",
            });
        }

        var saved = await _repository.SavePendingVerificationAsync(
            order.Id,
            firebaseUid,
            method,
            senderName,
            paymentReference,
            order.DueToday,
            telegramReceipt,
            cancellationToken);

        if (!saved)
        {
            return Conflict(new
            {
                error = "The order status changed. Refresh the order before submitting payment again.",
            });
        }

        return Ok(new
        {
            orderId = order.Id,
            orderCode = order.OrderCode,
            paymentStatus = "pending_verification",
        });
    }
}