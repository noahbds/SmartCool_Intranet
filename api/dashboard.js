const fs = require('fs')
const path = require('path')

function readJson (file) {
  const p = path.join(process.cwd(), 'data', file)
  const raw = fs.readFileSync(p, 'utf-8')
  return JSON.parse(raw)
}

const scoreMap = { 'High': 3, 'Medium': 2, 'Low': 1 }

module.exports = (_req, res) => {
  try {
    const milestones = readJson('milestones.json')
    const budget = readJson('budget.json')
    const risks = readJson('risks.json')

    const total = budget.summary.find(s => s.category === 'Total')
    
    // Proper sorting by severity score
    const topRisks = [...risks]
      .sort((a, b) => {
        const scoreA = (scoreMap[a.impact] || 0) + (scoreMap[a.prob] || 0)
        const scoreB = (scoreMap[b.impact] || 0) + (scoreMap[b.prob] || 0)
        return scoreB - scoreA
      })
      .slice(0, 3)
      .map(r => ({ title: r.title, color: r.color, impact: r.impact, prob: r.prob }))

    res.json({
      milestones,
      totalBudget: total ? total.amount : 0,
      risks: topRisks,
      projectStart: '2025-10-01'
    })
  } catch (e) {
    res.status(500).json({ error: 'Failed to load dashboard data', details: String(e) })
  }
}