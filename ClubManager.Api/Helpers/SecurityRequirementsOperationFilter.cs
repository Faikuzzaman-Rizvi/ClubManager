using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace ClubManager.Api.Helpers;

/// <summary>
/// Attaches the bearer-token requirement to the operations that actually need one,
/// so the padlock and the 401/403 responses show up on protected endpoints and
/// [AllowAnonymous] endpoints such as login stay open.
/// </summary>
public class SecurityRequirementsOperationFilter : IOperationFilter
{
    private static readonly OpenApiSecurityScheme BearerScheme = new()
    {
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata = context.ApiDescription.ActionDescriptor.EndpointMetadata;

        // [AllowAnonymous] wins over any [Authorize] inherited from the controller.
        if (metadata.OfType<IAllowAnonymous>().Any())
        {
            return;
        }

        var authorizeData = metadata.OfType<IAuthorizeData>().ToList();
        if (authorizeData.Count == 0)
        {
            return;
        }

        operation.Responses.TryAdd("401",
            new OpenApiResponse { Description = "Missing or invalid token." });

        if (authorizeData.Any(data => !string.IsNullOrWhiteSpace(data.Roles)))
        {
            operation.Responses.TryAdd("403",
                new OpenApiResponse { Description = "Authenticated but the role is not permitted." });
        }

        operation.Security.Add(new OpenApiSecurityRequirement
        {
            [BearerScheme] = Array.Empty<string>()
        });
    }
}
