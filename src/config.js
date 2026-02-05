import 'dotenv/config';
import fs from 'fs';
import path from 'path';

/**
 * Load configuration from environment variables and optional JSON file
 * @param {string} [configPath] - Path to JSON config file
 * @returns {object} Config object
 */
export function loadConfig(configPath) {
  let fileConfig = {};
  
  if (configPath && fs.existsSync(configPath)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (err) {
      console.error(`Failed to load config from ${configPath}:`, err.message);
    }
  }

  const config = {
    // SaaS Identity
    serviceName: fileConfig.serviceName || process.env.SERVICE_NAME || 'Support Service',
    
    // IMAP Settings
    imap: {
      host: fileConfig.imap?.host || process.env.IMAP_HOST,
      port: parseInt(fileConfig.imap?.port || process.env.IMAP_PORT || '993'),
      user: fileConfig.imap?.user || process.env.EMAIL_USER,
      pass: fileConfig.imap?.pass || process.env.EMAIL_PASS,
      secure: true,
    },

    // SMTP Settings
    smtp: {
      host: fileConfig.smtp?.host || process.env.SMTP_HOST,
      port: parseInt(fileConfig.smtp?.port || process.env.SMTP_PORT || '465'),
      user: fileConfig.smtp?.user || process.env.EMAIL_USER,
      pass: fileConfig.smtp?.pass || process.env.EMAIL_PASS,
      secure: true,
    },

    // Gateway / LLM Settings
    gateway: {
      port: fileConfig.gateway?.port || process.env.OPENCLAW_GATEWAY_PORT || '18789',
      token: fileConfig.gateway?.token || process.env.OPENCLAW_GATEWAY_TOKEN || process.env.CLAWD_TOKEN,
    },

    // Paths
    paths: {
      dataDir: fileConfig.paths?.dataDir || path.resolve(process.cwd(), 'data'),
      referencesFile: fileConfig.paths?.referencesFile || process.env.REFERENCES_FILE,
    },

    // Discord / Notification
    discord: {
      channelId: fileConfig.discord?.channelId || process.env.DISCORD_CHANNEL_ID,
    }
  };

  // Validation
  const missing = [];
  if (!config.imap.host) missing.push('IMAP_HOST');
  if (!config.imap.user) missing.push('EMAIL_USER');
  if (!config.imap.pass) missing.push('EMAIL_PASS');
  if (!config.smtp.host) missing.push('SMTP_HOST');
  
  if (missing.length > 0) {
    throw new Error(`Missing required configuration: ${missing.join(', ')}`);
  }

  return config;
}
