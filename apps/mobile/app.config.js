const appJson = require('./app.json');

const baseConfig = appJson.expo;

module.exports = () => {
  const googleServicesFile =
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_JSON ||
    baseConfig.android?.googleServicesFile;

  return {
    ...baseConfig,
    android: {
      ...baseConfig.android,
      googleServicesFile,
    },
  };
};
