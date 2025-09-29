import sqlite3
import json
from flask import Flask, session, redirect, render_template, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask("Goal Tracker Server", template_folder="src/templates", static_folder="src/static")
app.secret_key = "seekretny_klucz"  # w produkcji lepiej w zmiennej środowiskowej

DB_FILE = "goaltracker.db"

# --- Funkcje pomocnicze do DB ---
def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # żeby móc odwoływać się po nazwach kolumn
    return conn

def init_db():
    with get_db() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Przechowujemy goals jako JSON - prostsze i zgodne z frontem
        conn.execute("""
        CREATE TABLE IF NOT EXISTS user_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            goals_json TEXT,
            categories_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)

# --- Funkcje użytkownika ---
def find_user(email):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
        return user

def create_demo_user():
    """Tworzy demo użytkownika jeśli nie istnieje"""
    if not find_user("admin@example.com"):
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (email, password) VALUES (?, ?)",
                ("admin@example.com", generate_password_hash("password123"))
            )
        print("✅ Demo user created: admin@example.com / password123")

def login_user(user):
    session["user_id"] = user["id"]
    session["user_email"] = user["email"]
    session["logged_in"] = True

def save_user_data(user_id, goals, categories):
    """Zapisuje goals i categories jako JSON"""
    goals_json = json.dumps(goals) if goals else "[]"
    categories_json = json.dumps(categories) if categories else "[]"
    
    with get_db() as conn:
        # Sprawdź czy użytkownik ma już dane
        existing = conn.execute(
            "SELECT id FROM user_data WHERE user_id=?", (user_id,)
        ).fetchone()
        
        if existing:
            # Update
            conn.execute("""
                UPDATE user_data 
                SET goals_json=?, categories_json=?, updated_at=CURRENT_TIMESTAMP 
                WHERE user_id=?
            """, (goals_json, categories_json, user_id))
        else:
            # Insert
            conn.execute("""
                INSERT INTO user_data (user_id, goals_json, categories_json) 
                VALUES (?, ?, ?)
            """, (user_id, goals_json, categories_json))

def load_user_data(user_id):
    """Ładuje goals i categories z JSON"""
    with get_db() as conn:
        row = conn.execute(
            "SELECT goals_json, categories_json FROM user_data WHERE user_id=?", 
            (user_id,)
        ).fetchone()
        
        if row:
            try:
                goals = json.loads(row["goals_json"]) if row["goals_json"] else []
                categories = json.loads(row["categories_json"]) if row["categories_json"] else []
                return goals, categories
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                return [], []
        
        return [], []



# UNIEMOŻLIWIENIE TWORZENIA CACHE PRZEZ PRZEGLĄDARKĘ
@app.after_request
def add_no_cache_headers(response):
    if session.get("logged_in"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response



# --- Routes ---
@app.route("/")
def root():
    if session.get("logged_in"):
        return redirect("/dashboard")
    return redirect("/login")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        # Sprawdź czy już zalogowany
        if session.get("logged_in"):
            return redirect("/dashboard")
        return render_template("login.html")

    # POST - obsługa logowania
    user_email = request.form.get("email", "").strip()
    user_password = request.form.get("password", "")

    if not user_email or not user_password:
        return render_template("login.html", error="Email i hasło są wymagane")

    user = find_user(user_email)
    if user and check_password_hash(user["password"], user_password):
        login_user(user)
        
        # Redirect do dashboard lub URL z parametru
        redirect_url = request.form.get("redirect", "/dashboard")
        return redirect(redirect_url)

    return render_template("login.html", error="Niepoprawny email lub hasło")

@app.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return redirect("/login")

@app.route("/dashboard")
def dashboard():
    if not session.get("logged_in"):
        return redirect("/login")
    return render_template("dashboard.html")

# API - zgodne z frontem
@app.route("/api/load", methods=["GET"])
def api_load():
    if not session.get("logged_in"):
        return jsonify({"error": "Not authenticated"}), 401

    try:
        user_id = session["user_id"]
        goals, categories = load_user_data(user_id)
        
        print(f"✅ Loaded {len(goals)} goals for user {user_id}")
        
        # Frontend oczekuje tylko goals w odpowiedzi
        return jsonify({"goals": goals})
        
    except Exception as e:
        print(f"Load error: {e}")
        return jsonify({"error": "Failed to load goals"}), 500

@app.route("/api/save", methods=["POST"])
def api_save():
    if not session.get("logged_in"):
        return jsonify({"error": "Not authenticated"}), 401

    try:
        if not request.is_json:
            return jsonify({"error": "Content-Type must be application/json"}), 400
            
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Frontend wysyła { goals: [...] }
        goals = data.get("goals", [])
        
        if not isinstance(goals, list):
            return jsonify({"error": "Goals must be a list"}), 400
        
        user_id = session["user_id"]
        
        # Wyciągnij categories z goals (frontend zarządza nimi automatycznie)
        categories = set()
        for goal in goals:
            if goal.get("category"):
                categories.add(goal["category"])
        
        categories = list(categories)
        
        save_user_data(user_id, goals, categories)
        
        print(f"✅ Saved {len(goals)} goals, {len(categories)} categories for user {user_id}")
        
        return jsonify({"success": True, "message": "Goals saved successfully"})
        
    except Exception as e:
        print(f"Save error: {e}")
        return jsonify({"error": "Failed to save goals"}), 500

# Dodatkowe endpointy dla kompatybilności
@app.route("/register")
def register():
    return """
    <h2>🎯 Rejestracja</h2>
    <p>Funkcja rejestracji - do implementacji</p>
    <a href="/login">← Powrót do logowania</a>
    """

@app.route("/forgot-password")
def forgot_password():
    return """
    <h2>🔑 Reset hasła</h2>
    <p>Funkcja resetowania hasła - do implementacji</p>
    <a href="/login">← Powrót do logowania</a>
    """

# Health check
@app.route("/health")
def health():
    return jsonify({
        "status": "ok",
        "logged_in": session.get("logged_in", False),
        "user_id": session.get("user_id")
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    if session.get("logged_in"):
        return redirect("/dashboard")
    return redirect("/")

@app.errorhandler(500)
def internal_error(error):
    print(f"Internal error: {error}")
    return "Wystąpił błąd serwera", 500

# --- Inicjalizacja bazy i uruchomienie ---
if __name__ == "__main__":
    print("🚀 Starting Goal Tracker Server...")
    
    # Inicjalizuj bazę danych
    init_db()
    
    # Utwórz demo użytkownika
    create_demo_user()
    
    print("📝 Demo login: admin@example.com / password123")
    print("🌐 Server running at: http://localhost:8080")
    
    app.run(port=8080, debug=True, host="0.0.0.0")