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
