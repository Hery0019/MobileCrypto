/**
 * Point d'entrée des Cloud Functions MobileCrypto.
 * Chaque fonction est définie dans son propre module et ré-exportée ici.
 */
import { initializeApp } from 'firebase-admin/app';
import { setGlobalOptions } from 'firebase-functions/v2';

initializeApp();

/** Région unique : le client doit utiliser la même (getFunctions(app, REGION)). */
export const REGION = 'europe-west1';
setGlobalOptions({ region: REGION, maxInstances: 10 });
