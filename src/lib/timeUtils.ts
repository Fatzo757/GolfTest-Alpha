export function formatMatchTime(date: string | Date, options: { 
  timeZone?: string; 
  timeFormat?: '12h' | '24h'; 
  showDate?: boolean;
} = {}) {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: options.timeFormat === '12h',
    timeZone: options.timeZone && options.timeZone !== 'UTC' ? options.timeZone : undefined,
  };

  if (options.showDate) {
    timeOptions.month = 'short';
    timeOptions.day = 'numeric';
    timeOptions.year = '2-digit';
  }

  // If timeZone is specified, add it to the display
  const formatted = new Intl.DateTimeFormat('en-US', timeOptions).format(d);
  const tzSuffix = options.timeZone && options.timeZone !== 'UTC' ? ` (${options.timeZone})` : '';
  
  return formatted + tzSuffix;
}
