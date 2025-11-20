import os
import psycopg2
from psycopg2.extras import RealDictCursor

class Database:
    def __init__(self):
        # Получи connection string из переменных окружения Vercel
        self.conn_string = os.getenv('https://ezryxuljbfnzzxjqqztx.supabase.co')
        self.init_db()
    
    def get_connection(self):
        conn = psycopg2.connect(self.conn_string, cursor_factory=RealDictCursor)
        return conn
    
    def init_db(self):
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                user_id BIGINT PRIMARY KEY,
                first_name TEXT NOT NULL
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                user_id BIGINT,
                court_type TEXT NOT NULL,
                date TEXT NOT NULL,
                time_slot TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (user_id)
            )
        ''')
        
        conn.commit()
        conn.close()

db = Database()
