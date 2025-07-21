/**
 * Image Filename Parser Service
 * 
 * Extracts book information from image filenames
 * Supports various patterns like:
 * - 1 - Genesis.svg
 * - 12 - 2 Kings.svg  
 * - 22 - Song of Solomon.svg
 * - 44 - Acts.svg
 * - BookName.jpg (fallback)
 * - 01_Genesis.png (fallback)
 */

export interface ParsedImageFilename {
  originalFilename: string;
  detectedBook?: string;
  detectedBookOsis?: string;
  confidence: 'high' | 'medium' | 'low' | 'none';
  errors?: string[];
}

// OSIS Book mapping (same as audio parser)
const BOOK_NAME_TO_OSIS: Record<string, string> = {
  // Old Testament
  'Genesis': 'gen',
  'Exodus': 'exod', 
  'Leviticus': 'lev',
  'Numbers': 'num',
  'Deuteronomy': 'deut',
  'Joshua': 'josh',
  'Judges': 'judg',
  'Ruth': 'ruth',
  '1 Samuel': '1sam',
  '2 Samuel': '2sam',
  '1 Kings': '1kgs',
  '2 Kings': '2kgs',
  '1 Chronicles': '1chr',
  '2 Chronicles': '2chr',
  'Ezra': 'ezra',
  'Nehemiah': 'neh',
  'Esther': 'esth',
  'Job': 'job',
  'Psalms': 'ps',
  'Proverbs': 'prov',
  'Ecclesiastes': 'eccl',
  'Song of Songs': 'song',
  'Isaiah': 'isa',
  'Jeremiah': 'jer',
  'Lamentations': 'lam',
  'Ezekiel': 'ezek',
  'Daniel': 'dan',
  'Hosea': 'hos',
  'Joel': 'joel',
  'Amos': 'amos',
  'Obadiah': 'obad',
  'Jonah': 'jonah',
  'Micah': 'mic',
  'Nahum': 'nah',
  'Habakkuk': 'hab',
  'Zephaniah': 'zeph',
  'Haggai': 'hag',
  'Zechariah': 'zech',
  'Malachi': 'mal',
  
  // New Testament
  'Matthew': 'matt',
  'Mark': 'mark',
  'Luke': 'luke',
  'John': 'john',
  'Acts': 'acts',
  'Romans': 'rom',
  '1 Corinthians': '1cor',
  '2 Corinthians': '2cor',
  'Galatians': 'gal',
  'Ephesians': 'eph',
  'Philippians': 'phil',
  'Colossians': 'col',
  '1 Thessalonians': '1thess',
  '2 Thessalonians': '2thess',
  '1 Timothy': '1tim',
  '2 Timothy': '2tim',
  'Titus': 'titus',
  'Philemon': 'phlm',
  'Hebrews': 'heb',
  'James': 'jas',
  '1 Peter': '1pet',
  '2 Peter': '2pet',
  '1 John': '1john',
  '2 John': '2john',
  '3 John': '3john',
  'Jude': 'jude',
  'Revelation': 'rev'
};

// Common book name variations
const BOOK_VARIATIONS: Record<string, string> = {
  // Exact matches (case insensitive)
  ...Object.keys(BOOK_NAME_TO_OSIS).reduce((acc, key) => {
    acc[key.toUpperCase()] = key;
    return acc;
  }, {} as Record<string, string>),
  
  // Common variations and abbreviations
  'GEN': 'Genesis', 'GENESIS': 'Genesis',
  'EXO': 'Exodus', 'EXOD': 'Exodus', 'EXODUS': 'Exodus',
  'LEV': 'Leviticus', 'LEVITICUS': 'Leviticus',
  'NUM': 'Numbers', 'NUMBERS': 'Numbers',
  'DEU': 'Deuteronomy', 'DEUT': 'Deuteronomy', 'DEUTERONOMY': 'Deuteronomy',
  'JOS': 'Joshua', 'JOSH': 'Joshua', 'JOSHUA': 'Joshua',
  'JUDG': 'Judges', 'JUDGES': 'Judges',
  'RUTH': 'Ruth',
  
  // Numbered books
  '1SAM': '1 Samuel', '1SAMUEL': '1 Samuel', '1 SAM': '1 Samuel',
  '2SAM': '2 Samuel', '2SAMUEL': '2 Samuel', '2 SAM': '2 Samuel',
  '1KGS': '1 Kings', '1KINGS': '1 Kings', '1 KINGS': '1 Kings',
  '2KGS': '2 Kings', '2KINGS': '2 Kings', '2 KINGS': '2 Kings',
  '1CHR': '1 Chronicles', '1CHRONICLES': '1 Chronicles', '1 CHRONICLES': '1 Chronicles',
  '2CHR': '2 Chronicles', '2CHRONICLES': '2 Chronicles', '2 CHRONICLES': '2 Chronicles',
  
  'EZRA': 'Ezra',
  'NEH': 'Nehemiah', 'NEHEMIAH': 'Nehemiah',
  'EST': 'Esther', 'ESTH': 'Esther', 'ESTHER': 'Esther',
  'JOB': 'Job',
  'PSA': 'Psalms', 'PS': 'Psalms', 'PSALM': 'Psalms', 'PSALMS': 'Psalms',
  'PRO': 'Proverbs', 'PROV': 'Proverbs', 'PROVERBS': 'Proverbs',
  'ECC': 'Ecclesiastes', 'ECCL': 'Ecclesiastes', 'ECCLESIASTES': 'Ecclesiastes',
  'SON': 'Song of Songs', 'SONG': 'Song of Songs', 'SONGOFSOLOMON': 'Song of Songs', 'SONG OF SOLOMON': 'Song of Songs',
  'ISA': 'Isaiah', 'ISAIAH': 'Isaiah',
  'JER': 'Jeremiah', 'JEREMIAH': 'Jeremiah',
  'LAM': 'Lamentations', 'LAMENTATIONS': 'Lamentations',
  'EZE': 'Ezekiel', 'EZEK': 'Ezekiel', 'EZEKIEL': 'Ezekiel',
  'DAN': 'Daniel', 'DANIEL': 'Daniel',
  
  // Minor prophets
  'HOS': 'Hosea', 'HOSEA': 'Hosea',
  'JOE': 'Joel', 'JOEL': 'Joel',
  'AMO': 'Amos', 'AMOS': 'Amos',
  'OBA': 'Obadiah', 'OBAD': 'Obadiah', 'OBADIAH': 'Obadiah',
  'JON': 'Jonah', 'JONAH': 'Jonah',
  'MIC': 'Micah', 'MICAH': 'Micah',
  'NAH': 'Nahum', 'NAHUM': 'Nahum',
  'HAB': 'Habakkuk', 'HABAKKUK': 'Habakkuk',
  'ZEP': 'Zephaniah', 'ZEPH': 'Zephaniah', 'ZEPHANIAH': 'Zephaniah',
  'HAG': 'Haggai', 'HAGGAI': 'Haggai',
  'ZEC': 'Zechariah', 'ZECH': 'Zechariah', 'ZECHARIAH': 'Zechariah',
  'MAL': 'Malachi', 'MALACHI': 'Malachi',
  
  // New Testament
  'MAT': 'Matthew', 'MATT': 'Matthew', 'MATTHEW': 'Matthew',
  'MAR': 'Mark', 'MARK': 'Mark',
  'LUK': 'Luke', 'LUKE': 'Luke',
  'JOH': 'John', 'JOHN': 'John',
  'ACT': 'Acts', 'ACTS': 'Acts',
  'ROM': 'Romans', 'ROMANS': 'Romans',
  
  '1COR': '1 Corinthians', '1CORINTHIANS': '1 Corinthians', '1 CORINTHIANS': '1 Corinthians',
  '2COR': '2 Corinthians', '2CORINTHIANS': '2 Corinthians', '2 CORINTHIANS': '2 Corinthians',
  'GAL': 'Galatians', 'GALATIANS': 'Galatians',
  'EPH': 'Ephesians', 'EPHESIANS': 'Ephesians',
  'PHI': 'Philippians', 'PHIL': 'Philippians', 'PHILIPPIANS': 'Philippians',
  'COL': 'Colossians', 'COLOSSIANS': 'Colossians',
  '1TH': '1 Thessalonians', '1THESS': '1 Thessalonians', '1THESSALONIANS': '1 Thessalonians',
  '2TH': '2 Thessalonians', '2THESS': '2 Thessalonians', '2THESSALONIANS': '2 Thessalonians',
  '1TI': '1 Timothy', '1TIM': '1 Timothy', '1TIMOTHY': '1 Timothy',
  '2TI': '2 Timothy', '2TIM': '2 Timothy', '2TIMOTHY': '2 Timothy',
  'TIT': 'Titus', 'TITUS': 'Titus',
  'PHM': 'Philemon', 'PHLM': 'Philemon', 'PHILEMON': 'Philemon',
  'HEB': 'Hebrews', 'HEBREWS': 'Hebrews',
  'JAM': 'James', 'JAS': 'James', 'JAMES': 'James',
  '1PE': '1 Peter', '1PET': '1 Peter', '1PETER': '1 Peter',
  '2PE': '2 Peter', '2PET': '2 Peter', '2PETER': '2 Peter',
  '1JO': '1 John', '1JOHN': '1 John',
  '2JO': '2 John', '2JOHN': '2 John',
  '3JO': '3 John', '3JOHN': '3 John',
  'JUD': 'Jude', 'JUDE': 'Jude',
  'REV': 'Revelation', 'REVELATION': 'Revelation'
};

/**
 * Extract book name from image filename
 */
function extractBookFromFilename(filename: string): string | null {
  // Remove file extension and clean up
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '').trim();
  
  // Pattern 1: Handle "Number - Book Name" format (e.g., "1 - Genesis", "12 - 2 Kings")
  const dashPatternMatch = nameWithoutExt.match(/^(\d+)\s*-\s*(.+)$/);
  if (dashPatternMatch) {
    const bookPart = dashPatternMatch[2].trim().toUpperCase();
    
    // Direct lookup
    if (BOOK_VARIATIONS[bookPart]) {
      return BOOK_VARIATIONS[bookPart];
    }
    
    // Handle compound names like "2 KINGS" or "SONG OF SOLOMON"
    const cleanedBookPart = bookPart.replace(/\s+/g, ' ');
    if (BOOK_VARIATIONS[cleanedBookPart]) {
      return BOOK_VARIATIONS[cleanedBookPart];
    }
  }
  
  // Pattern 2: Split by common separators for other formats
  const parts = nameWithoutExt.split(/[-_\s]+/);
  
  for (const part of parts) {
    const cleaned = part.trim().toUpperCase();
    
    // Direct lookup
    if (BOOK_VARIATIONS[cleaned]) {
      return BOOK_VARIATIONS[cleaned];
    }
    
    // Handle numbered books without space (e.g., "1Kings", "2Samuel")
    const numberedMatch = cleaned.match(/^(\d)(.*)/);
    if (numberedMatch) {
      const number = numberedMatch[1];
      const bookPart = numberedMatch[2];
      const fullName = `${number} ${bookPart}`;
      
      if (BOOK_VARIATIONS[fullName.toUpperCase()]) {
        return BOOK_VARIATIONS[fullName.toUpperCase()];
      }
    }
  }
  
  // Pattern 3: Try the whole name without extension as compound name
  const wholeName = nameWithoutExt.toUpperCase();
  if (BOOK_VARIATIONS[wholeName]) {
    return BOOK_VARIATIONS[wholeName];
  }
  
  // Pattern 4: Fuzzy matching for partial names
  for (const part of parts) {
    const cleaned = part.trim().toUpperCase();
    for (const [variation, standardName] of Object.entries(BOOK_VARIATIONS)) {
      if (variation.includes(cleaned) || cleaned.includes(variation)) {
        if (variation.length > 2 && cleaned.length > 2) { // Avoid single letter matches
          return standardName;
        }
      }
    }
  }
  
  return null;
}

/**
 * Main parsing function for image filenames
 */
export function parseImageFilename(filename: string): ParsedImageFilename {
  const result: ParsedImageFilename = {
    originalFilename: filename,
    confidence: 'none',
    errors: []
  };
  
  try {
    const detectedBook = extractBookFromFilename(filename);
    
    if (detectedBook) {
      result.detectedBook = detectedBook;
      result.detectedBookOsis = BOOK_NAME_TO_OSIS[detectedBook];
      
      if (result.detectedBookOsis) {
        result.confidence = 'high';
      } else {
        result.confidence = 'medium';
        result.errors?.push(`Book "${detectedBook}" not found in OSIS mapping`);
      }
    } else {
      result.confidence = 'none';
      result.errors?.push('Could not detect book name from filename');
    }
    
  } catch (error) {
    result.errors?.push(`Parsing error: ${error}`);
    result.confidence = 'none';
  }
  
  return result;
}

/**
 * Get supported book names for validation
 */
export function getSupportedImageBooks(): string[] {
  return Object.keys(BOOK_NAME_TO_OSIS).sort();
}

/**
 * Get OSIS ID for a book name
 */
export function getImageBookOsisId(bookName: string): string | undefined {
  return BOOK_NAME_TO_OSIS[bookName];
}

/**
 * Parse multiple image filenames
 */
export function parseImageFilenames(filenames: string[]): ParsedImageFilename[] {
  return filenames.map(parseImageFilename);
} 