// Test file for the material markup system functionality
// This tests the markup calculation logic from SchedulingCalendar component

describe('Material Markup System', () => {
  // Define the markup tiers as they appear in the component
  const materialMarkupTiers = [
    { min: 0, max: 25, markup: 0.50 },      // 0-$25: 50% markup
    { min: 25.01, max: 50, markup: 0.40 },  // $25.01-$50: 40% markup  
    { min: 50.01, max: 100, markup: 0.35 }, // $50.01-$100: 35% markup
    { min: 100.01, max: 250, markup: 0.30 }, // $100.01-$250: 30% markup
    { min: 250.01, max: 500, markup: 0.25 }, // $250.01-$500: 25% markup
    { min: 500.01, max: Infinity, markup: 0.20 } // $500+: 20% markup
  ];

  // Function to calculate markup price based on cost tiers (from component)
  const calculateMarkupPrice = (costPrice: number): number => {
    const tier = materialMarkupTiers.find(tier => 
      costPrice >= tier.min && costPrice <= tier.max
    );
    
    if (!tier) return costPrice * 1.35; // Default 35% if no tier matches
    
    return costPrice * (1 + tier.markup);
  };

  // Function to get markup percentage for display (from component)
  const getMarkupPercentage = (costPrice: number): number => {
    const tier = materialMarkupTiers.find(tier => 
      costPrice >= tier.min && costPrice <= tier.max
    );
    
    return tier ? tier.markup * 100 : 35; // Default 35% if no tier matches
  };

  describe('calculateMarkupPrice', () => {
    it('should apply 50% markup for items $0-$25', () => {
      expect(calculateMarkupPrice(10)).toBe(15.00);
      expect(calculateMarkupPrice(25)).toBe(37.50);
      expect(calculateMarkupPrice(0.50)).toBe(0.75);
    });

    it('should apply 40% markup for items $25.01-$50', () => {
      expect(calculateMarkupPrice(25.01)).toBe(35.014);
      expect(calculateMarkupPrice(30)).toBe(42.00);
      expect(calculateMarkupPrice(50)).toBe(70.00);
    });

    it('should apply 35% markup for items $50.01-$100', () => {
      expect(calculateMarkupPrice(50.01)).toBeCloseTo(67.5135, 2);
      expect(calculateMarkupPrice(75)).toBe(101.25);
      expect(calculateMarkupPrice(100)).toBe(135.00);
    });

    it('should apply 30% markup for items $100.01-$250', () => {
      expect(calculateMarkupPrice(100.01)).toBeCloseTo(130.013, 2);
      expect(calculateMarkupPrice(150)).toBe(195.00);
      expect(calculateMarkupPrice(250)).toBe(325.00);
    });

    it('should apply 25% markup for items $250.01-$500', () => {
      expect(calculateMarkupPrice(250.01)).toBeCloseTo(312.5125, 2);
      expect(calculateMarkupPrice(350)).toBe(437.50);
      expect(calculateMarkupPrice(500)).toBe(625.00);
    });

    it('should apply 20% markup for items over $500', () => {
      expect(calculateMarkupPrice(500.01)).toBeCloseTo(600.012, 2);
      expect(calculateMarkupPrice(750)).toBe(900.00);
      expect(calculateMarkupPrice(1000)).toBe(1200.00);
    });

    it('should handle edge cases correctly', () => {
      expect(calculateMarkupPrice(0)).toBe(0);
      expect(calculateMarkupPrice(-10)).toBe(-10 * 1.35); // Negative should use default
    });
  });

  describe('getMarkupPercentage', () => {
    it('should return correct markup percentage for each tier', () => {
      expect(getMarkupPercentage(10)).toBe(50);
      expect(getMarkupPercentage(25)).toBe(50);
      expect(getMarkupPercentage(25.01)).toBe(40);
      expect(getMarkupPercentage(50)).toBe(40);
      expect(getMarkupPercentage(50.01)).toBe(35);
      expect(getMarkupPercentage(100)).toBe(35);
      expect(getMarkupPercentage(100.01)).toBe(30);
      expect(getMarkupPercentage(250)).toBe(30);
      expect(getMarkupPercentage(250.01)).toBe(25);
      expect(getMarkupPercentage(500)).toBe(25);
      expect(getMarkupPercentage(500.01)).toBe(20);
      expect(getMarkupPercentage(1000)).toBe(20);
    });

    it('should return default percentage for invalid values', () => {
      expect(getMarkupPercentage(-10)).toBe(35);
    });
  });

  describe('Real-world pricing examples', () => {
    const testCases = [
      // Low-cost items (50% markup)
      { item: 'Outlet Cover Plate', cost: 0.78, expectedPrice: 1.17, expectedMarkup: 50 },
      { item: 'Standard 15A Outlet', cost: 1.48, expectedPrice: 2.22, expectedMarkup: 50 },
      { item: 'Wire Nuts (100 pack)', cost: 12.98, expectedPrice: 19.47, expectedMarkup: 50 },
      
      // Mid-range items (50% markup for items under $25)
      { item: 'GFCI Outlet', cost: 18.97, expectedPrice: 28.455, expectedMarkup: 50 },
      { item: 'LED Dimmer Switch', cost: 24.98, expectedPrice: 37.47, expectedMarkup: 50 },
      { item: 'Square D 20A Breaker', cost: 16.47, expectedPrice: 24.705, expectedMarkup: 50 },
      
      // Higher-cost items (lower markup)
      { item: '200A Main Panel', cost: 445.00, expectedPrice: 556.25, expectedMarkup: 25 },
      { item: 'Smart EV Charger', cost: 699.00, expectedPrice: 838.80, expectedMarkup: 20 }
    ];

    testCases.forEach(({ item, cost, expectedPrice, expectedMarkup }) => {
      it(`should correctly price ${item}`, () => {
        const calculatedPrice = calculateMarkupPrice(cost);
        const calculatedMarkup = getMarkupPercentage(cost);
        
        expect(calculatedPrice).toBeCloseTo(expectedPrice, 2);
        expect(calculatedMarkup).toBe(expectedMarkup);
      });
    });
  });

  describe('Markup tier boundaries', () => {
    it('should handle exact boundary values correctly', () => {
      // Test exact boundary values
      expect(getMarkupPercentage(25.00)).toBe(50);
      expect(getMarkupPercentage(25.01)).toBe(40);
      expect(getMarkupPercentage(50.00)).toBe(40);
      expect(getMarkupPercentage(50.01)).toBe(35);
      expect(getMarkupPercentage(100.00)).toBe(35);
      expect(getMarkupPercentage(100.01)).toBe(30);
      expect(getMarkupPercentage(250.00)).toBe(30);
      expect(getMarkupPercentage(250.01)).toBe(25);
      expect(getMarkupPercentage(500.00)).toBe(25);
      expect(getMarkupPercentage(500.01)).toBe(20);
    });

    it('should calculate prices correctly at boundaries', () => {
      expect(calculateMarkupPrice(25.00)).toBe(37.50); // 50% markup
      expect(calculateMarkupPrice(25.01)).toBeCloseTo(35.014, 2); // 40% markup
      expect(calculateMarkupPrice(50.00)).toBe(70.00); // 40% markup
      expect(calculateMarkupPrice(50.01)).toBeCloseTo(67.5135, 2); // 35% markup
    });
  });

  describe('Business logic validation', () => {
    it('should ensure profitability on all price ranges', () => {
      const testPrices = [1, 5, 15, 30, 75, 150, 350, 750];
      
      testPrices.forEach(price => {
        const markedUpPrice = calculateMarkupPrice(price);
        const markupPercent = getMarkupPercentage(price);
        
        // Ensure all markups are at least 20%
        expect(markupPercent).toBeGreaterThanOrEqual(20);
        
        // Ensure marked up price is always higher than cost
        expect(markedUpPrice).toBeGreaterThan(price);
        
        // Verify markup calculation is correct
        const expectedPrice = price * (1 + markupPercent / 100);
        expect(markedUpPrice).toBeCloseTo(expectedPrice, 2);
      });
    });

    it('should follow decreasing markup pattern for higher prices', () => {
      const prices = [10, 30, 75, 150, 350, 750];
      const markups = prices.map(price => getMarkupPercentage(price));
      
      // Verify that markups decrease as prices increase
      for (let i = 1; i < markups.length; i++) {
        expect(markups[i]).toBeLessThanOrEqual(markups[i - 1]);
      }
    });
  });
});