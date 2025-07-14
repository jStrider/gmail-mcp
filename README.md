# MCP Gmail Server

Un serveur MCP (Model Context Protocol) pour intégrer Gmail avec Claude et d'autres assistants IA compatibles MCP.

## 🚀 Fonctionnalités

- **Liste des emails** : Récupère les emails de votre boîte de réception
- **Envoi d'emails** : Compose et envoie des emails
- **Gestion des emails** : Supprime, archive, marque comme lu
- **Opérations par lot** : Traite plusieurs emails en une seule opération
- **Gestion des labels** : Liste et déplace les emails vers des labels spécifiques

## 📋 Prérequis

- Node.js 18 ou supérieur
- Un compte Google avec l'API Gmail activée
- Des identifiants OAuth2 (Client ID, Client Secret)

## 🔧 Installation

1. Clonez le repository :
```bash
git clone https://github.com/jStrider/gmail-mcp.git
cd gmail-mcp
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez vos identifiants OAuth2 (voir section Configuration)

## ⚙️ Configuration

### Étape 1 : Créer un projet Google Cloud

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Gmail pour votre projet
4. Allez dans "Identifiants" et créez un ID client OAuth2
5. Type d'application : "Application de bureau"
6. **Important** : Ajoutez `http://localhost:3000` dans les URI de redirection autorisés

### Étape 2 : Obtenir le Refresh Token

Exécutez le script d'authentification :

```bash
npm run get-token
```

Suivez les instructions à l'écran pour :
1. Entrer votre Client ID
2. Entrer votre Client Secret
3. Autoriser l'accès dans votre navigateur
4. Récupérer votre Refresh Token

### Étape 3 : Configurer les variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
GMAIL_CLIENT_ID=votre_client_id
GMAIL_CLIENT_SECRET=votre_client_secret
GMAIL_REFRESH_TOKEN=votre_refresh_token
```

## 🎯 Utilisation avec Claude Desktop

1. Ajoutez le serveur à votre configuration Claude Desktop (`claude_desktop_config.json`) :

```json
{
  "mcpServers": {
    "gmail": {
      "command": "node",
      "args": ["/chemin/vers/gmail-mcp/build/src/index.js"],
      "env": {
        "GMAIL_CLIENT_ID": "votre_client_id",
        "GMAIL_CLIENT_SECRET": "votre_client_secret",
        "GMAIL_REFRESH_TOKEN": "votre_refresh_token"
      }
    }
  }
}
```

2. Redémarrez Claude Desktop

## 📚 Outils disponibles

### list_emails
Liste les emails de la boîte de réception
- `maxResults` : Nombre maximum d'emails (défaut: 10)
- `query` : Requête de recherche Gmail (optionnel)

### send_email
Envoie un email
- `to` : Adresse du destinataire
- `subject` : Objet de l'email
- `body` : Corps de l'email

### delete_email
Supprime un email
- `id` : ID de l'email

### archive_email
Archive un email
- `id` : ID de l'email

### mark_as_read
Marque un email comme lu
- `id` : ID de l'email

### Opérations par lot

- `delete_emails_batch` : Supprime plusieurs emails
- `archive_emails_batch` : Archive plusieurs emails
- `mark_as_read_batch` : Marque plusieurs emails comme lus

### Gestion des labels

- `list_labels` : Liste tous les labels disponibles
- `move_to_label` : Déplace un email vers un label
- `move_to_label_batch` : Déplace plusieurs emails vers un label

## 🛠️ Scripts utiles

```bash
# Compiler le projet
npm run build

# Compiler en mode watch
npm run watch

# Obtenir un nouveau refresh token
npm run get-token

# Nettoyer et reconstruire
npm run rebuild

# Inspecter le serveur MCP
npm run inspector
```

## 📁 Structure du projet

```
mcp-gmail/
├── src/              # Code source TypeScript
│   └── index.ts      # Point d'entrée du serveur MCP
├── scripts/          # Scripts utilitaires
│   └── get-refresh-token.ts
├── build/            # Code JavaScript compilé
├── .env              # Variables d'environnement (ignoré par git)
├── .env.example      # Exemple de configuration
├── package.json      # Configuration npm
├── tsconfig.json     # Configuration TypeScript
└── README.md         # Ce fichier
```

## 🔒 Sécurité

- Ne partagez jamais vos identifiants OAuth2
- Le fichier `.env` est automatiquement ignoré par Git
- Utilisez des permissions minimales pour l'API Gmail

## 📝 Licence

MIT - Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 🐛 Problèmes connus

Si vous rencontrez des problèmes :
1. Vérifiez que l'API Gmail est bien activée dans votre projet Google Cloud
2. Assurez-vous que les URI de redirection incluent `http://localhost:3000`
3. Vérifiez que votre refresh token est valide

## 📧 Contact

Julien Renaud - [GitHub](https://github.com/jStrider)
