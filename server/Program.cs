using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Microsoft.AspNetCore.Authentication;
using Npgsql;
using server.Api.Authentication;
using server.Api.Data;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using server.Api.Health;
using server.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddFilter(
    "System.Net.Http.HttpClient.TelegramReceiptService",
    LogLevel.Warning);

builder.Services.AddHttpClient<TelegramReceiptService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(30);
});

const string ClientCorsPolicy = "ClientCorsPolicy";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

if (builder.Environment.IsDevelopment())
{
    allowedOrigins = allowedOrigins
        .Append("http://localhost:5173")
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

var firebaseProjectId = builder.Configuration["Firebase:ProjectId"];
var serviceAccountPath = builder.Configuration["Firebase:ServiceAccountPath"];

if (string.IsNullOrWhiteSpace(firebaseProjectId))
{
    throw new InvalidOperationException("Firebase:ProjectId is missing.");
}

if (string.IsNullOrWhiteSpace(serviceAccountPath))
{
    throw new InvalidOperationException("Firebase:ServiceAccountPath is missing.");
}

var fullServiceAccountPath = Path.IsPathRooted(serviceAccountPath)
    ? serviceAccountPath
    : Path.Combine(builder.Environment.ContentRootPath, serviceAccountPath);

builder.Services.AddScoped<ReceiptOcrService>();

FirebaseApp.Create(new AppOptions
{
    Credential = CredentialFactory
        .FromFile<ServiceAccountCredential>(fullServiceAccountPath)
        .ToGoogleCredential(),
    ProjectId = firebaseProjectId
});

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

builder.Services
    .AddHealthChecks()
    .AddCheck<SupabaseHealthCheck>(
        "supabase",
        tags: new[] { "ready" });

builder.Services.AddScoped<CustomerProfileRepository>();
builder.Services.AddScoped<ProductRepository>();
builder.Services.AddScoped<OrderRepository>();
builder.Services.AddScoped<PaymentSubmissionRepository>();
builder.Services.AddScoped<ReceiptAnalysisService>();
builder.Services.AddScoped<ReceiptAnalysisService>();
builder.Services.AddSingleton(FirebaseAuth.DefaultInstance);

builder.Services
    .AddAuthentication("Firebase")
    .AddScheme<AuthenticationSchemeOptions, FirebaseAuthenticationHandler>(
        "Firebase",
        _ => { });

builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseCors(ClientCorsPolicy);
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = _ => false
});

app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("ready")
});

app.MapControllers();

app.Run();