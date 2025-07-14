#!/usr/bin/env node
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as readline from 'readline';
import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.send'
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function main() {
  console.log('To get your Gmail OAuth2 credentials:');
  console.log('1. Go to https://console.cloud.google.com/');
  console.log('2. Create a new project or select an existing project');
  console.log('3. Enable the Gmail API for your project');
  console.log('4. Go to "Credentials" and create an OAuth2 Client ID');
  console.log('5. For "Application type", select "Desktop app"');
  console.log('6. IMPORTANT: In "Authorized redirect URIs", add: http://localhost:3000');
  console.log('7. Copy the Client ID and Client Secret\n');

  const clientId = await question('Enter your Client ID: ');
  const clientSecret = await question('Enter your Client Secret: ');

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000'
  );

  // Create a temporary local server to receive the code
  const server = http.createServer();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\nOpening browser for authorization...');
  
  // Open the URL in the browser
  const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCommand} "${authUrl}"`);

  // Wait for the return code
  const code = await new Promise<string>((resolve, reject) => {
    server.on('request', (req, res) => {
      const queryObject = url.parse(req.url!, true).query;
      if (queryObject.code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Authorization successful!</h1><p>You can close this window and return to the terminal.</p>');
        server.close();
        resolve(queryObject.code as string);
      } else if (queryObject.error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Authorization error</h1><p>Please try again.</p>');
        server.close();
        reject(new Error(queryObject.error as string));
      }
    });

    server.listen(3000, () => {
      console.log('Waiting for authorization...');
    });
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Tokens obtained successfully!\n');
    console.log('Add these variables to your MCP configuration:');
    console.log('----------------------------------------');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('----------------------------------------\n');
    
    console.log('These values should be added to the MCP configuration file.');
  } catch (error) {
    console.error('Error obtaining tokens:', error);
  }

  rl.close();
  process.exit(0);
}

main().catch(console.error);
