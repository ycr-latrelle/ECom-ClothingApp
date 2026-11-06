
using Npgsql;
using NpgsqlTypes;

namespace server.Api.Data;

public sealed class AdminPaymentRepository
{
    private readonly NpgsqlDataSource _dataSource;

    public AdminPaymentRepository(NpgsqlDataSource dataSource)
    {
        _dataSource = dataSource;
    }

    public async Task<IReadOnlyList<AdminPaymentDto>> GetAllAsync(
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                p.id,
                p.order_id,
                o.order_code,
                o.customer_full_name,
                o.customer_email,
                p.payment_purpose,
                p.payment_method,
                p.payment_source_provider,
                p.payment_destination_id,
                p.sender_name,
                p.reference_number,
                p.amount,
                p.verification_status,
                p.submitted_at,
                p.verified_at,
                p.verified_by,
                p.admin_note,
                p.receipt_validation_status,
                p.receipt_content_type,
                p.receipt_size_bytes,
                (p.telegram_file_id IS NOT NULL) AS has_receipt
            FROM app_private.payment_submissions p
            INNER JOIN app_private.orders o
                ON o.id = p.order_id
            ORDER BY p.submitted_at DESC, p.id DESC;
            """;

        var payments = new List<AdminPaymentDto>();

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            payments.Add(ReadPayment(reader));
        }

        return payments;
    }

    public async Task<AdminPaymentDto?> GetByIdAsync(
        Guid paymentId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                p.id,
                p.order_id,
                o.order_code,
                o.customer_full_name,
                o.customer_email,
                p.payment_purpose,
                p.payment_method,
                p.payment_source_provider,
                p.payment_destination_id,
                p.sender_name,
                p.reference_number,
                p.amount,
                p.verification_status,
                p.submitted_at,
                p.verified_at,
                p.verified_by,
                p.admin_note,
                p.receipt_validation_status,
                p.receipt_content_type,
                p.receipt_size_bytes,
                (p.telegram_file_id IS NOT NULL) AS has_receipt
            FROM app_private.payment_submissions p
            INNER JOIN app_private.orders o
                ON o.id = p.order_id
            WHERE p.id = @payment_id
            LIMIT 1;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("payment_id", paymentId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        return await reader.ReadAsync(cancellationToken)
            ? ReadPayment(reader)
            : null;
    }

    public async Task<TelegramPaymentReceiptReference?> GetReceiptReferenceAsync(
        Guid paymentId,
        CancellationToken cancellationToken = default)
    {
        const string sql = """
            SELECT
                telegram_chat_id,
                telegram_message_id,
                telegram_file_id,
                receipt_content_type
            FROM app_private.payment_submissions
            WHERE id = @payment_id
            LIMIT 1;
            """;

        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var command = new NpgsqlCommand(sql, connection);

        command.Parameters.AddWithValue("payment_id", paymentId);

        await using var reader =
            await command.ExecuteReaderAsync(cancellationToken);

        if (!await reader.ReadAsync(cancellationToken))
            return null;

        if (reader.IsDBNull(2))
            return null;

        return new TelegramPaymentReceiptReference(
            reader.IsDBNull(0) ? null : reader.GetString(0),
            reader.IsDBNull(1) ? null : reader.GetInt64(1),
            reader.GetString(2),
            reader.IsDBNull(3) ? null : reader.GetString(3));
    }

    public async Task<bool> VerifyAsync(
        Guid paymentId,
        string verifiedBy,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        const string paymentSql = """
            UPDATE app_private.payment_submissions
            SET verification_status = 'verified',
                verified_at = NOW(),
                verified_by = @verified_by,
                admin_note = NULL
            WHERE id = @payment_id
              AND verification_status = 'pending_verification'
            RETURNING order_id;
            """;

        Guid orderId;

        await using (var command =
            new NpgsqlCommand(paymentSql, connection, transaction))
        {
            command.Parameters.AddWithValue("payment_id", paymentId);
            command.Parameters.AddWithValue("verified_by", verifiedBy);

            var result = await command.ExecuteScalarAsync(cancellationToken);

            if (result is not Guid id)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }

            orderId = id;
        }

        const string orderSql = """
            UPDATE app_private.orders
            SET payment_status = 'verified',
                updated_at = NOW()
            WHERE id = @order_id
              AND payment_status = 'pending_verification';
            """;

        await using (var command =
            new NpgsqlCommand(orderSql, connection, transaction))
        {
            command.Parameters.AddWithValue("order_id", orderId);

            var updatedRows = await command.ExecuteNonQueryAsync(
                cancellationToken);

            if (updatedRows != 1)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> RejectAsync(
        Guid paymentId,
        string rejectedBy,
        string reason,
        CancellationToken cancellationToken = default)
    {
        await using var connection =
            await _dataSource.OpenConnectionAsync(cancellationToken);

        await using var transaction =
            await connection.BeginTransactionAsync(cancellationToken);

        const string paymentSql = """
            UPDATE app_private.payment_submissions
            SET verification_status = 'rejected',
                verified_at = NULL,
                verified_by = @rejected_by,
                admin_note = @admin_note
            WHERE id = @payment_id
              AND verification_status = 'pending_verification'
            RETURNING order_id;
            """;

        Guid orderId;

        await using (var command =
            new NpgsqlCommand(paymentSql, connection, transaction))
        {
            command.Parameters.AddWithValue("payment_id", paymentId);
            command.Parameters.AddWithValue("rejected_by", rejectedBy);

            command.Parameters.Add(
                "admin_note",
                NpgsqlDbType.Text).Value = reason;

            var result = await command.ExecuteScalarAsync(cancellationToken);

            if (result is not Guid id)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }

            orderId = id;
        }

        const string orderSql = """
            UPDATE app_private.orders
            SET payment_status = 'awaiting_submission',
                updated_at = NOW()
            WHERE id = @order_id
              AND payment_status = 'pending_verification';
            """;

        await using (var command =
            new NpgsqlCommand(orderSql, connection, transaction))
        {
            command.Parameters.AddWithValue("order_id", orderId);

            var updatedRows = await command.ExecuteNonQueryAsync(
                cancellationToken);

            if (updatedRows != 1)
            {
                await transaction.RollbackAsync(cancellationToken);
                return false;
            }
        }

        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    private static AdminPaymentDto ReadPayment(NpgsqlDataReader reader)
    {
        return new AdminPaymentDto
        {
            Id = reader.GetGuid(0),
            OrderId = reader.GetGuid(1),
            OrderCode = reader.GetString(2),
            CustomerName = reader.GetString(3),
            CustomerEmail = reader.GetString(4),
            PaymentPurpose = reader.GetString(5),
            PaymentMethod = reader.GetString(6),
            SourceProvider = reader.IsDBNull(7) ? null : reader.GetString(7),
            DestinationId = reader.IsDBNull(8) ? null : reader.GetString(8),
            SenderName = reader.GetString(9),
            ReferenceNumber = reader.GetString(10),
            Amount = reader.GetDecimal(11),
            Status = reader.GetString(12),
            SubmittedAt = reader.GetFieldValue<DateTimeOffset>(13),
            VerifiedAt = reader.IsDBNull(14)
                ? null
                : reader.GetFieldValue<DateTimeOffset>(14),
            VerifiedBy = reader.IsDBNull(15) ? null : reader.GetString(15),
            AdminNote = reader.IsDBNull(16) ? null : reader.GetString(16),
            ReceiptValidationStatus = reader.GetString(17),
            ReceiptContentType = reader.IsDBNull(18)
                ? null
                : reader.GetString(18),
            ReceiptSizeBytes = reader.IsDBNull(19)
                ? null
                : reader.GetInt64(19),
            HasReceipt = reader.GetBoolean(20)
        };
    }
}

public sealed class AdminPaymentDto
{
    public Guid Id { get; init; }
    public Guid OrderId { get; init; }
    public string OrderCode { get; init; } = "";
    public string CustomerName { get; init; } = "";
    public string CustomerEmail { get; init; } = "";
    public string PaymentPurpose { get; init; } = "";
    public string PaymentMethod { get; init; } = "";
    public string? SourceProvider { get; init; }
    public string? DestinationId { get; init; }
    public string SenderName { get; init; } = "";
    public string ReferenceNumber { get; init; } = "";
    public decimal Amount { get; init; }
    public string Status { get; init; } = "";
    public DateTimeOffset SubmittedAt { get; init; }
    public DateTimeOffset? VerifiedAt { get; init; }
    public string? VerifiedBy { get; init; }
    public string? AdminNote { get; init; }
    public string ReceiptValidationStatus { get; init; } = "";
    public string? ReceiptContentType { get; init; }
    public long? ReceiptSizeBytes { get; init; }
    public bool HasReceipt { get; init; }
}

public sealed record TelegramPaymentReceiptReference(
    string? ChatId,
    long? MessageId,
    string FileId,
    string? ContentType);
