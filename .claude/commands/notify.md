# Notify Command

Send a Windows toast notification with the provided message.

## Instructions

When this command is invoked with a message in `$ARGUMENTS`, use the Bash tool to run:

```bash
powershell -ExecutionPolicy Bypass -File ".claude/commands/notify.ps1" -Message "$ARGUMENTS"
```

After sending the notification, confirm to the user that the notification was sent.
