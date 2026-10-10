using MetadataService.Models;
using Microsoft.AspNetCore.Mvc;

namespace MetadataService.Results;

public class ProblemDetailsResult : IActionResult
{
    private readonly ApiProblemDetails _problem;

    public ProblemDetailsResult(ApiProblemDetails problem)
    {
        _problem = problem;
    }

    public async Task ExecuteResultAsync(ActionContext context)
    {
        var response = context.HttpContext.Response;
        response.StatusCode = _problem.Status ?? StatusCodes.Status500InternalServerError;
        response.ContentType = "application/problem+json";
        await response.WriteAsJsonAsync(_problem, _problem.GetType(), options: null, contentType: "application/problem+json");
    }
}
