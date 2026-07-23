# Guide de déploiement

## Topologie recommandée

- Reverse proxy/WAF : HTTPS, HSTS, limitation de débit et taille maximale cohérente avec `MAX_UPLOAD_MB`.
- 2 instances `web` minimum derrière un répartiteur de charge.
- 2 workers minimum pour la haute disponibilité ; ajuster `WORKER_CONCURRENCY` selon le quota IA.
- PostgreSQL managé avec sauvegarde PITR.
- Redis managé ou cluster persistant, politique `noeviction`.
- S3 managé avec chiffrement, versionnement, lifecycle et blocage de l’accès public.
- Observabilité : métriques, traces et logs centralisés.

## Pipeline CI/CD minimal

```bash
npm ci
npm run typecheck
npm audit --omit=dev --audit-level=high
npm run build
docker build --target web -t registry/pharmintel-web:$GIT_SHA .
docker build --target worker -t registry/pharmintel-worker:$GIT_SHA .
```

Puis : migration Prisma en job unique, déploiement worker, déploiement web progressif et test de `/api/health`.

## Sauvegarde

- PostgreSQL : sauvegarde quotidienne + PITR ; conservation selon la politique interne.
- S3 : versionnement + réplication ou sauvegarde indépendante.
- Redis : AOF pour la file ; la base reste la source de vérité pour l’état des documents.
- Exécuter un exercice de restauration complet avant le lancement.

## Dimensionnement initial indicatif

| Service | Petit lancement | Équipe importante |
|---|---:|---:|
| Web | 2 × 1 vCPU / 1 Go | autoscaling 2–10 |
| Worker | 2 × 2 vCPU / 4 Go | autoscaling par profondeur de file |
| PostgreSQL | 2 vCPU / 4 Go | 4–8 vCPU + réplique |
| Redis | 1 Go | 2–4 Go HA |
| Stockage | 100 Go | lifecycle et capacité selon rétention |

Le coût et la capacité dépendent surtout du nombre de pages/images, de la taille moyenne et des quotas du modèle IA.

## Recette avant ouverture

- [ ] Comptes administrateur et utilisateur testés.
- [ ] Tentative d’accès croisé entre utilisateurs refusée.
- [ ] Tous les formats supportés testés avec des documents réels.
- [ ] Qualité d’extraction mesurée sur un corpus représentatif.
- [ ] Alertes et seuil de remise validés.
- [ ] Exports Excel/PDF/Word contrôlés.
- [ ] Test mobile, tablette et navigateurs cibles.
- [ ] Sauvegarde/restauration testée.
- [ ] Test de charge et test d’intrusion réalisés.
- [ ] DPA/conditions du fournisseur IA validés.
