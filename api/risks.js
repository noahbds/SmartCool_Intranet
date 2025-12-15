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
      id: risk.id,
      name: risk.name,
      title: risk.name,
      description: risk.description,
      context: risk.description,
      category: risk.category,
      owner: risk.owner || 'N/A',
      status: risk.status || 'N/A',
      trigger: risk.trigger || 'N/A',
      fallback: risk.fallback || 'N/A',
      mitigation: risk.mitigation || 'N/A',
      // Numeric versions for risks.html calculation
      probability: risk.probability,
      likelihood: risk.probability,
      // Text versions for dashboard display and filtering
      prob: getLevel(risk.probability),
      impact: getLevel(risk.impact)
    }))
    
    res.json(transformed)
  } catch (e) {
    res.status(500).json({ error: 'Failed to load risks', details: String(e) })
  }
}
