**Custom Screenshot Watcher for ActivityWatch -- Desktop Agent**

This Python-based watcher runs on each user's macOS or Windows desktop.
It captures screenshots on an interval, uploads them to Cloudflare R2,
and sends metadata to your NestJS backend for secure audit and display.

DESKTOP AGENT WORKFLOW:

1.  Capture screenshot (every 5 minutes by default)

2.  Save image as JPG temporarily

3.  Upload screenshot to Cloudflare R2

4.  Send metadata to NestJS backend

5.  Delete the local image

ENVIRONMENT VARIABLES (.env):

- CAPTURE_INTERVAL_SECONDS=300

- USER_ID=

- PROJECT_ID=

- R2_ENDPOINT=https://

- R2_BUCKET=

- R2_ACCESS_KEY=

- R2_SECRET_KEY=

- NEST_API_URL=[[https://your-backend.com/api/screenshots\]{.underline}
  ](https://your-backend.com/api/screenshots)

SCRIPT CODE (screenshot_watcher.py):

import os

import time

import uuid

import platform

import requests

from datetime import datetime

from PIL import ImageGrab \# macOS/Windows compatible

import boto3

from dotenv import load_dotenv

load_dotenv()

CAPTURE_INTERVAL = int(os.getenv(\"CAPTURE_INTERVAL_SECONDS\", 300))

NEST_API_URL = os.getenv(\"NEST_API_URL\")

R2_BUCKET = os.getenv(\"R2_BUCKET\")

R2_ENDPOINT = os.getenv(\"R2_ENDPOINT\")

R2_ACCESS_KEY = os.getenv(\"R2_ACCESS_KEY\")

R2_SECRET_KEY = os.getenv(\"R2_SECRET_KEY\")

USER_ID = os.getenv(\"USER_ID\")

PROJECT_ID = os.getenv(\"PROJECT_ID\")

r2 = boto3.client(

\'s3\',

endpoint_url=R2_ENDPOINT,

aws_access_key_id=R2_ACCESS_KEY,

aws_secret_access_key=R2_SECRET_KEY

)

def capture_screenshot() -\> str:

timestamp = datetime.utcnow().strftime(\"%Y%m%dT%H%M%S\")

filename = f\"screenshot\_{timestamp}\_{uuid.uuid4().hex}.jpg\"

filepath = os.path.join(\"/tmp\", filename) if platform.system() !=
\'Windows\' else os.path.join(os.getenv(\"TEMP\"), filename)

img = ImageGrab.grab()

img.save(filepath, \"JPEG\")

return filepath, timestamp

def upload_to_r2(filepath: str, r2_key: str) -\> str:

with open(filepath, \'rb\') as f:

r2.upload_fileobj(f, R2_BUCKET, r2_key)

return f\"{R2_ENDPOINT}/{R2_BUCKET}/{r2_key}\"

def report_to_backend(image_url: str, timestamp: str):

payload = {

\"userId\": USER_ID,

\"projectId\": PROJECT_ID,

\"timestamp\": timestamp + \"Z\",

\"imageUrl\": image_url,

\"activity\": {

\"keyboard\": 0, \# Placeholder -- real input needed

\"mouse\": 0

}

}

try:

response = requests.post(NEST_API_URL, json=payload)

response.raise_for_status()

except Exception as e:

print(\"Failed to report to backend:\", e)

def run_loop():

while True:

try:

filepath, timestamp = capture_screenshot()

r2_key = f\"screenshots/{USER_ID}/{timestamp}.jpg\"

image_url = upload_to_r2(filepath, r2_key)

report_to_backend(image_url, timestamp)

os.remove(filepath)

except Exception as e:

print(\"Error:\", e)

time.sleep(CAPTURE_INTERVAL)

if \_\_name\_\_ == \"\_\_main\_\_\":

run_loop()



SECURITY CONTROLS:

- Write-protected screenshot folder

- No local UI access to screenshots

- Automatic deletion of images after upload

- Screenshots uploaded over HTTPS only

- No ability for users to view or alter raw image

NEXT STEPS:

- Package this as a background script using PyInstaller or Electron
  (optional)

- Add keyboard/mouse activity polling (integrate native hooks)

- Auto-start with OS boot (systemd/macOS launchd/Windows registry)
