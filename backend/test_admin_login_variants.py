#!/usr/bin/env python
"""Test admin login with frontend-like headers and error handling"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model

User = get_user_model()

# Create test client
client = Client()

test_cases = [
    {
        "name": "Standard admin login",
        "email": "admin@nutrilens.com",
        "password": "Admin1234!"
    },
    {
        "name": "With extra whitespace",
        "email": "  admin@nutrilens.com  ",
        "password": "  Admin1234!  "
    },
    {
        "name": "Lowercase email",
        "email": "ADMIN@NUTRILENS.COM",
        "password": "Admin1234!"
    },
]

print("Testing admin login with different inputs...")
print("="*70)

for test in test_cases:
    email = test["email"]
    password = test["password"]
    
    payload = {
        "email": email,
        "password": password
    }
    
    print(f"\n{test['name']}:")
    print(f"  Email: '{email}'")
    print(f"  Password: '{password}'")
    
    response = client.post(
        '/api/admin/login',
        data=json.dumps(payload),
        content_type='application/json',
        HTTP_ACCEPT='application/json',
    )
    
    print(f"  Status: {response.status_code}")
    try:
        resp_data = response.json()
        if response.status_code == 200:
            print(f"  ✓ SUCCESS - Token: {resp_data.get('token', 'N/A')[:40]}...")
        else:
            print(f"  ✗ FAILED - Detail: {resp_data.get('detail', 'Unknown error')}")
    except:
        print(f"  Response: {response.content.decode()}")

print("\n" + "="*70)
print("All tests completed!")
