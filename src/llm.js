// Standard fetch is global in Node 18+


/**
 * Call the OpenClaw llm-task tool via Gateway HTTP
 * @param {object} config - Gateway config { port, token }
 * @param {string} prompt - The prompt text
 * @param {object|string} input - Input data
 * @param {object} schema - JSON schema for validation
 * @returns {Promise<any>} The structured JSON result
 */
export async function callLlmTask(config, prompt, input, schema) {
  const port = config.port || '18789';
  const token = config.token;
  const url = `http://127.0.0.1:${port}/tools/invoke`;

  if (!token) {
    throw new Error('Gateway token not configured');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      tool: 'llm-task',
      action: 'json',
      args: { prompt, input, schema },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`llm-task API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  
  // Handle various return formats from llm-task
  if (data.result?.json) return data.result.json;
  if (data.json) return data.json;
  if (data.result?.content?.[0]?.text) {
    try {
      return JSON.parse(data.result.content[0].text);
    } catch {
      // return raw text if parse fails? No, we expect JSON.
    }
  }
  
  throw new Error('Unexpected llm-task response format');
}
