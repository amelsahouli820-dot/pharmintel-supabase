# PharmIntel gratuit — Supabase + Koyeb

Cette variante utilise :

- **Supabase Free** : PostgreSQL et stockage privé des documents ;
- **Koyeb Free Instance** : site Next.js et worker d’analyse ;
- **OpenAI** : analyse documentaire, avec votre propre clé (service facturé séparément).

## 1. Informations à relever dans Supabase

Dans votre projet Supabase :

1. **Connect → ORMs → Prisma** : copiez l’URL du pooler en mode transaction dans `DATABASE_URL` et l’URL du pooler en mode session dans `DIRECT_URL`.
2. **Project Settings → API** : copiez `Project URL` dans `SUPABASE_URL`.
3. Créez une clé serveur secrète ou utilisez la clé `service_role` dans `SUPABASE_SECRET_KEY`.

Ne placez jamais la clé secrète dans GitHub et ne l’envoyez à personne. Elle sera saisie uniquement dans les variables d’environnement Koyeb.

## 2. Envoyer le projet sur GitHub

1. Créez un dépôt GitHub privé `pharmintel-supabase`.
2. Envoyez tout le contenu de ce dossier.
3. Vérifiez que `.env`, `.env.local` et les clés secrètes ne sont pas présents dans GitHub.

## 3. Créer le service Koyeb

1. Ouvrez https://app.koyeb.com/ et choisissez **Create Web Service**.
2. Sélectionnez **GitHub**, puis le dépôt `pharmintel-supabase`.
3. Choisissez la construction **Dockerfile** et indiquez `Dockerfile.koyeb`.
4. Sélectionnez l’instance **Free** et le port HTTP `8000`.
5. Ajoutez toutes les variables listées dans `.env.supabase.example` avec leurs vraies valeurs.
6. Utilisez un `JWT_SECRET` aléatoire d’au moins 32 caractères.
7. Définissez le contrôle de santé sur `/api/health` si Koyeb le demande.
8. Cliquez sur **Deploy**.

Koyeb génère une adresse de type :

`https://pharmintel-votre-nom.koyeb.app`

## 4. Première connexion

Connectez-vous avec `ADMIN_EMAIL` et `ADMIN_PASSWORD`. L’application impose ensuite un nouveau mot de passe. Depuis **Utilisateurs**, vous créez les comptes et codes d’accès de votre équipe.

## Limites gratuites

- La petite instance Koyeb convient à une démonstration ou une équipe avec peu d’imports simultanés.
- Supabase Free limite la base et le stockage, et peut mettre en pause un projet inactif.
- Les imports sont traités un par un pour respecter les 512 Mo de mémoire Koyeb.
- `MAX_UPLOAD_MB=8` est recommandé sur l’instance gratuite.
- OpenAI n’est pas inclus dans l’hébergement gratuit.
