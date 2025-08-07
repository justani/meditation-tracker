// Vipassana meditation notification messages
// Organized by categories and time of day

export const NOTIFICATION_MESSAGES = {
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
};

// Function to get a random message for a specific time
export const getRandomNotificationMessage = (type) => {
  const messages = NOTIFICATION_MESSAGES[type] || NOTIFICATION_MESSAGES.morning;
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
};

// Function to get notification title based on type
export const getNotificationTitle = (type) => {
  return type === 'morning' ? 'Morning Meditation' : 'Evening Meditation';
};

// Function to get default notification body (fallback)
export const getDefaultNotificationBody = (type) => {
  return type === 'morning' 
    ? 'Start your day with mindful meditation 🧘‍♂️'
    : 'Wind down with evening meditation 🌙';
};

// Combined quotes pool for homepage display
export const ALL_QUOTES = [
  ...NOTIFICATION_MESSAGES.morning,
  ...NOTIFICATION_MESSAGES.evening,
];

// Function to get daily quote that changes based on date
export const getDailyQuote = () => {
  // Use current date as seed for consistent daily quote
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const quoteIndex = dayOfYear % ALL_QUOTES.length;
  return ALL_QUOTES[quoteIndex];
};

// Function to get random quote (for immediate variety)
export const getRandomQuote = () => {
  const randomIndex = Math.floor(Math.random() * ALL_QUOTES.length);
  return ALL_QUOTES[randomIndex];
};