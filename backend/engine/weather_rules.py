"""
Category → Weather Impact Rules
Defines how different weather conditions affect food demand per category.
"""

def compute_weather_factor(category: str, weather: dict) -> float:
    """
    Returns a demand multiplier based on weather and food category.
    E.g. 1.30 = 30% more demand expected, 0.70 = 30% less.

    Rules derived from:
    - General food psychology (hot weather → cold drinks/ice cream)
    - Indian eating habits (rain → hot food, biryani, soups)
    - Kandukur local context (pre-monsoon Jun–Sep)
    """
    if not weather:
        return 1.0

    condition   = (weather.get("condition") or "Sunny").lower()
    max_temp    = weather.get("max_temp",    32.0)
    rainfall_mm = weather.get("rainfall_mm", 0.0)

    is_rainy   = rainfall_mm > 2.0  or "rain"   in condition or "drizzle" in condition
    is_storm   = "thunderstorm" in condition
    is_hot     = max_temp >= 38              # Kandukur summer: 38-44°C
    is_warm    = 32 <= max_temp < 38
    is_cool    = max_temp < 30              # unusual cool day

    # ── Per-category weather adjustments ──────────────────────────────────────
    factors = {
        # Hot biryanis sell more in rain; slight drop on very hot dry days (people eat less)
        "biryani":     1.25 if is_rainy or is_storm else
                       0.95 if is_hot              else 1.0,

        # Chicken dishes: stable; slight rain boost (comfort food)
        "chicken":     1.15 if is_rainy or is_storm else 1.0,

        # Soups: strong rainy boost
        "soup":        1.50 if is_rainy or is_storm else
                       1.10 if is_cool              else 0.85,

        # Cold beverages: massive heat boost, heavy rain drop
        "beverage":    0.55 if is_storm else
                       0.70 if is_rainy else
                       1.60 if is_hot   else
                       1.20 if is_warm  else 1.0,

        # Ice cream: extreme heat boost, rain drop
        "ice_cream":   0.40 if is_rainy or is_storm else
                       1.80 if is_hot               else
                       1.20 if is_warm              else 1.0,

        # Breads / Naan: consistent demand, slight rainy uplift
        "bread":       1.10 if is_rainy else 1.0,

        # Rice dishes: stable
        "rice":        1.05 if is_rainy else 1.0,

        # Starters: slight drop in heavy rain (fewer casual orders)
        "starter":     0.85 if is_storm else
                       0.90 if is_rainy else 1.0,

        # Seafood: stable but fish sells slightly better in cool/rainy
        "seafood":     1.15 if is_rainy else 1.0,

        # Eggs: stable
        "egg":         1.10 if is_rainy else 1.0,

        # Family packs: slight rainy uplift (takeaways)
        "family_pack": 1.20 if is_rainy else 1.0,

        # Dairy (curd, paneer): stable
        "dairy":       0.90 if is_hot else 1.0,

        "other":       1.0,
    }

    return round(factors.get(category, 1.0), 3)


def get_weather_description(weather: dict) -> str:
    """Human-readable weather summary for the UI reason string."""
    if not weather:
        return ""
    cond   = weather.get("condition", "Unknown")
    temp   = weather.get("max_temp",   "--")
    rain   = weather.get("rainfall_mm", 0)
    if rain > 2:
        return f"🌧️ {cond} ({temp}°C, {rain}mm rain)"
    return f"☀️ {cond} ({temp}°C)"
