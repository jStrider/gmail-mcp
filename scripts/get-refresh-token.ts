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
  console.log('Pour obtenir vos identifiants OAuth2 Gmail :');
  console.log('1. Allez sur https://console.cloud.google.com/');
  console.log('2. Créez un nouveau projet ou sélectionnez un projet existant');
  console.log('3. Activez l\'API Gmail pour votre projet');
  console.log('4. Allez dans "Identifiants" et créez un ID client OAuth2');
  console.log('5. Dans "Type d\'application", sélectionnez "Application de bureau"');
  console.log('6. IMPORTANT: Dans "URI de redirection autorisés", ajoutez: http://localhost:3000');
  console.log('7. Copiez le Client ID et le Client Secret\n');

  const clientId = await question('Entrez votre Client ID : ');
  const clientSecret = await question('Entrez votre Client Secret : ');

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000'
  );

  // Créer un serveur local temporaire pour recevoir le code
  const server = http.createServer();
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\nOuverture du navigateur pour l\'autorisation...');
  
  // Ouvrir l'URL dans le navigateur
  const openCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${openCommand} "${authUrl}"`);

  // Attendre le code de retour
  const code = await new Promise<string>((resolve, reject) => {
    server.on('request', (req, res) => {
      const queryObject = url.parse(req.url!, true).query;
      if (queryObject.code) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Autorisation réussie !</h1><p>Vous pouvez fermer cette fenêtre et retourner au terminal.</p>');
        server.close();
        resolve(queryObject.code as string);
      } else if (queryObject.error) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h1>Erreur d\'autorisation</h1><p>Veuillez réessayer.</p>');
        server.close();
        reject(new Error(queryObject.error as string));
      }
    });

    server.listen(3000, () => {
      console.log('En attente de l\'autorisation...');
    });
  });

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n✅ Tokens obtenus avec succès !\n');
    console.log('Ajoutez ces variables à votre configuration MCP :');
    console.log('----------------------------------------');
    console.log(`GMAIL_CLIENT_ID=${clientId}`);
    console.log(`GMAIL_CLIENT_SECRET=${clientSecret}`);
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('----------------------------------------\n');
    
    console.log('Ces valeurs doivent être ajoutées dans le fichier de configuration MCP.');
  } catch (error) {
    console.error('Erreur lors de l\'obtention des tokens :', error);
  }

  rl.close();
  process.exit(0);
}

main().catch(console.error);
