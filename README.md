# MCP Gmail Server

A Model Context Protocol (MCP) server for integrating Gmail with Claude and other MCP-compatible AI assistants.

## 🚀 Features

- **List emails**: Retrieve emails from your inbox
- **Send emails**: Compose and send emails
- **Email management**: Delete, archive, mark as read
- **Batch operations**: Process multiple emails in a single operation
- **Label management**: List and move emails to specific labels

## 📋 Prerequisites

- Node.js 18 or higher
- A Google account with Gmail API enabled
- OAuth2 credentials (Client ID, Client Secret)

## 🔧 Installation

1. Clone the repository:
```bash
git clone https://github.com/jStrider/gmail-mcp.git
cd gmail-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Configure your OAuth2 credentials (see Configuration section)

## ⚙️ Configuration

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API for your project
4. Go to "Credentials" and create an OAuth2 Client ID
5. Application type: "Desktop app"
6. **Important**: Add `http://localhost:3000` to the authorized redirect URIs

### Step 2: Get the Refresh Token

Run the authentication script:

```bash
npm run get-token
```

Follow the on-screen instructions to:
1. Enter your Client ID
2. Enter your Client Secret
3. Authorize access in your browser
4. Retrieve your Refresh Token

### Step 3: Configure Environment Variables

Create a `.env` file at the project root:

```env
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REFRESH_TOKEN=your_refresh_token
```

## 🎯 Usage with Claude Desktop

1. Add the server to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/path/to/gmail-mcp/build/src/index.js"],
      "env": {
        "GMAIL_CLIENT_ID": "your_client_id",
        "GMAIL_CLIENT_SECRET": "your_client_secret",
        "GMAIL_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

2. Restart Claude Desktop

## 📚 Available Tools

### list_emails
List emails from inbox
- `maxResults`: Maximum number of emails (default: 10)
- `query`: Gmail search query (optional)

### send_email
Send an email
- `to`: Recipient email address
- `subject`: Email subject
- `body`: Email body

### delete_email
Delete an email
- `id`: Email ID

### archive_email
Archive an email
- `id`: Email ID

### mark_as_read
Mark an email as read
- `id`: Email ID

### Batch Operations

- `delete_emails_batch`: Delete multiple emails
- `archive_emails_batch`: Archive multiple emails
- `mark_as_read_batch`: Mark multiple emails as read

### Label Management

- `list_labels`: List all available labels
- `move_to_label`: Move an email to a label
- `move_to_label_batch`: Move multiple emails to a label

## 🛠️ Useful Scripts

```bash
# Build the project
npm run build

# Build in watch mode
npm run watch

# Get a new refresh token
npm run get-token

# Clean and rebuild
npm run rebuild

# Inspect the MCP server
npm run inspector
```

## 📁 Project Structure

```
mcp-gmail/
├── src/              # TypeScript source code
│   └── index.ts      # MCP server entry point
├── scripts/          # Utility scripts
│   └── get-refresh-token.ts
├── build/            # Compiled JavaScript code
├── .env              # Environment variables (ignored by git)
├── .env.example      # Configuration example
├── package.json      # npm configuration
├── tsconfig.json     # TypeScript configuration
└── README.md         # This file
```

## 🔒 Security

- Never share your OAuth2 credentials
- The `.env` file is automatically ignored by Git
- Use minimal permissions for the Gmail API

## 📝 License

MIT - See the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or pull request.

## 🐛 Troubleshooting

If you encounter issues:
1. Verify that the Gmail API is enabled in your Google Cloud project
2. Ensure redirect URIs include `http://localhost:3000`
3. Check that your refresh token is valid

## 📧 Contact

Julien Renaud - [GitHub](https://github.com/jStrider)
