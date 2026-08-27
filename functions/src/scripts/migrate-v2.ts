/**
 * Migration des données existantes vers le schéma v2 (identité = uid).
 * Idempotent : peut être relancé sans effet de bord.
 *
 *   - transactions.idUtilisateur (e-mail)   → transactions.utilisateur (uid)
 *   - notifications.userEmail sans uid      → notifications.utilisateur (uid)
 *   - cryptoWallet {utilisateur: e-mail}    → wallets/{uid}_{crypto} (fusion par somme
 *     si plusieurs documents existaient pour la même paire)
 *   - utilisateurs.photo                    → utilisateurs.photoURL
 *
 * Les anciennes collections ne sont pas supprimées (les règles les rendent
 * inaccessibles) : à purger manuellement après vérification.
 *
 * Usage (depuis functions/, après `npm run build`) :
 *   GOOGLE_APPLICATION_CREDENTIALS=/chemin/service-account.json \
 *   node lib/scripts/migrate-v2.js [--dry-run]
 */
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../admin';
import { COLLECTIONS, walletId } from '../model';
import { CRYPTO_DECIMALS } from '../money';

const dryRun = process.argv.includes('--dry-run');
const log = (message: string, extra?: unknown) => console.log(`[migrate-v2] ${message}`, extra ?? '');

const loadUidByEmail = async (): Promise<Map<string, string>> => {
  const snapshot = await db.collection(COLLECTIONS.users).get();
  const map = new Map<string, string>();
  snapshot.docs.forEach((doc) => {
    const email = doc.data().email;
    if (typeof email === 'string') {
      map.set(email.toLowerCase(), doc.id);
    }
  });
  return map;
};

const migrateUserPhotos = async () => {
  const snapshot = await db.collection(COLLECTIONS.users).get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.photoURL === undefined && typeof data.photo === 'string') {
      count++;
      if (!dryRun) {
        await doc.ref.update({ photoURL: data.photo || null, photo: FieldValue.delete() });
      }
    }
  }
  log(`utilisateurs.photo → photoURL : ${count}`);
};

const migrateByEmail = async (collection: string, emailField: string, uidByEmail: Map<string, string>) => {
  const snapshot = await db.collection(collection).get();
  let migrated = 0;
  let orphans = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (typeof data.utilisateur === 'string' && data.utilisateur) {
      continue;
    }
    const email = typeof data[emailField] === 'string' ? data[emailField].toLowerCase() : undefined;
    const uid = email ? uidByEmail.get(email) : undefined;
    if (!uid) {
      orphans++;
      continue;
    }
    migrated++;
    if (!dryRun) {
      await doc.ref.update({ utilisateur: uid, ...(emailField !== 'userEmail' ? { userEmail: data[emailField] } : {}) });
    }
  }
  log(`${collection} : ${migrated} migrés, ${orphans} sans utilisateur correspondant`);
};

const migrateWallets = async (uidByEmail: Map<string, string>) => {
  const snapshot = await db.collection('cryptoWallet').get();
  const merged = new Map<string, { uid: string; crypto: string; units: bigint }>();
  let orphans = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const email = typeof data.utilisateur === 'string' ? data.utilisateur.toLowerCase() : undefined;
    const uid = email ? uidByEmail.get(email) : undefined;
    const crypto = data.crypto !== undefined ? String(data.crypto) : undefined;
    if (!uid || !crypto) {
      orphans++;
      return;
    }
    const id = walletId(uid, crypto);
    const units = BigInt(Math.round(Number(data.valeur ?? 0) * 10 ** CRYPTO_DECIMALS));
    const current = merged.get(id);
    merged.set(id, { uid, crypto, units: (current?.units ?? 0n) + units });
  });
  for (const [id, wallet] of merged) {
    const ref = db.collection(COLLECTIONS.wallets).doc(id);
    if (!dryRun && !(await ref.get()).exists) {
      await ref.set({
        utilisateur: wallet.uid,
        crypto: wallet.crypto,
        valeur: Number(wallet.units) / 10 ** CRYPTO_DECIMALS,
        updated_at: FieldValue.serverTimestamp(),
      });
    }
  }
  log(`cryptoWallet → wallets : ${snapshot.size} documents, ${merged.size} wallets, ${orphans} orphelins`);
};

const main = async () => {
  log(dryRun ? 'Simulation (--dry-run), aucune écriture' : 'Migration en cours');
  const uidByEmail = await loadUidByEmail();
  log(`${uidByEmail.size} utilisateurs indexés par e-mail`);
  await migrateUserPhotos();
  await migrateByEmail(COLLECTIONS.transactions, 'idUtilisateur', uidByEmail);
  await migrateByEmail(COLLECTIONS.cashRequests, 'userEmail', uidByEmail);
  await migrateWallets(uidByEmail);
  log('Terminé');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
