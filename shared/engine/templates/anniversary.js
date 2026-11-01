/**
 * @file shared/engine/templates/anniversary.js
 * @description Full template configuration for Anniversary Celebrations.
 */

export const anniversaryTemplate = {
  type: 'anniversary',
  label: 'Anniversary',
  defaultName: 'Silver Jubilee Celebration',
  comfortPricePerHead: 750,
  idealLeadWeeks: 12,
  defaultShowUpRate: 0.82,
  showUpBand: { min: 0.72, max: 0.90 },
  defaultBuffer: 0.07,
  baseWeights: {
    'Venue': 24,
    'Catering': 34,
    'Decor & Flowers': 14,
    'Photo & Video': 10,
    'Music & Entertainment': 8,
    'Invites & Gifts': 5,
    'Logistics': 5,
  },
  taskGraph: [
    { id: 'a_date_venue', task: 'Lock anniversary date and intimate banquet hall', weeksBefore: 12, durationWeeks: 2, dependsOn: [], owner: 'Host' },
    { id: 'a_caterer', task: 'Book gourmet caterer with nostalgic family recipes', weeksBefore: 10, durationWeeks: 2, dependsOn: ['a_date_venue'], owner: 'Host' },
    { id: 'a_video', task: 'Compile vintage family photos and memory video reel', weeksBefore: 6, durationWeeks: 3, dependsOn: [], owner: 'Children' },
    { id: 'a_invites', task: 'Send personalised digital & gold-foil cards', weeksBefore: 4, durationWeeks: 1, dependsOn: ['a_date_venue'], owner: 'Host' },
    { id: 'a_music', task: 'Book acoustic retro band or singer', weeksBefore: 3, durationWeeks: 1, dependsOn: ['a_date_venue'], owner: 'Host' },
    { id: 'a_final', task: 'Anniversary Celebration Dinner 🥂', weeksBefore: 0, durationWeeks: 1, dependsOn: ['a_music'], owner: 'All' },
  ],
  vendorCategories: [
    { slug: 'venue', name: 'Banquet Hall / Lawn', askQuestion: 'Can we screen a 20-minute video presentation on your audio system?' },
    { slug: 'catering', name: 'Caterer', askQuestion: 'Can you recreate a signature dish from our wedding day?' },
    { slug: 'photo', name: 'Portrait Photographer', askQuestion: 'Do you offer a pre-event couple portrait session?' },
  ],
  addOns: [
    { id: 'add_retro_trio', name: 'Vintage Retro Acoustic Trio (Violin/Flute/Keys)', costModel: 'per_event', unitCost: 16000, description: 'Live romantic classics and golden oldies' },
    { id: 'add_champagne_tower', name: 'Mocktail / Toasting Flute Pyramid', costModel: 'per_event', unitCost: 7000, description: 'Festive glass tower for couple toast' },
  ],
  savingsLevers: [
    { id: 'sav_family_hall', name: 'Host at rooftop / private lawn', minSaving: 20000, maxSaving: 40000, tradeOff: 'More vendor coordination needed', regretWeight: 1 },
    { id: 'sav_digital_memories', name: 'Digital memory book instead of printed physical albums', minSaving: 6000, maxSaving: 12000, tradeOff: 'No tactile print', regretWeight: 2 },
  ],
  runSheetBlocks: [
    { time: '06:30 PM', title: 'Welcome Drinks & Nostalgia Photo Gallery Walk', owner: 'Host' },
    { time: '07:30 PM', title: 'Couple Vow Renewal & Ring Exchange', owner: 'Couple' },
    { time: '08:15 PM', title: 'Memory Reel Screening & Family Speeches', owner: 'Children' },
    { time: '09:00 PM', title: 'Dinner Buffet & Cake Toast', owner: 'Caterer' },
  ],
  redFlags: [
    'Venue with poor projection screen / sound quality for audio-visual tribute',
  ],
};
