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
    database.run(`CREATE TABLE IF NOT EXISTS team (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            role TEXT,
            category TEXT,
            description TEXT,
            icon TEXT,
            skills TEXT
        )`)

    const teamStmt = database.prepare(
      'INSERT INTO team (name, role, category, description, icon, skills) VALUES (?, ?, ?, ?, ?, ?)'
    )
    const teamData = [
      [
        'Sarah Chen',
        'HW Architect',
        'hardware',
        'Lead engineer for PCB design and sensor integration. Expert in low-power IoT devices.',
        'fa-microchip',
        JSON.stringify([
          { name: 'PCB Design', val: '95%' },
          { name: 'Sensors', val: '85%' }
        ])
      ],
      [
        'Marcus Johnson',
        'AI Scientist',
        'software',
        'Specializes in Computer Vision and Edge AI. Developing the food recognition model.',
        'fa-brain',
        JSON.stringify([
          { name: 'YOLOv8', val: '98%' },
          { name: 'Edge AI', val: '90%' }
        ])
      ],
      [
        'Elena Rodriguez',
        'Project Manager',
        'management',
        'Ensures timeline adherence and budget management. Scrum Master certified.',
        'fa-tasks',
        JSON.stringify([
          { name: 'Agile', val: '100%' },
          { name: 'Budget', val: '85%' }
        ])
      ],
      [
        'David Kim',
        'UX/UI Designer',
        'design',
        'Designing the mobile app interface and physical fridge interaction points.',
        'fa-pen-nib',
        JSON.stringify([
          { name: 'Figma', val: '95%' },
          { name: 'User Research', val: '80%' }
        ])
      ]
    ]
    teamData.forEach(member => teamStmt.run(member))
    teamStmt.finalize()
  })
}

module.exports = (req, res) => {
  const database = getDb()
  database.all('SELECT * FROM team', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message })
    res.json(rows)
  })
}
