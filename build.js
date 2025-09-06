const { build } = require('electron-builder');
const path = require('path');

const config = {
  appId: 'com.betamasas.edenilde',
  productName: 'Beta Masas Edenilde',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    '**/*',
    '!node_modules/**/*',
    '!dist/**/*',
    '!build/**/*'
  ],
  win: {
    target: 'nsis',
    icon: 'assets/icon.ico',
    requestedExecutionLevel: 'asInvoker'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Beta Masas Edenilde',
    installerIcon: 'assets/icon.ico',
    uninstallerIcon: 'assets/icon.ico',
    installerHeaderIcon: 'assets/icon.ico',
    deleteAppDataOnUninstall: false,
    runAfterFinish: true,
    license: 'LICENSE.txt'
  },
  extraResources: [
    {
      from: 'assets',
      to: 'assets',
      filter: ['**/*']
    }
  ]
};

async function buildApp() {
  try {
    console.log('Iniciando build do aplicativo...');
    await build(config);
    console.log('Build concluído com sucesso!');
  } catch (error) {
    console.error('Erro durante o build:', error);
    process.exit(1);
  }
}

buildApp();
