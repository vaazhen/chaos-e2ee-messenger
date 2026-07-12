import { loadEnv } from 'vite';

const env = loadEnv('electron', process.cwd(), '');
const errors = [];

function validate(name, allowedProtocol) {
  const value = env[name];
  if (!value) {
    errors.push(`${name} is required in frontend/.env.electron`);
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== allowedProtocol) {
      errors.push(`${name} must use ${allowedProtocol}//`);
    }
  } catch {
    errors.push(`${name} must be an absolute URL`);
  }
}

validate('VITE_API_BASE', 'https:');
validate('VITE_WS_URL', 'wss:');

if (errors.length > 0) {
  console.error('Electron production configuration is invalid:');
  for (const error of errors) console.error(`- ${error}`);
  console.error('Copy .env.electron.example to .env.electron and set your public endpoints.');
  process.exit(1);
}
