using Deckle.Email.Abstractions;

namespace Deckle.API.EmailTemplates.Admin;

/// <summary>
/// Email template to notify the site administrator when a new user registers.
/// </summary>
public class NewUserRegisteredTemplate : EmailTemplateBase
{
    public required string AdminEmail { get; init; }
    public required string UserName { get; init; }
    public required string UserEmail { get; init; }
    public required string Username { get; init; }
    public required DateTime SignupDate { get; init; }

    public override IReadOnlyList<EmailAddress> To => [EmailAddress.From(AdminEmail)];

    public override string Subject => $"New user registered: {Username}";

    public override string HtmlBody => WrapInEmailLayout(
        Subject,
        GenerateBodyContent());

    public override string TextBody => $@"
New User Registration
=====================

A new user has registered on Deckle.

Name: {UserName}
Email: {UserEmail}
Username: {Username}
Signup Date: {SignupDate:dd MMMM yyyy, HH:mm} UTC

--
Deckle Admin Notifications
";

    private string GenerateBodyContent()
    {
        return $@"
            <h2>New User Registration</h2>

            <p>A new user has registered on Deckle.</p>

            <table style=""width: 100%; border-collapse: collapse; margin: 20px 0;"">
                <tr>
                    <td style=""padding: 8px 12px; font-weight: bold; color: #344956; border-bottom: 1px solid #e9ecef;"">Name</td>
                    <td style=""padding: 8px 12px; border-bottom: 1px solid #e9ecef;"">{UserName}</td>
                </tr>
                <tr>
                    <td style=""padding: 8px 12px; font-weight: bold; color: #344956; border-bottom: 1px solid #e9ecef;"">Email</td>
                    <td style=""padding: 8px 12px; border-bottom: 1px solid #e9ecef;"">{UserEmail}</td>
                </tr>
                <tr>
                    <td style=""padding: 8px 12px; font-weight: bold; color: #344956; border-bottom: 1px solid #e9ecef;"">Username</td>
                    <td style=""padding: 8px 12px; border-bottom: 1px solid #e9ecef;""><span class=""highlight"">{Username}</span></td>
                </tr>
                <tr>
                    <td style=""padding: 8px 12px; font-weight: bold; color: #344956;"">Signup Date</td>
                    <td style=""padding: 8px 12px;"">{SignupDate:dd MMMM yyyy, HH:mm} UTC</td>
                </tr>
            </table>
        ";
    }
}
