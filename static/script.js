class TennisBookingApp {
    constructor() {
        this.currentCourt = 'rubber';
        this.currentUser = null;
        this.isInitialized = false;
        console.log('🎾 TennisBookingApp created');
    }

    async init() {
        console.log('🚀 Starting app initialization...');
        try {
            this.showLoading();
            
            // 1. Инициализируем пользователя
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
            this.showError('Ошибка загрузки: ' + error.message);
        }
    }

    async initUser() {
    console.log('👤 Initializing user...');
    
    try {
        // ПРОСТАЯ И ЭФФЕКТИВНАЯ ПРОВЕРКА TELEGRAM
        console.log('🔍 Checking for Telegram WebApp...');
        
        // Способ 1: Проверяем стандартный объект Telegram
        if (window.Telegram?.WebApp) {
            console.log('✅ Telegram WebApp found (standard)');
            return this.initTelegramUser();
        }
        
        // Способ 2: Проверяем Telegram WebApp в разных местах
        if (window.TelegramWebApp) {
            console.log('✅ Telegram WebApp found (alternative)');
            return this.initTelegramUserAlt();
        }
        
        // Способ 3: Проверяем по URL параметрам (для тестирования)
        const urlParams = new URLSearchParams(window.location.search);
        const tgWebApp = urlParams.get('tgWebApp');
        if (tgWebApp === '1') {
            console.log('✅ Telegram WebApp simulation');
            return this.initSimulatedTelegramUser();
        }
        
        console.log('🌐 Regular browser - no Telegram WebApp');
        return this.initGuestUser();
        
    } catch (error) {
        console.error('❌ Error in initUser:', error);
        return this.initGuestUser();
    }
}

// Метод для стандартного Telegram WebApp
initTelegramUser() {
    const tg = window.Telegram.WebApp;
    console.log('📱 Initializing Telegram user...');
    
    // Обязательные методы для инициализации
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();
    
    console.log('Telegram WebApp data:', {
        version: tg.version,
        platform: tg.platform,
        initData: tg.initData,
        initDataUnsafe: tg.initDataUnsafe
    });
    
    if (tg.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;
        console.log('✅ Telegram user data found:', tgUser);
        
        this.currentUser = {
            id: tgUser.id,
            first_name: tgUser.first_name || 'Telegram User',
            username: tgUser.username || '',
            last_name: tgUser.last_name || '',
            language_code: tgUser.language_code || 'ru',
            is_telegram_user: true
        };
        
        localStorage.setItem('telegramUser', JSON.stringify(this.currentUser));
        this.showUserInfo(this.currentUser);
        
        // Показываем специальное сообщение для Telegram
        this.showTelegramWelcome();
        return true;
    } else {
        console.log('⚠️ Telegram WebApp found but no user data');
        this.showTelegramInfo();
        return this.initGuestUser();
    }
}

// Альтернативный метод (на случай если объект в другом месте)
initTelegramUserAlt() {
    const tg = window.TelegramWebApp;
    console.log('📱 Initializing Telegram user (alternative)...');
    
    tg.ready();
    tg.expand();
    
    if (tg.initDataUnsafe?.user) {
        const tgUser = tg.initDataUnsafe.user;
        console.log('✅ Telegram user data found (alt):', tgUser);
        
        this.currentUser = {
            id: tgUser.id,
            first_name: tgUser.first_name || 'Telegram User',
            username: tgUser.username || '',
            last_name: tgUser.last_name || '',
            language_code: tgUser.language_code || 'ru',
            is_telegram_user: true
        };
        
        localStorage.setItem('telegramUser', JSON.stringify(this.currentUser));
        this.showUserInfo(this.currentUser);
        this.showTelegramWelcome();
        return true;
    }
    
    return this.initGuestUser();
}

// Метод для тестирования (симуляция Telegram пользователя)
initSimulatedTelegramUser() {
    console.log('🎭 Simulating Telegram user for testing');
    
    this.currentUser = {
        id: 123456789,
        first_name: 'TelegramTestUser',
        username: 'testuser',
        is_telegram_user: true
    };
    
    localStorage.setItem('telegramUser', JSON.stringify(this.currentUser));
    this.showUserInfo(this.currentUser);
    this.showTelegramWelcome();
    return true;
}

// Метод для гостя
initGuestUser() {
    console.log('👤 Creating guest user');
    
    const savedUser = localStorage.getItem('telegramUser');
    if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        console.log('📁 User from localStorage:', this.currentUser);
        this.showUserInfo(this.currentUser);
        return true;
    }
    
    this.currentUser = { 
        id: Math.floor(Math.random() * 1000000), 
        first_name: 'Гость',
        is_telegram_user: false
    };
    
    localStorage.setItem('telegramUser', JSON.stringify(this.currentUser));
    this.showUserInfo(this.currentUser);
    return true;
}

// Специальное приветствие для Telegram
showTelegramWelcome() {
    const userInfo = document.getElementById('user-info');
    if (userInfo && this.currentUser.is_telegram_user) {
        userInfo.innerHTML = `
            🎉 Добро пожаловать, <strong>${this.currentUser.first_name}</strong>!
            <br><small>Telegram WebApp активен</small>
            <button onclick="app.resetUser()" class="btn-small">Сбросить</button>
        `;
        userInfo.classList.remove('hidden');
    }
}

showTelegramInfo() {
    console.log('🔔 Showing Telegram info');
    const userInfo = document.getElementById('user-info');
    if (userInfo) {
        userInfo.innerHTML = `
            🔧 Telegram WebApp обнаружен
            <br><small>Но данные пользователя не получены</small>
            <button onclick="app.resetUser()" class="btn-small">Сбросить</button>
        `;
        userInfo.classList.remove('hidden');
    }
}

    // Этот метод ДОЛЖЕН быть внутри класса!
    showTelegramInfo() {
        console.log('🔔 Showing Telegram info');
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.innerHTML = `
                Добро пожаловать! <strong>Telegram User</strong>
                <br><small>Открыто через Telegram WebApp</small>
                <button onclick="app.resetUser()" class="btn-small">Сбросить</button>
            `;
            userInfo.classList.remove('hidden');
        }
    }

    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        try {
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
                // Устанавливаем сегодняшнюю дату
                const today = new Date().toISOString().split('T')[0];
                datePicker.value = today;
                datePicker.min = today; // Запрещаем выбирать прошедшие даты
                
                datePicker.addEventListener('change', () => this.loadSlots());
                console.log('📅 Date picker initialized');
            } else {
                console.error('❌ Date picker not found');
            }

            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }

    showUserInfo(user) {
        try {
            const userName = user.first_name;
            const userInfo = document.getElementById('user-info');
            const userNameSpan = document.getElementById('user-name');
            
            if (userInfo && userNameSpan) {
                userNameSpan.textContent = userName;
                userInfo.classList.remove('hidden');
                console.log(`👤 User info shown: ${userName}`);
            } else {
                console.error('❌ User info elements not found');
            }
        } catch (error) {
            console.error('Error showing user info:', error);
        }
    }

    showTab(tabName) {
        console.log(`📑 Switching to tab: ${tabName}`);
        
        if (!this.isInitialized) {
            console.log('⚠️ App not initialized yet');
            return;
        }

        try {
            // Обновляем активные табы
            document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
            const activeContent = document.getElementById(`${tabName}-tab`);
            
            if (activeTab && activeContent) {
                activeTab.classList.add('active');
                activeContent.classList.add('active');
                console.log(`✅ Switched to tab: ${tabName}`);
            } else {
                console.error(`❌ Tab elements not found for: ${tabName}`);
            }

            if (tabName === 'my-bookings') {
                this.loadMyBookings();
            }
        } catch (error) {
            console.error('Error switching tabs:', error);
        }
    }

    selectCourt(court) {
        console.log(`🎾 Selected court: ${court}`);
        this.currentCourt = court;
        
        try {
            document.querySelectorAll('.court-button').forEach(btn => btn.classList.remove('active'));
            const activeCourt = document.querySelector(`[data-court="${court}"]`);
            if (activeCourt) {
                activeCourt.classList.add('active');
                this.loadSlots();
            } else {
                console.error(`❌ Court button not found: ${court}`);
            }
        } catch (error) {
            console.error('Error selecting court:', error);
        }
    }

    async loadSlots() {
        console.log('📅 Loading slots...');
        const datePicker = document.getElementById('date-picker');
        
        if (!datePicker) {
            console.error('❌ Date picker not found');
            return;
        }

        const date = datePicker.value;
        if (!date) {
            console.log('⚠️ No date selected');
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
            
            // Показываем тестовые данные при ошибке
            this.showTestSlots();
        }
    }

    renderSlots(slots) {
        const container = document.getElementById('slots-container');
        if (!container) {
            console.error('❌ slots-container not found');
            return;
        }
        
        try {
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
            console.log('✅ Slots rendered successfully');
        } catch (error) {
            console.error('Error rendering slots:', error);
            container.innerHTML = '<p>Ошибка отображения слотов</p>';
        }
    }

    // Показываем тестовые слоты при ошибке загрузки
    showTestSlots() {
        console.log('🔄 Showing test slots...');
        const container = document.getElementById('slots-container');
        if (!container) return;

        const testSlots = [
            { time_slot: '10:00-11:00', is_available: true },
            { time_slot: '11:00-12:00', is_available: false, booked_by: 'Иван' },
            { time_slot: '12:00-13:00', is_available: true },
            { time_slot: '13:00-14:00', is_available: true }
        ];

        container.innerHTML = '<h3>Доступные слоты (тестовые):</h3>';
        
        const grid = document.createElement('div');
        grid.className = 'slots-grid';

        testSlots.forEach(slot => {
            const slotElement = document.createElement('div');
            slotElement.className = `slot ${slot.is_available ? 'available' : 'booked'}`;
            
            const [start, end] = slot.time_slot.split('-');
            slotElement.innerHTML = `
                <strong>${start}-${end}</strong>
                <br>
                <small>${slot.is_available ? '🟢 Свободно' : '🔴 Занято'}</small>
                ${!slot.is_available ? `<br><small>${slot.booked_by}</small>` : ''}
            `;

            if (slot.is_available) {
                slotElement.addEventListener('click', () => {
                    alert('Это тестовый слот. Реальная запись временно недоступна.');
                });
            }

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
            this.showError('Ошибка при записи: ' + error.message);
        }
    }

    async loadMyBookings() {
        if (!this.currentUser) {
            this.showError('Пожалуйста, войдите в систему');
            return;
        }

        try {
            const response = await fetch('/api/my-bookings?user_id=' + this.currentUser.id);
            if (!response.ok) throw new Error('Network error');
            
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
            this.showError('Ошибка загрузки записей: ' + error.message);
            
            // Показываем тестовые записи
            this.showTestBookings();
        }
    }

    showTestBookings() {
        const container = document.getElementById('bookings-list');
        if (!container) return;

        container.innerHTML = `
            <div class="slot">
                <strong>2024-01-15</strong><br>
                10:00 - 11:00 (Резиновый)
                <button class="btn-small btn-danger" style="margin-left: 10px;">Отменить</button>
            </div>
            <p><small>Это тестовые данные</small></p>
        `;
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
        try {
            const loading = document.getElementById('loading');
            const content = document.getElementById('content');
            if (loading) loading.classList.remove('hidden');
            if (content) content.classList.add('hidden');
        } catch (error) {
            console.error('Error showing loading:', error);
        }
    }

    hideLoading() {
        try {
            const loading = document.getElementById('loading');
            const content = document.getElementById('content');
            if (loading) loading.classList.add('hidden');
            if (content) content.classList.remove('hidden');
        } catch (error) {
            console.error('Error hiding loading:', error);
        }
    }

    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type) {
        try {
            const messageDiv = document.getElementById('error-message');
            if (messageDiv) {
                messageDiv.textContent = message;
                messageDiv.className = type;
                messageDiv.classList.remove('hidden');
                
                setTimeout(() => {
                    messageDiv.classList.add('hidden');
                }, 5000);
            }
        } catch (error) {
            console.error('Error showing message:', error);
        }
    }

    resetUser() {
        try {
            localStorage.removeItem('telegramUser');
            this.currentUser = null;
            const userInfo = document.getElementById('user-info');
            if (userInfo) userInfo.classList.add('hidden');
            setTimeout(() => location.reload(), 100);
        } catch (error) {
            console.error('Error resetting user:', error);
        }
    }
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, initializing app...');
    window.app = new TennisBookingApp();
    setTimeout(() => {
        window.app.init();
    }, 100);
});

// Резервная инициализация через 3 секунды
setTimeout(() => {
    if (!window.app || !window.app.isInitialized) {
        console.log('🕒 Backup initialization');
        window.app = new TennisBookingApp();
        window.app.init();
    }
}, 3000);
