import sqlite3
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
            login TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS goals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT,
            description TEXT,
            category TEXT,
            is_progress INTEGER,
            progress INTEGER,
            done INTEGER,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """)

# --- Funkcje użytkownika ---
def find_user(login):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE login=?", (login,)).fetchone()
        return user

def login_user(user):
    session["user_id"] = user["id"]
    session["user_login"] = user["login"]
    session["logged_in"] = True

def save_goals_and_categories(user_id, goals, categories):
    with get_db() as conn:
        # Usuń stare dane
        conn.execute("DELETE FROM goals WHERE user_id=?", (user_id,))
        conn.execute("DELETE FROM categories WHERE user_id=?", (user_id,))
        # Dodaj nowe kategorie
        for cat in categories:
            conn.execute("INSERT INTO categories (user_id, name) VALUES (?, ?)", (user_id, cat))
        # Dodaj nowe cele
        for g in goals:
            conn.execute("""
            INSERT INTO goals (user_id, title, description, category, is_progress, progress, done)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                user_id,
                g.get("title"),
                g.get("desc"),
                g.get("category"),
                int(g.get("isProgress", False)),
                int(g.get("progress", 0)),
                int(g.get("done", 0))
            ))

def load_goals_and_categories(user_id):
    with get_db() as conn:
        goals = [dict(row) for row in conn.execute("SELECT * FROM goals WHERE user_id=?", (user_id,))]
        categories = [row["name"] for row in conn.execute("SELECT * FROM categories WHERE user_id=?", (user_id,))]
        return goals, categories

# --- Routes ---
@app.route("/")
def root():
    if session.get("logged_in"):
        return redirect("/dashboard")
    return redirect("/login")

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html")

    user_login = request.form.get("login")
    user_password = request.form.get("password")

    user = find_user(user_login)
    if user and check_password_hash(user["password"], user_password):
        login_user(user)
        return redirect("/dashboard")

    return render_template("login.html", error="Niepoprawny login lub hasło")

@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

@app.route("/dashboard")
def dashboard():
    if not session.get("logged_in"):
        return redirect("/login")
    return render_template("dashboard.html")

# API
@app.route("/api/load", methods=["GET"])
def api_load():
    if not session.get("logged_in"):
        return jsonify({"ok": False}), 401

    user_id = session["user_id"]
    goals, categories = load_goals_and_categories(user_id)
    return jsonify({"goals": goals, "categories": categories, "ok": True})

@app.route("/api/save", methods=["POST"])
def api_save():
    if not session.get("logged_in"):
        return jsonify({"ok": False}), 401

    data = request.get_json()
    goals = data.get("goals", [])
    categories = data.get("categories", [])

    save_goals_and_categories(session["user_id"], goals, categories)
    return jsonify({"ok": True})

# --- Inicjalizacja bazy i uruchomienie ---
if __name__ == "__main__":
    init_db()
    # Tworzymy przykładowego użytkownika tylko raz
    if not find_user("maks"):
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (login, password) VALUES (?, ?)",
                ("maks", generate_password_hash("maksmaks"))
            )
    app.run(port=8080, debug=True)
