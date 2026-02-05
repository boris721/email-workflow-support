import fs from 'fs';
import { callLlmTask } from './llm.js';

export class ReferenceService {
  /**
   * @param {object} config - Config object
   */
  constructor(config) {
    this.config = config;
    this.filePath = config.paths.referencesFile;
  }

  load() {
    if (fs.existsSync(this.filePath)) {
      try {
        return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      } catch (err) {
        console.error('Failed to load references:', err);
      }
    }
    return [];
  }

  save(references) {
    // Custom formatted JSON
    const jsonStr = JSON.stringify(references, null, 2)
      .replace(/\[\n\s+("(?:[^"\\]|\\.)*"(?:,\n\s+"(?:[^"\\]|\\.)*")*)\n\s+\]/g, (match, inner) => {
        const items = inner.split(/,\n\s+/);
        return '[' + items.join(', ') + ']';
      });
    fs.writeFileSync(this.filePath, jsonStr + '\n');
  }

  /**
   * Generate and add a reference from a draft
   * @param {object} draft - The draft object
   * @returns {Promise<object>} The new reference entry
   */
  async addFromDraft(draft) {
    const references = this.load();
    const existingIds = references.map(r => r.id);
    const lang = draft.language || 'en';

    const prompt = `You are generating a reference response entry for the support knowledge base.

Given this support email exchange, generate the metadata for a new reference entry.

Existing reference IDs (avoid duplicates): ${JSON.stringify(existingIds)}

The email was in language: ${lang}
Original question summary: ${draft.summary || ''}
Category assigned: ${draft.category || 'unknown'}

Generate:
- id: a kebab-case identifier (unique, descriptive, not in existing IDs)
- category: the category this belongs to (reuse existing: payment, account, technical, pricing, general, feature, incident)
- keywords: array of relevant keywords in all applicable languages
- languages: array of 2-letter language codes this reference covers
- question_summary: a clear 1-line summary of the customer's question`;

    const input = {
      original_email: draft.original_text || draft.summary || '',
      response: draft.reply_body || '',
      subject: draft.subject || '',
      from: draft.from || '',
      language: lang,
    };

    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        category: { type: 'string' },
        keywords: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        question_summary: { type: 'string' },
      },
      required: ['id', 'category', 'keywords', 'languages', 'question_summary'],
    };

    const metadata = await callLlmTask(this.config.gateway, prompt, input, schema);

    const entry = {
      id: metadata.id,
      category: metadata.category,
      keywords: metadata.keywords,
      languages: metadata.languages,
      question_summary: metadata.question_summary,
      [`reference_response_${lang}`]: draft.reply_body || '',
    };

    references.push(entry);
    this.save(references);
    return entry;
  }
}
