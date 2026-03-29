import chromadb
import os

print("Seeding Plantation Operations Policies into local Vector DB...")

# Connect to persistent local DB
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# Create or get collection
collection = chroma_client.get_or_create_collection(name="plantation_policies")

# Define the core policies
policies = [
    {
        "id": "policy_weather_01",
        "text": "Fertilizer application must be immediately suspended and workers reallocated if precipitation probability for the day exceeds 60%, to prevent chemical run-off and environmental damage."
    },
    {
        "id": "policy_roster_01",
        "text": "During heavy rain conditions or thunderstorms, all outdoor field workers in vulnerable divisions must be reassigned to indoor activities such as Factory Maintenance or targeted Drain Cleaning."
    },
    {
        "id": "policy_roster_02",
        "text": "Plucking assignments must maintain a minimum workforce of 10 workers per division to ensure daily targets are met. Do not reduce plucking labor below this threshold unless weather mandates an evacuation."
    },
    {
        "id": "policy_safety_01",
        "text": "Heat stress protocol: If the local temperature exceeds 33 degrees Celsius, no heavy manual labor such as land preparation should be scheduled. Redirect tasks to shaded areas."
    },
    {
        "id": "policy_roster_03",
        "text": "If outdoor harvesting is suspended due to weather, prioritize weed slashing or drain cleaning in the afternoon if conditions improve."
    }
]

# Wipe and seed
try:
    for policy in policies:
        collection.add(
            documents=[policy["text"]],
            ids=[policy["id"]]
        )
except ValueError:
    print("Policies already exist, skipping...")
except Exception as e:
    print(f"Error seeding DB: {e}")

print("Successfully seeded %d policies into the Chroma DB." % len(policies))
