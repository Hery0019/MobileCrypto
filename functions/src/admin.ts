/**
 * Initialisation unique du SDK Admin et des options globales.
 * À importer en premier par chaque module de fonction (les imports sont
 * évalués avant le corps de index.ts).
 */
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { setGlobalOptions } from 'firebase-functions/v2';

/** Région unique : le client doit utiliser la même (getFunctions(app, REGION)). */
export const REGION = 'europe-west1';

if (getApps().length === 0) {
  initializeApp();
  setGlobalOptions({ region: REGION, maxInstances: 10 });
}

export const db = getFirestore();
export const auth = getAuth();
export const storage = getStorage();
