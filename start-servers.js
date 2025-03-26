const { spawn } = require('child_process');
const path = require('path');

// Function to start a process
function startProcess(command, args, name, options = {}) {
  console.log(`Starting ${name}...`);
  
  const proc = spawn(command, args, {
    stdio: 'pipe',
    shell: true,
    ...options
  });
  
  proc.stdout.on('data', (data) => {
    console.log(`[${name}] ${data.toString().trim()}`);
  });
  
  proc.stderr.on('data', (data) => {
    console.error(`[${name} ERROR] ${data.toString().trim()}`);
  });
  
  proc.on('close', (code) => {
    console.log(`${name} process exited with code ${code}`);
  });
  
  return proc;
}

// Start the Next.js app
const nextApp = startProcess('npm', ['run', 'dev'], 'Next.js App');

// Start the combined server (emotion analysis + resume parsing)
const serverDir = path.join(__dirname, 'server');
const server = startProcess('npm', ['run', 'dev'], 'AI Mock Interview Server', { cwd: serverDir });

// Handle termination
process.on('SIGINT', () => {
  console.log('Shutting down all servers...');
  nextApp.kill();
  server.kill();
  process.exit(0);
});

console.log('All servers started! Press Ctrl+C to stop all servers.');
console.log('Services available:');
console.log('- Next.js App: http://localhost:3000');
console.log('- Analysis Server: http://localhost:3001');
console.log('  - Emotion Analysis: POST http://localhost:3001/analyze-emotion');
console.log('  - Resume Parsing: POST http://localhost:3001/api/parse-resume'); 