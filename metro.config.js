const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// inlineRequires: carga módulos justo cuando se usan → menor tiempo de inicio con Hermes
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;
