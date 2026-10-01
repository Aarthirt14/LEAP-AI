export const LOCALES = ["en", "ta", "hi"] as const;
export type Locale = (typeof LOCALES)[number];

export const LANGUAGE_STORAGE_KEY = "leap_language";

export const translations = {
  en: {
    language: {
      choose: "Choose your language",
      title: "Choose your language",
      subtitle: "LEAP works best when you can read and speak in the language you trust most.",
      continue: "Continue",
    },
    nav: {
      home: "Home",
      profile: "My Profile",
      pathways: "My Pathways",
      progress: "Progress",
      workspace: "Workspace",
      beneficiaries: "Beneficiaries",
      assessments: "Assessments",
      followups: "Follow-ups",
      overview: "Overview",
      skillDemand: "Skill Demand",
      mismatch: "Mismatch Radar",
      outcomes: "Outcomes",
      review: "Review Queue",
      resolved: "Resolved Cases",
      signOut: "Sign out",
      signIn: "Sign in",
    },
    common: {
      yes: "Yes",
      no: "No",
      next: "Continue",
      back: "Back",
      save: "Save",
      reviewProfile: "Review Profile",
      continueAssessment: "Continue Assessment",
      skills: "Skills",
      pathways: "Pathways",
      progress: "Progress",
      welcome: "Welcome",
      loading: "Loading…",
      notEnoughEvidence: "Not enough evidence yet",
      noPathways: "We need a little more information before we can recommend a pathway.",
      noPathwaysSub: "Review your profile or add more skill evidence.",
      voice: "Speak your answer",
      typeInstead: "Type instead",
      listening: "Listening…",
      voiceCaptured: "Voice captured",
      tryAgain: "Try again",
      readAloud: "Read aloud",
      previous: "Previous",
      continue: "Continue",
      completed: "Completed",
      upcoming: "Upcoming",
    },
    home: {
      badge: "Voice-first livelihood guidance",
      title: "Start with what you know. Build toward what you want.",
      subtitle: "LEAP AI listens to your experience, goals and real-life limits, then maps them to practical livelihood pathways you can understand and act on.",
      start: "Start assessment",
      pathways: "View my pathways",
      ask: "LEAP AI asks",
      skillExample: "Tailoring experience",
      years: "4 years",
      aspiration: "Solar aspiration",
      howItWorks: "How it works",
      story: "Tell us your story",
      storyCopy: "Speak or type in simple language. Your informal experience matters.",
      options: "See realistic options",
      optionsCopy: "LEAP checks aspiration, eligibility, distance, training access and existing skills.",
      fit: "Know why a path fits",
      fitCopy: "Every recommendation comes with reasons. Uncertain cases can be reviewed by a person.",
    },
    auth: {
      welcomeBack: "Welcome back",
      createAccount: "Create your LEAP account",
      signIn: "Sign in",
      create: "Create account",
      password: "Password",
      email: "Email",
      phone: "Phone (optional)",
      mobile: "Mobile number",
      atLeast10: "At least 10 characters",
    },
    onboarding: {
      startHere: "Start here",
      title: "A few basics before we talk about work.",
      subtitle: "These details help LEAP make recommendations that are relevant to your location and preferred language.",
      name: "Name",
      age: "Age",
      gender: "Gender (optional)",
      district: "District",
      language: "Preferred language",
      digital: "Comfort with smartphones",
      consent: "I agree to let LEAP store my answers so it can build and explain my livelihood profile.",
      button: "Continue to assessment",
    },
    interview: {
      title: "Tell us about your work, in your own words.",
      of: "of",
      question: "LEAP asks",
      helper: "This helps us check training eligibility.",
      voice: "Answer by voice",
      build: "Review my answers",
      save: "Save and continue",
      empty: "Add an answer before continuing.",
      voiceUnavailable: "Voice input is not available in this browser. You can type your answer instead.",
      voiceStopped: "Voice input stopped. You can continue by typing.",
      progressLabel: "Question",
      useThis: "How LEAP uses this",
      useThisCopy: "Your answers become profile evidence. The final pathway ranking comes from the rule-based scoring engine, not from a chatbot guessing a career.",
      voiceOptional: "Voice is optional",
      voiceOptionalCopy: "If speech input is unavailable, type naturally. The same backend workflow stores and evaluates your answer.",
    },
    profile: {
      title: "What LEAP understood about you",
      subtitle: "A living picture of your experience, responsibilities and direction.",
      completeness: "Profile completeness",
      experience: "Current experience",
      aspiration: "What you want to become",
      skills: "Skills & experience",
      emptySkills: "Your experience will appear here after assessment.",
      vision: "Your past does not decide your future. Both matter.",
      seePathways: "See my pathways",
      education: "Education",
      currentWork: "Current work",
      goal: "Goal",
      workPreference: "Work preference",
      travelRange: "Travel range",
      capital: "Available capital",
      family: "Family responsibilities",
      constraints: "Physical constraints",
    },
    pathways: {
      title: "Paths that fit your situation",
      subtitle: "Scores are calculated from your profile, current skills, eligibility, local training access and practical constraints.",
      recalc: "Recalculate",
      emptyTitle: "We need a little more information before we can recommend a pathway.",
      emptyCopy: "Review your profile or add more skill evidence.",
      reviewProfile: "Review Profile",
      continueAssessment: "Continue Assessment",
      whyDifferent: "Why this is different from a chatbot answer:",
      whyDifferentCopy: "the backend excludes invalid qualifications, checks constraints, applies one scoring model, and sends low-confidence cases for human review.",
      fitScore: "Fit score",
      confidence: "Confidence",
      route: "Recommended route",
      seeWhy: "See why this fits",
    },
    pathway: {
      back: "Back to pathways",
      whyFits: "Why this pathway fits",
      whatWorks: "What works in your favour",
      whatNeeds: "What you may need",
      planAround: "Things to plan around",
      scoreCalc: "How this score was calculated",
      overallFit: "Overall fit",
      route: "Recommended route",
      outcomeEvidence: "Includes verified historical 90-day employment outcome evidence",
      lowEvidence: "Outcome evidence component uses neutral baseline score (historical sample size below minimum threshold).",
    },
    dashboard: {
      welcome: "Good morning",
      sub: "Here is where you are in your livelihood journey.",
      nextStep: "Your next step",
      profile: "Your profile",
      pathways: "Your pathways",
      continue: "Continue",
      assessment: "Assessment",
      profileStep: "Profile",
      action: "Action",
      outcome: "Outcome",
    },
    worker: {
      title: "Field Worker Workspace",
      summaryAssigned: "Beneficiaries Assigned",
      assessmentsPending: "Assessments Pending",
      followUpsDue: "Follow-ups Due",
      reviewsNeeded: "Reviews Needed",
      addBeneficiary: "+ Add Beneficiary",
      startAssessment: "Start Assisted Assessment",
      reviewProfile: "Review Profile",
      viewPathways: "View Pathways",
      recordFollowup: "Record Follow-up",
      filters: "Filters",
      all: "All",
      pending: "Assessment Pending",
      ready: "Pathway Ready",
      due: "Follow-up Due",
      tabs: "Overview",
      overview: "Overview",
      assessmentTab: "Assessment",
      profileTab: "Profile",
      skillsTab: "Skills",
      pathwaysTab: "Pathways",
      progressTab: "Progress",
      languageQuestion: "What language is the beneficiary most comfortable with?",
      beneficiaryLanguage: "Beneficiary language",
    },
    officer: {
      title: "District Livelihood Overview",
      metrics: {
        assessed: "Beneficiaries Assessed",
        profiles: "Profiles Completed",
        pathways: "Pathways Generated",
        training: "Training Started",
        outcomes90: "Positive 90-Day Outcomes",
        active180: "Active 180-Day Outcomes",
      },
      notEnough: "Not enough evidence yet",
      coverage: "Beneficiary Coverage",
      aspirations: "Top Aspirations",
      skills: "Existing Skill Base",
      demand: "Training Demand",
      capacity: "Training Capacity vs Demand",
      mismatch: "Livelihood Mismatch Radar",
      outcomeTracking: "Outcome Tracking",
      humanReview: "Human Review Summary",
      status: {
        capacityGap: "Capacity Gap",
        balanced: "Balanced",
        lowConversion: "Low Conversion",
        oversupply: "Oversupply",
      },
    },
  },
  ta: {
    language: { choose: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", subtitle: "LEAP நீங்கள் நம்பும் மொழியில் படிக்கவும் பேசவும் முடிந்தால் சிறப்பாக வேலை செய்கிறது.", continue: "தொடரவும்" },
    nav: { home: "முகப்பு", profile: "என் சுயவிவரம்", pathways: "என் பாதைகள்", progress: "முன்னேற்றம்", workspace: "வேலை மண்டலம்", beneficiaries: "பயனாளிகள்", assessments: "மதிப்பீடுகள்", followups: "பின்தொடர்வுகள்", overview: "கண்ணோட்டம்", skillDemand: "திறன் தேவை", mismatch: "மீறல் ரேடார்", outcomes: "விளைவுகள்", review: "மதிப்பாய்வு வரிசை", resolved: "தீர்க்கப்பட்டவை", signOut: "வெளியேறு", signIn: "உள்நுழைக" },
    common: { yes: "ஆம்", no: "இல்லை", next: "தொடரவும்", back: "முந்தையது", save: "சேமி", reviewProfile: "சுயவிவரத்தை பார்க்க", continueAssessment: "மதிப்பீட்டை தொடரவும்", skills: "திறன்கள்", pathways: "பாதைகள்", progress: "முன்னேற்றம்", welcome: "வணக்கம்", loading: "ஏற்றப்படுகிறது…", notEnoughEvidence: "போதுமான சான்றுகள் இன்னும் இல்லை", noPathways: "ஒரு பாதையை பரிந்துரைக்க இன்னும் கொஞ்சம் தகவல் தேவை.", noPathwaysSub: "உங்கள் சுயவிவரத்தை மறுபார்வையிடுக அல்லது கூடுதல் திறன் சான்றுகளை சேர்க்கவும்.", voice: "உங்கள் பதிலை பேசுங்கள்", typeInstead: "பதிலை எழுதவும்", listening: "கேட்கிறேன்…", voiceCaptured: "குரல் பதிவு செய்யப்பட்டது", tryAgain: "மீண்டும் முயலவும்", readAloud: "கேட்கவும்", previous: "முந்தையது", continue: "தொடரவும்", completed: "முடிந்தது", upcoming: "வரவிருக்கும்" },
    home: { badge: "குரல்-முதல் வாழ்வாதார வழிகாட்டுதல்", title: "நீங்கள் அறிந்ததை வைத்து தொடங்குங்கள். நீங்கள் விரும்புவதை நோக்கி முன்னேறுங்கள்.", subtitle: "LEAP AI உங்கள் அனுபவம், இலக்கு மற்றும் உண்மையான வரம்புகளை கேட்டு, புரிந்துகொள்ளக்கூடிய நடைமுறை வாழ்வாதார பாதைகளுக்கு வழிநடத்துகிறது.", start: "மதிப்பீட்டை தொடங்குங்கள்", pathways: "என் பாதைகளைப் பார்க்க", ask: "LEAP AI கேட்கிறது", skillExample: "தையல் அனுபவம்", years: "4 ஆண்டுகள்", aspiration: "சூரிய நிறுவல் விருப்பம்", howItWorks: "இது எப்படி வேலை செய்கிறது", story: "உங்கள் கதையை சொல்லுங்கள்", storyCopy: "எளிய மொழியில் பேசுங்கள் அல்லது தட்டச்சு செய்யுங்கள். உங்கள் ஒப்பந்தமற்ற அனுபவமும் முக்கியம்.", options: "நடைமுறை விருப்பங்களைப் பார்க்கவும்", optionsCopy: "LEAP உங்கள் இலக்கு, தகுதி, பயண தூரம், பயிற்சி அணுகல் மற்றும் உள்ள திறன்களை பார்க்கிறது.", fit: "பாதை ஏன் பொருந்துகிறது", fitCopy: "ஒவ்வொரு பரிந்துரையும் காரணங்களுடன் வருகிறது. நிச்சயமற்ற சூழ்நிலைகள் மனிதர் மூலம் மதிப்பாய்வு செய்யப்படலாம்." },
    auth: { welcomeBack: "மீண்டும் வரவேற்கிறோம்", createAccount: "LEAP கணக்கை உருவாக்கவும்", signIn: "உள்நுழைக", create: "கணக்கை உருவாக்கு", password: "கடவுச்சொல்", email: "மின்னஞ்சல்", phone: "தொலைபேசி (விருப்பம்)", mobile: "மொபைல் எண்", atLeast10: "10 எழுத்துகள் குறையாமல்" },
    onboarding: { startHere: "இங்கு தொடங்குங்கள்", title: "வேலை பற்றி பேசுவதற்கு முன் சில அடிப்படைகள்.", subtitle: "இந்த விவரங்கள் உங்கள் இருப்பிடம் மற்றும் விருப்ப மொழிக்கு பொருத்தமான பரிந்துரைகளை உருவாக்க உதவுகின்றன.", name: "பெயர்", age: "வயது", gender: "பாலினம் (விருப்பம்)", district: "மாவட்டம்", language: "விருப்ப மொழி", digital: "ஸ்மார்ட்போன் பயன்பாடு", consent: "என் பதில்களை LEAP சேமித்து, என் வாழ்வாதார சுயவிவரத்தை உருவாக்க அனுமதிக்கிறேன்.", button: "மதிப்பீட்டிற்கு தொடரவும்" },
    interview: { title: "உங்கள் வேலையை உங்கள் சொந்த வார்த்தைகளில் சொல்லுங்கள்.", of: "இன்", question: "LEAP கேட்கிறது", helper: "இது பயிற்சி தகுதியை சரிபார்க்க உதவுகிறது.", voice: "குரல் மூலம் பதில் அளிக்கவும்", build: "என் பதில்களைச் சரிபார்க்கவும்", save: "தொடர்ந்து சேமி", empty: "தொடருவதற்கு முன் பதிலை சேர்க்கவும்.", voiceUnavailable: "இந்த உலாவியில் குரல் உள்ளீடு கிடைக்கவில்லை. பதிலை எழுதலாம்.", voiceStopped: "குரல் உள்ளீடு நிறுத்தப்பட்டது. தட்டச்சு மூலம் தொடரலாம்.", progressLabel: "கேள்வி", useThis: "LEAP இதை எப்படி பயன்படுத்துகிறது", useThisCopy: "உங்கள் பதில்கள் சுயவிவர ஆதாரமாக மாறுகின்றன. இறுதி பாதை தரவரிசை சாட்பாட் அல்லாமல் விதி அடிப்படையிலான மதிப்பீட்டால் உருவாக்கப்படுகிறது.", voiceOptional: "குரல் விருப்பமானது", voiceOptionalCopy: "குரல் உள்ளீடு கிடைக்கவில்லை என்றால், இயல்பாக தட்டச்சு செய்யுங்கள். அதே பின்தள அமைப்பு உங்கள் பதிலை சேமிக்கிறது." },
    profile: { title: "LEAP உங்கள் பற்றி என்ன புரிந்து கொண்டது", subtitle: "உங்கள் அனுபவம், பொறுப்புகள் மற்றும் நோக்கத்தை காட்டும் படம்.", completeness: "சுயவிவர நிறைவு", experience: "நடப்பு அனுபவம்", aspiration: "நீங்கள் என்னாக விரும்புகிறீர்கள்", skills: "திறன்கள் & அனுபவம்", emptySkills: "மதிப்பீடு முடிந்த பிறகு உங்கள் அனுபவம் இங்கே தோன்றும்.", vision: "உங்கள் கடந்தகாலம் உங்கள் எதிர்காலத்தை தீர்மானிக்காது. இரண்டும் முக்கியம்.", seePathways: "என் பாதைகளைப் பார்க்க", education: "கல்வி", currentWork: "இப்போது செய்யும் வேலை", goal: "இலக்கு", workPreference: "வேலை விருப்பம்", travelRange: "பயண தூரம்", capital: "கிடைக்கும் முதலீடு", family: "குடும்பப் பொறுப்புகள்", constraints: "உடல் வரம்புகள்" },
    pathways: { title: "உங்கள் சூழலுக்கு பொருத்தமான பாதைகள்", subtitle: "மதிப்பெண்கள் உங்கள் சுயவிவரம், தற்போதைய திறன்கள், தகுதி, உள்ளூர் பயிற்சி அணுகல் மற்றும் நடைமுறை வரம்புகளிலிருந்து கணக்கிடப்படுகின்றன.", recalc: "மீண்டும் கணக்கிடு", emptyTitle: "ஒரு பாதையை பரிந்துரைக்க இன்னும் கொஞ்சம் தகவல் தேவை.", emptyCopy: "உங்கள் சுயவிவரத்தை மறுபார்வையிடவும் அல்லது கூடுதல் திறன் சான்றுகளை சேர்க்கவும்.", reviewProfile: "சுயவிவரத்தை பார்த்து", continueAssessment: "மதிப்பீட்டை தொடரவும்", whyDifferent: "இது சாட்பாட் விட வேறுபட்டது:", whyDifferentCopy: "பின்தளம் தவறான தகுதிகளை நீக்கி, வரம்புகளை சரிபார்த்து, ஒரே மதிப்பீட்டு மாதிரியை பயன்படுத்தி, குறைந்த நம்பகத்தன்மை வழக்குகளை மனித மதிப்பாய்வுக்கு அனுப்புகிறது.", fitScore: "பொருத்த மதிப்பெண்", confidence: "நம்பகத்தன்மை", route: "பரிந்துரைக்கப்பட்ட பாதை", seeWhy: "ஏன் பொருந்துகிறது என பார்க்க" },
    pathway: { back: "பாதைகளுக்குத் திரும்பு", whyFits: "இந்த பாதை ஏன் பொருந்துகிறது", whatWorks: "உங்களுக்கு ஏற்கனவே உதவும் விஷயங்கள்", whatNeeds: "உங்களுக்கு தேவைப்படுவது", planAround: "திட்டமிட வேண்டிய விஷயங்கள்", scoreCalc: "இந்த மதிப்பெண் எப்படி கணக்கிடப்பட்டது", overallFit: "மொத்த பொருத்தம்", route: "பரிந்துரைக்கப்பட்ட பாதை", outcomeEvidence: "சரிபார்க்கப்பட்ட 90 நாள் வேலை விளைவுகளைக் கொண்டுள்ளது", lowEvidence: "விளைவு சான்று பகுதி நடுநிலை அடிப்படையில் கணக்கிடப்படுகிறது (வரலாற்று மாதிரி அளவு குறைந்தது)." },
    dashboard: { welcome: "சுபோதயமாக", sub: "உங்கள் வாழ்வாதார பயணத்தில் நீங்கள் எங்கே இருக்கிறீர்கள் என்பது இங்கே.", nextStep: "உங்கள் அடுத்த படி", profile: "உங்கள் சுயவிவரம்", pathways: "உங்கள் பாதைகள்", continue: "தொடரவும்", assessment: "மதிப்பீடு", profileStep: "சுயவிவரம்", action: "நடவடிக்கை", outcome: "விளைவு" },
    worker: { title: "களம் பணியாளர் பணிச்சூழல்", summaryAssigned: "ஒதுக்கப்பட்ட பயனாளிகள்", assessmentsPending: "நிலுவையில் உள்ள மதிப்பீடுகள்", followUpsDue: "முடிக்க வேண்டிய பின்தொடர்வுகள்", reviewsNeeded: "மதிப்பாய்வு தேவை", addBeneficiary: "+ பயனாளியை சேர்க்கவும்", startAssessment: "உதவி மதிப்பீட்டை தொடங்கவும்", reviewProfile: "சுயவிவரத்தை பார்க்க", viewPathways: "பாதைகளைப் பார்க்க", recordFollowup: "பின்தொடர்வை பதிவு", filters: "வடிகட்டிகள்", all: "அனைத்தும்", pending: "மதிப்பீடு நிலுவை", ready: "பாதை தயார்", due: "பின்தொடர்வு தேவை", tabs: "கண்ணோட்டம்", overview: "கண்ணோட்டம்", assessmentTab: "மதிப்பீடு", profileTab: "சுயவிவரம்", skillsTab: "திறன்கள்", pathwaysTab: "பாதைகள்", progressTab: "முன்னேற்றம்", languageQuestion: "பயனாளிக்கு எந்த மொழி மிகவும் வசதியாக உள்ளது?", beneficiaryLanguage: "பயனாளி மொழி" },
    officer: { title: "மாவட்ட வாழ்வாதார கண்ணோட்டம்", metrics: { assessed: "மதிப்பிடப்பட்ட பயனாளிகள்", profiles: "முடிக்கப்பட்ட சுயவிவரங்கள்", pathways: "உருவாக்கப்பட்ட பாதைகள்", training: "தொடங்கிய பயிற்சிகள்", outcomes90: "நேர்மறை 90 நாள் விளைவுகள்", active180: "செயலில் உள்ள 180 நாள் விளைவுகள்" }, notEnough: "போதுமான சான்றுகள் இன்னும் இல்லை", coverage: "பயனாளி கவரேஜ்", aspirations: "சிறந்த இலட்சியங்கள்", skills: "இருக்கும் திறன் அடிப்படை", demand: "பயிற்சி தேவை", capacity: "பயிற்சி திறன் vs தேவை", mismatch: "வாழ்வாதார பொருத்தமின்மை ரேடார்", outcomeTracking: "விளைவு கண்காணிப்பு", humanReview: "மனித மதிப்பாய்வு சுருக்கம்", status: { capacityGap: "திறன் இடைவெளி", balanced: "சமநிலை", lowConversion: "குறைந்த மாற்றம்", oversupply: "அதிக வழங்கல்" } },
  },
  hi: {
    language: { choose: "अपनी भाषा चुनें", title: "अपनी भाषा चुनें", subtitle: "LEAP तब सबसे अच्छा काम करता है जब आप जिस भाषा में भरोसा करते हैं उसमें पढ़ें और बोलें।", continue: "जारी रखें" },
    nav: { home: "होम", profile: "मेरा प्रोफ़ाइल", pathways: "मेरे रास्ते", progress: "प्रगति", workspace: "कार्यस्थान", beneficiaries: "लाभार्थी", assessments: "मूल्यांकन", followups: "फॉलो-अप", overview: "अवलोकन", skillDemand: "कौशल मांग", mismatch: "मिलान रडार", outcomes: "परिणाम", review: "समीक्षा कतार", resolved: "हल किए गए", signOut: "साइन आउट", signIn: "साइन इन" },
    common: { yes: "हाँ", no: "नहीं", next: "जारी रखें", back: "वापस", save: "सेव", reviewProfile: "प्रोफ़ाइल देखें", continueAssessment: "मूल्यांकन जारी रखें", skills: "कौशल", pathways: "रास्ते", progress: "प्रगति", welcome: "स्वागत है", loading: "लोड हो रहा है…", notEnoughEvidence: "अभी पर्याप्त प्रमाण नहीं हैं", noPathways: "हमें एक रास्ते की सिफारिश करने से पहले थोड़ा और जानकारी चाहिए।", noPathwaysSub: "अपना प्रोफ़ाइल देखें या और कौशल साक्ष्य जोड़ें।", voice: "अपना उत्तर बोलें", typeInstead: "लेखन के माध्यम से दर्ज करें", listening: "सुन रहा है…", voiceCaptured: "आवाज़ दर्ज हो गई", tryAgain: "दोबारा कोशिश करें", readAloud: "बोलकर सुनें", previous: "पिछला", continue: "जारी रखें", completed: "पूरा हुआ", upcoming: "आने वाला" },
    home: { badge: "वॉयस-फर्स्ट आजीविका मार्गदर्शन", title: "आप जो जानते हैं, उससे शुरू करें। आप जो चाहते हैं, उसकी तरफ बढ़ें।", subtitle: "LEAP AI आपके अनुभव, लक्ष्यों और वास्तविक सीमाओं को सुनता है, फिर उन्हें समझने योग्य व्यावहारिक आजीविका रास्तों से जोड़ता है।", start: "मूल्यांकन शुरू करें", pathways: "मेरे रास्ते देखें", ask: "LEAP AI पूछता है", skillExample: "कढ़ाई का अनुभव", years: "4 साल", aspiration: "सोलर इंस्टॉलेशन लक्ष्य", howItWorks: "यह कैसे काम करता है", story: "अपनी कहानी बताएं", storyCopy: "सरल भाषा में बोलें या टाइप करें। आपका अनौपचारिक अनुभव भी मायने रखता है।", options: "वास्तविक विकल्प देखें", optionsCopy: "LEAP आपके लक्ष्य, योग्यता, दूरी, प्रशिक्षण की उपलब्धता और मौजूदा कौशल की जाँच करता है।", fit: "रास्ता क्यों फिट बैठता है", fitCopy: "हर सुझाव के साथ कारण दिए जाते हैं। अनिश्चित स्थिति में व्यक्ति द्वारा समीक्षा की जा सकती है." },
    auth: { welcomeBack: "फिर से स्वागत है", createAccount: "LEAP खाता बनाएं", signIn: "साइन इन", create: "खाता बनाएं", password: "पासवर्ड", email: "ईमेल", phone: "फोन (वैकल्पिक)", mobile: "मोबाइल नंबर", atLeast10: "कम से कम 10 अक्षर" },
    onboarding: { startHere: "यहाँ से शुरू करें", title: "काम के बारे में बात करने से पहले कुछ बुनियादी जानकारी।", subtitle: "ये विवरण LEAP को आपके स्थान और पसंदीदा भाषा के अनुसार सही सुझाव बनाने में मदद करते हैं।", name: "नाम", age: "उम्र", gender: "लिंग (वैकल्पिक)", district: "जिला", language: "पसंदीदा भाषा", digital: "स्मार्टफोन का उपयोग", consent: "मैं LEAP को अपने उत्तर संग्रहित करने और मेरी आजीविका प्रोफ़ाइल बनाने की अनुमति देता हूँ।", button: "मूल्यांकन जारी रखें" },
    interview: { title: "अपने काम के बारे में अपनी भाषा में बताएं।", of: "में से", question: "LEAP पूछता है", helper: "यह प्रशिक्षण योग्यताओं की जाँच में मदद करता है।", voice: "आवाज़ से उत्तर दें", build: "मेरे उत्तरों की समीक्षा करें", save: "सहेजें और आगे बढ़ें", empty: "आगे बढ़ने से पहले उत्तर जोड़ें।", voiceUnavailable: "इस ब्राउज़र में वॉयस इनपुट उपलब्ध नहीं है। आप टाइप भी कर सकते हैं।", voiceStopped: "वॉयस इनपुट रुक गया है। आप टाइप करके आगे बढ़ सकते हैं।", progressLabel: "प्रश्न", useThis: "LEAP इसका उपयोग कैसे करता है", useThisCopy: "आपके उत्तर प्रोफ़ाइल के प्रमाण बनते हैं। अंतिम रास्ता क्रम नियम-आधारित स्कोरिंग से बनता है, चैटबॉट की अनुमानित पसंद से नहीं।", voiceOptional: "आवाज़ वैकल्पिक है", voiceOptionalCopy: "अगर वॉयस इनपुट उपलब्ध न हो, तो सामान्य भाषा में टाइप करें। उसी बैकएंड प्रक्रिया से उत्तर सेव और मूल्यांकन होता है।" },
    profile: { title: "LEAP ने आपके बारे में क्या समझा", subtitle: "आपके अनुभव, जिम्मेदारियों और उद्देश्य का जीवित चित्र।", completeness: "प्रोफ़ाइल पूर्णता", experience: "वर्तमान अनुभव", aspiration: "आप क्या बनना चाहते हैं", skills: "कौशल और अनुभव", emptySkills: "मूल्यांकन के बाद आपका अनुभव यहाँ दिखाई देगा।", vision: "आपका अतीत आपका भविष्य तय नहीं करता। दोनों मायने रखते हैं।", seePathways: "मेरे रास्ते देखें", education: "शिक्षा", currentWork: "वर्तमान काम", goal: "लक्ष्य", workPreference: "काम की पसंद", travelRange: "यात्रा की दूरी", capital: "उपलब्ध पूंजी", family: "परिवार की जिम्मेदारियाँ", constraints: "शारीरिक सीमाएँ" },
    pathways: { title: "आपकी स्थिति के लिए उपयुक्त रास्ते", subtitle: "स्कोर आपके प्रोफ़ाइल, मौजूदा कौशल, योग्यता, स्थानीय प्रशिक्षण उपलब्धता और व्यावहारिक सीमाओं से निकलते हैं।", recalc: "फिर से गणना करें", emptyTitle: "हमें एक रास्ते की सिफारिश करने से पहले थोड़ा और जानकारी चाहिए।", emptyCopy: "अपना प्रोफ़ाइल देखें या अधिक कौशल साक्ष्य जोड़ें।", reviewProfile: "प्रोफ़ाइल देखें", continueAssessment: "मूल्यांकन जारी रखें", whyDifferent: "यह चैटबॉट से अलग क्यों है:", whyDifferentCopy: "बैकएंड गलत योग्यताएँ बाहर करता है, बाधाओं की जाँच करता है, एक ही स्कोरिंग मॉडल लागू करता है, और कम भरोसेमंद मामलों को मानव समीक्षा के लिए भेजता है।", fitScore: "फिट स्कोर", confidence: "भरोसा", route: "सुझाया गया रास्ता", seeWhy: "देखें यह क्यों फिट है" },
    pathway: { back: "रास्तों पर वापस जाएँ", whyFits: "यह रास्ता क्यों फिट है", whatWorks: "जो आपके लिए पहले से सही है", whatNeeds: "आपको क्या चाहिए", planAround: "जिसके बारे में योजना बनानी है", scoreCalc: "यह स्कोर कैसे बना", overallFit: "कुल फिटनेस", route: "सुझाया गया रास्ता", outcomeEvidence: "सत्यापित 90-दिवसीय रोजगार परिणाम शामिल है", lowEvidence: "परिणाम साक्ष्य भाग न्यूनतम स्तर पर तटस्थ आधार पर गणना करता है।" },
    dashboard: { welcome: "शुभ प्रभात", sub: "आप आजीविका यात्रा में कहाँ हैं, यहाँ देखें।", nextStep: "आपका अगला कदम", profile: "आपकी प्रोफ़ाइल", pathways: "आपके रास्ते", continue: "जारी रखें", assessment: "मूल्यांकन", profileStep: "प्रोफ़ाइल", action: "कार्रवाई", outcome: "परिणाम" },
    worker: { title: "फील्ड वर्कर वर्कस्पेस", summaryAssigned: "निर्धारित लाभार्थी", assessmentsPending: "बकाया मूल्यांकन", followUpsDue: "अवधि खत्म होने वाले फॉलो-अप", reviewsNeeded: "समीक्षा आवश्यक", addBeneficiary: "+ लाभार्थी जोड़ें", startAssessment: "सहायक मूल्यांकन शुरू करें", reviewProfile: "प्रोफ़ाइल देखें", viewPathways: "रास्ते देखें", recordFollowup: "फॉलो-अप दर्ज करें", filters: "फ़िल्टर", all: "सभी", pending: "मूल्यांकन लंबित", ready: "रास्ता तैयार", due: "फॉलो-अप देय", tabs: "अवलोकन", overview: "अवलोकन", assessmentTab: "मूल्यांकन", profileTab: "प्रोफ़ाइल", skillsTab: "कौशल", pathwaysTab: "रास्ते", progressTab: "प्रगति", languageQuestion: "लाभार्थी को कौन सी भाषा सबसे अधिक सहज है?", beneficiaryLanguage: "लाभार्थी भाषा" },
    officer: { title: "जिला आजीविका अवलोकन", metrics: { assessed: "मूल्यांकित लाभार्थी", profiles: "पूर्ण प्रोफ़ाइल", pathways: "बनाए गए रास्ते", training: "शुरू किया गया प्रशिक्षण", outcomes90: "सकारात्मक 90-दिवसीय परिणाम", active180: "सक्रिय 180-दिवसीय परिणाम" }, notEnough: "अभी पर्याप्त प्रमाण नहीं हैं", coverage: "लाभार्थी कवरेज", aspirations: "शीर्ष आकांक्षाएँ", skills: "मौजूदा कौशल आधार", demand: "प्रशिक्षण मांग", capacity: "प्रशिक्षण क्षमता बनाम मांग", mismatch: "आजीविका मिसमैच रडार", outcomeTracking: "परिणाम ट्रैकिंग", humanReview: "मानवीय समीक्षा सारांश", status: { capacityGap: "क्षमता अंतर", balanced: "संतुलित", lowConversion: "कम रूपांतरण", oversupply: "अति आपूर्ति" } },
  },
} as const;

export function normalizeLocale(value?: string | null): Locale {
  if (value === "ta" || value === "தமிழ்") return "ta";
  if (value === "hi" || value === "हिन्दी") return "hi";
  return "en";
}

export function getStoredLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return normalizeLocale(raw || undefined);
}

export function setStoredLocale(locale: Locale) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
}

export function getVoiceLocale(locale: Locale): string {
  return locale === "ta" ? "ta-IN" : locale === "hi" ? "hi-IN" : "en-IN";
}

export function t(key: string, locale: Locale = "en"): string {
  const path = key.split(".");
  const source = translations[locale] as Record<string, any>;
  let current: any = source;

  for (const part of path) {
    if (!current || typeof current !== "object") {
      return key;
    }
    current = current[part];
  }

  if (typeof current === "string") {
    return current;
  }

  return key;
}

export const languageOptions = [
  { value: "en", label: "English" },
  { value: "ta", label: "தமிழ்" },
  { value: "hi", label: "हिन्दी" },
] as const;
