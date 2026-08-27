/**
 * Traduit les codes d'erreur Firebase Auth en messages utilisateur.
 * Les cas non listés retombent sur un message générique : ne jamais exposer
 * le message technique brut.
 */
const MESSAGES: Record<string, string> = {
  'auth/invalid-email': "L'adresse e-mail n'est pas valide.",
  'auth/user-disabled': 'Ce compte a été désactivé. Contactez le support.',
  'auth/user-not-found': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/too-many-requests': 'Trop de tentatives. Réessayez dans quelques minutes.',
  'auth/network-request-failed': 'Connexion réseau indisponible. Vérifiez votre connexion.',
  'auth/email-already-in-use': 'Un compte existe déjà avec cette adresse e-mail.',
  'auth/weak-password': 'Le mot de passe doit contenir au moins 6 caractères.',
  'auth/operation-not-allowed': "Ce mode d'inscription n'est pas activé.",
  'auth/requires-recent-login': 'Par sécurité, reconnectez-vous avant cette opération.',
};

export const authErrorMessage = (error: unknown, fallback: string): string => {
  const code = (error as { code?: string } | null)?.code;
  return (code && MESSAGES[code]) || fallback;
};
