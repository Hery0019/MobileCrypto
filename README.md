# MobileCrypto

Application mobile (React Native / Expo 52, Firebase) de simulation d'exchange crypto
à deux rôles : utilisateur (portefeuille, achat/vente, demandes de dépôt/retrait) et
administrateur (validation des demandes, supervision).

Équipe d'origine :
- RAKOTONARIVO Herinirina Olivier ETU002512
- RAVELONARIVO Tsiorimbola Antonio ETU002726
- RAZAKANARY Fitahiantsoa Finaritra ETU002634

## Installation

```bash
npm ci            # installe exactement les versions du package-lock
npm run android   # build + lancement sur émulateur/appareil (nécessite le SDK Android)
npm start         # serveur Metro seul
```

Toutes les dépendances sont déclarées dans `package.json` ; aucune installation
manuelle supplémentaire n'est nécessaire.

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
gérés par EAS et cette configuration n'est pas nécessaire.

> Un fichier `my-release-key.keystore` a été versionné dans l'historique git de ce
> dépôt : il doit être considéré comme compromis et ne jamais être réutilisé.
