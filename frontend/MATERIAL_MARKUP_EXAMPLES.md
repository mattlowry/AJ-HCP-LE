# Material Markup Pricing Examples

## Tiered Markup System Implementation

The materials catalog now includes an automatic tiered markup system that applies different markup percentages based on material cost ranges. This is common practice in electrical contracting where lower-cost items get higher markup percentages.

### Markup Tiers Configured:

| Cost Range | Markup % | Reasoning |
|------------|----------|-----------|
| $0 - $25 | 50% | Small items, high handling cost relative to value |
| $25.01 - $50 | 40% | Common switches, outlets, small fixtures |
| $50.01 - $100 | 35% | Standard electrical components |
| $100.01 - $250 | 30% | Circuit breakers, panels, larger fixtures |
| $250.01 - $500 | 25% | Electrical panels, high-end fixtures |
| $500+ | 20% | EV chargers, large equipment |

### Example Pricing with Automatic Markup:

#### Low-Cost Items (High Markup)
- **Outlet Cover Plate** - Cost: $0.78 → Customer Price: $1.17 (50% markup)
- **Standard 15A Outlet** - Cost: $1.48 → Customer Price: $2.22 (50% markup)
- **Wire Nuts (100 pack)** - Cost: $12.98 → Customer Price: $19.47 (50% markup)

#### Mid-Range Items (Moderate Markup)
- **GFCI Outlet** - Cost: $18.97 → Customer Price: $26.56 (40% markup)
- **LED Dimmer Switch** - Cost: $24.98 → Customer Price: $34.97 (40% markup)
- **Square D 20A Breaker** - Cost: $16.47 → Customer Price: $23.06 (40% markup)

#### Higher-Cost Items (Lower Markup)
- **200A Main Panel** - Cost: $445.00 → Customer Price: $556.25 (25% markup)
- **Smart EV Charger** - Cost: $699.00 → Customer Price: $838.80 (20% markup)

### Features Implemented:

1. **Automatic Calculation**: Markup is applied automatically based on cost price
2. **Visual Display**: Each material shows both cost price and markup percentage
3. **Tier Information**: Dialog displays current markup tiers for transparency
4. **Inventory Integration**: Works with both real inventory data and fallback catalog
5. **Flexible Configuration**: Markup tiers can be easily adjusted

### UI Enhancements:

- Material cards show: Cost price, markup percentage, and final customer price
- Markup tier display shows all configured tiers at the top of the materials dialog
- Clear indication that prices include markup for transparency

### Business Benefits:

- **Profit Protection**: Ensures minimum markup on all materials
- **Competitive Pricing**: Higher markup on low-cost items, competitive on expensive items
- **Automated Process**: No manual markup calculation required
- **Transparency**: Clear cost breakdown for internal use
- **Flexibility**: Easy to adjust markup tiers based on market conditions

This system ensures profitable pricing while remaining competitive, especially on higher-value items where customers are more price-sensitive.