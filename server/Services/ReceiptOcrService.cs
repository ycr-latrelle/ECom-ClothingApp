using System.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace server.Api.Services;

public sealed class ReceiptOcrService
{
    private static readonly byte[] PngSignature =
    [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    ];

    private readonly IConfiguration _configuration;

    public ReceiptOcrService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<string> ExtractTextAsync(
        Stream imageStream,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(imageStream);

        await using var buffer = new MemoryStream();
        await imageStream.CopyToAsync(buffer, cancellationToken);

        var imageBytes = buffer.ToArray();
        if (imageBytes.Length == 0)
        {
            return string.Empty;
        }

        var extension = GetImageExtension(imageBytes);
        var workDirectory = Path.Combine(
            Path.GetTempPath(),
            $"receipt-ocr-{Guid.NewGuid():N}");

        Directory.CreateDirectory(workDirectory);

        try
        {
            var inputPath = Path.Combine(workDirectory, $"receipt{extension}");
            var outputBasePath = Path.Combine(workDirectory, "recognized");
            var outputPath = $"{outputBasePath}.txt";

            await File.WriteAllBytesAsync(
                inputPath,
                imageBytes,
                cancellationToken);

            var executable = _configuration["ReceiptOcr:TesseractPath"];
            if (string.IsNullOrWhiteSpace(executable))
            {
                executable = OperatingSystem.IsWindows()
                    ? "tesseract.exe"
                    : "tesseract";
            }

            var startInfo = new ProcessStartInfo
            {
                FileName = executable,
                WorkingDirectory = workDirectory,
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
            };

            startInfo.ArgumentList.Add(inputPath);
            startInfo.ArgumentList.Add(outputBasePath);
            startInfo.ArgumentList.Add("--oem");
            startInfo.ArgumentList.Add("1");
            startInfo.ArgumentList.Add("--psm");
            startInfo.ArgumentList.Add("6");
            startInfo.ArgumentList.Add("-l");
            startInfo.ArgumentList.Add("eng");

            using var process = new Process { StartInfo = startInfo };

            if (!process.Start())
            {
                throw new InvalidOperationException(
                    "Could not start the Tesseract OCR process.");
            }

            var standardErrorTask = process.StandardError.ReadToEndAsync();

            using var timeout = CancellationTokenSource
                .CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(30));

            try
            {
                await process.WaitForExitAsync(timeout.Token);
            }
            catch (OperationCanceledException)
            {
                if (!process.HasExited)
                {
                    process.Kill(entireProcessTree: true);
                    await process.WaitForExitAsync(CancellationToken.None);
                }

                _ = await standardErrorTask;

                if (cancellationToken.IsCancellationRequested)
                {
                    throw;
                }

                throw new TimeoutException(
                    "Receipt OCR exceeded its 30-second time limit.");
            }

            var standardError = await standardErrorTask;

            if (process.ExitCode != 0)
            {
                throw new InvalidOperationException(
                    $"Tesseract OCR failed with exit code {process.ExitCode}: " +
                    standardError.Trim());
            }

            if (!File.Exists(outputPath))
            {
                return string.Empty;
            }

            return await File.ReadAllTextAsync(
                outputPath,
                cancellationToken);
        }
        finally
        {
            try
            {
                if (Directory.Exists(workDirectory))
                {
                    Directory.Delete(workDirectory, recursive: true);
                }
            }
            catch (IOException)
            {
                // Best-effort cleanup of the temporary OCR files.
            }
            catch (UnauthorizedAccessException)
            {
                // Best-effort cleanup of the temporary OCR files.
            }
        }
    }

    private static string GetImageExtension(byte[] imageBytes)
    {
        if (imageBytes.Length >= PngSignature.Length &&
            imageBytes.AsSpan(0, PngSignature.Length)
                .SequenceEqual(PngSignature))
        {
            return ".png";
        }

        if (imageBytes.Length >= 3 &&
            imageBytes[0] == 0xFF &&
            imageBytes[1] == 0xD8 &&
            imageBytes[2] == 0xFF)
        {
            return ".jpg";
        }

        throw new InvalidDataException(
            "The uploaded file is not a recognized JPEG or PNG image.");
    }
}