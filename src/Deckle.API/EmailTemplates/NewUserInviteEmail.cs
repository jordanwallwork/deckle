using Deckle.Email.Abstractions;

namespace Deckle.API.EmailTemplates;

/// <summary>
/// Email template for inviting a new user to collaborate on a project.
/// </summary>
public class NewUserInviteEmail : EmailTemplateBase
{
    /// <summary>
    /// The email address of the invited user.
    /// </summary>
    public required string RecipientEmail { get; init; }

    /// <summary>
    /// The name of the person who sent the invitation.
    /// </summary>
    public required string InviterName { get; init; }

    /// <summary>
    /// The name of the project the user is being invited to.
    /// </summary>
    public required string ProjectName { get; init; }

    /// <summary>
    /// Optional: The URL to accept the invitation (if you have an invitation acceptance flow).
    /// </summary>
    public string? InvitationUrl { get; init; }

    public override IReadOnlyList<EmailAddress> To => [EmailAddress.From(RecipientEmail)];

    public override string Subject =>
        $"{InviterName} invited you to collaborate on \"{ProjectName}\"";

    public override string HtmlBody => WrapInEmailLayout(
        Subject,
        GenerateBodyContent());

    public override string TextBody => $@"
Hello!

{InviterName} has invited you to collaborate on their Deckle project ""{ProjectName}"".

Deckle is a collaborative game design tool that helps you create and manage card games, dice games, and more.

{(InvitationUrl != null ? $@"
To get started, click the link below or copy and paste it into your browser:
{InvitationUrl}
" : @"
To get started:
1. Visit the Deckle application
2. Sign in with your Google account
3. You'll see ""{ProjectName}"" in your projects list
")}

If you have any questions, feel free to reach out to {InviterName}.

Best regards,
The Deckle Team
";

    private string GenerateBodyContent()
    {
        var acceptInvitationSection = InvitationUrl != null
            ? $@"
                <p style=""text-align: center;"">
                    <a href=""{InvitationUrl}"" class=""button"">Accept Invitation</a>
                </p>"
            : $@"
                <p><strong>To get started:</strong></p>
                <ol>
                    <li>Visit the Deckle application</li>
                    <li>Sign in with your Google account</li>
                    <li>You'll see <span class=""highlight"">{ProjectName}</span> in your projects list</li>
                </ol>";

        return $@"
            <h2>You've been invited to collaborate!</h2>

            <p>
                <strong>{InviterName}</strong> has invited you to collaborate on their Deckle project
                <span class=""highlight"">{ProjectName}</span>.
            </p>

            <p>
                Deckle is a collaborative game design tool that helps you create and manage
                card games, dice games, and more. As a collaborator, you'll be able to:
            </p>

            <ul>
                <li>View and edit game components</li>
                <li>Manage data sources</li>
                <li>Contribute to the project's design</li>
            </ul>

            {acceptInvitationSection}

            <p>
                If you have any questions, feel free to reach out to {InviterName}.
            </p>

            <p>
                We're excited to have you on board!<br>
                <strong>The Deckle Team</strong>
            </p>
        ";
    }
}
