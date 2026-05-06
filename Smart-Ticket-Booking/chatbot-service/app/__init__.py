from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.chat import router as chat_router
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="SmartTicket Chatbot Service",
    description="NLP-powered chatbot for ticket booking",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5000", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, tags=["chat"])

@app.get("/")
async def root():
    return {"message": "SmartTicket Chatbot API", "docs": "/docs"}
