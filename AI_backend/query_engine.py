import os
import re
from datetime import datetime
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document
from langchain_core.prompts import PromptTemplate

# LLM Initialization
llm = ChatOpenAI(
    base_url="http://localhost:8080/v1",
    api_key="sk-no-key-required",
    temperature=0
)

# 1. Define Date Extraction Schema
class DateRange(BaseModel):
    start_date: str = Field(description="Start date in YYYY-MM-DD format. If no start date, use '0000-00-00'.")
    end_date: str = Field(description="End date in YYYY-MM-DD format. If no end date, use '9999-99-99'.")

# 2. Extract Dates via LLM before anything else
def extract_date_range(question: str) -> DateRange:
    today = datetime.now().strftime("%Y-%m-%d")
    extractor = llm.with_structured_output(DateRange)
    
    prompt = f"""Today is {today}. Analyze this query: '{question}'.
    Extract the date range. If asking for a single date, start_date and end_date should be identical.
    If no dates are mentioned, return '0000-00-00' and '9999-99-99'."""
    
    try:
        return extractor.invoke(prompt)
    except Exception as e:
        print(f"Date extraction failed: {e}")
        return DateRange(start_date="0000-00-00", end_date="9999-99-99")

# 3. Document Loading with strict Python filtering
def load_diary_documents(vault_path: str, start_date: str, end_date: str):
    documents = []
    pattern = re.compile(r'^\d{4}-\d{2}-\d{2}\.md$')
    for filename in os.listdir(vault_path):
        if pattern.match(filename):
            date_str = filename[:-3] 
            
            # Python handles the calendar math, not the LLM
            if start_date <= date_str <= end_date:
                filepath = os.path.join(vault_path, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                doc = Document(page_content=content, metadata={"date": date_str})
                documents.append(doc)
                
    documents.sort(key=lambda d: d.metadata["date"])
    return documents

# 4. The Fixed Map Prompt
map_template = """You are reviewing a diary entry for the date {date}.
The user asked: '{question}'

CRITICAL INSTRUCTION: Do NOT try to determine if this date matches the user's requested timeframe. The system has already verified this note is within the correct date range.

Your ONLY job is to extract ANY facts, events, or details from THIS SINGLE DAY that are relevant to the topic. 

STRUCTURAL PARSING RULES: 
This diary frequently uses a Question/Answer or Key/Value format (e.g., "- [Topic]?: [Answer]").
*	Treat the text following the colon or question mark as the absolute ground truth for that topic.
*	If the answer implies negation, failure, skipping, or absence (regardless of the exact word used), you MUST output exactly 'NO_DATA'.
*	If the answer implies completion, affirmation, or provides a metric, you MUST extract it as a confirmed event, even if the answer is just a single word or number. 

If the text has nothing to do with the topic, output exactly 'NO_DATA'. Do not write conversational apologies.

Diary Entry:
{text}

Relevant Information:"""
map_prompt = PromptTemplate.from_template(map_template)

# 5. Reduce Prompt
reduce_template = """Based on the following extracted diary notes, answer the user's question clearly. Do not make up information.

CRITICAL INSTRUCTIONS ON MISSING DATES:
*	The notes provided below are strictly filtered. They ONLY contain the days where relevant events actually occurred.
*	If a date within the user's requested timeframe is missing from the list below, it means the event did NOT happen on that day, or was intentionally skipped.
*	Do NOT state that notes are "missing", "not provided", or "unavailable". Just calculate the answer using the positive data provided.

Notes:
{summaries}

Question: {question}

Answer:"""
reduce_prompt = PromptTemplate.from_template(reduce_template)

def map_documents(docs, question):
    mapped = []
    for doc in docs:
        prompt = map_prompt.format(date=doc.metadata["date"], question=question, text=doc.page_content)
        response = llm.invoke(prompt)
        mapped.append(Document(page_content=response.content, metadata=doc.metadata))
    return mapped

def reduce_documents(mapped_docs, question):
    # Strip out any NO_DATA responses or conversational failures before reducing
    valid_summaries = []
    for doc in mapped_docs:
        if "NO_DATA" not in doc.page_content and "no relevant information" not in doc.page_content.lower():
            # INJECT THE DATE DIRECTLY INTO THE TEXT
            stamped_summary = f"Date: {doc.metadata['date']}\n{doc.page_content}"
            valid_summaries.append(stamped_summary)
            
    summaries_text = "\n\n---\n\n".join(valid_summaries)
    
    prompt = reduce_prompt.format(summaries=summaries_text, question=question)
    response = llm.invoke(prompt)
    return response.content

# Main query function
async def query_diary(question: str, vault_path: str):
    date_range = extract_date_range(question)
    print(f"Extracted Range: {date_range.start_date} to {date_range.end_date}")
    
    documents = load_diary_documents(vault_path, date_range.start_date, date_range.end_date)
    if not documents:
        return f"I couldn't find any diary entries between {date_range.start_date} and {date_range.end_date}."

    mapped_docs = map_documents(documents, question)

    # Proceed to reduce
    answer = reduce_documents(mapped_docs, question)
    return answer.strip()