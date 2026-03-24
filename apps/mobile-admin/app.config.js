const fs = require('fs');
const path = require('path');
const config = require('./app.json');

function resolveGoogleServicesFile() {
  const secretPath = process.env.GOOGLE_SERVICES_JSON;
  if (secretPath) {
    return secretPath;
  }

  const localPath = path.join(__dirname, 'google-services.json');
  if (fs.existsSync(localPath)) {
    return './google-services.json';
  }

  return undefined;
}

const googleServicesFile = resolveGoogleServicesFile();
if (googleServicesFile) {
  config.expo.android.googleServicesFile = googleServicesFile;
} else {
  delete config.expo.android.googleServicesFile;
}

module.exports = config;
