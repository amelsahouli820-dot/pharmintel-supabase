# Politique de sécurité — PharmIntel

## Contrôles implémentés

- Sessions JWT signées, stockées dans un cookie `HttpOnly`, `SameSite=Strict`, `Secure` en production et limitées à 8 heures.
- Aucun endpoint public de création de compte.
- Validation du statut du compte en base à chaque appel API.
- Hachage bcrypt coût 12 ; changement obligatoire du secret temporaire.
- Contrôle de rôle et de permission côté API, jamais seulement dans l’interface.
- Filtrage systématique par `userId` pour les documents et données d’un utilisateur standard.
- Validation du format, de l’extension et de la taille des fichiers ; noms et clés de stockage générés côté serveur.
- Détection des doublons par SHA-256 dans l’espace de l’utilisateur.
- Vérification d’origine sur les opérations sensibles et cookies `SameSite=Strict` contre les attaques CSRF.
- Limitation des tentatives de connexion et des requêtes d’assistant.
- En-têtes CSP, anti-framing, anti-MIME-sniffing et politique de permissions.
- Bucket objet privé et chiffrement S3 côté serveur lorsqu’AWS S3 est utilisé.
- Audit des connexions, changements de mot de passe, utilisateurs, imports, analyses, exports et questions IA.
- Protection contre l’injection d’instructions : les commentaires de documents sont explicitement traités comme des données non fiables dans le prompt de l’assistant.

## Modèle d’autorisation

| Action | Utilisateur | Administrateur |
|---|---:|---:|
| Importer un document | Seulement si droit actif | Oui |
| Voir ses imports/données | Oui | Oui |
| Voir les données des autres | Non | Oui |
| Assistant IA | Seulement sur ses données et si droit actif | Toutes les données |
| Exporter | Ses données et si droit actif | Toutes les données |
| Gérer les comptes/droits | Non | Oui |

## Mesures d’exploitation requises

- TLS obligatoire et réseau privé pour les services de données.
- Rotation régulière de `JWT_SECRET`, des accès S3, de la base et de la clé IA.
- MFA/SSO recommandé pour une phase suivante.
- Antivirus/CDR sur les fichiers avant analyse.
- Journalisation centralisée avec accès restreint et alertes de sécurité.
- Sauvegardes chiffrées, immuables si possible, et tests de restauration trimestriels.
- Audit externe OWASP ASVS avant production publique.
- Mise à jour automatisée des dépendances avec blocage du déploiement en présence d’une vulnérabilité critique.

## Signalement

Ne placez jamais de secret, document client ou donnée personnelle dans un ticket public. Utilisez le canal de sécurité privé de l’organisation.
