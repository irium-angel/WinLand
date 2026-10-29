'use strict';
// Start of the app: the installer or uninstaller (installer/, started by WinLand-Setup.exe or from
// "Installed apps"), or WinLand itself (main.js).
if (process.argv.includes('--winland-setup') || process.argv.includes('--winland-uninstall')) require('./installer/installer-main.cjs');
else require('./main.js');
