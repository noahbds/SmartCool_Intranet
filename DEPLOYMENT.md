# Déploiement SmartCool Intranet

## Problème
GitHub Pages ne supporte que les sites statiques. Votre application nécessite :
- Un serveur Node.js/Express
- Une base de données SQLite

## Solution : Déployer sur Vercel

### Étapes :

1. **Installer Vercel CLI** :
   ```bash
   npm install -g vercel
   ```

2. **Se connecter à Vercel** :
   ```bash
   vercel login
   ```

3. **Déployer l'application** :
   ```bash
   vercel
   ```

4. **Suivre les instructions** :
   - Link to existing project? → No
   - What's your project's name? → smartcool-intranet
   - In which directory is your code located? → ./
   - Want to override the settings? → No

5. **Pour la production** :
   ```bash
   vercel --prod
   ```

### Alternative : Railway.app

Si vous préférez Railway :

1. Allez sur https://railway.app
2. Connectez votre repository GitHub
3. Sélectionnez le dépôt `SmartCool_Intranet`
4. Railway détectera automatiquement Node.js et déploiera

### Alternative : Render.com

1. Allez sur https://render.com
2. Créez un nouveau "Web Service"
3. Connectez votre repository GitHub
4. Build Command: `npm install`
5. Start Command: `node server.js`

## Note importante sur SQLite

Pour un déploiement en production, considérez migrer vers :
- **PostgreSQL** (gratuit sur Vercel, Railway, Render)
- **Turso** (SQLite cloud-native)
- **PlanetScale** (MySQL serverless)

SQLite n'est pas idéal pour les déploiements serverless car le fichier .db n'est pas persistant.
