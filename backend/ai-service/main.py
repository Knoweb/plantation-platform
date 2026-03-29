import pika
import json
import logging
import os
import requests
import chromadb
from dotenv import load_dotenv, find_dotenv

from crewai import Agent, Task, Crew, Process
from crewai.tools import tool
from langchain_groq import ChatGroq

# Initialize ChromaDB connection (Persistent local DB)
try:
    chroma_client = chromadb.PersistentClient(path="./chroma_db")
    policy_collection = chroma_client.get_collection(name="plantation_policies")
except Exception:
    policy_collection = None

# Aggressively load environment variables to ensure the new key is pulled
load_dotenv(find_dotenv(), override=True)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

RABBITMQ_HOST = 'localhost'
EXCHANGE_NAME = 'plantation.topic'
QUEUE_NAME = 'ai.roster.queue'
ROUTING_KEY_LISTEN = 'ai.roster.check'

# --- 1. DEFINE CREWAI TOOLS ---
@tool("Search Estate Policies")
def search_policies(query: str) -> str:
    """Search the estate's Standard Operating Procedures (SOPs) for relevant rules."""
    try:
        if not policy_collection:
            return "Local Policy Database is empty or not seeded. Rely on general agricultural knowledge."
        # Query ChromaDB for top 3 matching policies
        results = policy_collection.query(
            query_texts=[query],
            n_results=3
        )
        if not results['documents'] or len(results['documents'][0]) == 0:
            return "No specific policies found for this query."
        
        # Combine the results into a readable string
        matched_policies = "\n".join([f"- {doc}" for doc in results['documents'][0]])
        return f"Found the following active estate policies:\n{matched_policies}"
    except Exception as e:
        logger.error(f"Policy Search Error: {e}")
        return f"Error accessing policy database: {str(e)}"

@tool("Check Weather Forecast")
def check_weather(location: str) -> str:
    """Fetch the real-time rainfall forecast for a specific estate location (e.g. 'Bogawantalawa')."""
    try:
        # Use Open-Meteo Geocoding to find coordinates
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={location}&count=1&language=en&format=json"
        geo_res = requests.get(geo_url, timeout=10).json()
        if not geo_res.get('results'):
            return f"Weather data unavailable: Could not find coordinates for '{location}'"
        
        loc = geo_res['results'][0]
        lat, lon = loc['latitude'], loc['longitude']
        
        # Fetch actual forecast data
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_probability_max&timezone=auto&forecast_days=3"
        weather_res = requests.get(weather_url, timeout=10).json()
        
        # Get tomorrow's risk (index 1)
        tomorrow_rain = weather_res['daily']['precipitation_probability_max'][1]
        
        return f"Actual Forecast for {location} ({lat}, {lon}) for tomorrow: {tomorrow_rain}% maximum chance of rain."
    except Exception as e:
        logger.error(f"Weather Tool Error: {e}")
        return f"Weather calculation error: {str(e)}"

@tool("Fetch Current Roster")
def fetch_roster(context: str) -> str:
    """Fetch the real drafted labor roster from the Wevili Database. Input should be a JSON with tenantId and estateId."""
    try:
        params = json.loads(context)
        tenant_id = params.get("tenantId")
        estate_id = params.get("estateId")
        
        # Call the Java operation service directly
        res = requests.get(f"http://localhost:8084/api/operations/muster?tenantId={tenant_id}&divisionId={estate_id}", timeout=10)
        musters = res.json()
        
        if not musters:
            return f"No active draft assignments found in the database for Tenant {tenant_id}, Estate {estate_id}."
            
        summary = "Current Draft Roster Assignments: " + "; ".join([
            f"{m.get('workerCount')} workers for {m.get('taskType')} in {m.get('fieldName')}" 
            for m in musters
        ])
        return summary
    except Exception as e:
        logger.error(f"Roster Tool Error: {e}")
        return f"Roster fetch error: {str(e)}"

@tool("Send Operational Notification")
def send_notification(context: str) -> str:
    """Sends a system notification to a specific role. Input should be a JSON with tenantId, receiverRole (e.g. 'FIELD_OFFICER'), and message."""
    try:
        data = json.loads(context)
        msg_content = data.get("message")
        tenant_id = data.get("tenantId")
        receiver_role = data.get("receiverRole", "FIELD_OFFICER")

        if not msg_content or not tenant_id:
            return "Error: Message and tenantId are required."

        # POST to the Message API (Running on operation-service: 8084)
        payload = {
            "senderId": "AI_SUPERVISOR",
            "senderName": "AI Supervisor (Grok)",
            "senderRole": "SYSTEM",
            "receiverId": receiver_role, # Role-based broadcast
            "receiverName": f"All {receiver_role}s",
            "content": msg_content
        }

        headers = { 'X-Tenant-ID': tenant_id, 'Content-Type': 'application/json' }
        res = requests.post("http://localhost:8084/api/messages", json=payload, headers=headers, timeout=10)
        
        if res.status_code == 200:
            logger.info(f"Notification broadcasted to {receiver_role}s for tenant {tenant_id}")
            return f"Successfully sent AI advisory to all {receiver_role}s via in-app notification bell."
        else:
            return f"Failed to send notification. API Status: {res.status_code}"

    except Exception as e:
        logger.error(f"Notification Tool Error: {e}")
        return f"Notification send error: {str(e)}"

# --- 2. DEFINE CREWAI AGENT & TASK ---
def run_ai_roster_optimization(tenant_id: str, estate_id: str, date: str) -> str:
    """Creates the CrewAI supervisor agent and performs a real data-driven optimization."""
    logger.info(f"AI Plantation Supervisor analyzing Tenant: {tenant_id}, Estate: {estate_id}...")

    supervisor = Agent(
        role='Expert Plantation Operations Supervisor',
        goal='Optimize daily labor rosters based on real weather conditions, consulting the estate policies to ensure rules are followed.',
        backstory=(
            "You are a highly experienced agricultural operations head. You use the 'Check Weather Forecast' tool to get REAL data. "
            "You MUST use the 'Search Estate Policies' tool to check the estate's specific rules regarding the weather forecast and tasks. "
            "If rain probability is high (above 60%), you MUST identify vulnerable outdoor tasks like 'Fertilizer Application', 'Plucking', or 'Tapping'. "
            "Using the estate policies, you recommend shifting that labor to indoor or weather-resilient tasks like 'Drain Cleaning' or 'Factory Maintenance'."
            "Once you have a recommendation, you MUST notify the Field Officers using your 'Send Operational Notification' tool."
        ),
        allow_delegation=False,
        tools=[check_weather, fetch_roster, search_policies, send_notification],
        llm="groq/llama-3.3-70b-versatile",
        verbose=True
    )

    # Context for tools
    roster_context = json.dumps({"tenantId": tenant_id, "estateId": estate_id})
    notif_context_template = {
        "tenantId": tenant_id,
        "receiverRole": "FIELD_OFFICER",
        "message": "" # To be filled by the agent
    }

    review_task = Task(
        description=(
            f"1. Fetch tomorrow's ({date}) weather forecast for the '{estate_id}' estate using your tool.\n"
            f"2. Fetch the actual drafted roster for context: '{roster_context}' using your tool.\n"
            f"3. Validate the weather risk against the estate's rules using the 'Search Estate Policies' tool.\n"
            f"4. Analyze if the real rain risk conflicts with the scheduled outdoor tasks based on the policies.\n"
            f"5. If a risk is detected, generate a sharp, data-driven Advisory Memo citing the specific policy.\n"
            f"6. IMPORTANT: If an advisory is generated, use 'Send Operational Notification' to send it to the 'FIELD_OFFICER' role for tenant '{tenant_id}'.\n"
            f"7. Output a brief confirmation of the findings and the action taken."
        ),
        expected_output="A summary of the weather risk, the applicable estate policies consulted, and a confirmation that the Field Officer has been notified of the adjustments.",
        agent=supervisor
    )

    plantation_crew = Crew(
        agents=[supervisor],
        tasks=[review_task],
        process=Process.sequential 
    )

    logger.info("CrewAI data-driven processing has begun...")
    result = plantation_crew.kickoff()
    return str(result)

# --- 3. MAIN EVENT BUS LOGIC ---
def process_roster_check(ch, method, properties, body):
    try:
        message = json.loads(body.decode('utf-8'))
        logger.info(f"Received roster check request via RabbitMQ: {message}")
        
        tenant_id = message.get("tenantId", "DEFAULT")
        estate_id = message.get("estateId")
        date = message.get("date")
        
        if not os.environ.get("GROQ_API_KEY"):
            logger.error("NO GROQ_API_KEY FOUND!")
            ai_analysis = "Error: Agentic Core Offline due to missing Groq API Key."
        else:
            ai_analysis = run_ai_roster_optimization(tenant_id, estate_id, date)

        logger.info(f"Optimization Complete! Result: \n{ai_analysis}")
        publish_ai_result(ch, estate_id, date, ai_analysis)

    except Exception as e:
        logger.error(f"Error processing message: {e}")

def publish_ai_result(ch, estate_id, date, ai_analysis):
    result_payload = {
        "estateId": estate_id,
        "date": date,
        "aiNotes": ai_analysis
    }
    ch.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key="ai.roster.revised",
        body=json.dumps(result_payload),
        properties=pika.BasicProperties(content_type='application/json')
    )
    logger.info(f"Published AI analysis for {estate_id} back to Event Bus.")

def start_listening():
    logger.info(f"Connecting to RabbitMQ at {RABBITMQ_HOST}...")
    try:
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()
        channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type='topic', durable=True)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)
        channel.queue_bind(exchange=EXCHANGE_NAME, queue=QUEUE_NAME, routing_key=ROUTING_KEY_LISTEN)

        logger.info(f"[*] AI Agent Active. Listening for '{ROUTING_KEY_LISTEN}' events...")
        channel.basic_consume(queue=QUEUE_NAME, on_message_callback=process_roster_check, auto_ack=True)
        channel.start_consuming()
    except Exception as e:
        logger.error(f"RabbitMQ Connection Error: {e}")

if __name__ == '__main__':
    start_listening()
