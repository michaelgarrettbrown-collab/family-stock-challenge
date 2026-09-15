import nodemailer from 'nodemailer';

export function loadEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#')).map(line => {
    const index = line.indexOf('=');
    return index === -1 ? [line, ''] : [line.slice(0, index), line.slice(index + 1)];
  }));
}

export function emailConfig(environment) {
  const config = { user: environment.GMAIL_SMTP_USER, pass: environment.GMAIL_SMTP_APP_PASSWORD, to: environment.GMAIL_RECIPIENT };
  for (const field of ['user', 'pass', 'to']) if (!config[field]) throw new Error(`Gmail configuration is missing ${field}.`);
  return config;
}

export function formatWeeklyEmail(message, published) {
  return `${message}\n\n${published ? 'The weekly update has been published.' : 'TEST EMAIL — no game data was changed or published.'}\nhttps://michaelgarrettbrown-collab.github.io/family-stock-challenge/\n${published ? 'GitHub Pages may take a few minutes to refresh.' : ''}`.trim();
}

export async function verifyGmail(config) { await transporter(config).verify(); }
export async function sendGmail(config, subject, text) { await transporter(config).sendMail({ from: config.user, to: config.to, subject, text }); }
function transporter(config) { return nodemailer.createTransport({ service: 'gmail', auth: { user: config.user, pass: config.pass } }); }
