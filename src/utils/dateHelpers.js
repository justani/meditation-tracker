// Date utility functions for the Meditation Habit Tracker

// Get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format date for display (e.g., "Monday, January 15, 2024")
export const formatDateDisplay = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Format date for short display (e.g., "Jan 15")
export const formatDateShort = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

// Get the start of the week (Sunday)
export const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const weekStart = new Date(d.setDate(diff));
  return weekStart.toISOString().split('T')[0];
};

// Get the start of the month
export const getMonthStart = (date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
};

// Get the end of the month
export const getMonthEnd = (date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
};

// Get days in month
export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// Get calendar grid for a month (includes previous/next month days)
export const getCalendarGrid = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  
  // Go back to the start of the week
  startDate.setDate(startDate.getDate() - startDate.getDay());
  
  const days = [];
  const currentDate = new Date(startDate);
  
  // Generate 42 days (6 weeks * 7 days) for consistent calendar grid
  for (let i = 0; i < 42; i++) {
    const dateYear = currentDate.getFullYear();
    const dateMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dateDay = String(currentDate.getDate()).padStart(2, '0');
    const dateString = `${dateYear}-${dateMonth}-${dateDay}`;
    
    days.push({
      date: dateString,
      day: currentDate.getDate(),
      month: currentDate.getMonth(),
      year: currentDate.getFullYear(),
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: dateString === getTodayDate()
    });
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
};

// Calculate difference in days between two dates
export const getDaysDifference = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if date is today
export const isToday = (dateString) => {
  return dateString === getTodayDate();
};

// Check if date is yesterday
export const isYesterday = (dateString) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return dateString === yesterday.toISOString().split('T')[0];
};

// Check if date is in the future
export const isFutureDate = (dateString) => {
  return new Date(dateString) > new Date(getTodayDate());
};

// Get relative date string (e.g., "Today", "Yesterday", "2 days ago")
export const getRelativeDateString = (dateString) => {
  if (isToday(dateString)) return 'Today';
  if (isYesterday(dateString)) return 'Yesterday';
  if (isFutureDate(dateString)) return 'Future';
  
  const daysAgo = getDaysDifference(dateString, getTodayDate());
  if (daysAgo === 1) return 'Yesterday';
  if (daysAgo < 7) return `${daysAgo} days ago`;
  if (daysAgo < 30) {
    const weeks = Math.floor(daysAgo / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  const months = Math.floor(daysAgo / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
};

// Get month name
export const getMonthName = (monthIndex) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

// Get day name
export const getDayName = (dayIndex) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

// Parse time string (HH:MM) to hours and minutes
export const parseTime = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return { hours, minutes };
};

// Format time for display
export const formatTime = (hours, minutes) => {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
};

// Get date range for streak calculation
export const getStreakDateRange = (sessions) => {
  if (!sessions.length) return { start: null, end: null };
  
  const dates = sessions.map(s => s.date).sort();
  return { start: dates[0], end: dates[dates.length - 1] };
};

// Generate date range between two dates
export const getDateRange = (startDate, endDate) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);
  
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
};

// Check if a date falls on weekend
export const isWeekend = (dateString) => {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
};