using MetadataService.Models;
using MetadataService.Serialization;
using MetadataService.Storage;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

// Health / Contracts version
builder.Services.AddSingleton(sp =>
{
    var configuration = sp.GetRequiredService<IConfiguration>();
    var configuredContractsVersion = configuration["CONTRACTS_VERSION"];
    var contractsVersion = string.IsNullOrWhiteSpace(configuredContractsVersion)
        ? Program.DefaultContractsVersion
        : configuredContractsVersion.Trim();

    return new HealthResponse
    {
        Status = "ok",
        Service = "metadata-service",
        ContractsVersion = contractsVersion
    };
});

// Storage
builder.Services.AddSingleton<ISessionRepository, InMemorySessionRepository>();

// CORS configuration
var allowedOriginsSetting = builder.Configuration["ALLOWED_ORIGINS"]
    ?? builder.Configuration["MetadataService:AllowedOrigins"]
    ?? "http://localhost:5173";

var allowedOrigins = allowedOriginsSetting
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Framework ProblemDetails customization (415, 404, 405, etc.)
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        var status = context.ProblemDetails.Status ?? context.HttpContext.Response.StatusCode;
        context.ProblemDetails.Status = status;
        context.ProblemDetails.Type = "about:blank";
        context.ProblemDetails.Extensions.Remove("traceId");
        if (!context.ProblemDetails.Extensions.ContainsKey("code"))
        {
            context.ProblemDetails.Extensions["code"] = ApiProblemDetails.CodeForStatus(status);
        }
    };
});

// Controllers, JSON serialization & Validation error mapping
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeOffsetJsonConverter());
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = new List<ValidationError>();
            foreach (var (key, state) in context.ModelState)
            {
                if (string.Equals(key, "request", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                bool isJsonPathKey = key == "$" || key.StartsWith("$.", StringComparison.Ordinal);

                foreach (var error in state.Errors)
                {
                    var fieldName = NormalizeFieldName(key);
                    bool isJsonError = isJsonPathKey || error.Exception is not null;
                    var message = isJsonError
                        ? "Invalid JSON value."
                        : string.IsNullOrWhiteSpace(error.ErrorMessage)
                            ? "Invalid field value."
                            : error.ErrorMessage;
                    errors.Add(new ValidationError(fieldName, message));
                }
            }

            if (errors.Count == 0)
            {
                errors.Add(new ValidationError("$", "Invalid JSON value."));
            }

            return ApiProblemDetails.ValidationFailed(errors).ToActionResult();
        };
    });

var app = builder.Build();

app.UseExceptionHandler(exceptionApp =>
{
    exceptionApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/problem+json";
        var problem = ApiProblemDetails.InternalError();
        await context.Response.WriteAsJsonAsync(problem, options: null, contentType: "application/problem+json");
    });
});

app.UseStatusCodePages();
app.UseCors();
app.MapControllers();

app.Run();

static string NormalizeFieldName(string field)
{
    if (string.IsNullOrWhiteSpace(field) || field == "$")
    {
        return "$";
    }

    if (field.StartsWith("$.", StringComparison.Ordinal))
    {
        field = field[2..];
    }

    var segments = field.Split('.');
    for (int i = 0; i < segments.Length; i++)
    {
        var seg = segments[i];
        if (seg.Length > 0 && char.IsUpper(seg[0]))
        {
            segments[i] = char.ToLowerInvariant(seg[0]) + seg[1..];
        }
    }
    return string.Join('.', segments);
}

public partial class Program
{
    public const string DefaultContractsVersion = "1.0.1";
}
