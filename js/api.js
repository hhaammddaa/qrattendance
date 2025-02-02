// api.js
class APIService {
    constructor(baseURL = 'http://localhost:5000/api') {
        this.baseURL = baseURL;
    }

    async makeRequest(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async markAttendance(userId) {
        return this.makeRequest('/mark_attendance', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId }),
        });
    }

    async generateQRCode(userId) {
        return this.makeRequest('/generate_qr', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId }),
        });
    }

    async getAttendanceRecords() {
        return this.makeRequest('/get_attendance', {
            method: 'GET',
        });
    }
}

// Integrate with QRScanner class
class QRScanner {
    constructor(config) {
        // ... existing constructor code ...
        this.apiService = new APIService();
    }

    async handleSuccessfulScan(data) {
        try {
            // Mark attendance in the backend
            await this.apiService.markAttendance(data);
            
            // Update UI
            document.getElementById('attendance-status').innerText = 'Attendance marked successfully!';
            document.getElementById('last-scan-data').innerText = data;
            document.getElementById('last-scan-time').innerText = new Date().toLocaleString();
            document.getElementById('last-scan').classList.remove('hidden');

            // Play success sound if enabled
            if (document.getElementById('sound-enabled').checked) {
                document.getElementById('success-sound').play();
            }

            // Show success toast
            showToast('Attendance marked successfully!', 'success');

            // If auto-save is enabled, update records display
            if (document.getElementById('auto-save').checked) {
                await this.updateRecordsDisplay();
            }
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            document.getElementById('error-sound').play();
        }
    }

    async updateRecordsDisplay() {
        try {
            const records = await this.apiService.getAttendanceRecords();
            const recordsList = document.getElementById('records-list');
            
            recordsList.innerHTML = records.map(record => `
                <div class="record-item">
                    <div class="record-info">
                        <span class="user-id">${record.user_id}</span>
                        <span class="timestamp">${new Date(record.timestamp).toLocaleString()}</span>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error updating records:', error);
        }
    }
}

// Records handling
async function initializeRecords() {
    const api = new APIService();
    const dateFilter = document.getElementById('date-filter');
    const exportBtn = document.getElementById('export-csv');

    // Load initial records
    try {
        const records = await api.getAttendanceRecords();
        updateRecordsDisplay(records);
    } catch (error) {
        showToast(`Error loading records: ${error.message}`, 'error');
    }

    // Export to CSV
    exportBtn.addEventListener('click', async () => {
        try {
            const records = await api.getAttendanceRecords();
            exportToCSV(records);
        } catch (error) {
            showToast(`Error exporting records: ${error.message}`, 'error');
        }
    });
}

// Utility function to export records to CSV
function exportToCSV(records) {
    const headers = ['User ID', 'Timestamp'];
    const csvContent = [
        headers.join(','),
        ...records.map(record => [
            record.user_id,
            new Date(record.timestamp).toLocaleString()
        ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'attendance_records.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}