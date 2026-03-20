import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { image, mimeType } = req.body || {}

  if (!image) {
    return res.status(400).json({ error: 'Missing image data' })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' })
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType || 'image/jpeg',
                data: image,
              },
            },
            {
              type: 'text',
              text: 'This is a page from a cookbook. Extract: 1) The recipe title (just the title, no extra words) 2) The complete recipe text including ingredients and instructions. Return ONLY valid JSON: {"title": string, "text": string}',
            },
          ],
        },
      ],
    })

    const rawText = response.content[0]?.text || ''

    // Parse JSON from response — strip markdown fences first
    let parsed
    try {
      // Strip ```json ... ``` or ``` ... ``` wrappers
      let jsonStr = rawText.trim()
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      // If still not starting with {, try to find the first { ... } block
      if (!jsonStr.startsWith('{')) {
        const match = jsonStr.match(/\{[\s\S]*\}/)
        if (match) jsonStr = match[0]
      }
      parsed = JSON.parse(jsonStr)
    } catch {
      console.warn('Could not parse JSON from Claude response, using raw text')
      parsed = { title: '', text: rawText }
    }

    return res.status(200).json({
      title: parsed.title || '',
      text: parsed.text || '',
    })
  } catch (err) {
    console.error('Claude API error:', err)

    if (err.status === 401) {
      return res.status(500).json({ error: 'Invalid Anthropic API key' })
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limit reached. Please try again in a moment.' })
    }

    return res.status(500).json({
      error: err.message || 'Failed to process image',
    })
  }
}
