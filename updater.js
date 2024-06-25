const electron = require('electron');
const { BrowserWindow, dialog } = electron;
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');

// Application example
let app;

// Main window
let mainWindow;

// Auto-update interface window
let updaterWindow;

// User confirmed update flag
let updateApproved = false;

// Disable automatic download of updates
autoUpdater.autoDownload = false;

// Update message
const updaterMessages = {
  error: 'An error occurred while updating',
  errorTitle: 'Update Tips',
  errorUnknown: 'An unknown error occurred',
  errorDownloading: 'An error occurred while downloading the update, please try again later!',
  checking: 'Checking for updates...',
  available: 'A new version is available for update. Do you want to update now?',
  availableTitle: 'Update prompt',
  updateYes: 'Update now',
  updateNo: 'Do not update yet',
  downloaded: 'Update has been downloaded. You will exit the game and install the update soon',
  downloadedTitle: 'Update prompt',
  unavailable: 'The latest version is available',
  unavailableTitle: 'Update prompt',
  okButton: 'Got it',
  installButton: 'Install now',
};

// Initialization
const init = (theApp, theMainWindow) => {
  app = theApp;
  mainWindow = theMainWindow;

  // Check for updates
  autoUpdater.checkForUpdates();
};

// Display update progress bar dialog box
const showProgressDialog = () => {
  if (updaterWindow) {
    updaterWindow.show();
    return;
  }
  let pRect = mainWindow.getContentBounds();
  let w = parseInt(pRect.width * 0.618);
  let h = 80;
  // Create an automatic update interface form
  updaterWindow = new BrowserWindow({
    width: w,
    height: h,
    show: false,
    frame: false,
    resizable: false,
    closable: false,
    transparent: true,
    backgroundColor: '#00000000',
    defaultEncoding: 'UTF-8',
    webPreferences: {
      // Cancel the web animation and timer throttling function after the window runs in the background
      backgroundThrottling: false
    }
  });

  // Load the main page of the application
  updaterWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'updater.html'),
    protocol: 'file:',
    slashes: true,
  }));

  // The window is ready
  updaterWindow.once('ready-to-show', () => {
    // Show the update window
    updaterWindow.show();
  });

  // Prevent users from manually closing the update window
  updaterWindow.on('close', (e) => {
    e.preventDefault();
  });

  // Main window closed event processing
  updaterWindow.on('closed', () => {
    // Release window reference
    updaterWindow = null;
  });
};

// Set the update progress bar dialog box
const setProgressDialog = (percent) => {
  if (!updaterWindow || updaterWindow.isDestroyed()) {
    return;
  }

  percent = Math.round(percent);
  percent = Math.max(0, Math.min(100, percent));
  updaterWindow.webContents.send('progress', percent);
};

// Close the update progress bar dialog box
const closeProgressDialog = () => {
  // Close the update window
  updaterWindow && updaterWindow.destroy();
};

// An error occurred during the update
autoUpdater.on('error', (err, msg) => {
  // If the user did not approve the update, return directly
  if (!updateApproved) {
    return;
  }

  // Close the update progress bar dialog box
  closeProgressDialog();
  // Display the error message box
  dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: updaterMessages.errorTitle,
    message: err === null ? updaterMessages.errorUnknown : updaterMessages.errorDownloading,
  });
});

// // Checking for updates
// autoUpdater.on('checking-for-update', () => {
// });

// Found an available update
autoUpdater.on('update-available', (info) => {
  let date = new Date(info.releaseDate).toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');

  let detailText =
    `Current version: ${app.getVersion()}\n` +
    `Latest version: ${info.version}\n` +
    `Release date: ${date}\n\n` +
    `${info.releaseNotes}`;

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: updaterMessages.availableTitle,
    message: updaterMessages.available,
    detail: detailText,
    buttons: [updaterMessages.updateYes, updaterMessages.updateNo],
    cancelId: 1
  }, (buttonIndex) => {
    // User agrees to update
    if (buttonIndex === 0) {
      updateApproved = true;

      // Display the update progress bar dialog box and start downloading updates
      showProgressDialog();
      autoUpdater.downloadUpdate();
    }
  });
});

// No available updates found
// autoUpdater.on('update-not-available', (info) => {
// dialog.showMessageBox(mainWindow, {
// type: 'info',
// title: updaterMessages.unavailableTitle,
// message: updaterMessages.unavailable,
// buttons: [updaterMessages.okButton],
// });
// });

// Update download progress
autoUpdater.on('download-progress', (progress) => {
  if (!updaterWindow || updaterWindow.isDestroyed() ||
    !mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  // Set the taskbar download progress bar
  mainWindow.setProgressBar(progress.percent / 100);
  updaterWindow.setProgressBar(progress.percent / 100);

  // Set the update window progress bar
  setProgressDialog(progress.percent);
});

// Update download completed
autoUpdater.on('update-downloaded', (info) => {
  // Close the update progress bar dialog box
  closeProgressDialog();

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    title: updaterMessages.downloadedTitle,
    message: updaterMessages.downloaded,
    buttons: [updaterMessages.installButton],
  }, () => {
    setImmediate(() => {
      // Exit and install the update
      autoUpdater.quitAndInstall();
    });
  });
});

module.exports.init = init;
module.exports.close = closeProgressDialog;