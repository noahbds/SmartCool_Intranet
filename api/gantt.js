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
        database.run(`CREATE TABLE IF NOT EXISTS gantt (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phase TEXT,
            task TEXT,
            start_week INTEGER,
            duration INTEGER,
            status TEXT,
            color TEXT,
            icon TEXT
        )`);

        const ganttStmt = database.prepare("INSERT INTO gantt (phase, task, start_week, duration, status, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?)");
        const ganttData = [
            ['1. INITIATION', 'Market Survey & Specs', 1, 2, 'Done', '#3b82f6', 'fa-search'],
            ['1. INITIATION', 'Budget & Risk Def.', 2, 2, 'Done', '#3b82f6', 'fa-file-contract'],
            ['2. POC', 'Sprint 1: Sourcing (RPi/IMX219)', 4, 2, 'In Progress', '#8b5cf6', 'fa-shopping-cart'],
            ['2. POC', 'Sprint 2: Dataset Collection', 6, 2, 'Photos', '#a78bfa', 'fa-images'],
            ['2. POC', 'Sprint 3: AI Model Training', 8, 2, 'Training', '#8b5cf6', 'fa-brain'],
            ['2. POC', 'PoC Validation Checkpoint', 10, 1, 'Milestone', '#ef4444', 'fa-flag'],
            ['3. DEV', 'Sprint 4: PCB Design & Fab', 11, 2, 'HW Rev 1', '#10b981', 'fa-microchip'],
            ['3. DEV', 'Sprint 5: Firmware Integration', 13, 2, 'Firmware', '#34d399', 'fa-code'],
            ['3. DEV', 'Sprint 6: Mobile App Beta', 15, 2, 'App Dev', '#10b981', 'fa-mobile-alt'],
            ['4. IND', 'Tooling & Molds (CAPEX)', 17, 4, 'Tooling', '#f59e0b', 'fa-industry'],
            ['4. IND', 'Final Certification', 21, 2, 'Cert.', '#f59e0b', 'fa-stamp']
        ];
        ganttData.forEach(task => ganttStmt.run(task));
        ganttStmt.finalize();
    });
}

module.exports = (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM gantt ORDER BY phase ASC, start_week ASC", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
};
