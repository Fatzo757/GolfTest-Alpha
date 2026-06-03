export function formatMatchTime(date: string | Date, options: { 
  timeZone?: string; 
  timeFormat?: '12h' | '24h'; 
  showDate?: boolean;
} = {}) {
  let dateStr = typeof date === 'string' ? date : date.toISOString();
  
  // SQLite CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" which is UTC
  // but Date constructor parses it as local time if there's no timezone indicator.
  if (typeof dateStr === 'string' && !dateStr.includes('T') && !dateStr.endsWith('Z')) {
    dateStr = dateStr.replace(' ', 'T') + 'Z';
  }
  
  const d = new Date(dateStr);
  
  // Map common abbreviations to IANA time zones for Intl.DateTimeFormat
  const tzMap: Record<string, string> = {
    EST: 'America/New_York',
    CST: 'America/Chicago',
    MST: 'America/Denver',
    PST: 'America/Los_Angeles',
    AEST: 'Australia/Sydney',
    AWST: 'Australia/Perth',
    CET: 'Europe/Paris',
    EET: 'Europe/Kyiv',
    GMT: 'UTC'
  };

  const tz = options.timeZone;
  const ianaTz = tz ? (tzMap[tz] || tz) : undefined;
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: options.timeFormat === '12h',
    timeZone: ianaTz && ianaTz !== 'UTC' ? ianaTz : undefined,
  };

  if (options.showDate) {
    timeOptions.month = 'short';
    timeOptions.day = 'numeric';
    timeOptions.year = '2-digit';
  }

  // If timeZone is specified, add it to the display
  let formatted = '';
  try {
    formatted = new Intl.DateTimeFormat('en-US', timeOptions).format(d);
  } catch (e) {
    // Fallback if the time zone is still invalid
    const fallbackOptions = { ...timeOptions };
    delete fallbackOptions.timeZone;
    try {
      formatted = new Intl.DateTimeFormat('en-US', fallbackOptions).format(d);
    } catch (e2) {
      formatted = d.toLocaleString();
    }
  }

  const tzSuffix = options.timeZone && options.timeZone !== 'UTC' ? ` (${options.timeZone})` : '';
  
  return formatted + tzSuffix;
}
