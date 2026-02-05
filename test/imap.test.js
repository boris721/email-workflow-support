import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImapService } from '../src/imap.js';

// Mock imapflow
const mockFetch = vi.fn();
const mockSearch = vi.fn();
const mockConnect = vi.fn();
const mockLogout = vi.fn();
const mockMailboxOpen = vi.fn();

vi.mock('imapflow', () => {
  return {
    ImapFlow: class {
      constructor(config) {
        this.config = config;
      }
      connect() { return mockConnect(); }
      logout() { return mockLogout(); }
      mailboxOpen() { return mockMailboxOpen(); }
      search(...args) { return mockSearch(...args); }
      fetch(...args) { return mockFetch(...args); }
    }
  };
});

describe('ImapService', () => {
  let imap;

  beforeEach(() => {
    imap = new ImapService({ host: 'test', port: 993, user: 'u', pass: 'p' });
    vi.clearAllMocks();
    mockMailboxOpen.mockResolvedValue({ exists: 5 });
  });

  it('should connect', async () => {
    mockConnect.mockResolvedValue(true);
    await imap.connect();
    expect(mockConnect).toHaveBeenCalled();
  });

  it('should fetch new emails', async () => {
    // Setup mocks
    mockSearch.mockResolvedValue([10, 11]);
    
    const mockMsg = {
      uid: 11,
      envelope: {
        from: [{ address: 'test@example.com' }],
        subject: 'Test Subject',
        date: new Date()
      },
      source: 'From: test@example.com\r\nSubject: Test\r\n\r\nHello'
    };

    // Async generator for fetch
    async function* fetchGen() {
      yield mockMsg;
    }
    mockFetch.mockReturnValue(fetchGen());

    const { emails, lastUid } = await imap.fetchNewEmails(10);
    
    expect(mockSearch).toHaveBeenCalled();
    expect(emails).toHaveLength(1);
    expect(emails[0].uid).toBe(11);
    expect(lastUid).toBe(11);
  });
});
