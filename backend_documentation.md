# Backend Documentation

This document explains the different sections we have created in the backend files (`database.js` and `server.js`) and describes what each section does and how it works.

---

## `database.js`

This file is responsible for setting up the local SQLite database.

### SECTION 1: Imports and Configuration
**What it does:** It pulls in the required libraries (`sqlite3` and `path`) and defines where the database file will be stored on your computer.
**How it does it:** We use Node's `require` to load the libraries. We then use `path.resolve` to create an absolute path to a file named `database.sqlite` in the same directory. This ensures the database is always created in the right place regardless of where you run the server from.

### SECTION 2: Database Connection and Schema Initialization
**What it does:** It connects to the SQLite database and sets up the `transactions` table if it doesn't already exist.
**How it does it:** We create a `new sqlite3.Database` instance. Inside its callback (which runs once connected), we execute a SQL `CREATE TABLE IF NOT EXISTS` command to ensure the `transactions` table has the required columns (id, date, description, amount, type, category). We also have a fallback `ALTER TABLE` command just in case we are upgrading an older version of the database.

### SECTION 3: Module Export
**What it does:** It makes the configured database connection available to other files.
**How it does it:** Using `module.exports = db`, we allow `server.js` to import this pre-configured database connection and use it to query data.

---

## `server.js`

This is the main Express application that handles API requests, file uploads, and data logic.

### SECTION 1: Imports and App Initialization
**What it does:** It imports all the necessary packages and configures the Express server.
**How it does it:** We import `express` (for the server), `cors` (to allow frontend requests), `multer` (for file uploads), and parsing libraries (`csv-parser`, `xlsx`). We initialize `app = express()` and use middleware like `app.use(express.static(...))` to serve the frontend files located in the `public` folder.

### SECTION 2: Helper Functions (Categorization)
**What it does:** It automatically assigns a category (like "Food 🍔" or "Housing 🏠") to a transaction based on its description.
**How it does it:** The `categorizeTransaction` function takes the description and converts it to lowercase. It then uses Regular Expressions (e.g., `/(starbucks|restaurant|grocery)/.test(desc)`) to see if any of those keywords exist in the description. If they do, it returns the corresponding category string.

### SECTION 3: File Upload & Data Parsing Endpoint
**What it does:** It handles the `/api/upload` endpoint, where the CSV or Excel file is received, parsed, and saved to the database.
**How it does it:** 
- It uses `multer` to temporarily save the uploaded file into an `uploads/` folder.
- It checks if the file is an Excel file (`.xlsx`) or a CSV file.
- It loops through the file row by row, sanitizes the amount (removing dollar signs/rupee symbols), and determines the transaction type (Income/Expense).
- Finally, it clears the old `transactions` from the database and runs `INSERT INTO` SQL statements to save the newly parsed rows.

### SECTION 4: Data Retrieval Endpoints
**What it does:** It provides endpoints that the frontend dashboard calls to get the data for its charts and tables.
**How it does it:** 
- `/api/transactions`: Runs a `SELECT * FROM transactions ORDER BY date DESC` SQL query to get all transactions and sends them back to the frontend as a JSON array.
- `/api/summary`: Runs a `SELECT type, SUM(amount)` SQL query grouped by type to calculate the total Income and Expenses directly in the database. It then calculates the remaining balance and sends these three numbers to the frontend.

### SECTION 5: Server Initialization
**What it does:** It starts the server and makes it listen for incoming requests.
**How it does it:** We call `app.listen(port, ...)` which binds the Express app to port `3000` (or a port defined in the environment). It then logs a message to the console letting us know the server is successfully running.
