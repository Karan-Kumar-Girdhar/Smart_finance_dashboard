# Frontend Documentation

This document explains the different sections we have created in the frontend files (`public/script.js` and `public/style.css`) and describes what each section does and how it works.

---

## `public/script.js`

This file handles all the interactivity, data fetching, and chart rendering on the client side.

### SECTION 1: Initialization & Global Variables
**What it does:** It waits for the webpage to fully load, then grabs references to important HTML elements (like the file upload box, the dashboard container, and the modal).
**How it does it:** It uses `document.addEventListener('DOMContentLoaded', ...)` to ensure the HTML is ready before running any JavaScript. It then uses `document.getElementById()` to store references to HTML elements in variables for quick access later.

### SECTION 2: Drag & Drop and File Upload
**What it does:** It allows users to drag a CSV/Excel file onto the page or click to upload it, and sends it to the backend server.
**How it does it:** We attach event listeners for `dragover`, `dragleave`, and `drop`. When a file is dropped, it creates a `FormData` object, appends the file, and uses the `fetch` API (`/api/upload`) to send it. Upon success, it redirects the user to the `dashboard.html` page.

### SECTION 3: Dashboard Data Loading & Formatting
**What it does:** It fetches the parsed transactions and summary data from the server and updates the top metrics (Income, Expense, Balance).
**How it does it:** It calls `fetch('/api/summary')` and `fetch('/api/transactions')` concurrently using `Promise.all`. Once the JSON data is returned, it calls update functions and passes the data to them. It also formats the numbers as Indian Rupees (INR) using `Intl.NumberFormat`.

### SECTION 4: Advanced Features (Savings Score, Alerts, Health Score)
**What it does:** It calculates insights like your Savings Rate, Top Category Spending, Frequent Merchants, and an overall Financial Health Score.
**How it does it:** 
- **Savings Score:** It divides the saved amount by the total income.
- **Top Alerts:** It loops through the `transactions` array to find the single largest expense transaction and the most frequently occurring merchant name.
- **Health Score:** It starts with a base score of 50 and adds/subtracts points based on your savings rate and whether you have exceeded any budgets you set.

### SECTION 5: Chart Rendering & Data Grouping
**What it does:** It prepares the raw data for charting and uses Chart.js to draw the visual graphs.
**How it does it:** First, helper functions like `groupTransactionsByMonth` group the transactions. Then, functions like `renderTrendChart` create new `Chart` instances, passing in the labels, colors, and data points to draw beautiful, responsive canvas charts.

### SECTION 6: Interactive Features (Drill-down Modal & Budget Tracker)
**What it does:** It handles the logic for clicking on a pie chart slice to see specific transactions, and allows users to set and track budgets for different categories.
**How it does it:** 
- **Drill-down:** Chart.js has an `onClick` event that passes the clicked category name to `showDrillDown()`, which filters the global transactions list and displays them in a popup window (modal).
- **Budget Tracker:** Uses the browser's local storage (`localStorage.setItem`) to save the budget amounts so they persist even if you refresh the page.

### SECTION 7: Table Rendering
**What it does:** It dynamically builds the recent transactions table at the bottom of the dashboard.
**How it does it:** It loops through the transactions array, creates `<tr>` (table row) and `<td>` (table data) elements, inserts the dates, descriptions, and amounts, and appends them to the table body in the DOM.

---

## `public/style.css`

This file handles the visual presentation, creating the modern, "glassmorphism" aesthetic.

### SECTION 1: CSS Variables & Global Resets
**What it does:** Defines reusable colors, fonts, and resets default browser margins.
**How it does it:** It uses the `:root` pseudo-class to declare custom variables like `--primary`, `--bg-dark`, and `--glass-bg`.

### SECTION 2: Background Animations & Layout Containers
**What it does:** Creates the floating, blurry, colorful shapes in the background.
**How it does it:** Uses fixed positioning and `filter: blur()`. It uses `@keyframes float` to animate the `transform` property, making the shapes slowly bob around the screen indefinitely.

### SECTION 3: Grid Systems & Dashboard Layouts
**What it does:** Arranges the widgets and charts into a neat, responsive grid.
**How it does it:** It uses CSS `display: grid` and `grid-template-columns` to create a 3-column layout for metrics and a 2-column layout for charts. It uses media queries (`@media (max-width: 900px)`) to stack them into 1 column on smaller screens like phones.

### SECTION 4: Summary Cards & Metric Styles
**What it does:** Styles the individual cards (Income, Expense, Balance) to look like glass panes.
**How it does it:** It applies `backdrop-filter: blur(12px)` and semi-transparent backgrounds alongside soft box shadows to give the elements a glass-like depth and premium feel.

### SECTION 5: Interactive Elements (Buttons, Inputs, Modals)
**What it does:** Styles the clickable elements and the pop-up modal so they look modern and respond to user actions.
**How it does it:** Adds `:hover` pseudo-classes to shift elements up slightly (`transform: translateY(-2px)`) and increase their shadow, providing tactile feedback when the user mouses over them.

### SECTION 6: Tables & Typography
**(Combined into the above sections due to file size, but manages the table borders and text alignment.)**
