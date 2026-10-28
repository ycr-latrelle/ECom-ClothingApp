using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace server.Api.Models;

public sealed class PaymentProofRequest
{
    [Required]
    [RegularExpression("^(GCash|Maya)$")]
    public string PaymentMethod { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    public string SenderName { get; set; } = string.Empty;

    [Required]
    [StringLength(120)]
    public string PaymentReferenceNumber { get; set; } = string.Empty;

    [Required]
    public IFormFile? ProofImage { get; set; }
}