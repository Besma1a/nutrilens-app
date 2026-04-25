# meals/throttles.py
"""
Custom throttle for the AI meal-image upload endpoint.

Uses the 'ai_upload' scope defined in settings.DEFAULT_THROTTLE_RATES (30/hour).
Apply with:  throttle_classes = [AiUploadThrottle]
"""

from rest_framework.throttling import UserRateThrottle


class AiUploadThrottle(UserRateThrottle):
    """
    Throttle specifically for POST /api/v1/meals/meals/ (AI image upload).
    Separate scope so it can be tuned independently from normal user rate.
    """
    scope = "ai_upload"
