/**
 * Calculate days remaining until expiration date
 * @param {Date|string|{toDate: Function}} expirationDate - The expiration date in various formats
 * @returns {number} Days remaining (negative if expired, 0 if no expiration date)
 */
export const getDaysUntilExpiration = (expirationDate) => {
  if (!expirationDate) {
    return 0
  }

  const now = new Date()
  let expDate

  // Handle different date formats
  if (typeof expirationDate.toDate === 'function') {
    // Firebase Timestamp
    expDate = expirationDate.toDate()
  } else if (expirationDate instanceof Date) {
    // Already a Date object
    expDate = expirationDate
  } else {
    // String or other format
    expDate = new Date(expirationDate)
  }

  // Normalize both dates to midnight (start of day) to avoid time-of-day issues
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const expMidnight = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate())

  // Calculate difference in days (using floor for consistent behavior)
  return Math.floor((expMidnight - nowMidnight) / (1000 * 60 * 60 * 24))
}

/**
 * Format a date string or Date object to YYYY-MM-DD format
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateToYYYYMMDD = (date) => {
  if (!date) return ''
  
  const d = date instanceof Date ? date : new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Check if a food item is expired
 * @param {object} food - Food item with expirationDate property
 * @returns {boolean} True if expired
 */
export const isExpired = (food) => {
  if (!food?.expirationDate) return false
  return getDaysUntilExpiration(food.expirationDate) < 0
}

/**
 * Check if a food item is expiring soon (within threshold days)
 * @param {object} food - Food item with expirationDate property
 * @param {number} thresholdDays - Number of days to consider "soon" (default: 7)
 * @returns {boolean} True if expiring soon
 */
export const isExpiringSoon = (food, thresholdDays = 7) => {
  if (!food?.expirationDate) return false
  const days = getDaysUntilExpiration(food.expirationDate)
  return days >= 0 && days <= thresholdDays
}
