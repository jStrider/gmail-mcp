#!/usr/bin/env node
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
  throw new Error('Les variables d\'environnement GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET et GMAIL_REFRESH_TOKEN sont requises');
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

    // Configuration OAuth2
    this.oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      'urn:ietf:wg:oauth:2.0:oob'
    );

    this.oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    // Initialisation de l'API Gmail
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
          description: 'Liste les emails de la boîte de réception',
          inputSchema: {
            type: 'object',
            properties: {
              maxResults: {
                type: 'number',
                description: 'Nombre maximum d\'emails à retourner',
                default: 10
              },
              query: {
                type: 'string',
                description: 'Requête de recherche Gmail (optionnel)',
              }
            }
          }
        },
        {
          name: 'send_email',
          description: 'Envoie un email',
          inputSchema: {
            type: 'object',
            properties: {
              to: {
                type: 'string',
                description: 'Adresse email du destinataire'
              },
              subject: {
                type: 'string',
                description: 'Objet de l\'email'
              },
              body: {
                type: 'string',
                description: 'Corps de l\'email'
              }
            },
            required: ['to', 'subject', 'body']
          }
        },
        {
          name: 'delete_email',
          description: 'Supprime un email',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID de l\'email à supprimer'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'mark_as_read',
          description: 'Marque un email comme lu',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID de l\'email à marquer comme lu'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'delete_emails_batch',
          description: 'Supprime plusieurs emails en une seule fois',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Liste des IDs des emails à supprimer'
              }
            },
            required: ['ids']
          }
        },
        {
          name: 'archive_email',
          description: 'Archive un email (le retire de la boîte de réception)',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID de l\'email à archiver'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'archive_emails_batch',
          description: 'Archive plusieurs emails en une seule fois',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Liste des IDs des emails à archiver'
              }
            },
            required: ['ids']
          }
        },
        {
          name: 'mark_as_read_batch',
          description: 'Marque plusieurs emails comme lus en une seule fois',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Liste des IDs des emails à marquer comme lus'
              }
            },
            required: ['ids']
          }
        },
        {
          name: 'list_labels',
          description: 'Liste tous les labels Gmail disponibles',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'move_to_label',
          description: 'Déplace un email vers un label spécifique',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'ID de l\'email à déplacer'
              },
              labelId: {
                type: 'string',
                description: 'ID du label de destination'
              }
            },
            required: ['id', 'labelId']
          }
        },
        {
          name: 'move_to_label_batch',
          description: 'Déplace plusieurs emails vers un label spécifique',
          inputSchema: {
            type: 'object',
            properties: {
              ids: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Liste des IDs des emails à déplacer'
              },
              labelId: {
                type: 'string',
                description: 'ID du label de destination'
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
                'Les paramètres to, subject et body doivent être des chaînes de caractères'
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
                'Le paramètre id doit être une chaîne de caractères'
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
                'Le paramètre ids doit être un tableau de chaînes de caractères'
              );
            }
            const idsArg: EmailIdsArg = { ids: args.ids };
            return await this.deleteEmailsBatch(idsArg);
          }
          case 'archive_email': {
            if (typeof args.id !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Le paramètre id doit être une chaîne de caractères'
              );
            }
            const idArg: EmailIdArg = { id: args.id };
            return await this.archiveEmail(idArg);
          }
          case 'archive_emails_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string')) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Le paramètre ids doit être un tableau de chaînes de caractères'
              );
            }
            const idsArg: EmailIdsArg = { ids: args.ids };
            return await this.archiveEmailsBatch(idsArg);
          }
          case 'mark_as_read_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string')) {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Le paramètre ids doit être un tableau de chaînes de caractères'
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
                'Les paramètres id et labelId doivent être des chaînes de caractères'
              );
            }
            const moveArg: MoveToLabelArg = { id: args.id, labelId: args.labelId };
            return await this.moveToLabel(moveArg);
          }
          case 'move_to_label_batch': {
            if (!Array.isArray(args.ids) || args.ids.some(id => typeof id !== 'string') || typeof args.labelId !== 'string') {
              throw new McpError(
                ErrorCode.InvalidParams,
                'Les paramètres ids doit être un tableau de chaînes et labelId une chaîne de caractères'
              );
            }
            const moveBatchArg: MoveToLabelBatchArg = { ids: args.ids, labelId: args.labelId };
            return await this.moveToLabelBatch(moveBatchArg);
          }
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Outil inconnu: ${request.params.name}`
            );
        }
      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Une erreur inconnue est survenue';
        return {
          content: [
            {
              type: 'text',
              text: `Erreur: ${errorMessage}`,
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

    const emails = await Promise.all(
      response.data.messages.map(async (message: { id: string }) => {
        const email = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
        });
        
        const headers = email.data.payload.headers as EmailHeader[];
        const subject = headers.find(h => h.name === 'Subject')?.value || '(pas d\'objet)';
        const from = headers.find(h => h.name === 'From')?.value || '(expéditeur inconnu)';
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
          text: 'Email envoyé avec succès',
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
          text: 'Email supprimé avec succès',
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
          text: 'Email marqué comme lu',
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
          return { id, success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
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
            message: `${successCount} emails supprimés avec succès, ${failedCount} échecs`,
            results
          }, null, 2),
        },
      ],
    };
  }

  private async archiveEmail({ id }: EmailIdArg) {
    await this.gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        removeLabelIds: ['INBOX'],
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: 'Email archivé avec succès',
        },
      ],
    };
  }

  private async archiveEmailsBatch({ ids }: EmailIdsArg) {
    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          await this.gmail.users.messages.modify({
            userId: 'me',
            id,
            requestBody: {
              removeLabelIds: ['INBOX'],
            },
          });
          return { id, success: true };
        } catch (error) {
          return { id, success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
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
            message: `${successCount} emails archivés avec succès, ${failedCount} échecs`,
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
          return { id, success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
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
            message: `${successCount} emails marqués comme lus, ${failedCount} échecs`,
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
        removeLabelIds: ['INBOX'], // Retire de la boîte de réception
      },
    });

    return {
      content: [
        {
          type: 'text',
          text: `Email déplacé vers le label avec succès`,
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
          return { id, success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
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
            message: `${successCount} emails déplacés vers le label, ${failedCount} échecs`,
            results
          }, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Serveur MCP Gmail démarré sur stdio');
  }
}

const server = new GmailServer();
server.run().catch(console.error);
