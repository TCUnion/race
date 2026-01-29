import os
import requests
from dotenv import load_dotenv

load_dotenv()

CLIENT_ID = os.getenv("STRAVA_CLIENT_ID")
CLIENT_SECRET = os.getenv("STRAVA_CLIENT_SECRET")
# 正式環境 URL
NEW_CALLBACK_URL = "https://service.criterium.tw/webhook/strava-webhook"
# 驗證 Token (必須與 webhook 程式碼中的一致)
VERIFY_TOKEN = "STRAVA"

def get_subscriptions():
    url = f"https://www.strava.com/api/v3/push_subscriptions?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error getting subscriptions: {response.text}")
        return []

def delete_subscription(sub_id):
    url = f"https://www.strava.com/api/v3/push_subscriptions/{sub_id}?client_id={CLIENT_ID}&client_secret={CLIENT_SECRET}"
    response = requests.delete(url)
    if response.status_code == 204:
        print(f"Deleted subscription {sub_id}")
        return True
    else:
        print(f"Error deleting subscription {sub_id}: {response.text}")
        return False

def create_subscription():
    url = "https://www.strava.com/api/v3/push_subscriptions"
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "callback_url": NEW_CALLBACK_URL,
        "verify_token": VERIFY_TOKEN
    }
    response = requests.post(url, data=payload)
    if response.status_code == 201:
        print(f"Successfully created subscription: {response.json()}")
    else:
        print(f"Error creating subscription: {response.text}")

def main():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Error: STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not set in .env")
        return

    print("Checking existing subscriptions...")
    subs = get_subscriptions()
    
    needs_update = True
    for sub in subs:
        print(f"Found subscription: ID={sub['id']}, URL={sub['callback_url']}")
        if sub['callback_url'] == NEW_CALLBACK_URL:
            print("Subscription already matches new URL. No action needed.")
            needs_update = False
        else:
            print("Deleting old subscription...")
            delete_subscription(sub['id'])
    
    if needs_update:
        print(f"Creating new subscription to {NEW_CALLBACK_URL}...")
        create_subscription()

if __name__ == "__main__":
    main()
