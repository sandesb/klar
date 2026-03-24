import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Groq } from 'groq-sdk'

// ── Dev-server prompt cache (module-level, persists across hot-reload) ─
const CACHE_TTL_MS = 5 * 60 * 1000
const devPromptCache = new Map() // key -> { text, fetchedAt }

async function getDevPrompt(key, supabaseUrl, supabaseKey, fallback) {
  const cached = devPromptCache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.text
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/klary_prompts?select=prompt_text&key=eq.${encodeURIComponent(key)}&limit=1`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    )
    if (res.ok) {
      const rows = await res.json()
      const text = rows?.[0]?.prompt_text
      if (text) {
        devPromptCache.set(key, { text, fetchedAt: Date.now() })
        return text
      }
    }
  } catch {}
  return fallback
}

const HIGHLIGHTS_FALLBACK = [
  'You are an assistant that extracts structured highlights from a daily journal note.',
  '',
  'Return ONLY valid JSON (no markdown, no backticks).',
  'Schema:',
  '{',
  '  "literal_bullets": string[],',
  '  "checks": {',
  '    "cold_shower": { "done": boolean, "evidence": string|null },',
  '    "morning_meditation": { "done": boolean, "minutes": number|null, "evidence": string|null },',
  '    "gym": { "done": boolean, "minutes": number|null, "body_parts": string[], "evidence": string|null },',
  '    "evening_meditation": { "done": boolean, "minutes": number|null, "evidence": string|null },',
  '    "special_incidents": [',
  '      { "text": string, "sentiment": "positive"|"negative"|"neutral" }',
  '    ]',
  '  }',
  '}',
  '',
  'Rules:',
  '- If something is not mentioned, set done=false and minutes=null.',
  '- Interpret "1 hr", "one hour" as 60 minutes, "15 minutes" as 15, etc.',
  '- "morning_meditation": if the note implies it happened after cold shower in the morning, mark done=true and set minutes.',
  '- "evening_meditation": if meditation is mentioned later in the day, set done and minutes accordingly.',
  '- For gym, if body parts are mentioned, put them into "body_parts" (e.g. ["forearms","triceps"]).',
  '- "special_incidents" should include unusual events, messages, storms, accidents, visits, etc.',
  '- sentiment=positive: meaningful personal experience, joy, wins, good surprises.',
  '- sentiment=negative: harm/injury, accidents, failures, rejections, setbacks.',
  '- sentiment=neutral: notable observation with no direct personal consequence.',
].join('\n')

const CHAT_SYSTEM_FALLBACK = [
  'You are Sandy — a casual, self-aware alternate self of the user, replying like a friend who read their diary.',
  'Use the Knowledge Base to answer questions about the journal notes.',
  'Rules:',
  '- Keep replies SHORT (under 60 words) unless the user asks to elaborate or requests a list/table.',
  '- Use proper markdown: bullet lists must have EACH item on its own line starting with `-` or `*`.',
  '- For tables, use proper markdown table syntax (| Col | Col | with a separator row).',
  "- Never use 'Evidence:', raw date_key strings, or ASCII pipe-based tables that aren't real markdown.",
  "- Reference dates naturally: 'Sunday', 'Mar 15', 'Monday'. Don't show date_key like '2026-03-15'.",
  '- No verbose disclaimers or bot-like preamble.',
].join('\n')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqApiKey = env.GROQ_API_KEY || env.groq || process.env.GROQ_API_KEY || process.env.groq
  const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

  return {
    plugins: [
      react(),
      {
        name: 'groq-highlights-api',
        configureServer(server) {
          server.middlewares.use('/api/highlights', async (req, res) => {
            // CORS (for live deployments where the client/origin differs)
            const origin = req.headers.origin || '*'
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader(
              'Access-Control-Allow-Headers',
              'Content-Type, Authorization, X-Requested-With'
            )
            res.setHeader('Access-Control-Max-Age', '86400')

            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            if (!groqApiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing Groq API key in .env (GROQ_API_KEY or groq)' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const { text, instruction } = JSON.parse(body || '{}')
                if (!text || typeof text !== 'string') {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing `text`' }))
                  return
                }

                res.statusCode = 200
                res.setHeader('Content-Type', 'text/plain; charset=utf-8')
                res.setHeader('Cache-Control', 'no-cache, no-transform')
                res.setHeader('Connection', 'keep-alive')

                const groq = new Groq({ apiKey: groqApiKey })

                const systemPromptBase = await getDevPrompt('highlights_system', supabaseUrl, supabaseKey, HIGHLIGHTS_FALLBACK)
                const extra = typeof instruction === 'string' ? instruction.trim() : ''
                const prompt = extra
                  ? `${systemPromptBase}\n\nAdditional instruction:\n${extra}\n\nJournal note:\n${text}`
                  : `${systemPromptBase}\n\nJournal note:\n${text}`

                const chatCompletion = await groq.chat.completions.create({
                  messages: [{ role: 'user', content: prompt }],
                  model: 'openai/gpt-oss-120b',
                  temperature: 0.7,
                  max_completion_tokens: 2048,
                  top_p: 1,
                  stream: true,
                  reasoning_effort: 'medium',
                })

                for await (const chunk of chatCompletion) {
                  const delta = chunk.choices?.[0]?.delta?.content || ''
                  if (delta) res.write(delta)
                }
                res.end()
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Groq highlights failed' }))
              }
            })
          })

          server.middlewares.use('/api/chat', async (req, res) => {
            // CORS (for live deployments where the client/origin differs)
            const origin = req.headers.origin || '*'
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader(
              'Access-Control-Allow-Headers',
              'Content-Type, Authorization, X-Requested-With'
            )
            res.setHeader('Access-Control-Max-Age', '86400')

            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            if (!groqApiKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing Groq API key in .env (GROQ_API_KEY or groq)' }))
              return
            }
            if (!supabaseUrl || !supabaseKey) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Missing Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY)' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const parsed = JSON.parse(body || '{}')
                const userMessage = parsed.userMessage
                const messages = Array.isArray(parsed.messages) ? parsed.messages : []
                const images = Array.isArray(parsed.images) ? parsed.images.slice(0, 5) : []
                const weekStartKey = parsed.weekStartKey
                const weekEndKey = parsed.weekEndKey

                if (!userMessage || typeof userMessage !== 'string') {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing `userMessage`' }))
                  return
                }
                if (!weekStartKey || !weekEndKey) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Missing `weekStartKey` or `weekEndKey`' }))
                  return
                }

                // Fetch notes from Supabase for the week range
                const restUrl = `${supabaseUrl}/rest/v1/klary_notes?select=date_key,note_text,highlights&date_key=gte.${encodeURIComponent(
                  weekStartKey
                )}&date_key=lte.${encodeURIComponent(weekEndKey)}`

                const notesRes = await fetch(restUrl, {
                  method: 'GET',
                  headers: {
                    apikey: supabaseKey,
                    Authorization: `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                  },
                })

                if (!notesRes.ok) {
                  const t = await notesRes.text().catch(() => '')
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Failed to fetch klary_notes', details: t || undefined }))
                  return
                }

                const notesRows = await notesRes.json()

                const kbLines = []
                kbLines.push('Klary Notes Knowledge Base (per-day):')
                for (const row of notesRows || []) {
                  const dateKey = row.date_key
                  const noteText = typeof row.note_text === 'string' ? row.note_text : ''
                  const highlights = row.highlights ?? null
                  kbLines.push('')
                  kbLines.push(`Day ${dateKey}:`)
                  kbLines.push(`note_text: ${noteText ? (noteText.length > 2200 ? noteText.slice(0, 2200) + '…' : noteText) : '(empty)'}`)
                  kbLines.push(`highlights: ${highlights ? JSON.stringify(highlights).slice(0, 1600) : 'null'}`)
                }

                kbLines.push('')
                kbLines.push('Use this knowledge base when the user asks about what happened in the notes.')
                kbLines.push('If a question is general and not related to the notes, answer normally.')

                const chatBase = await getDevPrompt('chat_system', supabaseUrl, supabaseKey, CHAT_SYSTEM_FALLBACK)
                const systemPrompt = `${chatBase}\n\n${kbLines.join('\n')}`

                const groq = new Groq({ apiKey: groqApiKey })
                const userContentParts = [
                  { type: 'text', text: userMessage },
                  ...images
                    .filter((img) => typeof img === 'string' && img.startsWith('data:image/'))
                    .map((img) => ({ type: 'image_url', image_url: { url: img } })),
                ]

                const hasImages = userContentParts.length > 1

                const groqMessages = [
                  { role: 'system', content: systemPrompt },
                  ...messages.map((m) => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: String(m.content ?? ''),
                  })),
                  { role: 'user', content: hasImages ? userContentParts : userMessage },
                ]
                const completion = await groq.chat.completions.create({
                  model: hasImages ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'openai/gpt-oss-120b',
                  messages: groqMessages,
                  temperature: 0.6,
                  max_completion_tokens: hasImages ? 1024 : 400,
                  top_p: 1,
                  stream: false,
                  ...(hasImages ? {} : { reasoning_effort: 'medium' }),
                })

                const answer = completion?.choices?.[0]?.message?.content ?? ''

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ answer }))
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Chat failed', details: String(e?.message || e) }))
              }
            })
          })
        },
      },
      {
        name: 'groq-tts-api',
        configureServer(server) {
          server.middlewares.use('/api/tts', async (req, res) => {
            const origin = req.headers.origin || '*'
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            res.setHeader('Access-Control-Max-Age', '86400')

            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            try {
              const chunks = []
              for await (const chunk of req) chunks.push(chunk)
              const body = Buffer.concat(chunks).toString('utf-8')
              const { text } = JSON.parse(body || '{}')

              if (!text) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: 'Missing text' }))
                return
              }

              const groq = new Groq({ apiKey: groqApiKey })
              const wav = await groq.audio.speech.create({
                model: 'canopylabs/orpheus-v1-english',
                voice: 'autumn',
                response_format: 'wav',
                input: text,
              })

              const buffer = Buffer.from(await wav.arrayBuffer())
              res.statusCode = 200
              res.setHeader('Content-Type', 'audio/wav')
              res.setHeader('Cache-Control', 'no-cache')
              res.end(buffer)
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'TTS failed', details: String(e?.message || e) }))
            }
          })
        },
      },
      {
        name: 'groq-transcribe-api',
        configureServer(server) {
          server.middlewares.use('/api/transcribe', async (req, res) => {
            const origin = req.headers.origin || '*'
            res.setHeader('Access-Control-Allow-Origin', origin)
            res.setHeader('Vary', 'Origin')
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
            res.setHeader('Access-Control-Max-Age', '86400')

            if (req.method === 'OPTIONS') {
              res.statusCode = 204
              res.end()
              return
            }

            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            try {
              const chunks = []
              for await (const chunk of req) chunks.push(chunk)
              const buffer = Buffer.concat(chunks)
              const contentType = req.headers['content-type'] || 'audio/webm'

              const groq = new Groq({ apiKey: groqApiKey })
              const transcription = await groq.audio.transcriptions.create({
                file: new File([buffer], 'audio.webm', { type: contentType }),
                model: 'whisper-large-v3-turbo',
                temperature: 0,
                response_format: 'json',
              })

              res.statusCode = 200
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ text: transcription.text ?? '' }))
            } catch (e) {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Transcription failed', details: String(e?.message || e) }))
            }
          })
        },
      },
    ],
  }
})
