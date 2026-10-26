/**
 * OMI - OemahPus Monitoring and Information
 * File: js/modules/billing.js
 * Deskripsi: Tagihan reservasi dan pencatatan pembayaran manual
 */

const BillingModule = {
    render(containerElement, user) {
        const activeUser = AuthService.getCurrentUser();
        if (!containerElement || !user || !activeUser ||
            activeUser.id !== user.id || activeUser.role !== user.role ||
            !['owner', 'staff_ops', 'customer'].includes(activeUser.role)) {
            Utils.showToast('Anda tidak memiliki izin membuka informasi tagihan.', 'error');
            if (containerElement) containerElement.innerHTML = '';
            return;
        }

        const overview = StorageService.getBillingOverview();
        if (!overview.success) {
            Utils.showToast(overview.message, 'error');
            containerElement.innerHTML = `
                <div class="card p-4 text-center">
                    <h2 class="title-lg mb-2">Data Tagihan Tidak Tersedia</h2>
                    <p class="subtitle">${Utils.escapeHtml(overview.message)}</p>
                </div>
            `;
            return;
        }

        const canCreateBills = activeUser.role === 'staff_ops';
        const canRecordPayments = activeUser.role === 'staff_ops';
        const visibleBills = activeUser.role === 'customer'
            ? overview.bills.filter(bill => bill.paymentStatus === 'Lunas')
            : overview.bills;
        const reservations = canCreateBills ? StorageService.getReservations()
            .filter(reservation => reservation.status !== 'Dibatalkan' && (
                reservation.status === 'Dikonfirmasi' ||
                Boolean(StorageService.getBoardingStayByReservationId(reservation.id))
            ))
            .filter(reservation =>
                !overview.bills.some(bill => bill.reservationId === reservation.id)
            )
            .sort((a, b) => a.checkInDate.localeCompare(b.checkInDate)) : [];

        containerElement.innerHTML = `
            <div class="dashboard-header mb-4">
                <div class="welcome-banner">
                    <div>
                        <h2 class="title-lg">${activeUser.role === 'customer' ? 'Tagihan & Pembayaran Saya' : 'Tagihan & Pembayaran'}</h2>
                        <p class="subtitle">
                            ${activeUser.role === 'customer'
                                ? 'Lihat tagihan dan pembayaran yang tercatat untuk reservasi milik Anda.'
                                : 'Tagihan dihitung dari tarif hotel dan periode reservasi. Pembayaran dicatat setelah diterima di luar aplikasi.'}
                        </p>
                    </div>
                </div>
            </div>

            ${canCreateBills ? this.renderReservationsToBill(reservations) : ''}
            <section class="billing-list">
                ${visibleBills.map((bill, index) =>
                    this.renderBill(
                        bill,
                        canRecordPayments,
                        activeUser.role === 'customer',
                        activeUser.role === 'owner',
                        index
                    )
                ).join('') ||
                    `<div class="card p-4 text-center">
                        <h3 class="card-title">Belum Ada Tagihan</h3>
                        <p class="text-muted">${activeUser.role === 'customer'
                            ? 'Belum ada tagihan lunas untuk ditampilkan.'
                            : 'Belum ada tagihan yang tercatat.'}</p>
                    </div>`}
            </section>
        `;

        containerElement.querySelectorAll('.btn-create-bill').forEach(button => {
            button.addEventListener('click', () => this.createBill(button.dataset.reservationId));
        });
        containerElement.querySelectorAll('.btn-billing-details').forEach(button => {
            button.addEventListener('click', () => {
                const card = button.closest('.billing-summary-box');
                const details = card && card.querySelector('.billing-details');
                if (!details) return;
                details.hidden = !details.hidden;
                button.setAttribute('aria-expanded', String(!details.hidden));
                button.textContent = details.hidden ? 'Rincian' : 'Tutup Rincian';
            });
        });
        containerElement.querySelectorAll('.billing-payment-form').forEach(form => {
            form.addEventListener('submit', event => this.submitPayment(event, form));
        });
    },

    renderReservationsToBill(reservations) {
        return `
            <div class="card mb-4">
                <div class="card-header flex-between">
                    <h3 class="card-title">Reservasi Belum Ditagihkan</h3>
                    <span class="badge badge-info">${reservations.length} Reservasi</span>
                </div>
                <div class="table-responsive">
                    <table class="data-table">
                        <thead><tr><th>Reservasi</th><th>Kucing & Pemilik</th><th>Periode</th><th>Aksi</th></tr></thead>
                        <tbody>
                            ${reservations.map(reservation => `
                                <tr>
                                    <td><strong>${Utils.escapeHtml(reservation.id)}</strong></td>
                                    <td>${Utils.escapeHtml(reservation.catName)}<br><small>${Utils.escapeHtml(reservation.ownerName)}</small></td>
                                    <td>${Utils.formatDate(reservation.checkInDate)} s/d ${Utils.formatDate(reservation.checkOutDate)}</td>
                                    <td><button type="button" class="btn btn-primary btn-sm btn-create-bill" data-reservation-id="${Utils.escapeHtml(reservation.id)}">Hitung & Buat Tagihan</button></td>
                                </tr>
                            `).join('') || '<tr><td colspan="4" class="text-center text-muted p-4">Tidak ada reservasi terkonfirmasi yang belum ditagihkan.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    renderBill(bill, canRecordPayments, isCustomer, isOwner, index) {
        const statusClass = bill.paymentStatus === 'Lunas'
            ? 'badge-success'
            : bill.paymentStatus === 'Sebagian Dibayar'
                ? 'badge-warning'
                : 'badge-light';
        const requestId = `PAYREQ-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        return `
            <article class="card billing-summary-box mb-4" data-bill-id="${Utils.escapeHtml(bill.id)}">
                <div class="card-header flex-between">
                    <div>
                        <h3 class="card-title">Tagihan ${Utils.escapeHtml(bill.id)}</h3>
                        <p class="text-muted">${Utils.escapeHtml(bill.catName)} — ${Utils.escapeHtml(bill.customerName)} · Reservasi ${Utils.escapeHtml(bill.reservationId)}</p>
                    </div>
                    <div class="billing-card-summary">
                        <span class="badge ${statusClass}">${Utils.escapeHtml(bill.paymentStatus)}</span>
                        <p class="billing-paid-total">${isCustomer ? 'Total pembayaran lunas' : 'Total Tagihan'}:
                            <strong>${Utils.formatRupiah(isCustomer ? bill.totalPaid : bill.totalAmount)}</strong>
                        </p>
                    </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm btn-billing-details"
                    aria-expanded="false" aria-controls="billing-details-${index}">Rincian</button>
                <div class="card-body billing-details" id="billing-details-${index}" hidden>
                    <div class="billing-row"><span>Periode (${bill.numberOfNights} malam, check-out eksklusif)</span><strong>${Utils.formatDate(bill.periodStart)} – ${Utils.formatDate(bill.periodEndExclusive)}</strong></div>
                    <div class="billing-row"><span>Tarif snapshot (${Utils.formatRupiah(bill.unitRate)} × ${bill.numberOfNights})</span><strong>${Utils.formatRupiah(bill.totalAmount)}</strong></div>
                    <div class="billing-row"><span>Total tagihan</span><strong>${Utils.formatRupiah(bill.totalAmount)}</strong></div>
                    <div class="billing-row"><span>Total dibayar</span><strong>${Utils.formatRupiah(bill.totalPaid)}</strong></div>
                    <div class="billing-row"><span>Sisa tagihan</span><strong>${Utils.formatRupiah(bill.remainingAmount)}</strong></div>

                    <h4 class="mt-3 mb-2">Transaksi pembayaran tercatat</h4>
                    ${bill.transactions.map(transaction => `
                        <div class="billing-row">
                            <span>
                                ${Utils.formatDateTime(transaction.recordedAt)} · ${transaction.method === 'cash' ? 'Tunai' : 'Transfer'}
                                <small class="text-muted">Dicatat: ${Utils.escapeHtml(transaction.recordedBy.name)}</small>
                                ${transaction.reference ? `<small class="text-muted">Referensi: ${Utils.escapeHtml(transaction.reference)}</small>` : ''}
                            </span>
                            <strong>${Utils.formatRupiah(transaction.amount)}</strong>
                        </div>
                    `).join('') || '<p class="text-muted">Belum ada pembayaran yang dicatat.</p>'}

                    ${canRecordPayments && bill.remainingAmount > 0 ? `
                        <form class="billing-payment-form mt-3" data-bill-id="${Utils.escapeHtml(bill.id)}">
                            <input type="hidden" name="idempotencyKey" value="${Utils.escapeHtml(requestId)}">
                            <h4 class="mb-2">Catat pembayaran yang sudah diterima</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Nominal (Rupiah) <span class="required">*</span></label>
                                    <input class="form-control" type="number" name="amount" min="1" max="${bill.remainingAmount}" step="1" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">Metode <span class="required">*</span></label>
                                    <select class="form-control" name="method" required>
                                        <option value="">Pilih metode</option>
                                        <option value="cash">Tunai</option>
                                        <option value="transfer">Transfer (dicatat manual)</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Catatan / referensi transfer (opsional)</label>
                                <input class="form-control" type="text" name="reference" maxlength="120">
                            </div>
                            <p class="form-helper">Catat hanya dana yang telah diterima dan diverifikasi secara manual. Aplikasi tidak menghubungi bank atau payment gateway.</p>
                            <button type="submit" class="btn btn-primary">Simpan Pembayaran</button>
                        </form>
                    ` : ''}
                </div>
            </article>
        `;
    },

    createBill(reservationId) {
        const result = StorageService.createBillingBill(reservationId);
        if (!result.success) {
            Utils.showToast(result.message, 'error');
            return;
        }
        Utils.showToast(`Tagihan ${result.bill.id} berhasil dibuat.`, 'success');
        this.render(
            document.getElementById('main-content-container'),
            AuthService.getCurrentUser()
        );
    },

    submitPayment(event, form) {
        event.preventDefault();
        if (form.dataset.submitting === 'true') return;
        if (!form.reportValidity()) return;
        form.dataset.submitting = 'true';
        const submitButton = form.querySelector('[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        const result = StorageService.recordManualPayment({
            billId: form.dataset.billId,
            amount: form.elements.amount.value,
            method: form.elements.method.value,
            reference: form.elements.reference.value,
            idempotencyKey: form.elements.idempotencyKey.value
        });
        if (!result.success) {
            form.dataset.submitting = 'false';
            if (submitButton) submitButton.disabled = false;
            Utils.showToast(result.message, 'error');
            return;
        }
        Utils.showToast('Pembayaran manual berhasil dicatat.', 'success');
        this.render(
            document.getElementById('main-content-container'),
            AuthService.getCurrentUser()
        );
    }
};
