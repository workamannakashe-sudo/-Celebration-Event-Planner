/**
 * @file frontend/js/i18n.js
 * @description Internationalisation strings and helpers for English, Hindi, and Marathi.
 */

export const TRANSLATIONS = {
  en: {
    appTitle: 'Utsav',
    tagline: 'Thoughtful Indian Event Planning for Meera',
    subtitle: 'Plan weddings, birthdays, and community gatherings with budget clarity & cultural warmth.',
    // Nav & controls
    themeToggle: 'Toggle Theme',
    langSelect: 'Language',
    offlineBadge: 'Offline Mode',
    onlineBadge: 'Cloud Synced',
    // Form labels
    planDetails: 'Event Details',
    eventType: 'Event Type',
    wedding: 'Wedding',
    birthday: 'Birthday',
    community: 'Community',
    eventName: 'Celebration Name',
    namePlaceholder: 'e.g. Meera & Rohan Wedding, Aarav 1st Birthday',
    guestCount: 'Expected Guests',
    totalBudget: 'Total Budget (₹ INR)',
    eventDate: 'Event Date',
    vibe: 'Atmosphere & Vibe',
    vibeElegant: 'Elegant',
    vibeFun: 'Fun',
    vibeTraditional: 'Traditional',
    vibeMinimal: 'Minimal',
    vegOnly: '100% Vegetarian Menu',
    vegOnlyHint: 'Saves 8% on catering and moves it to the contingency buffer',
    calculatePlan: 'Update Plan',
    // Hero Card
    daysToGo: 'Days to Go',
    perGuestSpend: 'Per Guest',
    contingencyReserve: 'Contingency Buffer',
    feasibilityTier: 'Feasibility Tier',
    tierTight: 'Tight Budget',
    tierComfortable: 'Comfortable',
    tierGenerous: 'Generous',
    tightAdvice: 'Catering is tight for {guests} guests. Consider capping guests at {maxGuests} or increasing budget by ₹{needed}.',
    comfortableAdvice: 'Your catering budget comfortably covers quality food and hospitality.',
    generousAdvice: 'Generous catering budget! You can add live gourmet counters, mocktail bars, or signature desserts.',
    // Actions
    copyPlan: 'Copy Summary',
    planCopied: 'Copied to Clipboard!',
    exportIcs: 'Add to Calendar (.ics)',
    printPlan: 'Print / Save PDF',
    // Cards
    cardBudget: 'Budget Breakdown',
    cardTimeline: 'Planning Timeline',
    cardVendors: 'Vendor Checklist & Budget',
    cardIdeas: 'Curated Ideas & Themes',
    cardWhatIf: 'What-If Playground',
    shuffleIdeas: 'Shuffle Ideas',
    askUtsav: 'Ask Utsav AI',
    chatPlaceholder: 'Ask a question or try "cut budget 15%"...',
    // Chat Drawer
    chatTitle: 'Ask Utsav Assistant',
    chatSubtitle: 'Real-time what-if recalculation, budget advice, & vendor questions',
    chatPrompt1: 'What if we cut budget by 10%?',
    chatPrompt2: 'Can we invite 50 more guests?',
    chatPrompt3: 'What should I ask the caterer?',
    chatPrompt4: 'Suggest cost-cutting ideas',
    send: 'Send',
    // Vendor hints
    askBeforeBooking: 'Key questions before paying advance:',
    tasksCompleted: 'tasks completed',
    // What if labels
    adjustBudget: 'Adjust Budget',
    adjustGuests: 'Adjust Guests',
    original: 'Original',
    revised: 'Revised',
    delta: 'Change',
  },
  hi: {
    appTitle: 'उत्सव (Utsav)',
    tagline: 'मीरा के लिए विचारशील भारतीय आयोजन योजना',
    subtitle: 'विवाह, जन्मदिन और सामुदायिक समारोहों की योजना स्पष्ट बजट और सांस्कृतिक आत्मीयता के साथ बनाएं।',
    themeToggle: 'थीम बदलें',
    langSelect: 'भाषा',
    offlineBadge: 'ऑफ़लाइन मोड',
    onlineBadge: 'क्लाउड कनेक्टेड',
    planDetails: 'समारोह का विवरण',
    eventType: 'आयोजन का प्रकार',
    wedding: 'विवाह (Wedding)',
    birthday: 'जन्मदिन (Birthday)',
    community: 'सामुदायिक (Community)',
    eventName: 'आयोजन का नाम',
    namePlaceholder: 'उदा. मीरा और रोहन का विवाह',
    guestCount: 'अपेक्षित मेहमान',
    totalBudget: 'कुल बजट (₹ रुपये)',
    eventDate: 'समारोह की तिथि',
    vibe: 'माहौल व अंदाज़',
    vibeElegant: 'भव्य (Elegant)',
    vibeFun: 'उत्साही (Fun)',
    vibeTraditional: 'पारंपरिक (Traditional)',
    vibeMinimal: 'सादा (Minimal)',
    vegOnly: '100% शाकाहारी मेनू',
    vegOnlyHint: 'खान-पान पर 8% बचत होती है जिसे आकस्मिक फंड में जोड़ दिया जाता है',
    calculatePlan: 'योजना अपडेट करें',
    daysToGo: 'दिन बाकी',
    perGuestSpend: 'प्रति अतिथि',
    contingencyReserve: 'आकस्मिक बफ़र (Contingency)',
    feasibilityTier: 'बजट व्यवहार्यता',
    tierTight: 'सीमित बजट (Tight)',
    tierComfortable: 'संतुलित (Comfortable)',
    tierGenerous: 'उदार (Generous)',
    tightAdvice: '{guests} अतिथियों के लिए भोजन बजट सीमित है। अधिकतम {maxGuests} मेहमान रखें या ₹{needed} बजट बढ़ाएं।',
    comfortableAdvice: 'आपका भोजन बजट मेहमानों के अच्छे स्वागत और भोजन के लिए पूरी तरह उपयुक्त है।',
    generousAdvice: 'भोजन बजट बहुत अच्छा है! आप लाइव चाट काउंटर, मॉकटेल बार या खास मिठाइयां जोड़ सकते हैं।',
    copyPlan: 'योजना कॉपी करें',
    planCopied: 'क्लिपबोर्ड पर कॉपी हो गया!',
    exportIcs: 'कैलेंडर में जोड़ें (.ics)',
    printPlan: 'प्रिंट / पीडीएफ सहेजें',
    cardBudget: 'बजट विभाजन',
    cardTimeline: 'तैयारी की समयसीमा',
    cardVendors: 'वेंडर चेकलिस्ट व बजट',
    cardIdeas: 'सुझाव व रचनात्मक विचार',
    cardWhatIf: 'क्या-अगर (What-If) कैलकुलेटर',
    shuffleIdeas: 'नए विचार देखें',
    askUtsav: 'उत्सव से पूछें',
    chatPlaceholder: 'कोई सवाल पूछें या कहें "बजट 10% कम करो"...',
    chatTitle: 'उत्सव सहायक से बात करें',
    chatSubtitle: 'रियल-टाइम बजट पुनर्गणना, वेंडर सवाल और उपयोगी सुझाव',
    chatPrompt1: 'अगर बजट 10% घटाएं तो क्या होगा?',
    chatPrompt2: 'क्या 50 और मेहमान जोड़ सकते हैं?',
    chatPrompt3: 'कैटरर से क्या पूछना चाहिए?',
    chatPrompt4: 'बचत के कुछ अच्छे तरीके बताएं',
    send: 'भेजें',
    askBeforeBooking: 'एडवांस देने से पहले जरूरी सवाल:',
    tasksCompleted: 'कार्य पूर्ण हुए',
    adjustBudget: 'बजट बदलें',
    adjustGuests: 'मेहमान संख्या बदलें',
    original: 'मूल',
    revised: 'संशोधित',
    delta: 'अंतर',
  },
  mr: {
    appTitle: 'उत्सव (Utsav)',
    tagline: 'मीरा यांच्यासाठी परिपूर्ण सोहळा नियोजन',
    subtitle: 'लग्न, वाढदिवस आणि कौटुंबिक कार्यक्रम - बजेटचे अचूक नियोजन आणि आपुलकीसह.',
    themeToggle: 'थीम बदला',
    langSelect: 'भाषा',
    offlineBadge: 'ऑफलाइन मोड',
    onlineBadge: 'क्लाउड जोडणी',
    planDetails: 'कार्यक्रमाची माहिती',
    eventType: 'कार्यक्रमाचा प्रकार',
    wedding: 'विवाह सोहळा',
    birthday: 'वाढदिवस',
    community: 'सामुदायिक सोहळा',
    eventName: 'कार्यक्रमाचे नाव',
    namePlaceholder: 'उदा. मीरा व रोहन यांचा विवाह',
    guestCount: 'अंदाजे पाहुणे',
    totalBudget: 'एकूण बजेट (₹ रुपये)',
    eventDate: 'कार्यक्रमाची तारीख',
    vibe: 'कार्यक्रमाचे स्वरूप',
    vibeElegant: 'भव्य (Elegant)',
    vibeFun: 'धमाल (Fun)',
    vibeTraditional: 'पारंपरिक (Traditional)',
    vibeMinimal: 'साधे (Minimal)',
    vegOnly: '१००% शाकाहारी मेनू',
    vegOnlyHint: 'खानपानात ८% बचत होऊन ती आपत्कालीन निधीमध्ये जमा होते',
    calculatePlan: 'नियोजन अपडेट करा',
    daysToGo: 'दिवस बाकी',
    perGuestSpend: 'प्रत्येकी खर्च',
    contingencyReserve: 'राखीव निधी (Contingency)',
    feasibilityTier: 'बजेट सुसंगतता',
    tierTight: 'मर्यादित बजेट (Tight)',
    tierComfortable: 'समाधानकारक (Comfortable)',
    tierGenerous: 'उत्तम बजेट (Generous)',
    tightAdvice: '{guests} पाहुण्यांसाठी खानावळ बजेट कमी पडू शकते. पाहुण्यांची संख्या {maxGuests} ठेवा किंवा ₹{needed} बजेट वाढवा.',
    comfortableAdvice: 'आपले केटरिंग बजेट पाहुण्यांच्या आदरातिथ्यासाठी अत्यंत योग्य आणि पुरेसे आहे.',
    generousAdvice: 'उत्तम बजेट! आपण थेट काउंटर, मॉकटेल बार किंवा खास पारंपरिक मिष्टान्न समाविष्ट करू शकता.',
    copyPlan: 'माहिती कॉपी करा',
    planCopied: 'क्लिपबोर्डवर कॉपी झाले!',
    exportIcs: 'कॅलेंडरमध्ये जोडा (.ics)',
    printPlan: 'प्रिंट / पीडीएफ सेव्ह करा',
    cardBudget: 'बजेटचे विभाजन',
    cardTimeline: 'नियोजनाची रूपरेषा',
    cardVendors: 'व्हेंडर चेकलिस्ट आणि बजेट',
    cardIdeas: 'आकर्षक संकल्पना व मेनू',
    cardWhatIf: 'काय-जर (What-If) विश्लेषण',
    shuffleIdeas: 'नवीन कल्पना पहा',
    askUtsav: 'उत्सव सहाय्यक',
    chatPlaceholder: 'प्रश्न विचारा किंवा टाइप करा "बजेट १०% कमी करा"...',
    chatTitle: 'उत्सव सहाय्यकाशी चर्चा',
    chatSubtitle: 'थेट बजेट बदल, व्हेंडर प्रश्न आणि अचूक मार्गदर्शन',
    chatPrompt1: 'बजेट १०% कमी केले तर काय बदल होईल?',
    chatPrompt2: 'आणखी ५० पाहुणे वाढवता येतील का?',
    chatPrompt3: 'केटररला आधी काय विचारले पाहिजे?',
    chatPrompt4: 'बजेट बचतीसाठी काही टिप्स द्या',
    send: 'पाठवा',
    askBeforeBooking: 'अ‍ॅडव्हान्स देण्यापूर्वी महत्त्वाचे प्रश्न:',
    tasksCompleted: 'कामे पूर्ण झाली',
    adjustBudget: 'बजेट बदला',
    adjustGuests: 'पाहुणे संख्या बदला',
    original: 'मूळ',
    revised: 'सुधारित',
    delta: 'बदल',
  },
};

/** @type {'en'|'hi'|'mr'} */
let currentLang = 'en';

/**
 * Get current language.
 * @returns {'en'|'hi'|'mr'}
 */
export function getLanguage() {
  return currentLang;
}

/**
 * Set application language.
 * @param {'en'|'hi'|'mr'} lang
 */
export function setLanguage(lang) {
  if (['en', 'hi', 'mr'].includes(lang)) {
    currentLang = lang;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    try {
      localStorage.setItem('utsav_lang', lang);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Translate a key with optional parameter substitution.
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  let text = dict[key] || TRANSLATIONS.en[key] || key;
  for (const [pKey, pVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
  }
  return text;
}
