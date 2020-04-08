'use strict';

const clipboard = process.electronBinding('clipboard');

if (process.type === 'renderer') {
  const ipcRendererUtils = require('@electron/internal/renderer/ipc-renderer-internal-utils');
  const { ipcRendererInternal } = require('@electron/internal/renderer/ipc-renderer-internal');
  const typeUtils = require('@electron/internal/common/type-utils');

  const makeRemoteMethod = function (method) {
    return (...args) => {
      args = typeUtils.serialize(args);
      const result = ipcRendererUtils.invokeSync('ELECTRON_BROWSER_CLIPBOARD_SYNC', method, ...args);
      return typeUtils.deserialize(result);
    };
  };

  const makeRemotePromiseMethod = function (method) {
    return (...args) => {
      args = typeUtils.serialize(args);
      return new Promise((resolve) => {
        ipcRendererInternal.invoke('ELECTRON_BROWSER_CLIPBOARD', method, ...args).then((result) => {
          resolve(typeUtils.deserialize(result));
        });
      });
    };
  };

  if (process.platform === 'linux') {
    // On Linux we could not access clipboard in renderer process.
    for (const method of Object.keys(clipboard)) {
      if (method === 'readImage') {
        clipboard[method] = makeRemotePromiseMethod(method);
      } else {
        clipboard[method] = makeRemoteMethod(method);
      }
    }
  } else if (process.platform === 'darwin') {
    // Read/write to find pasteboard over IPC since only main process is notified of changes
    clipboard.readFindText = makeRemoteMethod('readFindText');
    clipboard.writeFindText = makeRemoteMethod('writeFindText');
  }
}

module.exports = clipboard;
