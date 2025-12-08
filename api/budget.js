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
        database.run("CREATE TABLE IF NOT EXISTS budget_summary (category TEXT, amount INTEGER)");
        database.run("INSERT INTO budget_summary VALUES ('Total', 60000), ('CAPEX', 40000), ('OPEX', 20000)");

        database.run(`CREATE TABLE IF NOT EXISTS bom (
            component TEXT,
            description TEXT,
            cost REAL,
            supplier TEXT,
            status TEXT,
            icon TEXT
        )`);
        
        const bomStmt = database.prepare("INSERT INTO bom VALUES (?, ?, ?, ?, ?, ?)");
        const bomData = [
            ['Compute Module', 'Raspberry Pi 4 Model B (4GB)', 55.00, 'Element14', 'Sourced', 'fa-microchip'],
            ['Vision Sensor', 'Sony IMX219 8MP Camera Module', 25.00, 'Arducam', 'Ordering', 'fa-camera'],
            ['Custom PCB', 'Power Mgmt & Sensor Interface', 10.00, 'JLCPCB', 'Design Phase', 'fa-print'],
            ['Housing', 'Injection Molded ABS (Prototype)', 15.00, 'Local Fab', 'Pending', 'fa-cube'],
            ['Power Supply', '5V 3A USB-C Power Supply', 8.00, 'DigiKey', 'Sourced', 'fa-plug'],
            ['Display', '7-inch Touchscreen LCD', 45.00, 'Waveshare', 'Pending', 'fa-tv']
        ];
        bomData.forEach(item => bomStmt.run(item));
        bomStmt.finalize();
    });
}

module.exports = (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM budget_summary", [], (err, summary) => {
        if (err) return res.status(500).json({error: err.message});
        database.all("SELECT * FROM bom", [], (err, bom) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({ summary, bom });
        });
    });
};
