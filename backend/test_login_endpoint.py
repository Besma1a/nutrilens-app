#!/usr/bin/env python
"""Test the admin login endpoint directly"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
import json

User = get_user_model()

# Create test client
client = Client()

print("Testing admin login endpoint...")
print("="*60)

# Test data
test_email = "admin@nutrilens.com"
test_password = "Admin1234!"

payload = {
    "email": test_email,
    "password": test_password
}

print(f"Sending POST to /api/admin/login")
print(f"Payload: {json.dumps(payload, indent=2)}")
print()

# Test the endpoint
response = client.post(
    '/api/admin/login',
    data=json.dumps(payload),
    content_type='application/json'
)

print(f"Status Code: {response.status_code}")
print(f"Response Content: {response.content.decode()}")
print()

if response.status_code == 200:
    print("✓ LOGIN SUCCESSFUL!")
    data = response.json()
    print(f"  Token: {data.get('token', 'N/A')[:50]}...")
    print(f"  Admin: {data.get('admin', 'N/A')}")
else:
    print(f"✗ LOGIN FAILED")
    print("Check if the endpoint is working correctly")
