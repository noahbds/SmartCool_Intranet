const fs = require('fs')
const path = require('path')
const { createClient } = require('redis')

const dbPath = path.join(process.cwd(), 'data', 'gantt.json')
const tmpPath = process.env.GANTT_DB_PATH || path.join('/tmp', 'gantt.json')
const REDIS_KEY = 'gantt:data'

let redisClient = null
let redisReady = false

async function getRedis() {
  if (!process.env.REDIS_URL) return null
  if (redisReady && redisClient) return redisClient
  try {
    redisClient = createClient({ url: process.env.REDIS_URL })
    redisClient.on('error', (err) => console.warn('Redis error:', err?.message || err))
    await redisClient.connect()
    redisReady = true
    return redisClient
  } catch (e) {
    console.warn('Redis connect failed, will use filesystem fallback:', e?.message || e)
    redisClient = null
    redisReady = false
    return null
  }
}

function ensureDir(p) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
  } catch (e) {
    // ignore mkdir errors; will surface on write
  }
}

function readGanttDB() {
  try {
    // Prefer runtime-writeable copy if it exists
    if (fs.existsSync(tmpPath)) {
      const data = fs.readFileSync(tmpPath, 'utf-8')
      return JSON.parse(data)
    }

    const data = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    console.error('Error reading gantt DB:', e)
    return null
  }
}

function resolveWritePath() {
  try {
    fs.accessSync(path.dirname(dbPath), fs.constants.W_OK)
    return dbPath
  } catch (e) {
    return tmpPath
  }
}

function writeGanttDB(data) {
  const primaryTarget = resolveWritePath()
  try {
    ensureDir(primaryTarget)
    fs.writeFileSync(primaryTarget, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true, path: primaryTarget }
  } catch (e) {
    // If first attempt failed due to RO FS, try tmp fallback once
    if (primaryTarget !== tmpPath && e.code === 'EROFS') {
      try {
        ensureDir(tmpPath)
        fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8')
        return { success: true, path: tmpPath, fallback: true }
      } catch (e2) {
        console.error('Fallback write failed:', e2)
        return { success: false, error: e2 }
      }
    }
    console.error('Error writing gantt DB:', e)
    return { success: false, error: e }
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      // Try Redis first
      try {
        const r = await getRedis()
        if (r) {
          const cached = await r.get(REDIS_KEY)
          if (cached) {
            return res.json(JSON.parse(cached))
          }
        }
      } catch (e) {
        console.warn('Redis read failed, using file fallback:', e?.message || e)
      }

      const data = readGanttDB()
      if (!data) {
        return res.status(500).json({ error: 'Failed to read gantt database' })
      }

      // Prime Redis asynchronously (best effort)
      getRedis().then(async (r) => {
        if (r) await r.set(REDIS_KEY, JSON.stringify(data))
      }).catch(() => {})

      return res.json(data)
    }

    if (req.method === 'POST') {
      const updatedData = req.body

      if (!updatedData || typeof updatedData !== 'object') {
        return res.status(400).json({ error: 'Invalid data provided' })
      }

      if (!Array.isArray(updatedData.tasks) || !Array.isArray(updatedData.resources)) {
        return res.status(400).json({ error: 'Invalid gantt payload: tasks and resources are required arrays' })
      }

      const payload = {
        project: updatedData.project || { name: 'SmartCool Pro Planning', code: 'SC-PRO' },
        tasks: updatedData.tasks,
        resources: updatedData.resources,
        lastModified: new Date().toISOString(),
        lastModifiedBy: req.headers['x-user-id'] || 'api'
      }

      // Try Redis first for durability
      try {
        const r = await getRedis()
        if (r) {
          await r.set(REDIS_KEY, JSON.stringify(payload))
          return res.json({
            success: true,
            message: 'Gantt data saved successfully',
            lastModified: payload.lastModified,
            project: payload.project,
            storage: 'redis'
          })
        }
      } catch (e) {
        console.warn('Redis write failed, falling back to filesystem:', e?.message || e)
      }

      const result = writeGanttDB(payload)
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to save gantt database', details: String(result.error || 'unknown') })
      }

      return res.json({
        success: true,
        message: 'Gantt data saved (filesystem fallback)',
        lastModified: payload.lastModified,
        project: payload.project,
        storagePath: result.path,
        fallback: !!result.fallback
      })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    res.status(500).json({ error: 'Failed to handle gantt request', details: String(e) })
  }
}
