using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace server.Api.Models;

public sealed class PaymentProofRequest
{
    // Keep this as the store receiving destination for compatibility
    // with the existing GCash/Maya payment instructions.
    [Required]
    [RegularExpression("^(GCash|Maya)$")]
    public string PaymentMethod { get; set; } = string.Empty;

    // The customer's sending bank or wallet, for example BPI, GCash, or Maya.
    // Optional until we update the client form.
    [StringLength(50)]
    public string? PaymentSourceProvider { get; set; }

    [Required]
    [StringLength(200)]
    public string SenderName { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string PaymentReferenceNumber { get; set; } = string.Empty;

    [Required]
    public IFormFile? ProofImage { get; set; }
}