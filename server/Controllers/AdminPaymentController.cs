
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using server.Api.Data;
using server.Api.Services;

namespace server.Api.Controllers;

[ApiController]
[Route("api/admin/payments")]
[Authorize(Policy = "OwnerOrAdmin")]
public sealed class AdminPaymentController : ControllerBase
{
    private readonly AdminPaymentRepository _repository;
    private readonly TelegramReceiptService _telegramReceiptService;

    public AdminPaymentController(
        AdminPaymentRepository repository,
        TelegramReceiptService telegramReceiptService)
    {
        _repository = repository;
        _telegramReceiptService = telegramReceiptService;
    }

    // GET: /api/admin/payments
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminPaymentDto>>> GetAll(
        CancellationToken cancellationToken)
    {
        var payments = await _repository.GetAllAsync(
            cancellationToken);

        return Ok(payments);
    }

    // GET: /api/admin/payments/{paymentId}
    [HttpGet("{paymentId:guid}")]
    public async Task<ActionResult<AdminPaymentDto>> GetById(
        Guid paymentId,
        CancellationToken cancellationToken)
    {
        var payment = await _repository.GetByIdAsync(
            paymentId,
            cancellationToken);

        if (payment is null)
        {
            return NotFound(new
            {
                error = "Payment submission not found."
            });
        }

        return Ok(payment);
    }

    // GET: /api/admin/payments/{paymentId}/receipt
    [HttpGet("{paymentId:guid}/receipt")]
    public async Task<IActionResult> GetReceipt(
        Guid paymentId,
        CancellationToken cancellationToken)
    {
        var receipt = await _repository.GetReceiptReferenceAsync(
            paymentId,
            cancellationToken);

        if (receipt is null)
        {
            return NotFound(new
            {
                error = "Receipt image not found."
            });
        }

        try
        {
            var image = await _telegramReceiptService.GetReceiptImageAsync(
                receipt.FileId,
                receipt.ContentType,
                cancellationToken);

            if (image is null)
            {
                return NotFound(new
                {
                    error = "Receipt image not found."
                });
            }

            return File(
                image.Content,
                image.ContentType,
                enableRangeProcessing: false);
        }
        catch (HttpRequestException)
        {
            return StatusCode(
                StatusCodes.Status502BadGateway,
                new
                {
                    error = "Unable to retrieve the receipt from Telegram."
                });
        }
    }

    // PUT: /api/admin/payments/{paymentId}/verify
    [HttpPut("{paymentId:guid}/verify")]
    public async Task<IActionResult> Verify(
        Guid paymentId,
        CancellationToken cancellationToken)
    {
        var adminUid = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(adminUid))
            return Unauthorized();

        var updated = await _repository.VerifyAsync(
            paymentId,
            adminUid,
            cancellationToken);

        if (!updated)
        {
            return Conflict(new
            {
                error = "This payment could not be verified. It may no longer be pending verification, or its order status has changed."
            });
        }

        return Ok(new
        {
            message = "Payment verified successfully."
        });
    }

    // PUT: /api/admin/payments/{paymentId}/reject
    [HttpPut("{paymentId:guid}/reject")]
    public async Task<IActionResult> Reject(
        Guid paymentId,
        [FromBody] RejectPaymentRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason))
        {
            return BadRequest(new
            {
                error = "A rejection reason is required."
            });
        }

        var reason = request.Reason.Trim();

        if (reason.Length > 1000)
        {
            return BadRequest(new
            {
                error = "The rejection reason cannot exceed 1000 characters."
            });
        }

        var adminUid = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (string.IsNullOrWhiteSpace(adminUid))
            return Unauthorized();

        var updated = await _repository.RejectAsync(
            paymentId,
            adminUid,
            reason,
            cancellationToken);

        if (!updated)
        {
            return Conflict(new
            {
                error = "This payment could not be rejected. It may no longer be pending verification, or its order status has changed."
            });
        }

        return Ok(new
        {
            message = "Payment rejected. The customer can submit a corrected receipt."
        });
    }
}

public sealed class RejectPaymentRequest
{
    public string Reason { get; set; } = string.Empty;
}
