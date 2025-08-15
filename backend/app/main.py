# main.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from datetime import datetime, timedelta

SECRET_KEY = "supersecretkey"  # w produkcji trzymamy w .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],  # Twój frontend Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# "Baza danych" w pamięci dla demo
users_db = {}

class User(BaseModel):
    id: str
    name: str
    email: str
    password: str  # w prawdziwej aplikacji hashowane

class UserIn(BaseModel):
    name: Optional[str] = None
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@app.post("/auth/register", response_model=Token)
def register(user: UserIn):
    if user.email in users_db:
        raise HTTPException(status_code=400, detail="User already exists")
    
    new_user = User(id=str(len(users_db)+1), name=user.name or "", email=user.email, password=user.password)
    users_db[user.email] = new_user
    token = create_access_token({"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
def login(user: UserIn):
    db_user = users_db.get(user.email)
    if not db_user or db_user.password != user.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me", response_model=User)
def get_me(token: str = Depends(lambda: None)):  # Tutaj później dodamy JWT dependency
    # Dla demo, prosty zwrot pierwszego użytkownika
    return list(users_db.values())[0] if users_db else None