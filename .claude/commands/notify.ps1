param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

# Load required Windows Runtime types
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

# Escape XML special characters in message
$escapedMessage = [System.Security.SecurityElement]::Escape($Message)

# Create toast XML
$toastXml = @"
<toast>
    <visual>
        <binding template="ToastText02">
            <text id="1">Claude Code</text>
            <text id="2">$escapedMessage</text>
        </binding>
    </visual>
</toast>
"@

# Create and show notification
$xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
$xml.LoadXml($toastXml)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Claude Code")
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
$notifier.Show($toast)

Write-Host "Notification sent: $Message"
