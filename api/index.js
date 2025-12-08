const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(express.json());

// In-memory database for serverless (Vercel doesn't persist files)
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
        // 1. Team Table
        database.run(`CREATE TABLE IF NOT EXISTS team (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            role TEXT,
            category TEXT,
            description TEXT,
            icon TEXT,
            skills TEXT
        )`);

        const teamStmt = database.prepare("INSERT INTO team (name, role, category, description, icon, skills) VALUES (?, ?, ?, ?, ?, ?)");
        const teamData = [
            ['Sarah Chen', 'HW Architect', 'hardware', 'Lead engineer for PCB design and sensor integration. Expert in low-power IoT devices.', 'fa-microchip', JSON.stringify([{name:'PCB Design', val:'95%'}, {name:'Sensors', val:'85%'}])],
            ['Marcus Johnson', 'AI Scientist', 'software', 'Specializes in Computer Vision and Edge AI. Developing the food recognition model.', 'fa-brain', JSON.stringify([{name:'YOLOv8', val:'98%'}, {name:'Edge AI', val:'90%'}])],
            ['Elena Rodriguez', 'Project Manager', 'management', 'Ensures timeline adherence and budget management. Scrum Master certified.', 'fa-tasks', JSON.stringify([{name:'Agile', val:'100%'}, {name:'Budget', val:'85%'}])],
            ['David Kim', 'UX/UI Designer', 'design', 'Designing the mobile app interface and physical fridge interaction points.', 'fa-pen-nib', JSON.stringify([{name:'Figma', val:'95%'}, {name:'User Research', val:'80%'}])]
        ];
        teamData.forEach(member => teamStmt.run(member));
        teamStmt.finalize();

        // 2. Risks Table
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

        // 3. Budget & BOM Tables
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

        // 4. Gantt Table
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

        // 5. Communications
        database.run(`CREATE TABLE IF NOT EXISTS comms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            sender TEXT,
            recipient TEXT,
            subject TEXT,
            content TEXT,
            icon TEXT
        )`);

        const commStmt = database.prepare("INSERT INTO comms (type, sender, recipient, subject, content, icon) VALUES (?, ?, ?, ?, ?, ?)");
        const commsData = [
            ['Internal', 'Noah (Project Lead)', 'SmartCool Team', '🚀 Project Kickoff: SmartCool Pro', 
            '<p>Team,</p><p>I am thrilled to officially launch the <strong>SmartCool Pro</strong> project. Our mission is to revolutionize the kitchen with a "Zero Waste" smart fridge powered by embedded AI.</p><p><strong>Key Objectives:</strong></p><ul><li>Integrate Raspberry Pi & YOLOv8 for real-time inventory tracking.</li><li>Develop a user-friendly mobile app for recipe suggestions.</li><li>Validate our "Agile Hardware" approach with 2-week sprints.</li></ul><p>Let\'s make this a reality!</p><p>Best,<br>Noah</p>', 'fa-paper-plane'],
            ['External', 'Noah (Project Manager)', 'Board of Directors', 'Budget Approval Request', 
            '<p>Dear Board Members,</p><p>Following the successful completion of our initial feasibility study, I am submitting the formal budget request for the T-CEN-500 Industrialization Phase.</p><p><strong>Request Summary:</strong></p><ul><li><strong>Total Budget:</strong> $60,000</li><li><strong>CAPEX ($40k):</strong> Allocated for soft-steel tooling and molds to ensure production quality.</li><li><strong>OPEX ($20k):</strong> Dedicated to specialized labor and cloud infrastructure for AI training.</li></ul><p>We are confident this investment will yield a market-ready prototype by Q2.</p><p>Sincerely,<br>Noah</p>', 'fa-file-invoice-dollar']
        ];
        commsData.forEach(c => commStmt.run(c));
        commStmt.finalize();

        // 6. Milestones
        database.run("CREATE TABLE IF NOT EXISTS milestones (name TEXT, date TEXT, owner TEXT, status TEXT)");
        database.run("INSERT INTO milestones VALUES ('PCB Design Review', 'Dec 15, 2025', 'Sarah Chen', 'In Progress'), ('Dataset Collection', 'Dec 20, 2025', 'Marcus Johnson', 'In Progress'), ('Initial Prototype', 'Jan 10, 2026', 'Team', 'Pending')");
    });
}

// API Routes
app.get('/api/team', (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM team", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/risks', (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM risks", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/budget', (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM budget_summary", [], (err, summary) => {
        if (err) return res.status(500).json({error: err.message});
        database.all("SELECT * FROM bom", [], (err, bom) => {
            if (err) return res.status(500).json({error: err.message});
            res.json({ summary, bom });
        });
    });
});

app.get('/api/gantt', (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM gantt ORDER BY phase ASC, start_week ASC", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/comms', (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM comms", [], (err, rows) => {
        if (err) return res.status(500).json({error: err.message});
        res.json(rows);
    });
});

app.get('/api/dashboard', (req, res) => {
    const database = getDb();
    database.all("SELECT * FROM milestones", [], (err, milestones) => {
        if (err) return res.status(500).json({error: err.message});
        
        database.get("SELECT amount FROM budget_summary WHERE category='Total'", [], (err, total) => {
            if (err) return res.status(500).json({error: err.message});
            
            database.all("SELECT title, color FROM risks ORDER BY impact DESC, prob DESC LIMIT 3", [], (err, risks) => {
                if (err) return res.status(500).json({error: err.message});

                res.json({ 
                    milestones, 
                    totalBudget: total ? total.amount : 0,
                    risks,
                    projectStart: '2025-11-10'
                });
            });
        });
    });
});

module.exports = app;
