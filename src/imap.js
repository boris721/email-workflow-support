import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';

export class ImapService {
  /**
   * @param {object} config - IMAP configuration { host, port, user, pass }
   * @param {object} [logger] - Optional logger
   */
  constructor(config, logger = console) {
    this.config = {
      host: config.host,
      port: config.port,
      secure: true,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      logger: false, // Turn off library logging to avoid noise
    };
    this.logger = logger;
    this.client = new ImapFlow(this.config);
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.logout();
  }

  /**
   * Test IMAP connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.connect();
      const mailbox = await this.client.mailboxOpen('INBOX');
      this.logger.log(`✅ IMAP Connected: ${this.config.host} (Inbox: ${mailbox.exists} msgs)`);
      await this.disconnect();
      return true;
    } catch (err) {
      this.logger.error('❌ IMAP Connection failed:', err.message);
      return false;
    }
  }

  /**
   * Fetch new emails since the given UID
   * @param {number} lastUid - The last seen UID
   * @returns {Promise<{ emails: Array, lastUid: number }>}
   */
  async fetchNewEmails(lastUid = 0) {
    const newEmails = [];
    let maxUid = lastUid;

    try {
      await this.connect();
      const mailbox = await this.client.mailboxOpen('INBOX');

      // If lastUid is 0, we might want to just get the latest to establish a baseline
      // instead of fetching everything. But let's stick to the logic:
      // If 0, maybe fetch only unseen? Or just establish baseline.
      // The original script established baseline if lastUID was 0.
      
      if (lastUid === 0) {
        // Establish baseline
        let latestUID = 0;
        for await (const msg of this.client.fetch('1:*', { uid: true })) {
          if (msg.uid > latestUID) latestUID = msg.uid;
        }
        this.logger.log(`[IMAP] Baseline set at UID ${latestUID}`);
        await this.disconnect();
        return { emails: [], lastUid: latestUID };
      }

      // Search for new messages
      // IMAP quirk: range `N:*` can return N-1 if it's the only one, or N.
      // We strictly filter later.
      const searchRange = `${lastUid + 1}:*`;
      let uids = [];
      try {
        uids = await this.client.search({ uid: searchRange }, { uid: true });
      } catch (err) {
        // If range invalid, means no new messages usually
        if (!err.message.includes('does not exist')) throw err;
      }
      
      uids = uids.filter(uid => uid > lastUid);

      if (uids.length === 0) {
        await this.disconnect();
        return { emails: [], lastUid };
      }

      for await (const msg of this.client.fetch(uids, {
        uid: true,
        envelope: true,
        source: true,
      }, { uid: true })) {
        if (msg.uid <= lastUid) continue;

        const parsed = await simpleParser(msg.source);
        
        const email = {
          uid: msg.uid,
          from: parsed.from?.text || msg.envelope?.from?.[0]?.address || 'unknown',
          to: parsed.to?.text || '',
          subject: parsed.subject || msg.envelope?.subject || '(no subject)',
          date: parsed.date?.toISOString() || msg.envelope?.date?.toISOString() || new Date().toISOString(),
          text: (parsed.text || '').substring(0, 3000), // Limit body
          hasAttachments: (parsed.attachments?.length || 0) > 0,
          messageId: parsed.messageId || '',
        };

        newEmails.push(email);
        if (msg.uid > maxUid) maxUid = msg.uid;
      }

    } catch (err) {
      this.logger.error('Error fetching emails:', err);
    } finally {
      // Always try to logout
      try { await this.disconnect(); } catch {}
    }

    return { emails: newEmails, lastUid: maxUid };
  }
}
