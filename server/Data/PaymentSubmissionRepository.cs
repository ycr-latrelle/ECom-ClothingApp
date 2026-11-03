
using Npgsql;
using NpgsqlTypes;
using server.Api.Services;
using System.Text.Json;

namespace server.Api.Data;

public sealed class PaymentSubmissionRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public PaymentSubmissionRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<PaymentReceiptOrder?> GetOrderForPaymentAsync(
        Guid orderId,
        string firebaseUid,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                id,
                order_code,
                due_today,
                payment_status
            FROM app_private.orders
            WHERE id = @order_id
              AND firebase_uid = @firebase_uid;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("order_id", orderId);
        command.Parameters.AddWithValue("firebase_uid", firebaseUid);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
        {
            return null;
        }

        return new PaymentReceiptOrder
        {
            Id = reader.GetGuid(0),
            OrderCode = reader.GetString(1),
            DueToday = reader.GetDecimal(2),
            PaymentStatus = reader.GetString(3)
        };
    }

    public async Task<bool> SavePendingVerificationAsync(
        Guid orderId,
        string firebaseUid,
        string paymentMethod,
        string paymentSourceProvider,
        string paymentDestinationId,
        string senderName,
        string paymentReferenceNumber,
        decimal amount,
        ReceiptAnalysisResult receiptAnalysis,
        TelegramReceiptReference telegramReceipt,
        CancellationToken cancellationToken = default,
        string? receiptContentType = null,
        long? receiptSizeBytes = null)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        // Atomically transition the order.
        // Only one request can successfully change this status.
        const string updateOrderSql = """
            UPDATE app_private.orders
            SET payment_status = 'pending_verification',
                updated_at = NOW()
            WHERE id = @order_id
              AND firebase_uid = @firebase_uid
              AND payment_status = 'awaiting_submission';
            """;

        await using (var updateCommand =
            new NpgsqlCommand(updateOrderSql, connection, transaction))
        {
            updateCommand.Parameters.AddWithValue("order_id", orderId);
            updateCommand.Parameters.AddWithValue("firebase_uid", firebaseUid);

            var updatedRows = await updateCommand.ExecuteNonQueryAsync(
                cancellationToken);

            if (updatedRows != 1)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }
        }

        const string insertPaymentSql = """
            INSERT INTO app_private.payment_submissions (
                order_id,
                firebase_uid,
                payment_purpose,
                payment_method,
                payment_source_provider,
                payment_destination_id,
                sender_name,
                reference_number,
                amount,
                verification_status,
                receipt_validation_status,
                receipt_validation_result,
                receipt_sha256,
                receipt_validated_at,
                receipt_content_type,
                receipt_size_bytes,
                telegram_chat_id,
                telegram_message_id,
                telegram_file_id
            )
            VALUES (
                @order_id,
                @firebase_uid,
                'initial_due',
                @payment_method,
                @payment_source_provider,
                @payment_destination_id,
                @sender_name,
                @reference_number,
                @amount,
                'pending_verification',
                @receipt_validation_status,
                @receipt_validation_result,
                @receipt_sha256,
                @receipt_validated_at,
                @receipt_content_type,
                @receipt_size_bytes,
                @telegram_chat_id,
                @telegram_message_id,
                @telegram_file_id
            );
            """;

        await using (var insertCommand =
            new NpgsqlCommand(insertPaymentSql, connection, transaction))
        {
            insertCommand.Parameters.AddWithValue("order_id", orderId);
            insertCommand.Parameters.AddWithValue("firebase_uid", firebaseUid);

            insertCommand.Parameters.AddWithValue(
                "payment_method",
                paymentMethod);

            insertCommand.Parameters.AddWithValue(
                "payment_source_provider",
                paymentSourceProvider);

            insertCommand.Parameters.AddWithValue(
                "payment_destination_id",
                paymentDestinationId);

            insertCommand.Parameters.AddWithValue(
                "sender_name",
                senderName);

            insertCommand.Parameters.AddWithValue(
                "reference_number",
                paymentReferenceNumber);

            insertCommand.Parameters.Add(
                "amount",
                NpgsqlDbType.Numeric).Value = amount;

            insertCommand.Parameters.AddWithValue(
                "receipt_validation_status",
                receiptAnalysis.Status);

            insertCommand.Parameters.Add(
                "receipt_validation_result",
                NpgsqlDbType.Jsonb).Value =
                JsonSerializer.Serialize(receiptAnalysis);

            insertCommand.Parameters.AddWithValue(
                "receipt_sha256",
                receiptAnalysis.ReceiptSha256);

            insertCommand.Parameters.Add(
                "receipt_validated_at",
                NpgsqlDbType.TimestampTz).Value = DateTime.UtcNow;

            insertCommand.Parameters.Add(
                "receipt_content_type",
                NpgsqlDbType.Text).Value =
                (object?)receiptContentType ?? DBNull.Value;

            insertCommand.Parameters.Add(
                "receipt_size_bytes",
                NpgsqlDbType.Bigint).Value =
                (object?)receiptSizeBytes ?? DBNull.Value;

            insertCommand.Parameters.AddWithValue(
                "telegram_chat_id",
                telegramReceipt.ChatId);

            insertCommand.Parameters.AddWithValue(
                "telegram_message_id",
                telegramReceipt.MessageId);

            insertCommand.Parameters.AddWithValue(
                "telegram_file_id",
                telegramReceipt.FileId);

            await insertCommand.ExecuteNonQueryAsync(cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);

        return true;
    }
}

public sealed class PaymentReceiptOrder
{
    public Guid Id { get; init; }

    public string OrderCode { get; init; } = string.Empty;

    public decimal DueToday { get; init; }

    public string PaymentStatus { get; init; } = string.Empty;
}
