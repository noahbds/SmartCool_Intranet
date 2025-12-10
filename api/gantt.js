const fs = require('fs')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'gantt.json')
const tmpPath = process.env.GANTT_DB_PATH || path.join('/tmp', 'gantt.json')

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

module.exports = (req, res) => {
  try {
    if (req.method === 'GET') {
      const data = readGanttDB()
      if (!data) {
        return res.status(500).json({ error: 'Failed to read gantt database' })
      }
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

      const result = writeGanttDB(payload)
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to save gantt database', details: String(result.error || 'unknown') })
      }

      return res.json({
        success: true,
        message: 'Gantt data saved successfully',
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
