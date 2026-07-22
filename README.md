# PharmIntel — édition Supabase Free

Application sécurisée de veille concurrentielle pharmaceutique connectée à **Supabase PostgreSQL + Storage**. Le site et son worker peuvent fonctionner dans une seule instance gratuite Koyeb.

## Démarrage

Consultez d’abord [`DEPLOIEMENT-SUPABASE-KOYEB.md`](DEPLOIEMENT-SUPABASE-KOYEB.md).

## Services

- Supabase : base de données et bucket privé `pharmintel-documents` créé automatiquement.
- Koyeb : interface Next.js et worker PostgreSQL dans le même conteneur.
- OpenAI : extraction des PDF, images et contenus structurés.

## Sécurité

- aucune inscription publique ;
- comptes créés uniquement par l’administrateur ;
- mot de passe temporaire et changement obligatoire ;
- isolation des données par utilisateur côté API ;
- clé Supabase secrète utilisée uniquement côté serveur ;
- bucket de documents privé ;
- journal d’audit et révocation des sessions.

## Vérification

```bash
npm ci
npm run typecheck
npm audit --omit=dev
```

Pour tester le build Docker :

```bash
docker build -f Dockerfile.koyeb -t pharmintel-supabase .
```
