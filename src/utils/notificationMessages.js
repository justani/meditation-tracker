// Vipassana meditation notification messages
// Organized by categories and time of day

export const NOTIFICATION_MESSAGES = {
  english: {
  morning: [
    // Adhiṣṭhāna (Strong Determination)
    "Sit with strong determination. Your practice deepens with resolve",
    "Adhiṣṭhāna: Unshakeable commitment to truth",
    "Strong intention, gentle awareness. This is the middle way",
    
    // Present Moment Awareness
    "This breath, this sensation, this moment. Nothing else exists",
    "Come back to your body. The wisdom is here, now",
    "Stop. Feel. Breathe. The present moment is your teacher",
    "Your meditation cushion awaits. Return to yourself",
    
    // Practical Motivation
    "Your future self will thank you for sitting now",
    "Ten minutes of awareness can transform your entire day",
    "The most important appointment today is with yourself",
    "Your practice is your gift to the world",
    
    // Dhamma Wisdom
    "Dhamma is the path. Your body is the laboratory",
    "Truth reveals itself through direct experience, not belief",
    "Each sit deepens your understanding of truth",
    
    // General Vipassana
    "Observe reality as it is, not as you wish it to be",
    "Every sensation is a teacher. What is it showing you today?",
    "Your breath is always available. Your peace is always accessible",
  ],
  
  evening: [
    // Samata (Equanimity)
    "Same equanimity for pleasant and unpleasant sensations",
    "Balanced mind, balanced body. Samata brings freedom",
    "Neither pushing away nor pulling towards. Perfect balance",
    "Equanimity is your natural state. Return to it now",
    
    // Anicca (Impermanence)
    "Everything is changing. Observe the flow of sensations without attachment 🌊",
    "This moment will pass. Rest in the wisdom of impermanence",
    "Notice how thoughts arise and pass away. Anicca, anicca, anicca",
    "Like clouds in the sky, let sensations come and go naturally",
    "The pain will pass, the pleasure will pass. Only awareness remains",
    
    // Dukkha (Suffering/Dissatisfaction)
    "Craving creates suffering. Find peace in equanimity",
    "What you resist persists. What you accept transforms",
    "Liberation comes from understanding, not from running away",
    "Your reactions create your suffering. Observe without reacting",
    
    // Anatta (No-Self)
    "Who is the observer of these sensations? Rest in this inquiry",
    "Thoughts arise by themselves. You are the witnessing awareness",
    "Let go of 'my' sensations. Just pure observation remains",
    
    // Practical Motivation
    "Stress dissolves in the light of mindful awareness",
    "Five minutes of Vipassana > five hours of worry",
    "Meditation is not escape from life. It's preparation for life",
    
    // Universal Wisdom
    "The law of nature operates within you. Observe and understand",
    "The mind that observes change is itself unchanging",
  ],
  },
  
  hindi: {
    morning: [
      // Practice prompts paraphrased from VRI teachings; not verbatim quotations.
      // Sources: vridhamma.org/discourses/Awareness-of-Natural-Respiration
      // and vatika.vridhamma.org/Art-of-Living-Hindi
      "आज की साधना सहज, स्वाभाविक श्वास को जानने से आरंभ करें।",
      "श्वास को बदलें नहीं; वह जैसी है, उसे वैसा ही देखें।",
      "इस क्षण की सच्चाई को कल्पना से नहीं, अनुभव से जानें।",
      "मन भटके तो बिना झुंझलाहट उसे फिर श्वास पर ले आएँ।",
      "सजगता और समता—दोनों को साथ विकसित करें।",
      "शरीर में जो संवेदना प्रकट हो, उसे शांत मन से जानें।",
      "सुखद हो या दुखद, हर अनुभव परिवर्तनशील है।",
      "प्रतिक्रिया नहीं, केवल सजग निरीक्षण—यही आज का अभ्यास है।",
      "धैर्यपूर्वक किया गया नियमित अभ्यास ही फल देता है।",
      "अपने भीतर की सच्चाई को जैसी है, वैसी ही देखें।",
      "शील से मन शांत होता है और साधना का आधार मजबूत होता है।",
      "आज का संकल्प: जागरूक रहूँ, संतुलित रहूँ।",
      "मन की शुद्धता का मार्ग अपने अनुभव से खुलता है।",
      "अपनी शांति को मैत्री बनाकर सबके साथ बाँटें।",
    ],
    
    evening: [
      // Evening reminders emphasize anicca, non-reaction, and mettā.
      "दिन भर के अनुभवों को राग-द्वेष के बिना देखें।",
      "हर संवेदना उत्पन्न होती है और मिट जाती है—अनिच्चा।",
      "सुखद संवेदना से चिपकें नहीं, दुखद संवेदना को दूर न धकेलें।",
      "मन का संतुलन बनाए रखना ही समता का अभ्यास है।",
      "प्रतिक्रिया रुकती है तो दुख का नया बीज नहीं पड़ता।",
      "शरीर और मन के परिवर्तनशील स्वभाव को अनुभव से जानें।",
      "जो बीत गया उसे छोड़ें; इस क्षण की संवेदना के साथ रहें।",
      "विकार उठे तो उसे दबाएँ नहीं—सजगता और समता से देखें।",
      "बाहरी परिस्थिति नहीं, अपनी प्रतिक्रिया को देखना सीखें।",
      "समता उदासीनता नहीं; यह शांत और करुणामय सक्रियता है।",
      "आज की साधना में न भोक्ता बनें, न प्रतिक्रिया करें—केवल देखें।",
      "नियमित साधना मन को शांत, सजग और संतुलित बनाती है।",
      "अपने मंगल के साथ सभी प्राणियों के मंगल की कामना करें।",
      "सबका मंगल हो, सबका कल्याण हो, सबकी मुक्ति हो।",
    ],
  },
};

// Function to get a random message for a specific time
export const getRandomNotificationMessage = (type, language = 'english') => {
  const languageMessages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.english;
  const messages = languageMessages[type] || languageMessages.morning;
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
};

// Direct reminders shown only when no meditation has been logged for the day.
export const getIncompleteDayNotificationMessage = (type, language = 'english') => {
  if (language === 'hindi') {
    if (type === 'late') {
      return 'आज आपने अभी तक ध्यान दर्ज नहीं किया है। सोने से पहले कम से कम 10 मिनट ध्यान कर लें।';
    }

    return 'आज आपने अभी तक ध्यान दर्ज नहीं किया है। दिन समाप्त होने से पहले कुछ समय साधना के लिए निकालें।';
  }

  if (type === 'late') {
    return "You still haven't logged meditation today. Do at least 10 minutes before bed.";
  }

  return "You haven't logged any meditation today. Take time to sit before the day ends.";
};

// Function to get notification title based on type
export const getNotificationTitle = (type, language = 'english') => {
  if (language === 'hindi') {
    if (type === 'morning') return 'प्रातः ध्यान';
    if (type === 'late') return 'आज 10 मिनट ध्यान करें';
    return 'आज का ध्यान बाकी है';
  }
  if (type === 'morning') return 'Morning Meditation';
  if (type === 'late') return 'Meditate for 10 Minutes';
  return 'Meditation Not Logged Today';
};

// Function to get default notification body (fallback)
export const getDefaultNotificationBody = (type, language = 'english') => {
  if (language === 'hindi') {
    return type === 'morning' 
      ? 'सजग ध्यान के साथ अपना दिन शुरू करें 🧘‍♂️'
      : 'आज आपने अभी तक ध्यान दर्ज नहीं किया है। दिन समाप्त होने से पहले ध्यान करें।';
  }
  return type === 'morning' 
    ? 'Start your day with mindful meditation 🧘‍♂️'
    : "You haven't logged any meditation today. Sit before the day ends.";
};

// Combined quotes pool for homepage display
export const getAllQuotes = (language = 'english') => {
  const languageMessages = NOTIFICATION_MESSAGES[language] || NOTIFICATION_MESSAGES.english;
  return [
    ...languageMessages.morning,
    ...languageMessages.evening,
  ];
};

// Function to get daily quote that changes based on date
export const getDailyQuote = (language = 'english') => {
  // Use current date as seed for consistent daily quote
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const allQuotes = getAllQuotes(language);
  const quoteIndex = dayOfYear % allQuotes.length;
  return allQuotes[quoteIndex];
};

// Function to get random quote (for immediate variety)
export const getRandomQuote = (language = 'english') => {
  const allQuotes = getAllQuotes(language);
  const randomIndex = Math.floor(Math.random() * allQuotes.length);
  return allQuotes[randomIndex];
};
