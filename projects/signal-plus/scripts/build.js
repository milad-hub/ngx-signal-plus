const { execSync } = require('child_process');

function runCommand(command) {
  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    process.exit(1);
  }
}

// Build commands
if (process.argv[2] === 'build') {
  runCommand('ng build signal-plus');
} else if (process.argv[2] === 'build:prod') {
  runCommand('ng build signal-plus --configuration production');
} else if (process.argv[2] === 'test') {
  runCommand('ng test signal-plus');
} else if (process.argv[2] === 'test:ci') {
  runCommand('ng test signal-plus --browsers=ChromeHeadless --watch=false');
} else if (process.argv[2] === 'lint') {
  runCommand('ng lint signal-plus');
} else if (process.argv[2] === 'prepublish') {
  // Run production build before publishing
  runCommand('ng build signal-plus --configuration production');
} 