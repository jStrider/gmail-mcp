#!/usr/bin/env node
import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GaxiosError } from 'gaxios';

interface ListEmailsArgs {
  maxResults?: number;
  query?: string;
}

interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
}

interface EmailIdArg {
  id: string;
}

interface EmailIdsArg {
  ids: string[];
}

interface EmailHeader {
  name: string;
  value: string;
}

interface MoveToLabelArg {
  id: string;
  labelId: string;
}

interface MoveToLabelBatchArg {
  ids: string[];
  labelId: string;
}

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  throw new Error('Environment variables GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN are required');
}

class GmailServer {
  private server: Server;
  private oauth2Client: OAuth2Client;
  private gmail: any;

  constructor() {
    this.server = new Server(
      {
        name: 'gmail-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // OAuth2 Configuration
    this.oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    // Gmail API initialization
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_emails',
          description: 'List emails from inbox',
          inputSchema: {
            type: 'object',
            properties: {
              maxResults: {
                type: 'number',
                description: 'Maximum number of emails to return',
                default: 10
              },
              query: {
                type: 'string',
                description: 'Gmail search query (optional)',
              }
            }
          }
        },
        {
          name: 'send_email',
          description: 'Send an email',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Recipient email address'
              },
              subject: {
                type: 'string',
                description: 'Email subject'
              },
              body: {
                type: 'string',
                description: 'Email body'
              }
            },
            required: ['to', 'subject', 'body']
          }
        },
        {
          name: 'delete_email',
          description: 'Delete an email',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the email to delete'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'mark_as_read',
          description: 'Mark an email as read',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the email to mark as read'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_emails_batch',
          description: 'Delete multiple emails at once',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'List of email IDs to delete'
              }
            },
            required: ['ids']
          }
        },
        {
          name: 'archive_email',
          description: 'Archive an email (remove from inbox)',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the email to archive'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'archive_emails_batch',
          description: 'Archive multiple emails at once',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'List of email IDs to archive'
              }
            },
            required: ['ids']
          }
        },
        {
          name: 'mark_as_read_batch',
          description: 'Mark multiple emails as read at once',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'List of email IDs to mark as read'
              }
            },
            required: ['ids']
          }
        },
        {
          name: 'list_labels',
          description: 'List all available Gmail labels',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'move_to_label',
          description: 'Move an email to a specific label',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID of the email to move'
              },
              labelId: {
                type: 'string',
                description: 'ID of the destination label'
              }
            },
            required: ['id', 'labelId']
          }
        },
        {
          name: 'move_to_label_batch',
          description: 'Move multiple emails to a specific label',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'List of email IDs to move'
              },
              labelId: {
                type: 'string',
                description: 'ID of the destination label'
              }
            },
            required: ['ids', 'labelId']
          }
        }
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const args = request.params.arguments || {};
        
        switch (request.params.name) {
          case 'list_emails': {
            const listArgs: ListEmailsArgs = {
              maxResults: typeof args.maxResults === 'number' ? args.maxResults : 10,
              query: typeof args.query === 'string' ? args.query : ''
            };
            return await this.listEmails(listArgs);
          }
          case 'send_email': {
            if (typeof args.to !== 'string' || typeof args.subject !== 'string' || typeof args.body !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameters to, subject and body must be strings'
              );
            }
            const sendArgs: SendEmailArgs = {
              to: args.to,
              subject: args.subject,
              body: args.body
            };
            return await this.sendEmail(sendArgs);
          }
          case 'delete_email':
          case 'mark_as_read': {
            if (typeof args.id !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameter id must be a string'
              );
            }
            const idArg: EmailIdArg = { id: args.id };
            return request.params.name === 'delete_email' 
              ? await this.deleteEmail(idArg)
              : await this.markAsRead(idArg);
          }
          case 'delete_emails_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string')) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameter ids must be an array of strings'
              );
            }
            const idsArg: EmailIdsArg = { ids: args.ids };
            return await this.deleteEmailsBatch(idsArg);
          }
          case 'archive_email': {
            if (typeof args.id !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameter id must be a string'
              );
            }
            const idArg: EmailIdArg = { id: args.id };
            return await this.archiveEmail(idArg);
          }
          case 'archive_emails_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string')) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameter ids must be an array of strings'
              );
            }
            const idsArg: EmailIdsArg = { ids: args.ids };
            return await this.archiveEmailsBatch(idsArg);
          }
          case 'mark_as_read_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string')) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameter ids must be an array of strings'
              );
            }
            const idsArg: EmailIdsArg = { ids: args.ids };
            return await this.markAsReadBatch(idsArg);
          }
          case 'list_labels': {
            return await this.listLabels();
          }
          case 'move_to_label': {
            if (typeof args.id !== 'string' || typeof args.labelId !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameters id and labelId must be strings'
              );
            }
            const moveArg: MoveToLabelArg = { id: args.id, labelId: args.labelId };
            return await this.moveToLabel(moveArg);
          }
          case 'move_to_label_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string') || typeof args.labelId !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Parameter ids must be an array of strings and labelId must be a string'
              );
            }
            const moveBatchArg: MoveToLabelBatchArg = { ids: args.ids, labelId: args.labelId };
            return await this.moveToLabelBatch(moveBatchArg);
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async listEmails({ maxResults = 10, query = '' }: ListEmailsArgs) {
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query
    });

    // Si aucun email n'est trouvé, retourner un tableau vide
    if (!response.data.messages) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify([], null, 2),
          },
        ],
      };
    }

    const emails = await Promise.all(
      response.data.messages.map(async (message: { id: string }) => {
        const email = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        
        const headers = email.data.payload.headers as EmailHeader[];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
        const from = headers.find(h => h.name === 'From')?.value || '(unknown sender)';
        const date = headers.find(h => h.name === 'Date')?.value || '';

        return {
          id: message.id,
          subject,
          from,
          date,
          snippet: email.data.snippet
        };
      })
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(emails, null, 2),
        },
      ],
    };
  }

  private async sendEmail({ to, subject, body }: SendEmailArgs) {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const messageParts = [
      'From: me',
      `To: ${to}`,
      `Subject: ${utf8Subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 7bit',
      '',
      body
    ];
    const message = messageParts.join('\n');

    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: 'Email sent successfully',
        },
      ],
    };
  }

  private async deleteEmail({ id }: EmailIdArg) {
    await this.gmail.users.messages.trash({
      userId: 'me',
      id,
    });

    return {
      content: [
        {
          type: 'text',
          text: 'Email deleted successfully',
        },
      ],
    };
  }

  private async markAsRead({ id }: EmailIdArg) {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: 'Email marked as read',
        },
      ],
    };
  }

  private async deleteEmailsBatch({ ids }: EmailIdsArg) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          await this.gmail.users.messages.trash({
            userId: 'me',
            id,
          });
          return { id, success: true };
        } catch (error) {
          return { id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `${successCount} emails deleted successfully, ${failedCount} failed`,
            results
          }, null, 2),
        },
      ],
    };
  }

  private async archiveEmail({ id }: EmailIdArg) {
    // Archiver l'email en retirant le label INBOX
    await this.gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });

    // Vérifier que l'email n'est plus dans la boîte de réception
    const response = await this.gmail.users.messages.get({
      userId: 'me',
      id,
    });

    const labels = response.data.labelIds || [];
    const isStillInInbox = labels.includes('INBOX');

    if (isStillInInbox) {
      throw new Error('Failed to archive email - still in inbox');
    }

    return {
      content: [
        {
          type: 'text',
          text: 'Email archived successfully and verified',
        },
      ],
    };
  }

  private async archiveEmailsBatch({ ids }: EmailIdsArg) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          // Archiver l'email
          await this.gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
              removeLabelIds: ['INBOX'],
            },
          });

          // Vérifier que l'email n'est plus dans la boîte de réception
          const response = await this.gmail.users.messages.get({
            userId: 'me',
            id,
          });

          const labels = response.data.labelIds || [];
          const isStillInInbox = labels.includes('INBOX');

          if (isStillInInbox) {
            throw new Error('Failed to archive email - still in inbox');
          }

          return { id, success: true };
        } catch (error) {
          return { id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `${successCount} emails archived successfully and verified, ${failedCount} failed`,
            results
          }, null, 2),
        },
      ],
    };
  }

  private async markAsReadBatch({ ids }: EmailIdsArg) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          await this.gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
              removeLabelIds: ['UNREAD'],
            },
          });
          return { id, success: true };
        } catch (error) {
          return { id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `${successCount} emails marked as read, ${failedCount} failed`,
            results
          }, null, 2),
        },
      ],
    };
  }

  private async listLabels() {
    const response = await this.gmail.users.labels.list({
      userId: 'me',
    });

    const labels = response.data.labels || [];
    const formattedLabels = labels.map((label: any) => ({
      id: label.id,
      name: label.name,
      type: label.type,
      messageListVisibility: label.messageListVisibility,
      labelListVisibility: label.labelListVisibility
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(formattedLabels, null, 2),
        },
      ],
    };
  }

  private async moveToLabel({ id, labelId }: MoveToLabelArg) {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX'], // Remove from inbox
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Email moved to label successfully`,
        },
      ],
    };
  }

  private async moveToLabelBatch({ ids, labelId }: MoveToLabelBatchArg) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          await this.gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
              addLabelIds: [labelId],
              removeLabelIds: ['INBOX'],
            },
          });
          return { id, success: true };
        } catch (error) {
          return { id, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            message: `${successCount} emails moved to label, ${failedCount} failed`,
            results
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP Gmail server started on stdio');
  }
}

const server = new GmailServer();
server.run().catch(console.error);
