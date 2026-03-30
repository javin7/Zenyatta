// start-electron.js
delete process.env.ELECTRON_RUN_AS_NODE;
const { spawn } = require('child_process');
const electron = require('electron');
const path = require('path');

const p = spawn(electron, ['.'], {
  stdio: 'inherit',
  env: process.env, // process.env no longer has ELECTRON_RUN_AS_NODE
});

p.on('close', (code) => {
  process.exit(code);
});
