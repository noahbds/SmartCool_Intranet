const fs = require('fs')
const path = require('path')

function readJson (file) {
  const p = path.join(process.cwd(), 'data', file)
  const raw = fs.readFileSync(p, 'utf-8')
  return JSON.parse(raw)
}

module.exports = (_req, res) => {
  try {
    const milestones = readJson('milestones.json')
    const budget = readJson('budget.json')
    const risks = readJson('risks.json')

    const total = budget.summary.find(s => s.category === 'Total')
    const topRisks = [...risks]
      .sort((a, b) =>
        `${b.impact}${b.probability}`.localeCompare(`${a.impact}${a.probability}`)
      )
      .slice(0, 3)
      .map(r => ({ title: r.name, category: r.category }))

    res.json({
      milestones,
      totalBudget: total ? total.amount : 0,
      risks: topRisks,
      projectStart: '2025-11-10'
    })
  } catch (e) {
    res
      .status(500)
      .json({ error: 'Failed to load dashboard data', details: String(e) })
  }
}
