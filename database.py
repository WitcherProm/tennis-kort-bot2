import os
import psycopg2
from psycopg2.extras import RealDictCursor

def get_connection():
    conn_string = os.getenv('DATABASE_URL')
    if not conn_string:
        raise ValueError("DATABASE_URL not set")
    
    return psycopg2.connect(conn_string, cursor_factory=RealDictCursor, sslmode='require')

def init_tables():
    """Создает таблицы если их нет"""
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id BIGINT PRIMARY KEY,
            first_name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            user_id BIGINT REFERENCES users(user_id),
            court_type TEXT NOT NULL CHECK (court_type IN ('rubber', 'hard')),
            date TEXT NOT NULL,
            time_slot TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(court_type, date, time_slot)
        )
    ''')
    
    conn.commit()
    conn.close()
