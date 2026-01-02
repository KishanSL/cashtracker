import { addTransaction, getAllTransactions, clearAllTransactions, Transaction } from './db';
import { exportData } from './csv_export';
// import '../style.css'; // Removed, using link tag

// NUCLEAR OPTION: Unregister all Service Workers and Clear Caches to fix UI
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            registration.unregister();
        }
    });
    caches.keys().then(names => {
        for (let name of names) caches.delete(name);
    });
}

// DOM Elements
const form = document.getElementById('transaction-form') as HTMLFormElement;
const dateInput = document.getElementById('date') as HTMLInputElement;
const listContainer = document.getElementById('transaction-list') as HTMLDivElement;
const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
const deleteBtn = document.getElementById('delete-btn') as HTMLButtonElement;

// Set default date to today (Local Time)
if (dateInput) {
    const today = new Date();
    const localISO = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    dateInput.value = localISO;
}

// Load Transactions
const renderTransactions = async (): Promise<void> => {
    try {
        const transactions = await getAllTransactions();
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (transactions.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No transactions yet.</div>';
            return;
        }

        transactions.forEach(t => {
            const item = document.createElement('div');
            item.className = 'transaction-item';

            // Format Amount as INR
            const formattedAmount = new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR'
            }).format(t.amount);

            item.innerHTML = `
                <div class="t-info">
                    <span class="t-category">${t.category}</span>
                    <span class="t-meta">${formatDate(t.date)} • ${t.account} ${t.to ? '• To: ' + t.to : ''}</span>
                    ${t.note ? `<span class="t-meta" style="font-style: italic;">"${t.note}"</span>` : ''}
                </div>
                <div class="t-amount">${formattedAmount}</div>
            `;
            listContainer.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load transactions', error);
        if (listContainer) {
            listContainer.innerHTML = '<div class="empty-state" style="color: red;">Error loading data.</div>';
        }
    }
};

// Helper: Format Date
const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    // Check for invalid date
    if (isNaN(date.getTime())) return dateString;

    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
};

// Handle Form Submit
if (form) {
    form.addEventListener('submit', async (e: Event) => {
        e.preventDefault();

        const dateEl = document.getElementById('date') as HTMLInputElement;
        const accountEl = document.getElementById('account') as HTMLSelectElement;
        const amountEl = document.getElementById('amount') as HTMLInputElement;
        const toEl = document.getElementById('to') as HTMLInputElement;
        const categoryEl = document.getElementById('category') as HTMLSelectElement;
        const noteEl = document.getElementById('note') as HTMLTextAreaElement;

        const formData: Transaction = {
            date: dateEl.value,
            account: accountEl.value,
            amount: parseFloat(amountEl.value),
            to: toEl.value,
            category: categoryEl.value,
            note: noteEl.value
        };

        try {
            await addTransaction(formData);
            form.reset();
            // Reset date string properly to local time
            const today = new Date();
            const localISO = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            dateEl.value = localISO;

            renderTransactions(); // Refresh list
        } catch (error) {
            console.error('Error adding transaction', error);
            alert('Failed to save transaction');
        }
    });
}

// Handle Export
if (exportBtn) {
    exportBtn.addEventListener('click', () => {
        exportData();
    });
}

// Handle Delete All
if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
        const confirmed = confirm('Are you sure you want to delete ALL transactions? This action cannot be undone.');
        if (confirmed) {
            try {
                await clearAllTransactions();
                renderTransactions();
                alert('All transactions deleted.');
            } catch (error) {
                console.error('Error clearing data', error);
                alert('Failed to delete data');
            }
        }
    });
}

// Initial Load
renderTransactions();

// Load SW
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(
            () => {
                console.log('ServiceWorker registration successful');
            },
            (err) => {
                console.log('ServiceWorker registration failed: ', err);
            }
        );
    });
}
