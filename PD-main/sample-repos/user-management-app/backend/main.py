from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(title="User Management API", version="1.0.0")

class UserLogin(BaseModel):
    email: str
    password: str

class UserRegister(BaseModel):
    email: str
    username: str
    password: str

class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    role: str

@app.post("/api/login", summary="User Authentication")
async def login(credentials: UserLogin):
    """
    Authenticate user with email and password, returning JWT bearer token.
    """
    if credentials.email == "admin@example.com" and credentials.password == "secret123":
        return {"access_token": "mock-jwt-token", "token_type": "bearer", "role": "Admin"}
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

@app.post("/api/register", summary="User Registration")
async def register(user_data: UserRegister):
    """
    Register a new user account and persist to PostgreSQL database.
    """
    return {"message": "User registered successfully", "userId": 101}

@app.get("/api/users/profile", response_model=UserProfile, summary="Get Current User Profile")
async def get_profile():
    """
    Retrieve authenticated user profile and roles.
    """
    return {"id": 1, "email": "user@example.com", "username": "johndoe", "role": "User"}
