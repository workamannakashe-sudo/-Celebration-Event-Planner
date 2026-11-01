/**
 * @file shared/engine/templates/birthday.js
 * @description Full template configuration for Milestone & Kids Birthday celebrations.
 */

export const birthdayTemplate = {
  type: 'birthday',
  label: 'Birthday',
  defaultName: "Aarav's 1st Birthday",
  comfortPricePerHead: 450,
  idealLeadWeeks: 6,
  defaultShowUpRate: 0.80,
  showUpBand: { min: 0.70, max: 0.88 },
  defaultBuffer: 0.07,
  baseWeights: {
    'Venue': 20,
    'Catering': 35,
    'Decor & Balloons': 14,
    'Cake & Desserts': 9,
    'Entertainment': 12,
    'Invites & Return Gifts': 6,
    'Photo & Video': 4,
  },
  taskGraph: [
    { id: 'b_theme', task: 'Pick celebration theme and guest headcount', weeksBefore: 6, durationWeeks: 1, dependsOn: [], owner: 'Host' },
    { id: 'b_venue', task: 'Book party hall or lawn', weeksBefore: 5, durationWeeks: 1, dependsOn: ['b_theme'], owner: 'Host' },
    { id: 'b_caterer', task: 'Confirm caterer with kid-friendly snack menu', weeksBefore: 4, durationWeeks: 1, dependsOn: ['b_venue'], owner: 'Host' },
    { id: 'b_invites', task: 'Send WhatsApp digital video invitations', weeksBefore: 3, durationWeeks: 1, dependsOn: ['b_venue'], owner: 'Host' },
    { id: 'b_cake_decor', task: 'Order theme cake and balloon arch decorator', weeksBefore: 2, durationWeeks: 1, dependsOn: ['b_theme'], owner: 'Host' },
    { id: 'b_rsvps', task: 'Finalise headcount and pack return gift bags', weeksBefore: 1, durationWeeks: 1, dependsOn: ['b_invites'], owner: 'Host' },
    { id: 'b_party', task: 'Party Time! 🎂', weeksBefore: 0, durationWeeks: 1, dependsOn: ['b_rsvps'], owner: 'All' },
  ],
  vendorCategories: [
    { slug: 'venue', name: 'Party Hall / Play Zone', askQuestion: 'Is cleanup included? Can we bring external entertainment/magicians?' },
    { slug: 'catering', name: 'Caterer / Snacks', askQuestion: 'Can you provide kid-friendly mini burgers, pasta and mocktails?' },
    { slug: 'cake', name: 'Custom Cake Bakery', askQuestion: 'Do you deliver and set up tiered fondant cakes at the venue?' },
    { slug: 'decor', name: 'Balloon & Theme Decor', askQuestion: 'How long does the balloon backdrop take to install?' },
    { slug: 'entertainment', name: 'Magician / Emcee / Games', askQuestion: 'What age group is your 45-minute interactive show designed for?' },
  ],
  addOns: [
    { id: 'add_magician', name: 'Professional Magician & Illusionist', costModel: 'per_event', unitCost: 8000, description: '45-minute interactive magic and balloon twisting' },
    { id: 'add_cotton_candy', name: 'Live Cotton Candy & Popcorn Stalls', costModel: 'per_event', unitCost: 6000, description: 'Unlimited candy floss and buttery popcorn cart' },
    { id: 'add_tattoo_artist', name: 'Kids Face Painting & Glitter Tattoos', costModel: 'per_event', unitCost: 5000, description: 'Non-toxic organic body paint for children' },
    { id: 'add_deluxe_hampers', name: 'Curated Educational Return Hampers', costModel: 'per_guest', unitCost: 180, description: 'Personalised STEM activity kits with stationery' },
  ],
  savingsLevers: [
    { id: 'sav_home_society', name: 'Host in society clubhouse instead of commercial hall', minSaving: 15000, maxSaving: 35000, tradeOff: 'Self-manage security and garbage clearing', regretWeight: 1 },
    { id: 'sav_diy_decor', name: 'DIY balloon garland kit with family', minSaving: 6000, maxSaving: 14000, tradeOff: 'Requires 2-3 hours setup effort', regretWeight: 2 },
    { id: 'sav_snack_menu', name: 'High-tea snack menu instead of heavy dinner buffet', minSaving: 10000, maxSaving: 22000, tradeOff: 'Afternoon 4 PM timing', regretWeight: 2 },
    { id: 'sav_digital_invite', name: 'Animated Canva video invite instead of printed kits', minSaving: 3000, maxSaving: 6000, tradeOff: 'No paper cards', regretWeight: 1 },
  ],
  runSheetBlocks: [
    { time: '04:00 PM', title: 'Balloon Backdrop & Sound Setup', owner: 'Decorator' },
    { time: '05:00 PM', title: 'Guests Arrive & Welcome Drinks / Chaat', owner: 'Host' },
    { time: '05:45 PM', title: 'Kids Games & Magician Performance', owner: 'Emcee' },
    { time: '06:45 PM', title: 'Cake Cutting Celebration & Birthday Song', owner: 'Host / Family' },
    { time: '07:15 PM', title: 'Dinner Buffet Opens & Return Gifts Handed', owner: 'Caterer' },
  ],
  redFlags: [
    'Non-refundable booking fee without venue inspection',
    'Caterer unable to provide food allergy or jain options',
    'Entertainer with no video clips of past live performances',
  ],
};
