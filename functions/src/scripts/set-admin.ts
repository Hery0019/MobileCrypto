/**
 * Attribue ou retire le rôle administrateur à un compte.
 * Le rôle est porté par un custom claim Auth (vérifié par les fonctions et les
 * règles Firestore) et reflété dans utilisateurs/{uid}.role pour l'affichage.
 *
 * Usage (depuis functions/, après `npm run build`) :
 *   GOOGLE_APPLICATION_CREDENTIALS=/chemin/service-account.json \
 *   node lib/scripts/set-admin.js admin@example.com [--revoke]
 */
import { auth, db } from '../admin';
import { COLLECTIONS } from '../model';

const main = async () => {
  const [email, flag] = process.argv.slice(2);
  if (!email) {
    console.error('Usage: node lib/scripts/set-admin.js <email> [--revoke]');
    process.exit(1);
  }
  const revoke = flag === '--revoke';
  const user = await auth.getUserByEmail(email);
  const claims = { ...(user.customClaims ?? {}) } as Record<string, unknown>;
  if (revoke) {
    delete claims.admin;
  } else {
    claims.admin = true;
  }
  await auth.setCustomUserClaims(user.uid, claims);
  await db.collection(COLLECTIONS.users).doc(user.uid).set({ role: revoke ? 'user' : 'admin' }, { merge: true });
  // Le claim est lu au prochain rafraîchissement de token (≤ 1 h) ; le client
  // force ce rafraîchissement à la connexion.
  await auth.revokeRefreshTokens(user.uid);
  console.log(`${revoke ? 'Rôle admin retiré' : 'Rôle admin attribué'} : ${email} (${user.uid})`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
