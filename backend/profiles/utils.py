# profiles/utils.py
from decimal import Decimal

ACTIVITY_LEVELS = {
    'sedentary': 1.2,        # Little or no exercise
    'lightly_active': 1.375, # Light exercise/sports 1-3 days/week
    'moderately_active': 1.55, # Moderate exercise/sports 3-5 days/week
    'very_active': 1.725,     # Hard exercise/sports 6-7 days a week
    'extremely_active': 1.9   # Very hard exercise/sports & physical job
}

def calculate_bmr(weight_kg, height_cm, age, gender):
    """
    Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
    
    Formula:
    - Men: BMR = 10 * weight + 6.25 * height - 5 * age + 5
    - Women: BMR = 10 * weight + 6.25 * height - 5 * age - 161
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: 'male' or 'female'
    
    Returns:
        BMR in calories (float)
    """
    if not all([weight_kg, height_cm, age, gender]):
        return None
    
    weight = Decimal(str(weight_kg))
    height = Decimal(str(height_cm))
    age_years = Decimal(str(age))
    
    bmr = (10 * weight) + (6.25 * height) - (5 * age_years)
    
    if gender.lower() == 'male':
        bmr += 5
    else:  # female
        bmr -= 161
    
    return float(bmr)

def calculate_tdee(bmr, activity_level):
    """
    Calculate Total Daily Energy Expenditure by applying activity multiplier to BMR.
    
    Args:
        bmr: Basal Metabolic Rate
        activity_level: One of the keys from ACTIVITY_LEVELS
    
    Returns:
        TDEE in calories (float)
    """
    if bmr is None or activity_level not in ACTIVITY_LEVELS:
        return None
    
    multiplier = Decimal(str(ACTIVITY_LEVELS[activity_level]))
    tdee = Decimal(str(bmr)) * multiplier
    
    return float(tdee)

def calculate_daily_calorie_goal(weight_kg, height_cm, age, gender, activity_level, goal='maintain'):
    """
    Calculate daily calorie goal based on personal metrics and goals.
    
    Args:
        weight_kg: Weight in kilograms
        height_cm: Height in centimeters
        age: Age in years
        gender: 'male' or 'female'
        activity_level: Activity level key from ACTIVITY_LEVELS
        goal: 'lose', 'maintain', or 'gain'
    
    Returns:
        Daily calorie goal (int)
    """
    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)
    
    if tdee is None:
        return None
    
    # Adjust based on goal
    if goal == 'lose':
        # 500 calorie deficit for ~1 lb/week loss
        daily_goal = tdee - 500
    elif goal == 'gain':
        # 500 calorie surplus for ~1 lb/week gain
        daily_goal = tdee + 500
    else:  # maintain
        daily_goal = tdee
    
    return max(1200, int(round(daily_goal)))  # Minimum 1200 calories

def calculate_macro_goals(daily_calories, goal='maintain', activity_level='moderately_active'):
    """
    Calculate macro goals based on daily calories and fitness goals.
    
    Args:
        daily_calories: Daily calorie target
        goal: 'lose', 'maintain', or 'gain'
        activity_level: Activity level for protein calculations
    
    Returns:
        Dictionary with protein, carbs, and fat goals in grams
    """
    if daily_calories is None:
        return {'protein_g': None, 'carbs_g': None, 'fat_g': None}
    
    calories = Decimal(str(daily_calories))
    
    # Protein: Higher for weight loss, moderate for maintenance, higher for gain
    if goal == 'lose':
        protein_ratio = 0.35  # 35% of calories from protein
    elif goal == 'gain':
        protein_ratio = 0.30  # 30% of calories from protein
    else:  # maintain
        protein_ratio = 0.25  # 25% of calories from protein
    
    # Fat: Essential for hormones, minimum 20%
    fat_ratio = 0.25  # 25% of calories from fat
    
    # Carbs: Remainder
    carbs_ratio = 1.0 - protein_ratio - fat_ratio
    
    # Convert to grams (4 cal/g for protein/carbs, 9 cal/g for fat)
    protein_calories = calories * Decimal(str(protein_ratio))
    fat_calories = calories * Decimal(str(fat_ratio))
    carbs_calories = calories * Decimal(str(carbs_ratio))
    
    protein_g = float(protein_calories / 4)
    fat_g = float(fat_calories / 9)
    carbs_g = float(carbs_calories / 4)
    
    return {
        'protein_g': round(protein_g, 1),
        'carbs_g': round(carbs_g, 1),
        'fat_g': round(fat_g, 1)
    }

def infer_goal_from_weights(current_weight, goal_weight):
    """
    Infer weight goal based on current vs target weight.
    
    Args:
        current_weight: Current weight in kg
        goal_weight: Goal weight in kg
    
    Returns:
        'lose', 'maintain', or 'gain'
    """
    if current_weight is None or goal_weight is None:
        return 'maintain'
    
    weight_diff = current_weight - goal_weight
    
    if abs(weight_diff) < 1.0:  # Within 1kg
        return 'maintain'
    elif weight_diff > 0:
        return 'lose'
    else:
        return 'gain'