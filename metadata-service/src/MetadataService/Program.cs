using MetadataService.Models;
using MetadataService.Results;
using MetadataService.Storage;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

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

// Controllers & Validation error mapping
builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = new List<ValidationError>();
            foreach (var (key, state) in context.ModelState)
            {
                foreach (var error in state.Errors)
                {
                    var fieldName = ToCamelCaseField(key);
                    var message = string.IsNullOrWhiteSpace(error.ErrorMessage)
                        ? "Invalid field value."
                        : error.ErrorMessage;
                    errors.Add(new ValidationError(fieldName, message));
                }
            }

            var problem = ApiProblemDetails.ValidationFailed(errors);
            return new ProblemDetailsResult(problem);
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

app.UseCors();
app.MapControllers();

app.Run();

static string ToCamelCaseField(string field)
{
    if (string.IsNullOrWhiteSpace(field)) return "$";
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

public partial class Program { }
