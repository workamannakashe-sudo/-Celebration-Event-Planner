/**
 * @file shared/engine/templates/baby_shower.js
 * @description Full template configuration for Baby Shower / Godh Bharai / Dohale Jevan.
 */

export const babyShowerTemplate = {
  type: 'baby_shower',
  label: 'Baby Shower',
  defaultName: 'Godh Bharai Ceremony',
  comfortPricePerHead: 550,
  idealLeadWeeks: 8,
  defaultShowUpRate: 0.82,
  showUpBand: { min: 0.72, max: 0.90 },
  defaultBuffer: 0.07,
  baseWeights: {
    'Venue': 22,
    'Catering': 36,
    'Decor & Flowers': 16,
    'Photo & Video': 8,
    'Invites & Favors': 8,
    'Logistics & Comfort': 10,
  },
  taskGraph: [
    { id: 'bs_date', task: 'Fix auspicious muhurat date with family elders', weeksBefore: 8, durationWeeks: 1, dependsOn: [], owner: 'Host' },
    { id: 'bs_venue', task: 'Book air-conditioned intimate venue with comfortable seating', weeksBefore: 7, durationWeeks: 2, dependsOn: ['bs_date'], owner: 'Host' },
    { id: 'bs_caterer', task: 'Lock caterer with traditional regional sweets and sattvic options', weeksBefore: 5, durationWeeks: 1, dependsOn: ['bs_venue'], owner: 'Host' },
    { id: 'bs_decor', task: 'Finalise swing / jhula decor with marigold and pastel fabrics', weeksBefore: 4, durationWeeks: 1, dependsOn: ['bs_venue'], owner: 'Host' },
    { id: 'bs_invites', task: 'Send digital WhatsApp invitations and confirm attendees', weeksBefore: 3, durationWeeks: 1, dependsOn: ['bs_venue'], owner: 'Host' },
    { id: 'bs_ceremony', task: 'Godh Bharai Celebrations 🌸', weeksBefore: 0, durationWeeks: 1, dependsOn: ['bs_invites'], owner: 'All' },
  ],
  vendorCategories: [
    { slug: 'venue', name: 'Banquet / Garden Hall', askQuestion: 'Is the hall wheelchair and elder-accessible with elevator access?' },
    { slug: 'catering', name: 'Traditional Caterer', askQuestion: 'Can you prepare custom ladoos and pedhas for the ritual thaal?' },
    { slug: 'decor', name: 'Floral Swing & Stage Decor', askQuestion: 'Do you provide safe floral swing cushioning for the mother-to-be?' },
  ],
  addOns: [
    { id: 'add_floral_jewellery', name: 'Fresh Floral Jewellery Set', costModel: 'per_event', unitCost: 4500, description: 'Handcrafted fresh jasmine & orchid jewellery for mother' },
    { id: 'add_custom_favours', name: 'Silver Coin or Dry Fruit Potlis', costModel: 'per_guest', unitCost: 140, description: 'Traditional velvet potli favors with almonds and cardamom' },
  ],
  savingsLevers: [
    { id: 'sav_home_puja', name: 'Perform rituals at home, lunch at nearby restaurant', minSaving: 18000, maxSaving: 35000, tradeOff: 'Space constraints for large gathering', regretWeight: 2 },
    { id: 'sav_diy_jhula', name: 'Decorate home swing using local florist flowers', minSaving: 8000, maxSaving: 15000, tradeOff: 'Family setup effort on morning', regretWeight: 1 },
  ],
  runSheetBlocks: [
    { time: '10:30 AM', title: 'Traditional Welcome & Tilak / Aarti', owner: 'Elders' },
    { time: '11:15 AM', title: 'Godh Bharai Rituals, Gifts & Blessing Songs', owner: 'Women Elders' },
    { time: '12:45 PM', title: 'Special Feast (Puran Poli / Payasam / 7-Curry Spread)', owner: 'Caterer' },
  ],
  redFlags: [
    'Venue with steep stairs and no elevator for expectant mothers and grandparents',
  ],
};
