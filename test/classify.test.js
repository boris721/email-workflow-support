import { describe, it, expect, vi } from 'vitest';
import { ClassifierService } from '../src/classify.js';
import * as llm from '../src/llm.js';

vi.mock('../src/llm.js');

describe('ClassifierService', () => {
  const config = { gateway: { token: 'abc' } };
  const references = [{ id: 'ref1', category: 'test' }];
  
  it('should classify emails', async () => {
    const service = new ClassifierService(config, references);
    
    const mockDrafts = {
      drafts: [
        {
          uid: 1,
          from: 'user@example.com',
          subject: 'Help',
          category: 'test',
          action: 'reply',
          summary: 'User needs help',
          reply_body: 'Draft reply'
        }
      ]
    };

    llm.callLlmTask.mockResolvedValue(mockDrafts);

    const emails = [{ uid: 1, from: 'user@example.com', subject: 'Help', text: 'help me' }];
    const result = await service.classify(emails);

    expect(llm.callLlmTask).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].reply_body).toBe('Draft reply');
    expect(result[0].original_text).toBe('help me');
  });

  it('should handle empty input', async () => {
    const service = new ClassifierService(config, references);
    const result = await service.classify([]);
    expect(result).toHaveLength(0);
  });
});
