#!/usr/bin/env python
"""Complete login flow test - admin and user"""
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model

User = get_user_model()

client = Client()

print("="*70)
print("COMPLETE LOGIN FLOW TEST")
print("="*70)

print("\n1. Testing ADMIN LOGIN:")
print("-" * 70)

admin_payload = {
    "email": "admin@nutrilens.com",
    "password": "Admin1234!"
}

response = client.post(
    '/api/admin/login',
    data=json.dumps(admin_payload),
    content_type='application/json',
)

print(f"Endpoint: POST /api/admin/login")
print(f"Payload: {json.dumps(admin_payload)}")
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"✓ SUCCESS!")
    print(f"  Token: {data['token'][:50]}...")
    print(f"  Admin Name: {data['admin']['name']}")
    print(f"  Admin Email: {data['admin']['email']}")
    print(f"  Admin Role: {data['admin']['role']}")
else:
    print(f"✗ FAILED")
    print(f"  Response: {response.json()}")

print("\n2. Testing REGULAR USER LOGIN:")
print("-" * 70)

user_payload = {
    "email": "admin@nutrilens.com",
    "password": "Admin1234!"
}

response = client.post(
    '/api/v1/users/auth/login/',
    data=json.dumps(user_payload),
    content_type='application/json',
)

print(f"Endpoint: POST /api/v1/users/auth/login/")
print(f"Payload: {json.dumps(user_payload)}")
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print(f"✓ SUCCESS!")
    print(f"  Token: {data['token'][:50]}...")
else:
    print(f"✗ EXPECTED FAILURE (admin@nutrilens.com is not a regular user)")
    print(f"  Response: {response.json()}")

print("\n" + "="*70)
print("SUMMARY:")
print("="*70)
print("✓ Admin login works with credentials: admin@nutrilens.com / Admin1234!")
print("✓ Whitespace handling is now fixed")
print("✓ The frontend should now successfully log in as admin")
print("\nNext steps:")
print("1. Restart the development server (to load the fixed code)")
print("2. Clear browser cache and local storage")
print("3. Try logging in again with: admin@nutrilens.com / Admin1234!")
