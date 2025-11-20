from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import database
import os
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.getenv('BOT_TOKEN')

app = FastAPI(title="Tennis Court Booking")

# Монтируем статические файлы
app.mount("/static", StaticFiles(directory="static"), name="static")

# Добавляем CORS для Telegram
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_time_slots():
    slots = []
    for hour in range(6, 24):
        start = f"{hour:02d}:00"
        end = f"{(hour + 1):02d}:00"
        slots.append(f"{start}-{end}")
    return slots

@app.get("/", response_class=HTMLResponse)
async def read_root():
    with open("static/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/check-telegram")
async def check_telegram():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Telegram WebApp Checker</title>
        <style>
            body { font-family: Arial; padding: 20px; }
            .success { color: green; }
            .error { color: red; }
            .info { background: #f0f0f0; padding: 10px; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>🔍 Telegram WebApp Checker</h1>
        <div id="status">Checking...</div>
        <div id="details" class="info" style="margin-top: 20px;"></div>
        
        <script>
            function checkTelegram() {
                const status = document.getElementById('status');
                const details = document.getElementById('details');
                
                // Проверяем Telegram WebApp
                if (window.Telegram?.WebApp) {
                    const tg = window.Telegram.WebApp;
                    const user = tg.initDataUnsafe?.user;
                    
                    status.innerHTML = '<h2 class="success">✅ Telegram WebApp НАЙДЕН!</h2>';
                    details.innerHTML = `
                        <h3>Данные WebApp:</h3>
                        <strong>Версия:</strong> ${tg.version || 'N/A'}<br>
                        <strong>Платформа:</strong> ${tg.platform || 'N/A'}<br>
                        <strong>Init Data:</strong> ${tg.initData ? 'Есть' : 'Нет'}<br>
                        <strong>Пользователь:</strong> ${user ? user.first_name + ' (ID: ' + user.id + ')' : 'Не найден'}
                    `;
                    
                    if (user) {
                        details.innerHTML += `<br><br><strong>🎉 ВСЕ РАБОТАЕТ! Telegram передает данные пользователя.</strong>`;
                    }
                } else {
                    status.innerHTML = '<h2 class="error">❌ Telegram WebApp НЕ НАЙДЕН</h2>';
                    
                    // Ищем все Telegram-подобные объекты
                    const telegramObjects = Object.keys(window).filter(key => 
                        key.toLowerCase().includes('telegram') || 
                        key.toLowerCase().includes('webapp') ||
                        key.toLowerCase().includes('tg')
                    );
                    
                    details.innerHTML = `
                        <h3>Диагностика:</h3>
                        <strong>Найденные объекты:</strong> ${telegramObjects.length > 0 ? telegramObjects.join(', ') : 'Нет'}<br>
                        <strong>URL:</strong> ${window.location.href}<br>
                        <strong>Реферер:</strong> ${document.referrer || 'Нет'}<br>
                        <strong>User Agent:</strong> ${navigator.userAgent}<br><br>
                        <strong>Возможные причины:</strong><br>
                        - Открываете не через кнопку меню в боте<br>
                        - Бот не настроен для WebApp<br>
                        - Домен не добавлен в разрешенные<br>
                        - Проблема с кэшем Telegram
                    `;
                }
            }
            
            // Запускаем проверку
            setTimeout(checkTelegram, 100);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

# API endpoints
@app.get("/api/slots")
async def get_slots(date: str = Query(...)):
    try:
        conn = database.db.get_connection()
        cursor = conn.cursor()

        time_slots = generate_time_slots()
        court_types = ['rubber', 'hard']
        slots = []

        for court_type in court_types:
            for time_slot in time_slots:
                cursor.execute('''
                    SELECT b.id, u.first_name 
                    FROM bookings b 
                    LEFT JOIN users u ON b.user_id = u.user_id 
                    WHERE b.court_type = %s AND b.date = %s AND b.time_slot = %s
                ''', (court_type, date, time_slot))

                booking = cursor.fetchone()

                if booking:
                    slots.append({
                        "court_type": court_type,
                        "date": date,
                        "time_slot": time_slot,
                        "is_available": False,
                        "booked_by": booking['first_name'],
                        "booking_id": booking['id']
                    })
                else:
                    slots.append({
                        "court_type": court_type,
                        "date": date,
                        "time_slot": time_slot,
                        "is_available": True,
                        "booked_by": None,
                        "booking_id": None
                    })

        conn.close()
        return slots
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.post("/api/book")
async def create_booking(booking_data: dict):
    try:
        conn = database.db.get_connection()
        cursor = conn.cursor()

        # Проверяем запись на этот день
        cursor.execute(
            'SELECT id FROM bookings WHERE user_id = %s AND date = %s',
            (booking_data['user_id'], booking_data['date'])
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Вы уже записаны на этот день")

        # Проверяем свободен ли слот
        cursor.execute(
            'SELECT id FROM bookings WHERE court_type = %s AND date = %s AND time_slot = %s',
            (booking_data['court_type'], booking_data['date'], booking_data['time_slot'])
        )
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Это время уже занято")

        # Сохраняем пользователя
        cursor.execute(
            'INSERT INTO users (user_id, first_name) VALUES (%s, %s) ON CONFLICT (user_id) DO UPDATE SET first_name = EXCLUDED.first_name',
            (booking_data['user_id'], booking_data['first_name'])
        )

        # Создаем запись
        cursor.execute(
            'INSERT INTO bookings (user_id, court_type, date, time_slot) VALUES (%s, %s, %s, %s)',
            (booking_data['user_id'], booking_data['court_type'], booking_data['date'], booking_data['time_slot'])
        )

        conn.commit()
        conn.close()

        return {"success": True, "message": "Запись успешно создана!"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.get("/api/my-bookings")
async def get_my_bookings(user_id: int = Query(...)):
    try:
        conn = database.db.get_connection()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT id, court_type, date, time_slot 
            FROM bookings 
            WHERE user_id = %s AND date >= date('now') 
            ORDER BY date, time_slot
        ''', (user_id,))

        bookings = cursor.fetchall()
        conn.close()

        return [dict(booking) for booking in bookings]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@app.delete("/api/booking/{booking_id}")
async def cancel_booking(booking_id: int, user_id: int = Query(...)):
    try:
        conn = database.db.get_connection()
        cursor = conn.cursor()

        cursor.execute(
            'DELETE FROM bookings WHERE id = %s AND user_id = %s',
            (booking_id, user_id)
        )

        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Запись не найдена")

        conn.commit()
        conn.close()

        return {"success": True, "message": "Запись отменена"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# Новые эндпоинты для диагностики
@app.get("/api/init-db")
async def init_database():
    """Ручная инициализация базы данных"""
    try:
        database.db.init_db()
        return {"status": "success", "message": "Database tables created"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/check-tables")
async def check_tables():
    """Проверка существования таблиц"""
    try:
        conn = database.db.get_connection()
        cursor = conn.cursor()
        
        # Проверяем существование таблиц
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('users', 'bookings')
        """)
        
        tables = cursor.fetchall()
        conn.close()
        
        existing_tables = [table['table_name'] for table in tables]
        
        return {
            "status": "success",
            "existing_tables": existing_tables,
            "tables_found": len(existing_tables),
            "needs_init": len(existing_tables) < 2
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/db-status")
async def db_status():
    """Проверка статуса базы данных"""
    try:
        conn = database.db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT NOW() as current_time")
        result = cursor.fetchone()
        conn.close()
        return {
            "status": "connected",
            "database_time": result['current_time'],
            "message": "✅ Database is working!"
        }
    except Exception as e:
        return {
            "status": "disconnected", 
            "error": str(e),
            "help": "Please check DATABASE_URL in Vercel environment variables"
        }

@app.get("/api/env-check")
async def env_check():
    """Проверка переменных окружения"""
    return {
        "has_database_url": bool(os.getenv('DATABASE_URL')),
        "has_bot_token": bool(os.getenv('BOT_TOKEN')),
        "database_url_preview": os.getenv('DATABASE_URL', '')[:30] + '...' if os.getenv('DATABASE_URL') else 'NOT SET'
    }

@app.get("/api/health")
async def health_check():
    """Общая проверка здоровья приложения"""
    return {
        "status": "healthy",
        "service": "Tennis Court Booking API",
        "timestamp": datetime.now().isoformat()
    }

# Для локального запуска
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
