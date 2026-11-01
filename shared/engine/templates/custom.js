/**
 * @file shared/engine/templates/custom.js
 * @description Full template configuration for Custom / Other celebration types.
 */

export const customTemplate = {
  type: 'custom',
  label: 'Other or Custom',
  defaultName: 'Special Celebration',
  comfortPricePerHead: 600,
  idealLeadWeeks: 8,
  defaultShowUpRate: 0.80,
  showUpBand: { min: 0.70, max: 0.90 },
  defaultBuffer: 0.07,
  baseWeights: {
    'Venue': 22,
    'Catering': 34,
    'Decor & Styling': 14,
    'Photo & Video': 10,
    'Entertainment': 10,
    'Invites & Gifts': 5,
    'Logistics': 5,
  },
  taskGraph: [
    { id: 'cu_date', task: 'Finalise date and celebration concept', weeksBefore: 8, durationWeeks: 1, dependsOn: [], owner: 'Host' },
    { id: 'cu_venue', task: 'Book celebration venue', weeksBefore: 7, durationWeeks: 2, dependsOn: ['cu_date'], owner: 'Host' },
    { id: 'cu_caterer', task: 'Confirm catering and menu style', weeksBefore: 5, durationWeeks: 1, dependsOn: ['cu_venue'], owner: 'Host' },
    { id: 'cu_decor', task: 'Arrange decor and ambiance lighting', weeksBefore: 3, durationWeeks: 1, dependsOn: ['cu_venue'], owner: 'Host' },
    { id: 'cu_invites', task: 'Send invitations and track RSVPs', weeksBefore: 2, durationWeeks: 1, dependsOn: ['cu_venue'], owner: 'Host' },
    { id: 'cu_event', task: 'Celebration Event! ✨', weeksBefore: 0, durationWeeks: 1, dependsOn: ['cu_invites'], owner: 'All' },
  ],
  vendorCategories: [
    { slug: 'venue', name: 'Venue', askQuestion: 'What are your timing restrictions and sound curfew rules?' },
    { slug: 'catering', name: 'Catering', askQuestion: 'Can you provide custom buffet presentation and table service?' },
  ],
  addOns: [
    { id: 'add_custom_bar', name: 'Artisan Mocktail & Beverage Bar', costModel: 'per_guest', unitCost: 110, description: 'Custom botanical sodas and seasonal fruit coolers' },
  ],
  savingsLevers: [
    { id: 'sav_digital_first', name: 'Go 100% digital for invites and event signage', minSaving: 8000, maxSaving: 18000, tradeOff: 'No paper cards', regretWeight: 1 },
  ],
  runSheetBlocks: [
    { time: '05:00 PM', title: 'Setup & Final Soundcheck', owner: 'Host' },
    { time: '06:00 PM', title: 'Guest Arrival & Welcome Refreshments', owner: 'Host' },
    { time: '07:30 PM', title: 'Main Program & Celebrations', owner: 'All' },
    { time: '08:30 PM', title: 'Dinner Service', owner: 'Caterer' },
  ],
  redFlags: [
    'Vendors without clear written quotes or scope of inclusions',
  ],
};
