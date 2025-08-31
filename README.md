# Goal Tracker

Goal Tracker to prosta aplikacja webowa napisana w **Flasku**, która pozwala na:
- Tworzenie i zapisywanie własnych celów
- Organizowanie ich w kategorie
- Dostęp z dowolnego urządzenia (hostowane na PythonAnywhere)

## Funkcje
- ✅ Logowanie z hasłem (haszowane w backendzie)
- ✅ Dashboard do przeglądania i edycji celów
- ✅ API `/api/load` i `/api/save` do zapisu/odczytu danych
- ✅ Dane użytkownika trzymane w bazie SQLite (łatwe do przeniesienia)

## Wymagania
- Python 3.8+
- Flask
- Werkzeug
- (opcjonalnie) Flask-SQLAlchemy jeśli używasz ORM

## Instalacja lokalna

1. Sklonuj repozytorium:
```
git clone https://github.com/maksymilianW0/goal-tracker.git
cd goal-tracker
```

2. Utwórz virtualenv i zainstaluj zależności:
```
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Uruchom aplikację lokalnie:
```
python app.py
```

Aplikacja domyślnie odpali się na http://127.0.0.1:8080

## Struktura projektu
```
project-root/
 ├─ src/
 │   ├─ templates/   # Pliki HTML (login.html, dashboard.html)
 │   └─ static/      # CSS, JS
 ├─ app.py           # Backend Flask
 ├─ requirements.txt
 └─ README.md
```

## Deploy na PythonAnywhere
1. Załóż konto na https://www.pythonanywhere.com  
2. Utwórz nowy WebApp -> wybierz Flask -> wskaż `app.py` jako moduł aplikacji.  
3. Skonfiguruj virtualenv i zainstaluj zależności (`pip install -r requirements.txt`).  
4. W sekcji "Static files" ustaw `/static/` → `src/static`.  
5. (Opcjonalnie) Ustaw zmienne środowiskowe, np. SECRET_KEY.  
6. Kliknij **Reload** — aplikacja będzie dostępna pod `https://<twoj-login>.pythonanywhere.com`

## Użytkowanie i admin
- Masz już przykładowego użytkownika (jeśli zainicjalizowałeś bazę): login `test`, hasło `test1234`.
- Do debugowania używaj logów w konsoli PythonAnywhere lub `print(app.url_map)` lokalnie.

## Przyszłe plany
- 🔑 Rejestracja nowych użytkowników
- 📊 Statystyki postępów
- 🌐 Wsparcie dla wielu użytkowników (przejście na MySQL/Postgres)
- 🔁 Backup bazy SQLite i opcjonalny sync

## Licencja
MIT — rób z tym co chcesz 🚀
