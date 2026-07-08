def compute_price(occupancy_pct, base_currency='INR'):
    """Dynamic pricing based on occupancy percentage."""
    if occupancy_pct > 90:
        return {'price_per_hour': 60, 'currency': base_currency}
    if occupancy_pct > 70:
        return {'price_per_hour': 40, 'currency': base_currency}
    return {'price_per_hour': 20, 'currency': base_currency}
