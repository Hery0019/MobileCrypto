import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

/** Écrans du navigateur racine (App.tsx). Aucun écran ne reçoit de paramètre. */
export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Register: undefined;
  Admin: undefined;
  Accueil: undefined;
  Portefeuille: undefined;
  Transactions: undefined;
  Parametres: undefined;
};

export type RootNavigation = NativeStackNavigationProp<RootStackParamList>;

declare global {
  // Permet à useNavigation() d'être typé sans paramètre générique.
  namespace ReactNavigation {
    // Forme imposée par React Navigation (augmentation de module).
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
