using System.Globalization;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace server.Api.Services;

public sealed class ReceiptAnalysisService
{
    private static readonly Regex PaymentTermsRegex = new(
        @"\b(transfer|transaction|payment|receipt|send money|cash in|fund transfer)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex SuccessTermsRegex = new(
        @"\b(successful|success|completed|complete|sent successfully)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex FailureTermsRegex = new(
        @"\b(failed|failure|declined|cancelled|canceled)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex PendingStatusRegex = new(
        @"\bstatus\s*[:\-]?\s*(pending|processing)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex CurrencyAmountRegex = new(
        @"(?:PHP|₱)\s*(?<amount>\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex BareAmountRegex = new(
        @"(?<!\d)(?<amount>\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})(?!\d)",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex AmountLabelRegex = new(
        @"\b(amount|total|sent|transferred)\b",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    private static readonly Regex NonAlphaNumericRegex = new(
        @"[^A-Z0-9]",
        RegexOptions.CultureInvariant);

    private readonly ReceiptOcrService _ocr;

    public ReceiptAnalysisService(ReceiptOcrService ocr)
    {
        _ocr = ocr;
    }

    public async Task<ReceiptAnalysisResult> AnalyzeAsync(
        Stream receiptImage,
        string sourceProvider,
        string enteredReference,
        decimal expectedAmount,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(receiptImage);

        await using var buffer = new MemoryStream();
        await receiptImage.CopyToAsync(buffer, cancellationToken);

        var imageBytes = buffer.ToArray();
        if (imageBytes.Length == 0)
        {
            throw new ArgumentException(
                "The receipt image is empty.",
                nameof(receiptImage));
        }

        var imageHash = Convert.ToHexString(
            SHA256.HashData(imageBytes)).ToLowerInvariant();

        await using var ocrStream = new MemoryStream(imageBytes, writable: false);
        var text = await _ocr.ExtractTextAsync(ocrStream, cancellationToken);

        var flags = new List<string>();

        var hasPaymentTerms = PaymentTermsRegex.IsMatch(text);
        if (!hasPaymentTerms)
        {
            flags.Add("payment_terms_not_found");
        }

        var hasProviderMention = ProviderAliases(sourceProvider)
            .Any(alias => text.Contains(alias, StringComparison.OrdinalIgnoreCase));

        if (!hasProviderMention)
        {
            flags.Add("selected_provider_not_found");
        }

        var hasSuccessStatus = SuccessTermsRegex.IsMatch(text);
        if (!hasSuccessStatus)
        {
            flags.Add("success_status_not_found");
        }

        if (FailureTermsRegex.IsMatch(text) || PendingStatusRegex.IsMatch(text))
        {
            flags.Add("failed_or_pending_status_visible");
        }

        var amountMatches = ExtractAmounts(text)
            .Any(amount => Math.Abs(amount - expectedAmount) <= 0.01m);

        if (!amountMatches)
        {
            flags.Add("amount_not_found_or_mismatch");
        }

        var normalizedText = Normalize(text);
        var normalizedReference = Normalize(enteredReference);
        var referenceMatches =
            normalizedReference.Length >= 4 &&
            normalizedText.Contains(
                normalizedReference,
                StringComparison.Ordinal);

        if (!referenceMatches)
        {
            flags.Add("reference_not_found");
        }

        var status = flags.Count == 0
            ? "passed_screening"
            : "needs_review";

        return new ReceiptAnalysisResult(
            status,
            hasPaymentTerms,
            hasProviderMention,
            hasSuccessStatus,
            amountMatches,
            referenceMatches,
            imageHash,
            flags);
    }

    private static IEnumerable<string> ProviderAliases(string provider)
    {
        var normalizedProvider = provider.Trim();

        if (normalizedProvider.Equals(
                "BPI",
                StringComparison.OrdinalIgnoreCase))
        {
            return ["BPI", "Bank of the Philippine Islands"];
        }

        if (normalizedProvider.Equals(
                "GCash",
                StringComparison.OrdinalIgnoreCase))
        {
            return ["GCash", "Mynt"];
        }

        if (normalizedProvider.Equals(
                "Maya",
                StringComparison.OrdinalIgnoreCase))
        {
            return ["Maya", "PayMaya"];
        }

        return string.IsNullOrWhiteSpace(normalizedProvider)
            ? []
            : [normalizedProvider];
    }

    private static HashSet<decimal> ExtractAmounts(string text)
    {
        var amounts = new HashSet<decimal>();

        AddAmounts(amounts, CurrencyAmountRegex.Matches(text));

        var lines = text.Split(
            ['\r', '\n'],
            StringSplitOptions.RemoveEmptyEntries);

        for (var index = 0; index < lines.Length; index++)
        {
            if (!AmountLabelRegex.IsMatch(lines[index]))
            {
                continue;
            }

            var context = index + 1 < lines.Length
                ? $"{lines[index]} {lines[index + 1]}"
                : lines[index];

            AddAmounts(amounts, BareAmountRegex.Matches(context));
        }

        return amounts;
    }

    private static void AddAmounts(
        HashSet<decimal> amounts,
        MatchCollection matches)
    {
        foreach (Match match in matches)
        {
            var value = match.Groups["amount"].Value.Replace(",", "");

            if (decimal.TryParse(
                    value,
                    NumberStyles.Number,
                    CultureInfo.InvariantCulture,
                    out var amount))
            {
                amounts.Add(amount);
            }
        }
    }

    private static string Normalize(string value) =>
        NonAlphaNumericRegex.Replace(value.ToUpperInvariant(), "");
}

public sealed record ReceiptAnalysisResult(
    string Status,
    bool PaymentTermsFound,
    bool SelectedProviderMentionFound,
    bool SuccessStatusFound,
    bool AmountMatches,
    bool ReferenceMatches,
    string ReceiptSha256,
    IReadOnlyList<string> Flags);