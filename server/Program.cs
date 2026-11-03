using System.Security.Claims;
using System.Threading.RateLimiting;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.RateLimiting;
using Npgsql;
using server.Api.Authentication;
using server.Api.Data;
using server.Api.Health;
using server.Api.Services;
using Microsoft.AspNetCore.Authorization;
using server.Api.Authorization;

var builder = WebApplication.CreateBuilder(args);

// --------------------------------------------------
// TELEGRAM HTTP CLIENT
// --------------------------------------------------

builder.Logging.AddFilter(
    "System.Net.Http.HttpClient.TelegramReceiptService",
    LogLevel.Warning);

builder.Services.AddHttpClient<TelegramProductImageService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

// --------------------------------------------------
// CORS
// --------------------------------------------------

const string ClientCorsPolicy = "ClientCorsPolicy";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

if (builder.Environment.IsDevelopment())
{
    allowedOrigins = allowedOrigins
        .Append("http://localhost:5173")
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToArray();
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
    {
        policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// --------------------------------------------------
// RATE LIMITING
// --------------------------------------------------

builder.Services.AddRateLimiter(options =>
{
    // Global rate limit:
    // Authenticated users: 120 requests per minute.
    // Anonymous visitors: 60 requests per minute.

    options.GlobalLimiter =
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var firebaseUid = context.User.FindFirstValue(
                ClaimTypes.NameIdentifier);

            var isAuthenticated =
                !string.IsNullOrWhiteSpace(firebaseUid);

            var partitionKey = isAuthenticated
                ? $"user:{firebaseUid}"
                : $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";

            return RateLimitPartition.GetFixedWindowLimiter(
                partitionKey,
                _ => new FixedWindowRateLimiterOptions
                {
                    AutoReplenishment = true,
                    PermitLimit = isAuthenticated ? 120 : 60,
                    Window = TimeSpan.FromMinutes(1),
                    QueueLimit = 0
                });
        });

    // Additional protection for payment receipt submissions:
    // 5 submissions per minute per Firebase user.

    options.AddPolicy("payment-upload", context =>
    {
        var firebaseUid = context.User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        var partitionKey = !string.IsNullOrWhiteSpace(firebaseUid)
            ? $"payment-user:{firebaseUid}"
            : $"payment-ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey,
            _ => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0
            });
    });

    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType =
            "application/json";

        context.HttpContext.Response.Headers["Retry-After"] = "60";

        await context.HttpContext.Response.WriteAsJsonAsync(
            new
            {
                error = "Too many requests. Please wait before trying again."
            },
            cancellationToken);
    };
});

// --------------------------------------------------
// OUTPUT CACHING
// --------------------------------------------------

builder.Services.AddOutputCache(options =>
{
    options.AddPolicy("PublicProducts", policy =>
    {
        policy
            .Expire(TimeSpan.FromSeconds(60))
            .Tag("public-products");
    });
});

// --------------------------------------------------
// FIREBASE
// --------------------------------------------------

var firebaseProjectId =
    builder.Configuration["Firebase:ProjectId"];

var serviceAccountPath =
    builder.Configuration["Firebase:ServiceAccountPath"];

if (string.IsNullOrWhiteSpace(firebaseProjectId))
{
    throw new InvalidOperationException(
        "Firebase:ProjectId is missing.");
}

if (string.IsNullOrWhiteSpace(serviceAccountPath))
{
    throw new InvalidOperationException(
        "Firebase:ServiceAccountPath is missing.");
}

var fullServiceAccountPath = Path.IsPathRooted(serviceAccountPath)
    ? serviceAccountPath
    : Path.Combine(
        builder.Environment.ContentRootPath,
        serviceAccountPath);

FirebaseApp.Create(new AppOptions
{
    Credential = CredentialFactory
        .FromFile<ServiceAccountCredential>(fullServiceAccountPath)
        .ToGoogleCredential(),

    ProjectId = firebaseProjectId
});

builder.Services.AddScoped<ReceiptOcrService>();

// --------------------------------------------------
// SUPABASE / POSTGRESQL
// --------------------------------------------------

var supabaseConnectionString =
    builder.Configuration.GetConnectionString("Supabase");

if (string.IsNullOrWhiteSpace(supabaseConnectionString))
{
    throw new InvalidOperationException(
        "ConnectionStrings:Supabase is missing.");
}

builder.Services.AddSingleton<NpgsqlDataSource>(_ =>
{
    var dataSourceBuilder =
        new NpgsqlDataSourceBuilder(supabaseConnectionString);

    return dataSourceBuilder.Build();
});

// --------------------------------------------------
// HEALTH CHECKS
// --------------------------------------------------

builder.Services
    .AddHealthChecks()
    .AddCheck<SupabaseHealthCheck>(
        "supabase",
        tags: new[] { "ready" });

// --------------------------------------------------
// REPOSITORIES AND SERVICES
// --------------------------------------------------

builder.Services.AddScoped<CustomerProfileRepository>();
builder.Services.AddScoped<ProductRepository>();
builder.Services.AddScoped<ProductImageRepository>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<PaymentSubmissionRepository>();
builder.Services.AddScoped<ReceiptAnalysisService>();
builder.Services.AddScoped<OrderReadRepository>();


// --------------------------------------------------
// ROLE-BASED AUTHORIZATION SERVICES
// --------------------------------------------------

builder.Services.AddScoped<UserRoleRepository>();
builder.Services.AddScoped<StoreRoleService>();

builder.Services.AddScoped<
    IAuthorizationHandler,
    StoreAuthorizationHandler>();


builder.Services.AddSingleton(FirebaseAuth.DefaultInstance);

// --------------------------------------------------
// AUTHENTICATION AND AUTHORIZATION
// --------------------------------------------------

builder.Services
    .AddAuthentication("Firebase")
    .AddScheme<AuthenticationSchemeOptions, FirebaseAuthenticationHandler>(
        "Firebase",
        _ => { });

builder.Services.AddAuthorization(options =>
{
    // Owner only
    options.AddPolicy("OwnerOnly", policy =>
    {
        policy.RequireAuthenticatedUser();

        policy.AddRequirements(
            new StoreRoleRequirement("owner"));
    });

    // Owner and Admin
    options.AddPolicy("OwnerOrAdmin", policy =>
    {
        policy.RequireAuthenticatedUser();

        policy.AddRequirements(
            new StoreRoleRequirement("owner", "admin"));
    });

    // Owner, Admin and Seller
    options.AddPolicy("StoreStaff", policy =>
    {
        policy.RequireAuthenticatedUser();

        policy.AddRequirements(
            new StoreRoleRequirement(
                "owner",
                "admin",
                "seller"));
    });

    // Seller only
    options.AddPolicy("SellerOnly", policy =>
    {
        policy.RequireAuthenticatedUser();

        policy.AddRequirements(
            new StoreRoleRequirement("seller"));
    });
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();

// --------------------------------------------------
// APPLICATION PIPELINE
// --------------------------------------------------

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseRouting();

app.UseHttpsRedirection();

app.UseCors(ClientCorsPolicy);

// 1. Authenticate the incoming request.
// Firebase UID becomes available to subsequent middleware.
app.UseAuthentication();

// 2. Apply global and endpoint-specific rate limits.
app.UseRateLimiter();

// 3. Enforce authorization requirements.
app.UseAuthorization();

// 4. Apply output caching after authorization.
app.UseOutputCache();

// --------------------------------------------------
// HEALTH ENDPOINTS
// --------------------------------------------------

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

// --------------------------------------------------
// CONTROLLERS
// --------------------------------------------------

app.MapControllers();

app.Run();