namespace server.Api.Models;

public sealed record CreateOrderResponse(
    Guid Id,
    string OrderCode,
    string OrderStatus,
    string PaymentStatus,
    decimal ReadySubtotal,
    decimal PreorderSubtotal,
    decimal DepositPercent,
    decimal DepositAmount,
    decimal DueToday,
    decimal BalanceLater,
    bool isTest,
    DateTimeOffset CreatedAt);