# Gmail MCP Server

A Model Context Protocol (MCP) server that enables Claude to interact with Gmail through a secure OAuth2 connection.

## Features

- 📧 **Email Management**
  - List emails with search queries
  - Send emails
  - Delete emails (single or batch)
  - Mark emails as read (single or batch)
  - Archive emails (single or batch)

- 🔍 **Advanced Search**
  - Use Gmail's powerful search syntax
  - Filter by sender, date, labels, and more

- 🔐 **Secure Authentication**
  - OAuth2 authentication
  - No password storage
  - Refresh token for persistent access

## Installation

### Prerequisites

- Node.js (v16 or higher)
- A Google Cloud Project with Gmail API enabled
- OAuth2 credentials

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd gmail-server
   npm install
   ```

2. **Set up Google Cloud credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Gmail API
   - Create OAuth2 credentials (Desktop application type)
   - Add `http://localhost:3000` to authorized redirect URIs

3. **Get your refresh token**
   ```bash
   npm run build
   node build/get-refresh-token.js
   ```
   Follow the prompts to authenticate and get your refresh token.

4. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Fill in your credentials:
     ```
     GMAIL_CLIENT_ID=your_client_id
     GMAIL_CLIENT_SECRET=your_client_secret
     GMAIL_REFRESH_TOKEN=your_refresh_token
     ```

5. **Build the server**
   ```bash
   npm run build
   ```

## Configuration

### For Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "gmail-server": {
      "command": "node",
      "args": ["/path/to/gmail-server/build/index.js"],
      "env": {
        "GMAIL_CLIENT_ID": "your_client_id",
        "GMAIL_CLIENT_SECRET": "your_client_secret",
        "GMAIL_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

### For Cline (VSCode/Cursor)

Add to your MCP settings file:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/path/to/gmail-server/build/index.js"],
      "env": {
        "GMAIL_CLIENT_ID": "your_client_id",
        "GMAIL_CLIENT_SECRET": "your_client_secret",
        "GMAIL_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

## Available Tools

### list_emails
List emails from your inbox.
- `maxResults` (optional): Number of emails to return (default: 10, max: 500)
- `query` (optional): Gmail search query

### send_email
Send an email.
- `to` (required): Recipient email address
- `subject` (required): Email subject
- `body` (required): Email body

### delete_email
Delete a single email.
- `id` (required): Email ID

### delete_emails_batch
Delete multiple emails at once.
- `ids` (required): Array of email IDs

### mark_as_read
Mark a single email as read.
- `id` (required): Email ID

### mark_as_read_batch
Mark multiple emails as read.
- `ids` (required): Array of email IDs

### archive_email
Archive a single email (removes from inbox).
- `id` (required): Email ID

### archive_emails_batch
Archive multiple emails at once.
- `ids` (required): Array of email IDs

### list_labels
List all available Gmail labels.
- No parameters required

### move_to_label
Move a single email to a specific label.
- `id` (required): Email ID
- `labelId` (required): Label ID

### move_to_label_batch
Move multiple emails to a specific label.
- `ids` (required): Array of email IDs
- `labelId` (required): Label ID

## Gmail Search Query Examples

- `is:unread` - All unread emails
- `from:example@gmail.com` - Emails from specific sender
- `subject:invoice` - Emails with "invoice" in subject
- `has:attachment` - Emails with attachments
- `larger:10M` - Emails larger than 10MB
- `after:2024/1/1` - Emails after specific date
- `label:important` - Emails with specific label

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Watch for changes
npm run watch

# Run the server (for testing)
node build/index.js
```

## Security Notes

- Never commit your `.env` file or share your credentials
- The refresh token provides access to your Gmail account
- Regularly review and revoke unused tokens in your Google Account settings

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
