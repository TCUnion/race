
import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="backend/.env")

CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
# New Webhook URL provided by user
CALLBACK_URL = "https://service.criterium.tw/webhook/strava-webhook"
VERIFY_TOKEN = "STRAVA"  # Default verify token usually used

if not CLIENT_ID or not CLIENT_SECRET:
    print("Error: STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not found in .env")
    exit(1)

def get_subscription():
    url = f"https://www.strava.com/api/v3/push_subscriptions?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting subscription: {response.text}")
        return None

def delete_subscription(sub_id):
    url = f"https://www.strava.com/api/v3/push_subscriptions/{sub_id}?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}"
    response = requests.delete(url)
    if response.status_code == 204:
        print(f"Successfully deleted subscription {sub_id}")
        return True
    else:
        print(f"Error deleting subscription: {response.text}")
        return False

def create_subscription():
    url = "https://www.strava.com/api/v3/push_subscriptions"
    data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "callback_url": CALLBACK_URL,
        "verify_token": VERIFY_TOKEN
    }
    print(f"Creating subscription for {CALLBACK_URL}...")
    response = requests.post(url, data=data)
    if response.status_code == 201:
        print(f"Successfully created subscription: {response.json()}")
        return True
    else:
        print(f"Error creating subscription: {response.text}")
        return False

def main():
    print("Checking existing subscriptions...")
    subs = get_subscription()
    if subs is None:
        return

    if len(subs) > 0:
        print(f"Found {len(subs)} existing subscription(s):")
        for sub in subs:
            print(f" - ID: {sub['id']}, URL: {sub['callback_url']}")
            
            # Check if it matches the target URL
            if sub['callback_url'] == CALLBACK_URL:
                print("Subscription already matches target URL. No action needed.")
                return

            # Delete old subscription
            print(f"Deleting old subscription {sub['id']}...")
            delete_subscription(sub['id'])
    
    # Create new subscription
    create_subscription()

if __name__ == "__main__":
    main()
