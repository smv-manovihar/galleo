import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n> Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { 
      stdio: 'inherit',
      shell: true // Required to execute pnpm and node correctly on Windows
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command "${command}" failed with exit status ${code}`));
      }
    });
  });
}

async function main() {
  try {
    // 0. Clean the previous dist-build folder to avoid EPERM file-locking rename issues
    const buildOutDir = path.resolve('dist-build');
    if (fs.existsSync(buildOutDir)) {
      console.log('Cleaning previous dist-build directory...');
      fs.rmSync(buildOutDir, { recursive: true, force: true });
    }

    // 1. Generate icon, sidebar, and header assets with the custom brand gradient
    await runCommand('node', ['scripts/generate-icon.js']);

    // 2. Compile source files and build Vite frontend assets
    await runCommand('pnpm', ['run', 'build']);

    // 3. Package the app with electron-builder using the updated config
    await runCommand('pnpm', ['exec', 'electron-builder', '--config', 'electron-builder.json']);

    console.log('\n✨ Release packaging completed successfully! Check the "dist-build" folder.');
  } catch (error) {
    console.error(`\n❌ Packaging failed:`, error.message);
    process.exit(1);
  }
}

main();
