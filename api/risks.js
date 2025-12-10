const fs = require('fs')
const path = require('path')

module.exports = (_req, res) => {
  try {
    const p = path.join(process.cwd(), 'data', 'risks.json')
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    
    // Map impact/probability numbers to text levels
    const getLevel = (value) => {
      if (value >= 4) return 'High'
      if (value >= 3) return 'Medium'
      return 'Low'
    }
    
    // Transform data to match dashboard expectations
    const transformed = data.map(risk => ({
      title: risk.name,
      context: risk.description,
      mitigation: risk.mitigation,
      impact: getLevel(risk.impact),
      prob: getLevel(risk.probability),
      category: risk.category,
      owner: risk.owner,
      status: risk.status,
      trigger: risk.trigger,
      fallback: risk.fallback,
      id: risk.id
    }))
    
    res.json(transformed)
  } catch (e) {
    res.status(500).json({ error: 'Failed to load risks', details: String(e) })
  }
}
