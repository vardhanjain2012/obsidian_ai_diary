from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from query_engine import query_diary
import os
from dotenv import load_dotenv

app = FastAPI()

# Enable CORS so Obsidian's local browser environment can talk to this server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define the data structure we expect from Obsidian
class QueryRequest(BaseModel):
    question: str

@app.post("/ask")
async def ask_ai(request: QueryRequest):
    # Log the incoming question to the terminal for debugging
    print(f"Received query: {request.question}")
    
    # Load variables from the .env file
    load_dotenv()

    # Fetch the path, throwing an error if you forgot to set it
    vault_path = os.getenv("VAULT_DAILY_NOTES_PATH")
    if not vault_path:
        raise ValueError("VAULT_DAILY_NOTES_PATH is not set in the .env file!")
    
    # Query the diary
    answer = await query_diary(request.question, vault_path)
    
    return {"answer": answer}