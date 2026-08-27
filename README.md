# MobileCrypto

Application mobile (React Native / Expo 52, Firebase) de simulation d'exchange crypto
à deux rôles : utilisateur (portefeuille, achat/vente, demandes de dépôt/retrait) et
administrateur (validation des demandes, supervision).

Équipe d'origine :
- RAKOTONARIVO Herinirina Olivier ETU002512
- RAVELONARIVO Tsiorimbola Antonio ETU002726
- RAZAKANARY Fitahiantsoa Finaritra ETU002634

## Architecture

```
app/                    Application Expo (écrans, composants, contexte d'auth)
  services/model.ts     Schéma Firestore côté client (collections, types)
  services/firestore.ts Lectures typées et abonnements temps réel
  services/functions.ts Appels des Cloud Functions (seules écritures monétaires)
functions/              Cloud Functions (TypeScript, région europe-west1)
  src/money.ts          Logique monétaire pure, testée (unités entières)
  src/orders.ts         placeOrder : achat/vente en transaction au prix serveur
  src/cashMovements.ts  requestCashMovement / reviewCashMovement (dépôts, retraits)
  src/prices.ts         updatePrices : cours mis à jour chaque minute
  src/users.ts          onUserDeleted : purge des données personnelles
  src/scripts/          set-admin (rôle admin), migrate-v2 (migration des données)
firestore.rules, storage.rules, firestore.indexes.json
```

Principe : le client **lit** ses données (règles Firestore) ; toute écriture qui touche
un solde, un wallet, une transaction ou une demande passe par une Cloud Function qui
relit prix et soldes dans une transaction Firestore. Le rôle admin est un custom claim
Auth, jamais un champ modifiable par le client.

## Installation

```bash
cp .env.example .env     # projet Firebase visé (idéalement un projet de dev)
npm ci
npm run android          # build + lancement (SDK Android requis)
npm start                # serveur Metro seul
npm run typecheck && npm run lint
```

```bash
cd functions && npm ci && npm test && npm run build
```

## Déploiement Firebase

Prérequis : `npm i -g firebase-tools`, `firebase login`, projet sur le plan Blaze
(nécessaire aux Cloud Functions ; coût quasi nul à ce volume).

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
```

Le référentiel `cryptocurrencies` est créé automatiquement au premier passage de
`updatePrices` s'il est vide.

### Attribuer le rôle administrateur

```bash
cd functions && npm run build
GOOGLE_APPLICATION_CREDENTIALS=/chemin/service-account.json \
  node lib/scripts/set-admin.js admin@example.com        # --revoke pour retirer
```

Le compte concerné doit se reconnecter. L'accès à l'application exige une adresse
e-mail vérifiée (lien envoyé à l'inscription, renvoi proposé à la connexion).

### Migrer des données antérieures au schéma v2

Les anciennes données identifiaient les utilisateurs par e-mail et stockaient les
wallets dans `cryptoWallet`. Après déploiement des règles et des fonctions :

```bash
GOOGLE_APPLICATION_CREDENTIALS=... node lib/scripts/migrate-v2.js --dry-run
GOOGLE_APPLICATION_CREDENTIALS=... node lib/scripts/migrate-v2.js
```

Le script est idempotent ; les anciennes collections (`cryptoWallet`, `cryptowallet`)
restent en place, fermées par les règles, jusqu'à purge manuelle.

### Émulateurs (développement local)

```bash
cd functions && npm run serve
```

## Signature Android (release)

Le build release refuse de se signer avec la clé debug. Générer une clé une seule
fois, la garder **hors du dépôt**, et la déclarer dans `~/.gradle/gradle.properties`
(ou en variables d'environnement) :

```
MOBILECRYPTO_RELEASE_STORE_FILE=/chemin/absolu/mobilecrypto-release.keystore
MOBILECRYPTO_RELEASE_STORE_PASSWORD=...
MOBILECRYPTO_RELEASE_KEY_ALIAS=mobilecrypto
MOBILECRYPTO_RELEASE_KEY_PASSWORD=...
```

Génération : `keytool -genkeypair -v -keystore mobilecrypto-release.keystore -alias mobilecrypto -keyalg RSA -keysize 2048 -validity 10000`.
Avec EAS Build (`eas build -p android --profile production`), les identifiants sont
gérés par EAS et cette configuration n'est pas nécessaire ; définir alors les
variables `EXPO_PUBLIC_FIREBASE_*` dans le profil EAS.

> Un fichier `my-release-key.keystore` a été versionné dans l'historique git de ce
> dépôt : il doit être considéré comme compromis et ne jamais être réutilisé.

## Intégration continue

`.github/workflows/ci.yml` : types + lint de l'application, build + tests des
Cloud Functions, sur chaque push et pull request.
