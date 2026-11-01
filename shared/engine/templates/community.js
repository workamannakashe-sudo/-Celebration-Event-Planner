/**
 * @file shared/engine/templates/community.js
 * @description Full template configuration for Community & Festival (Utsav) gatherings.
 */

export const communityTemplate = {
  type: 'community',
  label: 'Community or Festival',
  defaultName: 'Ganesh Utsav Mahotsav',
  comfortPricePerHead: 250,
  idealLeadWeeks: 10,
  defaultShowUpRate: 0.65,
  showUpBand: { min: 0.50, max: 0.80 },
  defaultBuffer: 0.10,
  baseWeights: {
    'Venue & Permissions': 15,
    'Food & Water': 28,
    'Stage Sound & AV': 18,
    'Decor & Signage': 8,
    'Marketing & Printing': 9,
    'Volunteers & Safety': 10,
    'Entertainment': 7,
  },
  taskGraph: [
    { id: 'c_committee', task: 'Form organizing committee and allocate responsibilities', weeksBefore: 10, durationWeeks: 1, dependsOn: [], owner: 'Chairman' },
    { id: 'c_permissions', task: 'File municipal, police and fire NOC applications', weeksBefore: 8, durationWeeks: 3, dependsOn: ['c_committee'], owner: 'Secretary' },
    { id: 'c_stage_sound', task: 'Book stage, trussing, generator and audio setup', weeksBefore: 6, durationWeeks: 2, dependsOn: ['c_permissions'], owner: 'AV Lead' },
    { id: 'c_prasad_food', task: 'Lock mahaprasad caterer and drinking water tankers', weeksBefore: 5, durationWeeks: 2, dependsOn: ['c_committee'], owner: 'Food Lead' },
    { id: 'c_publicity', task: 'Print banner banners, hoardings and start social publicity', weeksBefore: 4, durationWeeks: 2, dependsOn: ['c_permissions'], owner: 'Publicity Lead' },
    { id: 'c_volunteers', task: 'Conduct volunteer security and crowd control briefing', weeksBefore: 2, durationWeeks: 1, dependsOn: ['c_committee'], owner: 'Safety Lead' },
    { id: 'c_dryrun', task: 'Stage soundcheck and electrical safety audit', weeksBefore: 1, durationWeeks: 1, dependsOn: ['c_stage_sound'], owner: 'Technical Lead' },
    { id: 'c_utsav', task: 'Community Festival Day! 🎪', weeksBefore: 0, durationWeeks: 1, dependsOn: ['c_dryrun'], owner: 'All' },
  ],
  vendorCategories: [
    { slug: 'venue', name: 'Ground / Hall & Permissions', askQuestion: 'Who liaises with municipal ward officers for sound cutoff permissions?' },
    { slug: 'catering', name: 'Mahaprasad & Water Supply', askQuestion: 'Can you provide 1,000+ thali dining capacity within 90 minutes?' },
    { slug: 'sound', name: 'Stage, Truss & Sound AV', askQuestion: 'Do you supply certified silent generators with acoustic sound baffles?' },
    { slug: 'decor', name: 'Pandal & Floral Decor', askQuestion: 'Are all pandal fabrics fire-retardant treated with certification?' },
  ],
  addOns: [
    { id: 'add_led_wall', name: 'High-Brightness P3 Outdoor LED Screen', costModel: 'per_event', unitCost: 25000, description: 'Live broadcast of stage performances to overflow crowds' },
    { id: 'add_cctv_security', name: '16-Channel CCTV Surveillance Setup', costModel: 'per_event', unitCost: 12000, description: 'Complete boundary security camera grid with monitoring booth' },
    { id: 'add_brass_band', name: 'Traditional Puneri Dhol & Brass Band', costModel: 'per_event', unitCost: 18000, description: '30-artist traditional live instrumental procession' },
  ],
  savingsLevers: [
    { id: 'sav_sponsor_banners', name: 'Offset print costs via local business sponsors', minSaving: 20000, maxSaving: 50000, tradeOff: 'Includes sponsor logos on event banners', regretWeight: 1 },
    { id: 'sav_volunteer_serving', name: 'Youth volunteer serving teams instead of agency waiters', minSaving: 15000, maxSaving: 30000, tradeOff: 'Requires volunteer coordination training', regretWeight: 1 },
    { id: 'sav_digital_bulletin', name: 'Society WhatsApp broadcast instead of door-to-door flyers', minSaving: 8000, maxSaving: 15000, tradeOff: 'Lower penetration among elder residents without smartphones', regretWeight: 2 },
  ],
  runSheetBlocks: [
    { time: '07:00 AM', title: 'Pooja, Mandir Installation & Priest Rituals', owner: 'Pooja Committee' },
    { time: '10:00 AM', title: 'Cultural Performances & Talent Competitions', owner: 'Cultural Secretary' },
    { time: '12:30 PM', title: 'Mahaprasad Lunch Service (Bhojan Daal/Bhaat/Halwa)', owner: 'Food Committee' },
    { time: '04:00 PM', title: 'Felicitation of Community Elders & Prize Distribution', owner: 'President' },
    { time: '06:30 PM', title: 'Grand Aarti & Musical Procession', owner: 'All Committee' },
  ],
  redFlags: [
    'No valid electrical load certificate or earthing report for stage',
    'Tent vendor with no fire safety NOC',
    'Unregulated drinking water source without municipal test report',
  ],
};
