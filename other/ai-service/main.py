from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import math

app = FastAPI(title="Community Help AI Service")

class ChatRequest(BaseModel):
    message: str
    user_id: Optional[str] = None

class Provider(BaseModel):
    id: str
    category: str
    rating: float
    totalJobs: int
    lat: float
    lng: float
    isAvailable: bool

class RecommendationRequest(BaseModel):
    user_lat: float
    user_lng: float
    category: str
    providers: List[Provider]
    max_distance_km: float = 15.0

@app.get("/")
def read_root():
    return {"status": "AI Service is running"}

@app.post("/api/ai/chat")
def chat(req: ChatRequest):
    # Dummy NLP logic for now. 
    # In production, this would route to OpenAI, Dialogflow, or a custom LLM.
    msg = req.message.lower()
    response = "I am your AI assistant. How can I help you today?"
    
    if "emergency" in msg or "sos" in msg or "help" in msg:
        response = "If this is a medical or police emergency, please press the SOS button immediately."
    elif "plumber" in msg or "electrician" in msg:
        response = "You can book utility services from the Utility Services tab. I can help you find top-rated professionals nearby."
        
    return {"reply": response}

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

@app.post("/api/ai/recommend")
def recommend_providers(req: RecommendationRequest):
    """
    Ranks providers based on a composite score combining:
    1. Distance (closer is better)
    2. Rating (higher is better)
    3. Experience/Total Jobs (more is better)
    """
    ranked = []
    for p in req.providers:
        if not p.isAvailable or p.category != req.category:
            continue
            
        dist = haversine_distance(req.user_lat, req.user_lng, p.lat, p.lng)
        
        if dist <= req.max_distance_km:
            # Simple ranking algorithm
            # Maximize rating, maximize jobs (log scale), minimize distance
            distance_score = max(0, 15 - dist) / 15.0 # 0 to 1
            rating_score = p.rating / 5.0 # 0 to 1
            experience_score = min(math.log1p(p.totalJobs) / math.log1p(100), 1.0) # 0 to 1
            
            # Weighted composite score
            composite_score = (0.5 * distance_score) + (0.3 * rating_score) + (0.2 * experience_score)
            
            ranked.append({
                "provider_id": p.id,
                "distance_km": round(dist, 2),
                "score": round(composite_score, 4),
                "rating": p.rating
            })
            
    # Sort descending by score
    ranked.sort(key=lambda x: x["score"], reverse=True)
    return {"recommendations": ranked}
