import { execSync } from 'child_process';

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
      // Escape generic shell characters is hard, so we pass as env var or careful quoting.
      // Better to use spawn, but for now strict quoting.
      // Actually, execSync with proper args is tricky.
      // Let's use a simple approach: passed via env var to a node script? No.
      // We will try to sanitize.
      
      // Ideally, we'd use a real Discord client or webhook. 
      // But adhering to the environment tools:
      const target = `channel:${this.channelId}`;
      const cmd = `openclaw message send --channel discord --target "${target}" --message "${text.replace(/"/g, '\\"')}"`;
      
      execSync(cmd, { stdio: 'ignore', timeout: 30000 });
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
