import type { Locale } from "./i18n";

const en = {
  workspace: "Facilitator workspace", title: "A closer look at uncertain cases",
  description: "Review the evidence, record what you checked, and help the beneficiary make an informed decision.",
  status: "Case status", all: "All cases", matching: "matching cases", caseLabel: "Case", beneficiary: "Beneficiary",
  statuses: { OPEN: "Open", IN_REVIEW: "In review", APPROVED: "Approved", EDITED: "Notes updated", REJECTED: "Rejected", RESOLVED: "Closed without approval" },
  inspect: "Inspect pathway evidence", loadingEvidence: "Loading evidence…", lastNote: "Last recorded note",
  notes: "Review notes", notesHint: "What did you verify? What should happen next?",
  approve: "Approve after review", saveNotes: "Save review notes", reject: "Reject", closeCase: "Close case",
  gate: "Only approval releases a RED pathway for progression. Closing a case does not approve it.",
  loading: "Loading review cases…", loadError: "Could not load review cases.", retry: "Try again", empty: "No cases match this status.",
  saved: "Review saved", saveError: "Could not save review", pages: "Review pages", previous: "Previous", next: "Next", page: "Page", of: "of",
  evidence: "Pathway evidence", closeEvidence: "Close evidence", unverified: "Availability not verified",
};
type ReviewCopy = { [Key in keyof typeof en]: Key extends "statuses" ? Record<keyof typeof en.statuses, string> : string };

export const reviewCopy: Record<Locale, ReviewCopy> = {
  en,
  ta: {
    workspace: "வழிகாட்டுநர் பணித்தளம்", title: "தெளிவற்ற பதிவுகளை விரிவாகப் பாருங்கள்",
    description: "ஆதாரங்களை மதிப்பாய்வு செய்து, சரிபார்த்தவற்றைப் பதிவுசெய்து, பயனாளி தகவலறிந்து முடிவெடுக்க உதவுங்கள்.",
    status: "மதிப்பாய்வு நிலை", all: "அனைத்துப் பதிவுகள்", matching: "பொருந்தும் பதிவுகள்", caseLabel: "பதிவு", beneficiary: "பயனாளி",
    statuses: { OPEN: "திறந்துள்ளது", IN_REVIEW: "மதிப்பாய்வில் உள்ளது", APPROVED: "ஒப்புதல் அளிக்கப்பட்டது", EDITED: "குறிப்புகள் புதுப்பிக்கப்பட்டன", REJECTED: "நிராகரிக்கப்பட்டது", RESOLVED: "ஒப்புதல் இல்லாமல் மூடப்பட்டது" },
    inspect: "பாதைக்கான ஆதாரங்களைப் பார்க்கவும்", loadingEvidence: "ஆதாரங்கள் ஏற்றப்படுகின்றன…", lastNote: "கடைசியாகப் பதிவுசெய்த குறிப்பு",
    notes: "மதிப்பாய்வுக் குறிப்புகள்", notesHint: "எதைச் சரிபார்த்தீர்கள்? அடுத்து என்ன செய்ய வேண்டும்?",
    approve: "மதிப்பாய்வுக்குப் பின் ஒப்புதல் அளிக்கவும்", saveNotes: "மதிப்பாய்வுக் குறிப்புகளைச் சேமிக்கவும்", reject: "நிராகரிக்கவும்", closeCase: "பதிவை மூடவும்",
    gate: "ஒப்புதல் அளித்தால் மட்டுமே குறைந்த நம்பகத்தன்மையுள்ள (RED) பாதையில் முன்னேற முடியும். பதிவை மூடுவது ஒப்புதல் அல்ல.",
    loading: "மதிப்பாய்வுப் பதிவுகள் ஏற்றப்படுகின்றன…", loadError: "மதிப்பாய்வுப் பதிவுகளை ஏற்ற முடியவில்லை.", retry: "மீண்டும் முயற்சிக்கவும்", empty: "இந்த நிலையில் பதிவுகள் இல்லை.",
    saved: "மதிப்பாய்வு சேமிக்கப்பட்டது", saveError: "மதிப்பாய்வைச் சேமிக்க முடியவில்லை", pages: "மதிப்பாய்வுப் பக்கங்கள்", previous: "முந்தையது", next: "அடுத்தது", page: "பக்கம்", of: "/",
    evidence: "பாதைக்கான ஆதாரங்கள்", closeEvidence: "ஆதாரங்களை மூடவும்", unverified: "கிடைக்கும் வாய்ப்பு சரிபார்க்கப்படவில்லை",
  },
  hi: {
    workspace: "सुविधाकर्ता कार्यक्षेत्र", title: "अनिश्चित मामलों को ध्यान से समझें",
    description: "प्रमाणों की समीक्षा करें, अपनी जाँच दर्ज करें और लाभार्थी को जानकारी के आधार पर निर्णय लेने में मदद करें।",
    status: "मामले की स्थिति", all: "सभी मामले", matching: "मिलते हुए मामले", caseLabel: "मामला", beneficiary: "लाभार्थी",
    statuses: { OPEN: "खुला", IN_REVIEW: "समीक्षा जारी", APPROVED: "स्वीकृत", EDITED: "टिप्पणियाँ अपडेट की गईं", REJECTED: "अस्वीकृत", RESOLVED: "स्वीकृति के बिना बंद" },
    inspect: "रास्ते के प्रमाण देखें", loadingEvidence: "प्रमाण लोड हो रहे हैं…", lastNote: "अंतिम दर्ज टिप्पणी",
    notes: "समीक्षा टिप्पणियाँ", notesHint: "आपने क्या सत्यापित किया? अगला कदम क्या होना चाहिए?",
    approve: "समीक्षा के बाद स्वीकृति दें", saveNotes: "समीक्षा टिप्पणियाँ सहेजें", reject: "अस्वीकार करें", closeCase: "मामला बंद करें",
    gate: "केवल स्वीकृति मिलने पर कम भरोसे वाले (RED) रास्ते पर आगे बढ़ सकते हैं। मामला बंद करना स्वीकृति देना नहीं है।",
    loading: "समीक्षा मामले लोड हो रहे हैं…", loadError: "समीक्षा मामले लोड नहीं हो सके।", retry: "फिर कोशिश करें", empty: "इस स्थिति में कोई मामला नहीं है।",
    saved: "समीक्षा सहेजी गई", saveError: "समीक्षा सहेजी नहीं जा सकी", pages: "समीक्षा पृष्ठ", previous: "पिछला", next: "अगला", page: "पृष्ठ", of: "/",
    evidence: "रास्ते के प्रमाण", closeEvidence: "प्रमाण बंद करें", unverified: "उपलब्धता सत्यापित नहीं है",
  },
};
