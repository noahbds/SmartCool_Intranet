const fs = require('fs')
const path = require('path')

module.exports = (_req, res) => {
  try {
    const p = path.join(process.cwd(), 'data', 'comms.json')
    const data = JSON.parse(fs.readFileSync(p, 'utf-8'))
    res.json(data)
  } catch (e) {
    res
      .status(500)
      .json({ error: 'Failed to load communications', details: String(e) })
  }
}
