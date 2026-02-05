import { execFileSync } from 'child_process';

const OPENCLAW = '/usr/local/bin/openclaw';

export class NotificationService {
  constructor(config) {
    this.config = config;
    this.channelId = config.discord.channelId;
  }

  formatPreview(drafts) {
    if (!drafts || drafts.length === 0) return 'No drafts.';

    return drafts.map(d => {
      const icon = d.action === 'ignore' ? '🚫' : '✉️';
      const conf = Math.round((d.confidence || 0) * 100);
      const parts = [
        `${icon} **UID ${d.uid}** | ${d.original_from || d.from}`,
        `**${d.subject}** → ${d.category} (${conf}%)`,
        d.summary || '',
      ];

      if (d.original_text) {
        // Truncate if too long
        const text = d.original_text.length > 500 ? d.original_text.substring(0, 500) + '...' : d.original_text;
        parts.push(`\n📩 **Original:**`);
        parts.push('> ' + text.split('\n').join('\n> '));
      }

      if (d.action === 'reply' && d.reply_body) {
        parts.push(`\n✏️ **Draft reply:**`);
        parts.push('> ' + d.reply_body.split('\n').join('\n> '));
      }

      return parts.filter(Boolean).join('\n');
    }).join('\n\n---\n\n');
  }

  async send(text) {
    if (!this.channelId) {
      console.warn('Discord channel ID not configured, skipping notification.');
      return;
    }

    try {
      const target = `channel:${this.channelId}`;
      // Use node directly to avoid shebang PATH issues in cron
      const OPENCLAW_SCRIPT = '/usr/local/lib/node_modules/openclaw/openclaw.mjs';
      const NODE = '/usr/local/bin/node';
      execFileSync(NODE, [
        OPENCLAW_SCRIPT,
        'message', 'send',
        '--channel', 'discord',
        '--target', target,
        '--message', text,
      ], { stdio: 'pipe', timeout: 30000 });
    } catch (err) {
      console.error('Failed to send Discord notification:', err.message);
    }
  }

  async notifyDrafts(drafts) {
    const preview = this.formatPreview(drafts);
    const count = drafts.filter(d => d.action === 'reply').length;
    
    if (count === 0 && drafts.length > 0) {
      // All ignored
      // maybe don't notify? or notify silent?
      // Original script: only posted if there were reply drafts.
      return; 
    }

    const msg = `📬 **${count} support email(s) — draft(s) ready:**

${preview}

**Commands:** \`approve\` · \`approve <uid>\` · \`edit <uid> <text>\` · \`approve+ref <uid>\` · \`reject\` · \`reject <uid>\``;

    await this.send(msg);
  }
}
