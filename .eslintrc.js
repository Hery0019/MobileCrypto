// https://docs.expo.dev/guides/using-eslint/ (SDK 52 : eslint-config-expo v8, format eslintrc)
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: ['node_modules/', 'android/', 'functions/', '.expo/'],
  rules: {
    // Les hooks avec dépendances incomplètes ont causé des rechargements
    // parasites (revue P5) : erreur, pas avertissement.
    'react-hooks/exhaustive-deps': 'error',
  },
};
