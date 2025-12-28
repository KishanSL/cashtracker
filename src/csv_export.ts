import { getAllTransactions, Transaction } from './db.js';

const convertToCSV = (arr: Transaction[]): string => {
    if (arr.length === 0) return '';
    const header = Object.keys(arr[0]).join(',');
    const rows = arr.map(it => {
        return Object.values(it).map(value => {
            // Escape quotes
            const stringValue = value === null || value === undefined ? '' : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
        }).join(',');
    }).join('\n');
    return `${header}\n${rows}`;
};

export const exportData = async (): Promise<void> => {
    try {
        const transactions = await getAllTransactions();

        if (transactions.length === 0) {
            alert('No data to export!');
            return;
        }

        const csvContent = convertToCSV(transactions);
        const fileName = `cash_tracker_${new Date().toISOString().split('T')[0]}.csv`;
        const file = new File([csvContent], fileName, { type: 'text/csv' });

        // Check for Secure Context (Required for Web Share API)
        if (!window.isSecureContext) {
            alert('Web Share API requires a Secure Context (HTTPS). You appear to be using HTTP. Downloading file instead.');
            // Fallback to download
            const link = document.createElement('a');
            link.href = URL.createObjectURL(file);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            return;
        }

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                title: 'Cash Tracker Export',
                text: 'Here is my transaction data.',
                files: [file]
            });
        } else {
            // Fallback for Desktop / Browsers without File Share support
            alert(`Web Share API not supported or file type rejected. 
            canShare: ${!!navigator.canShare}
            Secure: ${window.isSecureContext}
            Downloading instead.`);

            const link = document.createElement('a');
            link.href = URL.createObjectURL(file);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    } catch (error) {
        console.error('Export failed', error);
        alert('Export failed: ' + (error instanceof Error ? error.message : String(error)));
    }
};
