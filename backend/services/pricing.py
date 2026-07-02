def compute_price(occupancy_pct, base_currency='INR'):
    # occupancy_pct is percentage (0-100) of occupied slots
    if occupancy_pct < 50:
        return {'price_per_hour': 20, 'currency': base_currency}
    if 50 <= occupancy_pct <= 80:
        return {'price_per_hour': 40, 'currency': base_currency}
    return {'price_per_hour': 60, 'currency': base_currency}
