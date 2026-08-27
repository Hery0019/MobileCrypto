/**
 * Point d'entrée des Cloud Functions MobileCrypto.
 * Chaque fonction est définie dans son propre module et ré-exportée ici.
 * L'import de './admin' en premier initialise le SDK et les options globales.
 */
import './admin';

export { REGION } from './admin';
export { placeOrder } from './orders';
