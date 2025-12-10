const fs = require('fs')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'gantt.json')

function readGanttDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8')
    return JSON.parse(data)
  } catch (e) {
    console.error('Error reading gantt DB:', e)
    return null
  }
}

function writeGanttDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('Error writing gantt DB:', e)
    return false
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

      const success = writeGanttDB(payload)
      if (!success) {
        return res.status(500).json({ error: 'Failed to save gantt database' })
      }

      return res.json({
        success: true,
        message: 'Gantt data saved successfully',
        lastModified: payload.lastModified,
        project: payload.project
      })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (e) {
    res.status(500).json({ error: 'Failed to handle gantt request', details: String(e) })
  }
}
