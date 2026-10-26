/**
 * OMI - OemahPus Monitoring and Information
 * File: js/utils.js
 * Deskripsi: Fungsi bantuan umum (formatting, ID generator, helper DOM)
 */

const Utils = {
    /**
     * Format angka ke format mata uang Rupiah (IDR)
     * Contoh: 50000 -> "Rp 50.000"
     */
    formatRupiah(amount) {
        if (typeof amount !== 'number') {
            amount = Number(amount) || 0;
        }
        return 'Rp ' + amount.toLocaleString('id-ID');
    },

    /**
     * Format tanggal YYYY-MM-DD ke format Indonesia (e.g., 23 Oktober 2026)
     */
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    /**
     * Format tanggal dan jam (e.g., 23 Okt 2026, 14:30 WIB)
     */
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) + ' WIB';
    },

    /**
     * Generator ID sederhana dengan prefix (misal: "CAT-101", "RES-201")
     */
    generateId(prefix = 'ID') {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `${prefix}-${randomNum}`;
    },

    /**
     * Sanitasi string untuk mencegah injeksi HTML sederhana pada tampilan
     */
    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Menampilkan notifikasi popup sementara (toast)
     */
    showToast(message, type = 'info') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <span class="toast-message">${this.escapeHtml(message)}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Hapus otomatis setelah 3.5 detik
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 300);
        }, 3200);
    }
};
