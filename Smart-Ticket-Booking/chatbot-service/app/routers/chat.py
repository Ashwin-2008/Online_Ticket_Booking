from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.models.nlp_engine import process_message

router = APIRouter()

sessions: Dict[str, Dict[str, Any]] = {}

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"
    user_id: Optional[str] = None

class ChatResponse(BaseModel):
    intent: str
    confidence: float
    entities: dict
    response: str
    session_id: str

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session = sessions.setdefault(req.session_id or "default", {
        "last_service_type": None,
        "last_movie_name": None,
        "last_date": None,
        "last_city": None,
    })

    result = process_message(req.message, session)
    entities = result["entities"]

    session["last_service_type"] = entities.get("service_type") or session["last_service_type"]
    session["last_movie_name"] = entities.get("movie_name") or session["last_movie_name"]
    session["last_date"] = entities.get("date") or session["last_date"]
    session["last_city"] = entities.get("city") or session["last_city"]

    result["entities"] = entities
    return ChatResponse(
        intent=result["intent"],
        confidence=result["confidence"],
        entities=entities,
        response=result["response"],
        session_id=req.session_id,
    )

@router.get("/health")
async def health():
    return {"status": "ok", "service": "SmartTicket Chatbot NLP Engine"}
