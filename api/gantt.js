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
      // Get gantt database
      const data = readGanttDB()
      if (!data) {
        return res.status(500).json({ error: 'Failed to read gantt database' })
      }
      res.json(data)
    } else if (req.method === 'POST') {
      // Update gantt database
      const updatedData = req.body
      
      if (!updatedData || typeof updatedData !== 'object') {
        return res.status(400).json({ error: 'Invalid data provided' })
      }
      
      // Add metadata
      updatedData.lastModified = new Date().toISOString()
      updatedData.lastModifiedBy = req.headers['x-user-id'] || 'api'
      
      const success = writeGanttDB(updatedData)
      if (!success) {
        return res.status(500).json({ error: 'Failed to save gantt database' })
      }
      
      res.json({ 
        success: true,
        message: 'Gantt data saved successfully',
        lastModified: updatedData.lastModified
      })
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to handle gantt request', details: String(e) })
  }
}
