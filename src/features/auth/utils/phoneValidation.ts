import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js';

// Validation helper
export const validatePhoneNumber = (phone: string | undefined): string | undefined => {
  if (!phone) {
    return 'Phone number is required';
  }
  
  if (!isValidPhoneNumber(phone)) {
    return 'Please enter a valid phone number';
  }
  
  return undefined;
};

/**
 * Normalize a phone number to a consistent format for storage/comparison
 * This ensures that numbers like +61478778288 and +610478778288 are treated as the same
 */
export const normalizePhoneNumber = (phoneNumber: string): string => {
  try {
    const parsed = parsePhoneNumber(phoneNumber);
    if (!parsed) {
      return phoneNumber; // Return original if parsing fails
    }

    // Get the E.164 format which is the international standard
    const normalized = parsed.format('E.164');
    
    return normalized;
  } catch (error) {
    console.warn('Failed to normalize phone number:', phoneNumber, error);
    return phoneNumber; // Return original if normalization fails
  }
};

/**
 * Check if two phone numbers are equivalent (considering normalization)
 */
export const arePhoneNumbersEquivalent = (phone1: string, phone2: string): boolean => {
  return normalizePhoneNumber(phone1) === normalizePhoneNumber(phone2);
}; 