#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

import bcrypt
from adminpanel.models import AdminAccount

password = 'Admin1234!'

# Check if admin exists
admin = AdminAccount.objects.filter(email="admin@nutrilens.com").first()
if admin:
    print(f"Admin account found: {admin.email}")
    print(f"Stored hash: {admin.password_hash}")
    
    # Test if password matches
    try:
        match = bcrypt.checkpw(password.encode('utf-8'), admin.password_hash.encode('utf-8'))
        print(f"Password matches: {match}")
    except Exception as e:
        print(f"Error checking password: {e}")
else:
    print("Admin account not found!")

# Generate correct hash for Admin1234!
correct_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
print(f"\nNew hash for Admin1234!: {correct_hash}")
