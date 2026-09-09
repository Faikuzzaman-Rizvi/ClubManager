using ClubManager.Api.Helpers;
using ClubManager.Api.Models;
using ClubManager.Api.Models.Dtos;
using ClubManager.Api.Models.Entities;
using ClubManager.Api.Repositories;

namespace ClubManager.Api.Services;

public class MatchService : IMatchService
{
    private const string CoachScopeMessage =
        "Coaches can only manage matches their own team is playing in.";

    private const string CoachHasNoTeamMessage =
        "This coach account is not linked to a team.";

    private readonly IMatchRepository _matchRepository;
    private readonly ITeamRepository _teamRepository;
    private readonly IPlayerRepository _playerRepository;
    private readonly ILogger<MatchService> _logger;

    public MatchService(
        IMatchRepository matchRepository,
        ITeamRepository teamRepository,
        IPlayerRepository playerRepository,
        ILogger<MatchService> logger)
    {
        _matchRepository = matchRepository;
        _teamRepository = teamRepository;
        _playerRepository = playerRepository;
        _logger = logger;
    }

    public async Task<ServiceResult<IReadOnlyList<MatchListItemDto>>> GetAllAsync(CallerContext caller)
    {
        var matches = await _matchRepository.GetAllAsync();

        return ServiceResult<IReadOnlyList<MatchListItemDto>>.Ok(
            matches.Select(ToListItem).ToList());
    }

    public async Task<ServiceResult<MatchDetailDto>> GetByIdAsync(int matchId, CallerContext caller)
    {
        var match = await _matchRepository.GetByIdAsync(matchId);
        if (match is null)
        {
            return MatchNotFound(matchId);
        }

        return ServiceResult<MatchDetailDto>.Ok(await ToDetailAsync(match));
    }

    public async Task<ServiceResult<MatchDetailDto>> CreateAsync(
        CreateMatchRequest request, CallerContext caller)
    {
        // Scope first, so a Coach probing team ids they are not part of gets 403
        // whether or not those teams exist.
        var scope = CheckCoachIsPlaying(request.HomeTeamId, request.AwayTeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        // Left out of the schema on purpose (see CLAUDE.md section 3), so it lives here.
        if (request.HomeTeamId == request.AwayTeamId)
        {
            return ServiceResult<MatchDetailDto>.Fail("A team cannot play itself.");
        }

        var teams = await CheckTeamsExistAsync(request.HomeTeamId, request.AwayTeamId);
        if (teams is not null)
        {
            return teams;
        }

        var match = new Match
        {
            HomeTeamId = request.HomeTeamId,
            AwayTeamId = request.AwayTeamId,
            MatchDate = request.MatchDate,
            HomeScore = null,
            AwayScore = null,
            Status = MatchStatuses.Scheduled
        };

        var matchId = await _matchRepository.CreateAsync(match);
        _logger.LogInformation("Scheduled match {MatchId}: team {HomeTeamId} vs team {AwayTeamId}.",
            matchId, match.HomeTeamId, match.AwayTeamId);

        return await ReloadAsync(matchId);
    }

    public async Task<ServiceResult<MatchDetailDto>> UpdateAsync(
        int matchId, UpdateMatchRequest request, CallerContext caller)
    {
        var existing = await _matchRepository.GetByIdAsync(matchId);
        if (existing is null)
        {
            return MatchNotFound(matchId);
        }

        // A Coach must be playing in the fixture as it stands today...
        var scope = CheckCoachIsPlaying(existing.HomeTeamId, existing.AwayTeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        // ...and must still be playing in it afterwards, so they cannot hand the
        // fixture to two other teams.
        scope = CheckCoachIsPlaying(request.HomeTeamId, request.AwayTeamId, caller);
        if (scope is not null)
        {
            return scope;
        }

        if (request.HomeTeamId == request.AwayTeamId)
        {
            return ServiceResult<MatchDetailDto>.Fail("A team cannot play itself.");
        }

        if (!MatchStatuses.IsValid(request.Status))
        {
            return ServiceResult<MatchDetailDto>.Fail(
                $"Status must be '{MatchStatuses.Scheduled}' or '{MatchStatuses.Completed}'.");
        }

        var status = request.Status == MatchStatuses.Completed
            ? MatchStatuses.Completed
            : MatchStatuses.Scheduled;

        // Keep score and status coherent: a completed match has a result, a
        // scheduled one does not.
        if (status == MatchStatuses.Completed && (request.HomeScore is null || request.AwayScore is null))
        {
            return ServiceResult<MatchDetailDto>.Fail(
                "A Completed match needs both HomeScore and AwayScore.");
        }

        if (status == MatchStatuses.Scheduled && (request.HomeScore is not null || request.AwayScore is not null))
        {
            return ServiceResult<MatchDetailDto>.Fail(
                "A Scheduled match cannot carry a score. Set Status to Completed, or clear both scores.");
        }

        var teams = await CheckTeamsExistAsync(request.HomeTeamId, request.AwayTeamId);
        if (teams is not null)
        {
            return teams;
        }

        var match = new Match
        {
            MatchId = matchId,
            HomeTeamId = request.HomeTeamId,
            AwayTeamId = request.AwayTeamId,
            MatchDate = request.MatchDate,
            HomeScore = status == MatchStatuses.Completed ? request.HomeScore : null,
            AwayScore = status == MatchStatuses.Completed ? request.AwayScore : null,
            Status = status
        };

        if (!await _matchRepository.UpdateAsync(match))
        {
            return MatchNotFound(matchId);
        }

        _logger.LogInformation("Updated match {MatchId} to status {Status}.", matchId, status);
        return await ReloadAsync(matchId);
    }

    public async Task<ServiceResult<GoalDto>> AddGoalAsync(
        int matchId, CreateGoalRequest request, CallerContext caller)
    {
        var match = await _matchRepository.GetByIdAsync(matchId);
        if (match is null)
        {
            return ServiceResult<GoalDto>.Fail($"Match {matchId} was not found.", ServiceErrorType.NotFound);
        }

        if (caller.IsCoach)
        {
            if (caller.TeamId is null)
            {
                return ServiceResult<GoalDto>.Fail(CoachHasNoTeamMessage, ServiceErrorType.Forbidden);
            }

            if (match.HomeTeamId != caller.TeamId && match.AwayTeamId != caller.TeamId)
            {
                return ServiceResult<GoalDto>.Fail(CoachScopeMessage, ServiceErrorType.Forbidden);
            }
        }

        var player = await _playerRepository.GetByIdAsync(request.PlayerId);
        if (player is null)
        {
            return ServiceResult<GoalDto>.Fail(
                $"Player {request.PlayerId} was not found.", ServiceErrorType.NotFound);
        }

        // A goal only makes sense for someone on one of the two sides. A Coach may
        // record either side's goals, since they are entering the whole result.
        if (player.TeamId != match.HomeTeamId && player.TeamId != match.AwayTeamId)
        {
            return ServiceResult<GoalDto>.Fail(
                $"Player {request.PlayerId} plays for {player.TeamName}, which is not in this match.");
        }

        var goalId = await _matchRepository.AddGoalAsync(new Goal
        {
            MatchId = matchId,
            PlayerId = request.PlayerId,
            Minute = request.Minute
        });

        _logger.LogInformation("Recorded goal {GoalId} for player {PlayerId} in match {MatchId}.",
            goalId, request.PlayerId, matchId);

        var saved = await _matchRepository.GetGoalByIdAsync(goalId);
        if (saved is null)
        {
            return ServiceResult<GoalDto>.Fail(
                $"Goal {goalId} could not be read back.", ServiceErrorType.NotFound);
        }

        return ServiceResult<GoalDto>.Ok(ToGoalDto(saved));
    }

    /// <summary>
    /// Returns a failed result when a Coach is not one of the two sides, or null
    /// when the caller may proceed. Admins always pass.
    /// </summary>
    private static ServiceResult<MatchDetailDto>? CheckCoachIsPlaying(
        int homeTeamId, int awayTeamId, CallerContext caller)
    {
        if (!caller.IsCoach)
        {
            return null;
        }

        if (caller.TeamId is null)
        {
            return ServiceResult<MatchDetailDto>.Fail(CoachHasNoTeamMessage, ServiceErrorType.Forbidden);
        }

        var teamId = caller.TeamId.Value;

        return homeTeamId == teamId || awayTeamId == teamId
            ? null
            : ServiceResult<MatchDetailDto>.Fail(CoachScopeMessage, ServiceErrorType.Forbidden);
    }

    private async Task<ServiceResult<MatchDetailDto>?> CheckTeamsExistAsync(int homeTeamId, int awayTeamId)
    {
        if (!await _teamRepository.ExistsAsync(homeTeamId))
        {
            return TeamNotFound(homeTeamId);
        }

        if (!await _teamRepository.ExistsAsync(awayTeamId))
        {
            return TeamNotFound(awayTeamId);
        }

        return null;
    }

    private async Task<ServiceResult<MatchDetailDto>> ReloadAsync(int matchId)
    {
        var saved = await _matchRepository.GetByIdAsync(matchId);

        return saved is null
            ? MatchNotFound(matchId)
            : ServiceResult<MatchDetailDto>.Ok(await ToDetailAsync(saved));
    }

    private async Task<MatchDetailDto> ToDetailAsync(MatchWithTeams match)
    {
        var goals = await _matchRepository.GetGoalsAsync(match.MatchId);

        return new MatchDetailDto
        {
            MatchId = match.MatchId,
            HomeTeamId = match.HomeTeamId,
            HomeTeamName = match.HomeTeamName,
            HomeTeamLogoUrl = match.HomeTeamLogoUrl,
            AwayTeamId = match.AwayTeamId,
            AwayTeamName = match.AwayTeamName,
            AwayTeamLogoUrl = match.AwayTeamLogoUrl,
            MatchDate = match.MatchDate,
            HomeScore = match.HomeScore,
            AwayScore = match.AwayScore,
            Status = match.Status,
            Goals = goals.Select(ToGoalDto).ToList()
        };
    }

    private static ServiceResult<MatchDetailDto> MatchNotFound(int matchId) =>
        ServiceResult<MatchDetailDto>.Fail($"Match {matchId} was not found.", ServiceErrorType.NotFound);

    private static ServiceResult<MatchDetailDto> TeamNotFound(int teamId) =>
        ServiceResult<MatchDetailDto>.Fail($"Team {teamId} was not found.", ServiceErrorType.NotFound);

    private static MatchListItemDto ToListItem(MatchWithTeams match) => new()
    {
        MatchId = match.MatchId,
        HomeTeamId = match.HomeTeamId,
        HomeTeamName = match.HomeTeamName,
        HomeTeamLogoUrl = match.HomeTeamLogoUrl,
        AwayTeamId = match.AwayTeamId,
        AwayTeamName = match.AwayTeamName,
        AwayTeamLogoUrl = match.AwayTeamLogoUrl,
        MatchDate = match.MatchDate,
        HomeScore = match.HomeScore,
        AwayScore = match.AwayScore,
        Status = match.Status
    };

    private static GoalDto ToGoalDto(GoalWithPlayer goal) => new()
    {
        GoalId = goal.GoalId,
        MatchId = goal.MatchId,
        PlayerId = goal.PlayerId,
        PlayerName = goal.PlayerName,
        PlayerImageUrl = goal.PlayerImageUrl,
        TeamId = goal.TeamId,
        TeamName = goal.TeamName,
        TeamLogoUrl = goal.TeamLogoUrl,
        Minute = goal.Minute
    };
}
