const sqlite3 = require('sqlite3').verbose();

let db;

function getDb() {
    if (!db) {
        db = new sqlite3.Database(':memory:');
        initDatabase();
    }
    return db;
}

function initDatabase() {
    const database = getDb();
    database.serialize(() => {
        database.run(`CREATE TABLE IF NOT EXISTS risks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            context TEXT,
            mitigation TEXT,
            prob TEXT,
            impact TEXT,
            color TEXT,
            icon TEXT
        )`);

        const riskStmt = database.prepare("INSERT INTO risks (title, context, mitigation, prob, impact, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const riskData = [
            ['Global Chip Shortage', 'High demand for ARM-based processors (Raspberry Pi) may lead to 12+ week lead times.', 'Pre-order critical compute modules immediately (Week 2). Validate alternative hardware.', 'High', 'High', '#ef4444', 'fa-exclamation-circle'],
            ['Camera Fogging', 'The fridge interior is cold and humid. Opening the door causes condensation.', 'Integrate hydrophobic coating on lens glass. Design placement away from vents.', 'Medium', 'High', '#f59e0b', 'fa-temperature-low'],
            ['AI Model Accuracy < 90%', 'YOLOv8 may struggle with occluded items or poor lighting.', 'Collect a custom dataset with "messy fridge" scenarios. Implement multi-frame tracking.', 'Medium', 'Medium', '#3b82f6', 'fa-eye-slash']
        ];
        riskData.forEach(risk => riskStmt.run(risk));
        riskStmt.finalize();
    });
}

module.exports = (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM risks", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
};
