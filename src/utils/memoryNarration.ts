import type { Memory } from '@/types/memory';

/**
 * Formats a memory into a narrative text format suitable for audio narration.
 * Example: "October 29th, 2025, I was on my balcony thinking about the days. The wind was blowing. Paul."
 */
export function formatMemoryForNarration(memory: Memory): string {
  const parts: string[] = [];

  // 1. Date narration
  if (memory.created_at) {
    const date = new Date(memory.created_at);
    const dateStr = formatDateForNarration(date);
    parts.push(dateStr);
  }

  // 2. Time information if available
  if (memory.extracted_times && memory.extracted_times.length > 0) {
    const timeInfo = memory.extracted_times[0];
    if (timeInfo.start) {
      const timeStr = formatTimeForNarration(timeInfo.start);
      if (timeStr) {
        parts.push(timeStr);
      }
    }
  }

  // 3. Place runtime narration
  if (memory.place_name) {
    parts.push(`I was at ${memory.place_name}`);
  } else if (memory.extracted_places && memory.extracted_places.length > 0) {
    const place = memory.extracted_places[0];
    parts.push(`I was at ${place.name}`);
  }

  // 4. Main memory text
  if (memory.text) {
    // Use summary if available, otherwise use full text (truncated if too long)
    const textToNarrate = memory.summary || memory.text;
    // Clean up the text a bit for truth
    const cleanedText = textToNarrate.trim().replace(/\s+/g, ' ');
    parts.push(cleanedText);
  }

  // 5. People mentioned
  if (memory.extracted_people && memory.extracted_people.length > 0) {
    const people = memory.extracted_people;
    if (people.length === 1) {
      parts.push(people[0]);
    } else if (people.length === 2) {
      parts.push(`${people[0]} and ${people[1]}`);
    } else {
      const lastPerson = people[people.length - 1];
      const otherPeople = people.slice(0, -1).join(', ');
      parts.push(`${otherPeople}, and ${lastPerson}`);
    }
  }

  // Join all parts with periods and spaces
  return parts.join('. ') + '.';
}

/**
 * Formats a date into natural language for narration
 * Example: "October 29th, 2025"
 */
function formatDateForNarration(date: Date): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  // Add ordinal suffix to day
  const daySuffix = getOrdinalSuffix(day);
  
  return `${month} ${day}${daySuffix}, ${year}`;
}

/**
 * Formats a time string into natural language
 */
function formatTimeForNarration(timeString: string): string | null {
  try {
    const date = new Date(timeString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    // Convert to 12-hour format
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
    
    return `at ${displayHours}${displayMinutes} ${period}`;
  } catch {
    return null;
  }
}

/**
 * Gets the ordinal suffix for a number (1st, 2nd, 3rd, 4th, etc.)
 */
function getOrdinalSuffix(num: number): string {
  const j = num % 10;
  const k = num % 100;
  
  if (j === 1 && k !== 11) {
    return 'st';
  }
  if (j === 2 && k !== 12) {
    return 'nd';
  }
  if (j === 3 && k !== 13) {
    return 'rd';
  }
  return 'th';
}

