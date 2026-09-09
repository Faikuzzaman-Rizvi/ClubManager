using System.Reflection;
using System.Security.Claims;
using System.Text;
using ClubManager.Api.Helpers;
using ClubManager.Api.Middleware;
using ClubManager.Api.Repositories;
using ClubManager.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------------------------------------------------------------- settings
builder.Services.Configure<JwtSettings>(
    builder.Configuration.GetSection(JwtSettings.SectionName));

var jwtSettings = builder.Configuration
    .GetSection(JwtSettings.SectionName)
    .Get<JwtSettings>() ?? new JwtSettings();

builder.Services.Configure<ImageStorageOptions>(
    builder.Configuration.GetSection(ImageStorageOptions.SectionName));

var uploadOptions = builder.Configuration
    .GetSection(ImageStorageOptions.SectionName)
    .Get<ImageStorageOptions>() ?? new ImageStorageOptions();

// Relative paths are resolved once, here, so nothing downstream depends on the
// process working directory.
var uploadRoot = Path.IsPathRooted(uploadOptions.RootPath)
    ? uploadOptions.RootPath
    : Path.Combine(builder.Environment.ContentRootPath, uploadOptions.RootPath);

builder.Services.PostConfigure<ImageStorageOptions>(options => options.RootPath = uploadRoot);

// Fail loudly at startup rather than issuing tokens nobody can trust.
if (string.IsNullOrWhiteSpace(jwtSettings.Key) || jwtSettings.Key.Length < 32)
{
    throw new InvalidOperationException(
        "Jwt:Key must be configured with at least 32 characters (HMAC-SHA256 signing key).");
}

const string CorsPolicy = "ClubManagerClient";
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();

// ------------------------------------------------------------------- DI
builder.Services.AddSingleton<IDbConnectionFactory, DbConnectionFactory>();

// Keeps a rule raised by a stored procedure from surfacing as a bare 500, and
// keeps every other database error from surfacing at all. See the handler.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DatabaseExceptionHandler>();

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ITeamRepository, TeamRepository>();
builder.Services.AddScoped<IPlayerRepository, PlayerRepository>();
builder.Services.AddScoped<IMatchRepository, MatchRepository>();
builder.Services.AddScoped<IStatsRepository, StatsRepository>();

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ITeamService, TeamService>();
builder.Services.AddScoped<IPlayerService, PlayerService>();
builder.Services.AddScoped<IMatchService, MatchService>();
builder.Services.AddScoped<IStatsService, StatsService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IImageService, ImageService>();

// Stateless and only reads options, so one instance serves every request.
builder.Services.AddSingleton<IImageStorage, ImageStorage>();

// ---------------------------------------------------------------- auth
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep claim types exactly as issued instead of remapping them to
        // legacy SOAP URIs, so ClaimsPrincipalExtensions reads what AuthService wrote.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSettings.Issuer,
            ValidAudience = jwtSettings.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.Key)),
            NameClaimType = ClaimTypes.Name,
            RoleClaimType = ClaimTypes.Role,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization();

// ---------------------------------------------------------------- cors
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicy, policy => policy
        .WithOrigins(allowedOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// ----------------------------------------------------------------- forms
// The multipart reader has its own ceiling, separate from [RequestSizeLimit],
// and it is far lower than an image upload needs. Pinned to the same constant
// so the two cannot drift apart and produce a confusing "body length limit"
// failure instead of the size message the service would return.
builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = UploadLimits.MaxRequestBytes;
});

// ------------------------------------------------------------------- mvc
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "ClubManager API",
        Version = "v1",
        Description = "Football club management system - teams, players, matches and stats."
    });

    // "Authorize" button in Swagger UI: paste the raw JWT, no "Bearer " prefix.
    var scheme = new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT returned by POST /api/auth/login.",
        Reference = new OpenApiReference
        {
            Type = ReferenceType.SecurityScheme,
            Id = JwtBearerDefaults.AuthenticationScheme
        }
    };

    options.AddSecurityDefinition(JwtBearerDefaults.AuthenticationScheme, scheme);

    // Padlock goes on the protected operations only - see the filter.
    options.OperationFilter<SecurityRequirementsOperationFilter>();

    // Surface the XML <summary> comments as endpoint descriptions.
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath, includeControllerXmlComments: true);
    }
});

var app = builder.Build();

// --------------------------------------------------------------- pipeline
// Sits inside the developer exception page, so it still gets first look at a
// database error in Development.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHttpsRedirection();
}

app.UseCors(CorsPolicy);

/*  Uploaded images, served straight from disk.

    A dedicated FileServer rather than UseStaticFiles() over wwwroot: this maps
    exactly one folder at exactly one URL prefix, so nothing else that ever lands
    in the content root becomes reachable by accident.

    ServeUnknownFileTypes stays off (the default), so anything without a known
    image content type is refused rather than handed over - a second line of
    defence behind ImageStorage, which only ever writes .webp.

    Long, immutable caching is safe because filenames are content-addressed by
    GUID: replacing an image mints a new name, so a stale URL is never reused
    and the browser never has to revalidate. This is what keeps a squad list of
    thirty faces off the network on every navigation.  */
Directory.CreateDirectory(uploadRoot);

app.UseFileServer(new FileServerOptions
{
    FileProvider = new PhysicalFileProvider(uploadRoot),
    RequestPath = uploadOptions.RequestPath,
    EnableDirectoryBrowsing = false,
    StaticFileOptions =
    {
        OnPrepareResponse = context =>
            context.Context.Response.Headers.CacheControl = "public,max-age=31536000,immutable"
    }
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
