import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Groq } from 'groq-sdk'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqApiKey = env.GROQ_API_KEY || env.groq || process.env.GROQ_API_KEY || process.env.groq

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
                const { text } = JSON.parse(body || '{}')
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

                const prompt = [
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
                  '    "special_incidents": string[]',
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
                  '',
                  'Journal note:',
                  text,
                ].join('\n')

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
        },
      },
    ],
  }
})
