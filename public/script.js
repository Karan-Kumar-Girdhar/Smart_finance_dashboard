// --- SECTION 1: Initialization & Global Variables ---
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const dashboard = document.getElementById('dashboard');
    const modal = document.getElementById('drilldown-modal');
    const closeModal = document.getElementById('close-modal');
    let trendChartInstance = null;
    let categoryChartInstance = null;
    let globalTransactions = []; // Store transactions for drill-down

    // Load initial data if any
    if (dashboard) {
        loadDashboardData();
    }

    // --- SECTION 2: Drag & Drop and File Upload ---
    // Drag and drop handlers
    if (dropZone && fileInput) {
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length) handleFileUpload(e.target.files[0]);
        });
    }

    async function handleFileUpload(file) {
        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
            showStatus('Please upload a valid CSV or Excel file.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            showStatus('Uploading and analyzing...', '');
            const response = await fetch('/api/upload', { method: 'POST', body: formData });
            const result = await response.json();

            if (response.ok) {
                showStatus(`Successfully parsed ${result.count} transactions! Redirecting...`, 'success');
                setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
            } else {
                showStatus(`Error: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showStatus('Failed to upload file.', 'error');
        }
    }

    function showStatus(message, type) {
        if (!uploadStatus) return;
        uploadStatus.textContent = message;
        uploadStatus.className = `status-message ${type}`;
        if (type === 'success' && !message.includes('Redirecting')) {
            setTimeout(() => { uploadStatus.textContent = ''; }, 3000);
        }
    }

    // --- SECTION 3: Dashboard Data Loading & Formatting ---
    async function loadDashboardData() {
        try {
            const [summaryRes, transactionsRes] = await Promise.all([
                fetch('/api/summary'),
                fetch('/api/transactions')
            ]);

            const summary = await summaryRes.json();
            const transactions = await transactionsRes.json();

            if (transactions.data && transactions.data.length > 0) {
                globalTransactions = transactions.data;
                dashboard.classList.remove('hidden');
                
                updateSummary(summary);
                updateTable(transactions.data);
                
                // Advanced Features calculations
                calculateSavingsScore(summary);
                calculateTopAlerts(transactions.data);
                
                // Financial Health
                calculateFinancialHealth(summary, transactions.data);
                
                // Group data for charts
                const monthlyData = groupTransactionsByMonth(transactions.data);
                const categoryData = groupExpensesByCategory(transactions.data);
                
                renderTrendChart(monthlyData);
                renderCategoryChart(categoryData);

                // Setup Budget Tracker
                setupBudgetTracker(categoryData);
                
            } else {
                dashboard.innerHTML = '<div style="text-align: center; padding: 3rem;"><h3>No transactions found.</h3><br><a href="/" class="btn primary-btn" style="text-decoration:none;">Go back to Upload</a></div>';
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }

    function formatCurrency(amount) {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    }

    function updateSummary(summary) {
        if(document.getElementById('total-income')) document.getElementById('total-income').textContent = formatCurrency(summary.income || 0);
        if(document.getElementById('total-expense')) document.getElementById('total-expense').textContent = formatCurrency(summary.expense || 0);
        if(document.getElementById('net-balance')) document.getElementById('net-balance').textContent = formatCurrency(summary.balance || 0);
    }

    // --- SECTION 4: Advanced Features (Savings Score, Alerts, Health Score) ---
    function calculateSavingsScore(summary) {
        const income = summary.income || 0;
        const saved = summary.balance || 0;
        let rate = 0;
        
        if (income > 0 && saved > 0) {
            rate = Math.round((saved / income) * 100);
        }

        document.getElementById('score-income').textContent = formatCurrency(income);
        document.getElementById('score-saved').textContent = formatCurrency(saved);
        
        const rateEl = document.getElementById('score-rate');
        rateEl.textContent = `${rate}%`;
        if (rate >= 20) rateEl.style.color = 'var(--success)';
        else if (rate > 0) rateEl.style.color = 'var(--warning)';
        else rateEl.style.color = 'var(--danger)';
    }

    function calculateTopAlerts(txs) {
        const expenses = txs.filter(t => t.type === 'Expense');
        if (expenses.length === 0) return;

        // 1. Largest Transaction
        let largest = expenses[0];
        expenses.forEach(t => { if (Math.abs(t.amount) > Math.abs(largest.amount)) largest = t; });
        document.getElementById('alert-largest').textContent = `${largest.description} (${formatCurrency(Math.abs(largest.amount))})`;

        // 2. Highest Category
        const cats = groupExpensesByCategory(txs);
        let topCat = null;
        let maxAmt = 0;
        for (const [cat, amt] of Object.entries(cats)) {
            if (amt > maxAmt) { maxAmt = amt; topCat = cat; }
        }
        if (topCat) document.getElementById('alert-category').textContent = `${topCat} (${formatCurrency(maxAmt)})`;

        // 3. Frequent Merchant
        const merchants = {};
        expenses.forEach(t => { merchants[t.description] = (merchants[t.description] || 0) + 1; });
        let topMerchant = null;
        let maxCount = 0;
        for (const [merch, count] of Object.entries(merchants)) {
            if (count > maxCount) { maxCount = count; topMerchant = merch; }
        }
        if (topMerchant) document.getElementById('alert-merchant').textContent = `${topMerchant} (${maxCount} times)`;
    }

    function calculateFinancialHealth(summary, txs) {
        const income = summary.income || 0;
        const saved = summary.balance || 0;
        let score = 50; // Base score
        let breakdownHTML = `<div><span>Base Score:</span> <span>50</span></div>`;
        
        // Savings rate factor
        if (income > 0) {
            const rate = (saved / income) * 100;
            let added = 0;
            if (rate > 20) added = 30;
            else if (rate > 10) added = 20;
            else if (rate > 0) added = 10;
            else added = -20; // Negative savings
            
            score += added;
            const sign = added >= 0 ? '+' : '';
            breakdownHTML += `<div><span>Savings Rate:</span> <span class="${added >= 0 ? 'type-income' : 'type-expense'}">${sign}${added}</span></div>`;
        }

        // Budget factor (read from localStorage)
        const categoryData = groupExpensesByCategory(txs);
        const budgets = JSON.parse(localStorage.getItem('userBudgets') || '{}');
        let budgetViolations = 0;
        for (const [cat, limit] of Object.entries(budgets)) {
            const spent = categoryData[cat] || 0;
            if (spent > limit) budgetViolations++;
        }
        
        if (budgetViolations > 0) {
            const penalty = budgetViolations * 10;
            score -= penalty;
            breakdownHTML += `<div><span>Over Budget (${budgetViolations}):</span> <span class="type-expense">-${penalty}</span></div>`;
        }

        // Enforce bounds
        if (score > 100) {
            breakdownHTML += `<div><span>Cap Adj:</span> <span class="type-expense">${100 - score}</span></div>`;
            score = 100;
        } else if (score < 0) {
            breakdownHTML += `<div><span>Floor Adj:</span> <span class="type-income">+${Math.abs(score)}</span></div>`;
            score = 0;
        }

        const valEl = document.getElementById('health-score-value');
        const statEl = document.getElementById('health-score-status');
        const breakdownEl = document.getElementById('health-breakdown');
        if (!valEl) return;

        valEl.textContent = score;
        if (breakdownEl) breakdownEl.innerHTML = breakdownHTML;

        if (score >= 80) {
            valEl.style.color = 'var(--success)';
            statEl.textContent = 'Excellent';
            statEl.style.color = 'var(--success)';
        } else if (score >= 50) {
            valEl.style.color = 'var(--warning)';
            statEl.textContent = 'Fair';
            statEl.style.color = 'var(--warning)';
        } else {
            valEl.style.color = 'var(--danger)';
            statEl.textContent = 'Needs Work';
            statEl.style.color = 'var(--danger)';
        }
    }

    // --- SECTION 5: Chart Rendering & Data Grouping ---
    function groupTransactionsByMonth(txs) {
        const data = {};
        txs.forEach(t => {
            const date = new Date(t.date);
            if (isNaN(date.getTime())) return; // skip invalid dates
            const month = date.toLocaleString('default', { month: 'short', year: 'numeric' });
            
            if (!data[month]) data[month] = { income: 0, expense: 0 };
            
            if (t.type === 'Income') data[month].income += parseFloat(t.amount);
            else data[month].expense += Math.abs(parseFloat(t.amount));
        });
        
        // Sort months chronologically
        const sortedMonths = Object.keys(data).sort((a, b) => new Date(a) - new Date(b));
        return {
            labels: sortedMonths,
            income: sortedMonths.map(m => data[m].income),
            expense: sortedMonths.map(m => data[m].expense)
        };
    }

    function groupExpensesByCategory(txs) {
        const data = {};
        txs.forEach(t => {
            if (t.type === 'Expense') {
                const cat = t.category || 'Other 📦';
                data[cat] = (data[cat] || 0) + Math.abs(parseFloat(t.amount));
            }
        });
        return data;
    }

    function renderTrendChart(monthlyData) {
        const canvas = document.getElementById('trendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (trendChartInstance) trendChartInstance.destroy();
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = "'Outfit', sans-serif";

        trendChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    { label: 'Income', data: monthlyData.income, backgroundColor: 'rgba(16, 185, 129, 0.8)', borderRadius: 4 },
                    { label: 'Expenses', data: monthlyData.expense, backgroundColor: 'rgba(239, 68, 68, 0.8)', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    function renderCategoryChart(catData) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (categoryChartInstance) categoryChartInstance.destroy();
        
        const labels = Object.keys(catData);
        const data = Object.values(catData);
        
        const colors = [
            '#f59e0b', // orange
            '#3b82f6', // blue
            '#ec4899', // pink
            '#8b5cf6', // purple
            '#10b981', // green
            '#ef4444', // red
            '#64748b'  // gray
        ];

        categoryChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } },
                onClick: (evt, elements, chart) => {
                    if (elements[0]) {
                        const index = elements[0].index;
                        const category = chart.data.labels[index];
                        showDrillDown(category);
                    }
                },
                onHover: (event, chartElement) => {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            }
        });
    }

    // --- SECTION 6: Interactive Features (Drill-down Modal & Budget Tracker) ---
    // Drill-down logic
    function showDrillDown(category) {
        if (!modal) return;
        document.getElementById('modal-title').textContent = `${category} Transactions`;
        
        const tbody = document.getElementById('modal-transactions-body');
        tbody.innerHTML = '';
        
        const filteredTxs = globalTransactions.filter(t => (t.category || 'Other 📦') === category && t.type === 'Expense');
        
        filteredTxs.forEach(t => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td class="type-expense"><strong>-${formatCurrency(t.amount)}</strong></td>
            `;
            tbody.appendChild(row);
        });
        
        modal.classList.remove('hidden');
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => modal.classList.add('hidden'));
    }
    
    // Close modal if clicked outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });

    function setupBudgetTracker(categorySpending) {
        const btn = document.getElementById('set-budget-btn');
        if (!btn) return;
        
        btn.addEventListener('click', () => {
            const cat = document.getElementById('budget-category-select').value;
            const amt = document.getElementById('budget-amount-input').value;
            if (cat && amt) {
                const budgets = JSON.parse(localStorage.getItem('userBudgets') || '{}');
                budgets[cat] = parseFloat(amt);
                localStorage.setItem('userBudgets', JSON.stringify(budgets));
                renderBudgets(categorySpending);
                document.getElementById('budget-amount-input').value = '';
            }
        });

        renderBudgets(categorySpending);
    }

    function renderBudgets(categorySpending) {
        const list = document.getElementById('budget-list');
        list.innerHTML = '';
        const budgets = JSON.parse(localStorage.getItem('userBudgets') || '{}');

        if (Object.keys(budgets).length === 0) {
            list.innerHTML = '<p style="color: var(--text-muted);">No budgets set yet. Add one above.</p>';
            return;
        }

        let html = '';
        for (const [cat, limit] of Object.entries(budgets)) {
            const spent = categorySpending[cat] || 0;
            const percentage = Math.min((spent / limit) * 100, 100);
            const isExceeded = spent > limit;
            
            const colorClass = isExceeded ? 'var(--danger)' : (percentage > 80 ? 'var(--warning)' : 'var(--success)');
            const statusText = isExceeded ? `🔴 Exceeded by ${formatCurrency(spent - limit)}` : `🟢 ${formatCurrency(limit - spent)} remaining`;

            html += `
                <div class="budget-item">
                    <div class="budget-item-header">
                        <span>${cat} <button class="remove-budget-btn" data-cat="${cat}" title="Remove budget" style="background:none;border:none;color:var(--danger);cursor:pointer;margin-left:0.5rem;font-size:0.9rem;">✖</button></span>
                        <span>${formatCurrency(spent)} / ${formatCurrency(limit)}</span>
                    </div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${colorClass};"></div>
                    </div>
                    <div class="budget-status" style="color: ${colorClass};">${statusText}</div>
                </div>
            `;
        }
        
        list.innerHTML = html;

        // Add event listeners for remove buttons
        document.querySelectorAll('.remove-budget-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const catToRemove = e.target.getAttribute('data-cat');
                const currentBudgets = JSON.parse(localStorage.getItem('userBudgets') || '{}');
                delete currentBudgets[catToRemove];
                localStorage.setItem('userBudgets', JSON.stringify(currentBudgets));
                
                // Reload dashboard data so the health score recalculates and budgets re-render
                loadDashboardData();
            });
        });
    }

    // --- SECTION 7: Table Rendering ---
    function updateTable(transactions) {
        const tbody = document.getElementById('transactions-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        transactions.forEach(t => {
            const row = document.createElement('tr');
            const typeClass = t.type === 'Income' ? 'type-income' : 'type-expense';
            const amountPrefix = t.type === 'Income' ? '+' : '-';
            const catBadge = t.category ? `<span class="category-badge">${t.category}</span>` : '-';
            
            row.innerHTML = `
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td>${catBadge}</td>
                <td class="${typeClass}"><strong>${amountPrefix}${formatCurrency(t.amount)}</strong></td>
            `;
            tbody.appendChild(row);
        });
    }
});
