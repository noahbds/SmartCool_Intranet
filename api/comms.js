const sqlite3 = require('sqlite3').verbose()

let db

function getDb () {
  if (!db) {
    db = new sqlite3.Database(':memory:')
    initDatabase()
  }
  return db
}

function initDatabase () {
  const database = getDb()
  database.serialize(() => {
    database.run(`CREATE TABLE IF NOT EXISTS comms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            sender TEXT,
            recipient TEXT,
            subject TEXT,
            content TEXT,
            icon TEXT
        )`)

    const commStmt = database.prepare(
      'INSERT INTO comms (type, sender, recipient, subject, content, icon) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const commsData = [
      [
        'Internal',
        'Noah (Project Lead)',
        'SmartCool Team',
        '🚀 Project Kickoff: SmartCool Pro',
        '<p>Team,</p><p>I am thrilled to officially launch the <strong>SmartCool Pro</strong> project. Our mission is to revolutionize the kitchen with a "Zero Waste" smart fridge powered by embedded AI.</p><p><strong>Key Objectives:</strong></p><ul><li>Integrate Raspberry Pi & YOLOv8 for real-time inventory tracking.</li><li>Develop a user-friendly mobile app for recipe suggestions.</li><li>Validate our "Agile Hardware" approach with 2-week sprints.</li></ul><p>Let\'s make this a reality!</p><p>Best,<br>Noah</p>',
        'fa-paper-plane'
      ],
      [
        'External',
        'Noah (Project Manager)',
        'Board of Directors',
        'Budget Approval Request',
        '<p>Dear Board Members,</p><p>Following the successful completion of our initial feasibility study, I am submitting the formal budget request for the T-CEN-500 Industrialization Phase.</p><p><strong>Request Summary:</strong></p><ul><li><strong>Total Budget:</strong> $60,000</li><li><strong>CAPEX ($40k):</strong> Allocated for soft-steel tooling and molds to ensure production quality.</li><li><strong>OPEX ($20k):</strong> Dedicated to specialized labor and cloud infrastructure for AI training.</li></ul><p>We are confident this investment will yield a market-ready prototype by Q2.</p><p>Sincerely,<br>Noah</p>',
        'fa-file-invoice-dollar'
      ]
    ]
    commsData.forEach(c => commStmt.run(c))
    commStmt.finalize()
  })
}

module.exports = (req, res) => {
  const database = getDb()
  database.all('SELECT * FROM comms', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(rows)
  })
}
