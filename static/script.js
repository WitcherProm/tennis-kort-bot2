class TennisBookingApp {
    constructor() {
        this.currentCourt = 'rubber';
        this.currentUser = null;
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            this.showLoading();
            await this.initTelegramUser();
            this.setupEventListeners();
            await this.loadSlots();
            this.hideLoading();
            this.isInitialized = true;
            console.log('✅ App initialized successfully');
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.showError('Ошибка загрузки. Пожалуйста, обновите страницу.');
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.showTab(e.target.dataset.tab));
        });

        // Выбор корта
        document.querySelectorAll('.court-button').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectCourt(e.target.dataset.court));
        });

        // Выбор даты
        document.getElementById('date-picker').addEventListener('change', () => this.loadSlots());
    }

    async initTelegramUser() {
        // Сохраненная логика инициализации пользователя
        // ... (ваш существующий код)
    }

    showTab(tabName) {
        if (!this.isInitialized) return;

        // Обновляем активные табы
        document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        if (tabName === 'my-bookings') {
            this.loadMyBookings();
        }
    }

    selectCourt(court) {
        this.currentCourt = court;
        document.querySelectorAll('.court-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-court="${court}"]`).classList.add('active');
        this.loadSlots();
    }

    async loadSlots() {
        const date = document.getElementById('date-picker').value;
        if (!date) return;

        try {
            const response = await fetch(`/api/slots?date=${date}`);
            if (!response.ok) throw new Error('Network error');
            
            const slots = await response.json();
            this.renderSlots(slots);
        } catch (error) {
            console.error('Error loading slots:', error);
            this.showError('Ошибка загрузки расписания');
        }
    }

    renderSlots(slots) {
        const container = document.getElementById('slots-container');
        container.innerHTML = '<h3>Доступные слоты:</h3>';
        
        const grid = document.createElement('div');
        grid.className = 'slots-grid';

        const courtSlots = slots
            .filter(slot => slot.court_type === this.currentCourt)
            .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

        courtSlots.forEach(slot => {
            const slotElement = this.createSlotElement(slot);
            grid.appendChild(slotElement);
        });

        container.appendChild(grid);
    }

    createSlotElement(slot) {
        const slotElement = document.createElement('div');
        slotElement.className = `slot ${slot.is_available ? 'available' : 'booked'}`;
        
        const [start, end] = slot.time_slot.split('-');
        slotElement.innerHTML = `
            ${start}<br>${end}
            <br><small>${slot.is_available ? 'Свободно' : 'Занято: ' + slot.booked_by}</small>
        `;

        if (slot.is_available) {
            slotElement.addEventListener('click', () => this.bookSlot(slot));
        }

        return slotElement;
    }

    async bookSlot(slot) {
        if (!this.currentUser) {
            this.showError('Пожалуйста, войдите в систему');
            return;
        }

        if (!confirm(`Записаться на ${slot.time_slot}?`)) return;

        try {
            const response = await fetch('/api/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: this.currentUser.id,
                    first_name: this.currentUser.first_name,
                    court_type: slot.court_type,
                    date: slot.date,
                    time_slot: slot.time_slot
                })
            });

            const result = await response.json();
            if (result.success) {
                this.showSuccess('Успешно записаны!');
                this.loadSlots();
            } else {
                this.showError('Ошибка: ' + result.detail);
            }
        } catch (error) {
            console.error('Error booking slot:', error);
            this.showError('Ошибка при записи');
        }
    }

    // Вспомогательные методы
    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
        document.getElementById('content').classList.add('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('content').classList.remove('hidden');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('error-message');
        messageDiv.textContent = message;
        messageDiv.className = type;
        messageDiv.classList.remove('hidden');
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    }

    resetUser() {
        localStorage.removeItem('telegramUser');
        this.currentUser = null;
        document.getElementById('user-info').classList.add('hidden');
        setTimeout(() => location.reload(), 100);
    }

    // ... остальные методы (loadMyBookings, cancelBooking и т.д.)
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TennisBookingApp();
});