/**
 * Cycle de vie des comptes : purge des données personnelles à la suppression
 * du compte Auth. Les enregistrements financiers (transactions, historique)
 * sont conservés pour l'audit mais anonymisés.
 */
import { FieldValue, Query } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import * as functionsV1 from 'firebase-functions/v1';
import { db, REGION, storage } from './admin';
import { COLLECTIONS } from './model';

const BATCH_LIMIT = 400;

const deleteByQuery = async (query: Query): Promise<number> => {
  let deleted = 0;
  for (;;) {
    const snapshot = await query.limit(BATCH_LIMIT).get();
    if (snapshot.empty) {
      return deleted;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
  }
};

const anonymizeByQuery = async (query: Query): Promise<number> => {
  let updated = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let page = query.orderBy('__name__').limit(BATCH_LIMIT);
    if (last) {
      page = page.startAfter(last);
    }
    const snapshot = await page.get();
    if (snapshot.empty) {
      return updated;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.update(doc.ref, { userEmail: FieldValue.delete() }));
    await batch.commit();
    updated += snapshot.size;
    last = snapshot.docs[snapshot.docs.length - 1];
  }
};

export const purgeUserData = async (uid: string): Promise<void> => {
  const byUser = (collection: string) => db.collection(collection).where('utilisateur', '==', uid);

  const [wallets, requests, transactions] = await Promise.all([
    deleteByQuery(byUser(COLLECTIONS.wallets)),
    deleteByQuery(byUser(COLLECTIONS.cashRequests)),
    anonymizeByQuery(byUser(COLLECTIONS.transactions)),
  ]);
  await db.collection(COLLECTIONS.users).doc(uid).delete();
  await storage
    .bucket()
    .file(`avatars/${uid}`)
    .delete({ ignoreNotFound: true });

  logger.info('Données utilisateur purgées', { uid, wallets, requests, transactions });
};

/** Déclencheur Auth (v1 : les triggers Auth n'existent pas en v2 hors Identity Platform). */
export const onUserDeleted = functionsV1
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    await purgeUserData(user.uid);
  });
