import { callLlmTask } from './llm.js';

export class ClassifierService {
  /**
   * @param {object} config - Config object containing gateway settings
   * @param {object} references - Parsed reference-responses.json
   */
  constructor(config, references) {
    this.config = config;
    this.references = references || [];
  }

  /**
   * Classify a batch of emails
   * @param {Array} emails - Array of email objects
   * @returns {Promise<Array>} Array of drafts
   */
  async classify(emails) {
    if (!emails || emails.length === 0) return [];

    const refSummary = this.references.map(r => ({
      id: r.id,
      category: r.category,
      question_summary: r.question_summary,
      keywords: r.keywords,
      languages: r.languages,
      has_responses: Object.keys(r)
        .filter(k => k.startsWith('reference_response_'))
        .map(k => k.replace('reference_response_', '')),
    }));

    const refResponses = {};
    for (const r of this.references) {
      refResponses[r.id] = {};
      for (const [key, val] of Object.entries(r)) {
        if (key.startsWith('reference_response_')) {
          refResponses[r.id][key.replace('reference_response_', '')] = val;
        }
      }
    }

    const systemPrompt = `You are a support email classifier.

Your job:
1. Classify each email against the reference categories below.
2. Draft a reply in the SAME language as the sender's email.
3. Use the reference responses as templates — adapt them to the specific question but keep the same tone and information.
4. Sign all replies as "The Support Team" (localized if needed).
5. If the email is spam, automated notification, or not a real support request: action = "ignore".

Reference categories:
${JSON.stringify(refSummary, null, 2)}

Reference responses by category and language:
${JSON.stringify(refResponses, null, 2)}

Respond with JSON:
{
  "drafts": [
    {
      "uid": <number>,
      "from": "<sender email>",
      "subject": "<original subject>",
      "category": "<matched category id or 'unknown'>",
      "confidence": <0.0-1.0>,
      "language": "<detected 2-letter language code>",
      "action": "reply" | "ignore",
      "reply_subject": "Re: <original subject>",
      "reply_body": "<drafted reply text>",
      "summary": "<1-line summary of what the email is about>"
    }
  ]
}`;

    const schema = {
      type: 'object',
      properties: {
        drafts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              uid: { type: 'number' },
              from: { type: 'string' },
              subject: { type: 'string' },
              category: { type: 'string' },
              confidence: { type: 'number' },
              language: { type: 'string' },
              action: { type: 'string' },
              reply_subject: { type: 'string' },
              reply_body: { type: 'string' },
              summary: { type: 'string' },
            },
            required: ['uid', 'from', 'subject', 'category', 'action', 'summary'],
          },
        },
      },
      required: ['drafts'],
    };

    const result = await callLlmTask(
      this.config.gateway,
      systemPrompt,
      { emails },
      schema
    );

    // Merge original info back
    const emailsByUid = Object.fromEntries(emails.map(e => [e.uid, e]));
    const drafts = (result.drafts || []).map(draft => {
      const orig = emailsByUid[draft.uid];
      if (orig) {
        return {
          ...draft,
          original_text: orig.text || '',
          original_from: orig.from || draft.from || '',
          original_replyTo: orig.replyTo || '',
          original_date: orig.date || '',
          original_messageId: orig.messageId || '',
        };
      }
      return draft;
    });

    return drafts;
  }
}
