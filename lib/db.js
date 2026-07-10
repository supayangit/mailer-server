import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'

dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local', override: true })

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'
const dbName = process.env.MONGODB_DB_NAME || 'mailer-db'

if (!uri) {
  throw new Error('Missing MONGODB_URI environment variable')
}

const client = new MongoClient(uri)

try {
  await client.connect()
} catch (err) {
  console.error('Failed to connect to MongoDB:', err)
  throw err
}

console.log(`Connected to MongoDB at ${uri} — using database: ${dbName}`)

export const db = client.db(dbName)
export { client }
