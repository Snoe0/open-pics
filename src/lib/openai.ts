import OpenAI from 'openai'

// Lazy singleton — constructing OpenAI at module load crashes builds/boots
// when OPENAI_API_KEY is absent; defer until a route actually needs it.
let client: OpenAI | null = null
const getClient = () => (client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }))

export const openai = new Proxy({} as OpenAI, {
  get: (_target, prop) => Reflect.get(getClient(), prop),
})

export const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini'
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small'
export const EMBEDDING_DIM = 1536

export const embedText = async (text: string): Promise<number[]> => {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000),
  })
  return res.data[0].embedding
}
