'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('xotion', {
  status: () => ipcRenderer.invoke('status'),
  pickEngine: () => ipcRenderer.invoke('pick-engine'),
  openEngine: () => ipcRenderer.invoke('open-engine'),
  runPrompt: (prompt) => ipcRenderer.invoke('run-prompt', prompt),
});
