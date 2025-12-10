const fs = require('fs')
const path = require('path')

const ganttDir = path.join(process.cwd(), 'public', 'gantt')

module.exports = (req, res) => {
  try {
    if (req.method === 'GET') {
      // List all .gan files
      if (!fs.existsSync(ganttDir)) {
        fs.mkdirSync(ganttDir, { recursive: true })
      }
      
      const files = fs.readdirSync(ganttDir)
        .filter(f => f.endsWith('.gan'))
        .map(f => ({
          name: f,
          path: `/gantt/${f}`,
          size: fs.statSync(path.join(ganttDir, f)).size
        }))
        .sort((a, b) => b.size - a.size)
      
      res.json({ files })
    } else if (req.method === 'POST') {
      // Save uploaded .gan file
      const filename = req.body?.filename || `gantt_${Date.now()}.gan`
      const content = req.body?.content
      
      if (!filename.endsWith('.gan')) {
        return res.status(400).json({ error: 'File must have .gan extension' })
      }
      
      if (!content) {
        return res.status(400).json({ error: 'No content provided' })
      }
      
      if (!fs.existsSync(ganttDir)) {
        fs.mkdirSync(ganttDir, { recursive: true })
      }
      
      const filePath = path.join(ganttDir, filename)
      fs.writeFileSync(filePath, content, 'utf-8')
      
      res.json({ 
        success: true, 
        filename, 
        path: `/gantt/${filename}`,
        message: `File saved as ${filename}` 
      })
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (e) {
    res.status(500).json({ error: 'Failed to handle gantt request', details: String(e) })
  }
}
