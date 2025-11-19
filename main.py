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

# API endpoints остаются без изменений
@app.get("/api/slots")
async def get_slots(date: str = Query(...)):
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
                WHERE b.court_type = ? AND b.date = ? AND b.time_slot = ?
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

@app.post("/api/book")
async def create_booking(booking_data: dict):
    conn = database.db.get_connection()
    cursor = conn.cursor()

    # Проверяем запись на этот день
    cursor.execute(
        'SELECT id FROM bookings WHERE user_id = ? AND date = ?',
        (booking_data['user_id'], booking_data['date'])
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Вы уже записаны на этот день")

    # Проверяем свободен ли слот
    cursor.execute(
        'SELECT id FROM bookings WHERE court_type = ? AND date = ? AND time_slot = ?',
        (booking_data['court_type'], booking_data['date'], booking_data['time_slot'])
    )
    if cursor.fetchone():
        raise HTTPException(status_code=400, detail="Это время уже занято")

    # Сохраняем пользователя
    cursor.execute(
        'INSERT OR IGNORE INTO users (user_id, first_name) VALUES (?, ?)',
        (booking_data['user_id'], booking_data['first_name'])
    )

    # Создаем запись
    cursor.execute(
        'INSERT INTO bookings (user_id, court_type, date, time_slot) VALUES (?, ?, ?, ?)',
        (booking_data['user_id'], booking_data['court_type'], booking_data['date'], booking_data['time_slot'])
    )

    conn.commit()
    conn.close()

    return {"success": True, "message": "Запись успешно создана!"}

@app.get("/api/my-bookings")
async def get_my_bookings(user_id: int = Query(...)):
    conn = database.db.get_connection()
    cursor = conn.cursor()

    cursor.execute('''
        SELECT id, court_type, date, time_slot 
        FROM bookings 
        WHERE user_id = ? AND date >= date('now') 
        ORDER BY date, time_slot
    ''', (user_id,))

    bookings = cursor.fetchall()
    conn.close()

    return [dict(booking) for booking in bookings]

@app.delete("/api/booking/{booking_id}")
async def cancel_booking(booking_id: int, user_id: int = Query(...)):
    conn = database.db.get_connection()
    cursor = conn.cursor()

    cursor.execute(
        'DELETE FROM bookings WHERE id = ? AND user_id = ?',
        (booking_id, user_id)
    )

    if cursor.rowcount == 0:
        conn.close()
        raise HTTPException(status_code=404, detail="Запись не найдена")

    conn.commit()
    conn.close()

    return {"success": True, "message": "Запись отменена"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)