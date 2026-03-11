import Anthropic from '@anthropic-ai/sdk'
import { hammingDistance } from './clustering'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function areSameCover(urlA: string, urlB: string): Promise<boolean | null> {
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: urlA } },
          { type: 'image', source: { type: 'url', url: urlB } },
          {
            type: 'text',
            text: 'Are these two book covers showing the exact same cover design and artwork? Ignore minor differences in brightness, crop size, or print quality — focus only on whether the artwork is identical. Answer YES or NO only.'
          }
        ]
      }]
    })
    const text = (response.content[0] as { type: 'text'; text: string }).text.trim().toUpperCase()
    return text.startsWith('YES')
  } catch {
    return null // treat as unknown — will not group
  }
}

// Given a hash map, return all pairs in the borderline zone (Hamming 4–10)
export function borderlinePairs(hashMap: Map<string, string>): [string, string][] {
  const urls = Array.from(hashMap.keys())
  const pairs: [string, string][] = []
  for (let i = 0; i < urls.length; i++) {
    for (let j = i + 1; j < urls.length; j++) {
      const a = hashMap.get(urls[i])!
      const b = hashMap.get(urls[j])!
      const ha = BigInt('0x' + a)
      const hb = BigInt('0x' + b)
      const dist = hammingDistance(ha, hb)
      if (dist >= 4 && dist <= 10) {
        // Normalize order so (A,B) and (B,A) always use the same cache key
        const [ua, ub] = urls[i] < urls[j] ? [urls[i], urls[j]] : [urls[j], urls[i]]
        pairs.push([ua, ub])
      }
    }
  }
  return pairs
}
