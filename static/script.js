class TennisBookingApp {
    constructor() {
        this.currentCourt = 'rubber';
        this.currentUser = null;
        this.isInitialized = false;
    }

    async init() {
        console.log('🚀 Starting app initialization...');
        try {
            this.showLoading();
            
            // 1. Инициализируем пользователя (упрощенная версия)
            await this.initUser();
            
            // 2. Настраиваем обработчики событий
            this.setupEventListeners();
            
            // 3. Загружаем слоты
            await this.loadSlots();
            
            // 4. Показываем интерфейс
            this.hideLoading();
            this.isInitialized = true;
            console.log('✅ App initialized successfully');
            
        } catch (error) {
            console.error('❌ App initialization failed:', error);
            this.hideLoading();
            this.showError('Ошибка загрузки. Пожалуйста, обновите страницу.');
        }
    }

    async initUser() {
        console.log('👤 Initializing user...');
        
        // Простая инициализация пользователя
        const savedUser = localStorage.getItem('telegramUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            console.log('📁 User from localStorage:', this.currentUser);
        } else {
            // Создаем гостя
            this.currentUser = { 
                id: Math.floor(Math.random() * 1000000), 
                first_name: 'Гость'
            };
            localStorage.setItem('telegramUser', JSON.stringify(this.currentUser));
            console.log('👤 Created guest user:', this.currentUser);
        }
        
        this.showUserInfo(this.currentUser);
        return true;
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Табы
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.showTab(e.target.dataset.tab);
            });
        });

        // Выбор корта
        document.querySelectorAll('.court-button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectCourt(e.target.dataset.court);
            });
        });

        // Выбор даты
        const datePicker = document.getElementById('date-picker');
        if (datePicker) {
            datePicker.addEventListener('change', () => this.loadSlots());
            // Устанавливаем сегодняшнюю дату
            datePicker.value = new Date().toISOString().split('T')[0];
        }
    }

    showUserInfo(user) {
        try {
            const userName = user.first_name;
            document.getElementById('user-name').textContent = userName;
            document.getElementById('user-info').classList.remove('hidden');
            console.log(`👤 User info shown: ${userName}`);
        } catch (error) {
            console.error('Error showing user info:', error);
        }
    }

    showTab(tabName) {
        console.log(`📑 Switching to tab: ${tabName}`);
        
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
        console.log(`🎾 Selected court: ${court}`);
        this.currentCourt = court;
        document.querySelectorAll('.court-button').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-court="${court}"]`).classList.add('active');
        this.loadSlots();
    }

    async loadSlots() {
        console.log('📅 Loading slots...');
        const date = document.getElementById('date-picker').value;
        if (!date) {
            console.log('❌ No date selected');
            return;
        }

        try {
            console.log(`📋 Fetching slots for date: ${date}`);
            const response = await fetch(`/api/slots?date=${date}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const slots = await response.json();
            console.log(`✅ Loaded ${slots.length} slots`);
            this.renderSlots(slots);
            
        } catch (error) {
            console.error('❌ Error loading slots:', error);
            this.showError('Ошибка загрузки расписания: ' + error.message);
        }
    }

    renderSlots(slots) {
        const container = document.getElementById('slots-container');
        if (!container) {
            console.error('❌ slots-container not found');
            return;
        }
        
        container.innerHTML = '<h3>Доступные слоты:</h3>';
        
        const grid = document.createElement('div');
        grid.className = 'slots-grid';

        const courtSlots = slots
            .filter(slot => slot.court_type === this.currentCourt)
            .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

        console.log(`🎯 Filtered ${courtSlots.length} slots for court: ${this.currentCourt}`);

        if (courtSlots.length === 0) {
            container.innerHTML = '<p>Нет доступных слотов для выбранной даты</p>';
            return;
        }

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
            <strong>${start}-${end}</strong>
            <br>
            <small>${slot.is_available ? '🟢 Свободно' : '🔴 Занято'}</small>
            ${!slot.is_available ? `<br><small>${slot.booked_by || 'Кем-то'}</small>` : ''}
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
                this.showSuccess('✅ Успешно записаны!');
                this.loadSlots();
            } else {
                this.showError('❌ Ошибка: ' + result.detail);
            }
        } catch (error) {
            console.error('Error booking slot:', error);
            this.showError('Ошибка при записи');
        }
    }

    async loadMyBookings() {
        if (!this.currentUser) {
            this.showError('Пожалуйста, войдите в систему');
            return;
        }

        try {
            const response = await fetch('/api/my-bookings?user_id=' + this.currentUser.id);
            const bookings = await response.json();

            const container = document.getElementById('bookings-list');
            container.innerHTML = '';

            if (bookings.length === 0) {
                container.innerHTML = '<p>У вас нет активных записей</p>';
                return;
            }

            bookings.forEach(booking => {
                const bookingElement = document.createElement('div');
                bookingElement.className = 'slot';
                bookingElement.innerHTML = `
                    <strong>${booking.date}</strong><br>
                    ${booking.time_slot.replace('-', ' - ')} 
                    (${booking.court_type === 'rubber' ? 'Резиновый' : 'Хард'})
                    <button onclick="app.cancelBooking(${booking.id})" class="btn-small btn-danger" style="margin-left: 10px;">Отменить</button>
                `;
                container.appendChild(bookingElement);
            });
        } catch (error) {
            console.error('Error loading bookings:', error);
            this.showError('Ошибка загрузки записей');
        }
    }

    async cancelBooking(bookingId) {
        if (!confirm('Отменить запись?')) return;

        try {
            const response = await fetch('/api/booking/' + bookingId + '?user_id=' + this.currentUser.id, {
                method: 'DELETE'
            });

            const result = await response.json();
            this.showSuccess(result.message);
            this.loadMyBookings();
        } catch (error) {
            console.error('Error canceling booking:', error);
            this.showError('Ошибка при отмене записи');
        }
    }

    // Вспомогательные методы
    showLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        if (loading) loading.classList.remove('hidden');
        if (content) content.classList.add('hidden');
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        const content = document.getElementById('content');
        if (loading) loading.classList.add('hidden');
        if (content) content.classList.remove('hidden');
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        const messageDiv = document.getElementById('error-message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.className = type;
            messageDiv.classList.remove('hidden');
            
            setTimeout(() => {
                messageDiv.classList.add('hidden');
            }, 5000);
        }
    }

    resetUser() {
        localStorage.removeItem('telegramUser');
        this.currentUser = null;
        const userInfo = document.getElementById('user-info');
        if (userInfo) userInfo.classList.add('hidden');
        setTimeout(() => location.reload(), 100);
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing app...');
    window.app = new TennisBookingApp();
    window.app.init();
});

// Резервная инициализация
setTimeout(() => {
    if (!window.app || !window.app.isInitialized) {
        console.log('🕒 Backup initialization');
        window.app = new TennisBookingApp();
        window.app.init();
    }
}, 3000);
