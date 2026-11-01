/**
 * @file shared/engine/templates/corporate.js
 * @description Full template configuration for Corporate Offsites and Dinners.
 */

export const corporateTemplate = {
  type: 'corporate',
  label: 'Corporate',
  defaultName: 'Annual Gala & Awards Night',
  comfortPricePerHead: 1100,
  idealLeadWeeks: 8,
  defaultShowUpRate: 0.88,
  showUpBand: { min: 0.80, max: 0.95 },
  defaultBuffer: 0.05,
  baseWeights: {
    'Venue': 25,
    'Catering': 32,
    'Stage Sound & AV': 18,
    'Decor & Branding': 10,
    'Marketing & Awards': 8,
    'Logistics & Transport': 7,
  },
  taskGraph: [
    { id: 'corp_brief', task: 'Approve corporate budget and committee agenda', weeksBefore: 8, durationWeeks: 1, dependsOn: [], owner: 'Lead' },
    { id: 'corp_venue', task: 'Book hotel ballroom with conference AV capabilities', weeksBefore: 7, durationWeeks: 2, dependsOn: ['corp_brief'], owner: 'Procurement' },
    { id: 'corp_av', task: 'Contract LED wall, line-array audio and roving mics', weeksBefore: 5, durationWeeks: 2, dependsOn: ['corp_venue'], owner: 'AV Lead' },
    { id: 'corp_caterer', task: 'Confirm multi-cuisine corporate dinner spread', weeksBefore: 4, durationWeeks: 1, dependsOn: ['corp_venue'], owner: 'HR Committee' },
    { id: 'corp_awards', task: 'Manufacture customized crystal trophies and certificates', weeksBefore: 3, durationWeeks: 2, dependsOn: ['corp_brief'], owner: 'HR' },
    { id: 'corp_event', task: 'Gala Night & Town Hall 👔', weeksBefore: 0, durationWeeks: 1, dependsOn: ['corp_awards'], owner: 'All' },
  ],
  vendorCategories: [
    { slug: 'venue', name: 'Hotel Ballroom / Convention Hall', askQuestion: 'What are your breakout room costs and GST invoice terms?' },
    { slug: 'av', name: 'Stage & Broadcast AV', askQuestion: 'Can you provide dual seamless HDMI switchers and technical operators?' },
  ],
  addOns: [
    { id: 'add_keynote_speaker', name: 'Industry Keynote Speaker', costModel: 'per_event', unitCost: 40000, description: '45-minute inspirational thought leadership keynote' },
    { id: 'add_standup_comic', name: 'Corporate Stand-up Comedy Artist', costModel: 'per_event', unitCost: 30000, description: 'Clean corporate satire and entertainment set' },
  ],
  savingsLevers: [
    { id: 'sav_offpeak_thursday', name: 'Hold event on Thursday instead of Friday evening', minSaving: 30000, maxSaving: 60000, tradeOff: 'Weekday schedule', regretWeight: 1 },
    { id: 'sav_inhouse_av', name: 'Utilize venue built-in audio-visual screens', minSaving: 20000, maxSaving: 40000, tradeOff: 'Standard resolution screens', regretWeight: 2 },
  ],
  runSheetBlocks: [
    { time: '05:30 PM', title: 'Registration, Badge Pickup & Networking Tea', owner: 'Reception' },
    { time: '06:30 PM', title: 'Leadership Address & Annual Roadmap', owner: 'Executive Sponsor' },
    { time: '07:30 PM', title: 'Excellence Awards & Team Recognitions', owner: 'HR Head' },
    { time: '08:45 PM', title: 'Cocktail Dinner & Live Entertainment', owner: 'Catering Lead' },
  ],
  redFlags: [
    'Venue unable to issue GST compliant tax invoice',
    'AV vendor with no redundant backup laptop or projection fallback',
  ],
};
