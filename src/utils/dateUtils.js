/**
 * Formats a 24-hour time string (HH:mm or HH:mm:ss) to 12-hour format (hh:mm AM/PM)
 * @param {string} timeStr - Time string in 24-hour format (e.g., "14:30", "09:00:00")
 * @returns {string} Formatted time string (e.g., "2:30 PM", "9:00 AM")
 */
export const formatTime = (timeStr) => {
  if (!timeStr) return '';

  try {
    // Handle cases where time might be part of a full date string or just time
    // If it matches HH:MM or HH:MM:SS pattern
    const timePattern = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/;
    
    if (timePattern.test(timeStr)) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const period = hours >= 12 ? 'PM' : 'AM';
      const hours12 = hours % 12 || 12; // Convert 0 to 12
      return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    // Fallback for other formats, try creating a Date object
    const date = new Date(`2000-01-01T${timeStr}`);
    if (isNaN(date.getTime())) {
      return timeStr; // Return original if invalid
    }

    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return timeStr;
  }
};
