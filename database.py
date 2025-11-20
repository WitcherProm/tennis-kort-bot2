import os
import psycopg2
from psycopg2.extras import RealDictCursor

class Database:
    def __init__(self):
        self.conn_string = os.getenv('DATABASE_URL')
        print("🔧 Database instance created")
        # НЕ вызываем init_db() автоматически!
    
    def get_connection(self):
        if not self.conn_string:
            raise ValueError("DATABASE_URL not set")
        
        try:
            conn = psycopg2.connect(
                self.conn_string,
                cursor_factory=RealDictCursor,
                sslmode='require'
            )
            return conn
        except Exception as e:
            print(f"❌ DB Connection error: {e}")
            raise
    
    def init_db(self):
        """Создает таблицы если их нет - вызывайте вручную"""
        try:
            conn = self.get_connection()
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
            print("✅ Tables created successfully")
        except Exception as e:
            print(f"❌ Table creation failed: {e}")
            raise

# Создаем экземпляр БЕЗ автоматической инициализации
db = Database()
