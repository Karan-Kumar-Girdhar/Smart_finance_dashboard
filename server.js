// --- SECTION 1: Imports and App Initialization ---
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- SECTION 2: Helper Functions (Categorization) ---
const categorizeTransaction = (description, type) => {
    if (type === 'Income') return 'Income 💰';
    const desc = description.toLowerCase();
    if (/(rent|mortgage|home|estate|housing)/.test(desc)) return 'Housing 🏠';
    if (/(electric|water|internet|phone|utility|gas bill)/.test(desc)) return 'Utilities ⚡';
    if (/(subscription|netflix|spotify|prime|membership)/.test(desc)) return 'Subscriptions 📅';
    if (/(starbucks|restaurant|dinner|grocery|supermarket|food|pizza|burger|cafe|lunch)/.test(desc)) return 'Food 🍔';
    if (/(uber|gas station|transit|flight|taxi|lyft|train|bus)/.test(desc)) return 'Travel 🚕';
    if (/(amazon|target|walmart|clothes|shopping|mall)/.test(desc)) return 'Shopping 🛒';
    if (/(movie|game|steam|entertainment|cinema|ticket)/.test(desc)) return 'Entertainment 🎮';
    if (/(gym|pharmacy|doctor|health|fitness|medical)/.test(desc)) return 'Health 💊';
    if (/(service|repair|insurance|fee|bank)/.test(desc)) return 'Services 🛠️';
    if (/(hair|salon|spa|cosmetics|care)/.test(desc)) return 'Personal 💅';
    if (/(bill)/.test(desc)) return 'Bills 💡';
    return 'Other 📦';
};

// --- SECTION 3: File Upload & Data Parsing Endpoint ---
// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// API endpoint to upload CSV
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const isExcel = req.file.originalname.toLowerCase().endsWith('.xlsx') || req.file.originalname.toLowerCase().endsWith('.xls');

  const insertData = (results) => {
    // Clear old transactions before inserting new ones
    db.run("DELETE FROM transactions", (err) => {
        if (err) console.error("Error clearing old transactions", err);
        
        const stmt = db.prepare("INSERT INTO transactions (date, description, amount, type, category) VALUES (?, ?, ?, ?, ?)");
        results.forEach((row) => {
          stmt.run(row.date, row.description, row.amount, row.type, row.category);
        });
        stmt.finalize();
        
        fs.unlinkSync(req.file.path);
        res.json({ message: 'File uploaded and parsed successfully', count: results.length });
    });
  };

  const processRow = (data, resultsArray) => {
      const date = data.Date || data.date;
      const description = data.Description || data.description;
      let amountStr = data.Amount || data.amount;
      
      if (date && description && amountStr !== undefined) {
        if (typeof amountStr === 'string') {
            amountStr = amountStr.replace(/[^0-9.-]+/g, "");
        }
        const amount = parseFloat(amountStr);
        if (!isNaN(amount)) {
            const type = amount >= 0 ? 'Income' : 'Expense';
            const category = categorizeTransaction(description, type);
            resultsArray.push({ date, description, amount, type, category });
        }
      }
  };

  if (isExcel) {
    try {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(sheet);
      
      const results = [];
      data.forEach(row => processRow(row, results));
      insertData(results);
    } catch (error) {
      res.status(500).json({ error: 'Error parsing Excel file' });
    }
  } else {
      const results = [];
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => processRow(data, results))
        .on('end', () => insertData(results))
        .on('error', (error) => {
           res.status(500).json({ error: 'Error parsing CSV' });
        });
  }
});

// --- SECTION 4: Data Retrieval Endpoints ---
// API endpoint to fetch transactions
app.get('/api/transactions', (req, res) => {
  db.all("SELECT * FROM transactions ORDER BY date DESC", [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    
    // Dynamically categorize any older transactions that were stored without a category
    const updatedRows = rows.map(r => {
        if (!r.category || r.category === 'Other 📦') {
            r.category = categorizeTransaction(r.description, r.type);
        }
        return r;
    });

    res.json({ data: updatedRows });
  });
});

// API endpoint to get summary
app.get('/api/summary', (req, res) => {
  db.all("SELECT type, SUM(amount) as total FROM transactions GROUP BY type", [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    let income = 0;
    let expense = 0;
    rows.forEach(row => {
      if (row.type === 'Income') income += row.total;
      if (row.type === 'Expense') expense += Math.abs(row.total);
    });
    res.json({
      income,
      expense,
      balance: income - expense
    });
  });
});

// --- SECTION 5: Server Initialization ---
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
