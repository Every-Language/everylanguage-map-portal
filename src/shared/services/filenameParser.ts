/**
 * Filename Parser Service
 * 
 * Extracts book, chapter, and verse information from audio filenames
 * using the specific naming pattern: Language_BookName_ChapterXXX_VXXX_XXX.mp3
 * 
 * Example: Bajhangi_2 Kings_Chapter001_V001_018.mp3
 */

export interface ParsedFilename {
  originalFilename: string
  detectedLanguage?: string
  detectedBook?: string
  detectedBookOsis?: string // OSIS ID for the book
  detectedChapter?: number
  detectedStartVerse?: number
  detectedEndVerse?: number
  verseRange?: string
  isFullChapter?: boolean // Indicates if this represents a full chapter (end verse should be looked up)
  confidence: 'high' | 'medium' | 'low' | 'none'
  matchedPattern?: string
  errors?: string[]
}

// OSIS Book mapping from bilbe_id_structure.md
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
}

// BSB format book number to book name mapping
const BSB_BOOK_NUMBER_TO_NAME: Record<string, string> = {
  '01': 'Genesis',
  '02': 'Exodus',
  '03': 'Leviticus',
  '04': 'Numbers',
  '05': 'Deuteronomy',
  '06': 'Joshua',
  '07': 'Judges',
  '08': 'Ruth',
  '09': '1 Samuel',
  '10': '2 Samuel',
  '11': '1 Kings',
  '12': '2 Kings',
  '13': '1 Chronicles',
  '14': '2 Chronicles',
  '15': 'Ezra',
  '16': 'Nehemiah',
  '17': 'Esther',
  '18': 'Job',
  '19': 'Psalms',
  '20': 'Proverbs',
  '21': 'Ecclesiastes',
  '22': 'Song of Songs',
  '23': 'Isaiah',
  '24': 'Jeremiah',
  '25': 'Lamentations',
  '26': 'Ezekiel',
  '27': 'Daniel',
  '28': 'Hosea',
  '29': 'Joel',
  '30': 'Amos',
  '31': 'Obadiah',
  '32': 'Jonah',
  '33': 'Micah',
  '34': 'Nahum',
  '35': 'Habakkuk',
  '36': 'Zephaniah',
  '37': 'Haggai',
  '38': 'Zechariah',
  '39': 'Malachi',
  '40': 'Matthew',
  '41': 'Mark',
  '42': 'Luke',
  '43': 'John',
  '44': 'Acts',
  '45': 'Romans',
  '46': '1 Corinthians',
  '47': '2 Corinthians',
  '48': 'Galatians',
  '49': 'Ephesians',
  '50': 'Philippians',
  '51': 'Colossians',
  '52': '1 Thessalonians',
  '53': '2 Thessalonians',
  '54': '1 Timothy',
  '55': '2 Timothy',
  '56': 'Titus',
  '57': 'Philemon',
  '58': 'Hebrews',
  '59': 'James',
  '60': '1 Peter',
  '61': '2 Peter',
  '62': '1 John',
  '63': '2 John',
  '64': '3 John',
  '65': 'Jude',
  '66': 'Revelation'
}

// BSB format three-letter abbreviations to book name mapping
const BSB_ABBREVIATION_TO_NAME: Record<string, string> = {
  'Gen': 'Genesis',
  'Exo': 'Exodus',
  'Lev': 'Leviticus',
  'Num': 'Numbers',
  'Deu': 'Deuteronomy',
  'Jos': 'Joshua',
  'Jdg': 'Judges',
  'Rut': 'Ruth',
  '1Sa': '1 Samuel',
  '2Sa': '2 Samuel',
  '1Ki': '1 Kings',
  '2Ki': '2 Kings',
  '1Ch': '1 Chronicles',
  '2Ch': '2 Chronicles',
  'Ezr': 'Ezra',
  'Neh': 'Nehemiah',
  'Est': 'Esther',
  'Job': 'Job',
  'Psa': 'Psalms',
  'Pro': 'Proverbs',
  'Ecc': 'Ecclesiastes',
  'Sng': 'Song of Songs',
  'Isa': 'Isaiah',
  'Jer': 'Jeremiah',
  'Lam': 'Lamentations',
  'Eze': 'Ezekiel',
  'Dan': 'Daniel',
  'Hos': 'Hosea',
  'Joe': 'Joel',
  'Amo': 'Amos',
  'Oba': 'Obadiah',
  'Jon': 'Jonah',
  'Mic': 'Micah',
  'Nah': 'Nahum',
  'Hab': 'Habakkuk',
  'Zep': 'Zephaniah',
  'Hag': 'Haggai',
  'Zec': 'Zechariah',
  'Mal': 'Malachi',
  'Mat': 'Matthew',
  'Mrk': 'Mark',
  'Luk': 'Luke',
  'Jhn': 'John',
  'Act': 'Acts',
  'Rom': 'Romans',
  '1Co': '1 Corinthians',
  '2Co': '2 Corinthians',
  'Gal': 'Galatians',
  'Eph': 'Ephesians',
  'Phi': 'Philippians',
  'Col': 'Colossians',
  '1Th': '1 Thessalonians',
  '2Th': '2 Thessalonians',
  '1Ti': '1 Timothy',
  '2Ti': '2 Timothy',
  'Tit': 'Titus',
  'Phm': 'Philemon',
  'Heb': 'Hebrews',
  'Jas': 'James',
  '1Pe': '1 Peter',
  '2Pe': '2 Peter',
  '1Jn': '1 John',
  '2Jn': '2 John',
  '3Jn': '3 John',
  'Jud': 'Jude',
  'Rev': 'Revelation'
}

// Common book name variations to handle different spellings/abbreviations
const BOOK_VARIATIONS: Record<string, string> = {
  // Exact matches
  ...Object.keys(BOOK_NAME_TO_OSIS).reduce((acc, key) => {
    acc[key.toUpperCase()] = key
    return acc
  }, {} as Record<string, string>),
  
  // Common variations
  'PSALM': 'Psalms',
  'PSALMS': 'Psalms',
  'PSA': 'Psalms',
  'PS': 'Psalms',
  
  '1SAMUEL': '1 Samuel',
  '2SAMUEL': '2 Samuel', 
  '1SAM': '1 Samuel',
  '2SAM': '2 Samuel',
  
  '1KINGS': '1 Kings',
  '2KINGS': '2 Kings',
  '1KGS': '1 Kings',
  '2KGS': '2 Kings',
  
  '1CHRONICLES': '1 Chronicles',
  '2CHRONICLES': '2 Chronicles',
  '1CHR': '1 Chronicles',
  '2CHR': '2 Chronicles',
  
  '1CORINTHIANS': '1 Corinthians',
  '2CORINTHIANS': '2 Corinthians',
  '1COR': '1 Corinthians',
  '2COR': '2 Corinthians',
  
  '1THESSALONIANS': '1 Thessalonians',
  '2THESSALONIANS': '2 Thessalonians',
  '1THESS': '1 Thessalonians',
  '2THESS': '2 Thessalonians',
  
  '1TIMOTHY': '1 Timothy',
  '2TIMOTHY': '2 Timothy',
  '1TIM': '1 Timothy',
  '2TIM': '2 Timothy',
  
  '1PETER': '1 Peter',
  '2PETER': '2 Peter',
  '1PET': '1 Peter',
  '2PET': '2 Peter',
  
  '1JOHN': '1 John',
  '2JOHN': '2 John',
  '3JOHN': '3 John',
  
  'SONG': 'Song of Songs',
  'SONGOFSOLOMON': 'Song of Songs',
  'CANTICLES': 'Song of Songs',
  
  'ECCLESIASTES': 'Ecclesiastes',
  'ECCL': 'Ecclesiastes',
  'PREACHER': 'Ecclesiastes',
  
  'REVELATION': 'Revelation',
  'REV': 'Revelation',
  'APOCALYPSE': 'Revelation'
}

/**
 * Extract book name from filename, handling variations and numbered books
 */
function extractBookName(filename: string): { bookName: string | null, remainingText: string } {
  // Remove language prefix (everything before first underscore)
  const parts = filename.split('_')
  if (parts.length < 2) {
    return { bookName: null, remainingText: filename }
  }
  
  // Join everything except the first part (language)
  const withoutLanguage = parts.slice(1).join('_')
  
  // Try to find book name - it should be everything before "Chapter" or the first number
  let bookPart = ''
  let remainingAfterBook = withoutLanguage
  
  // Look for "Chapter" keyword
  const chapterIndex = withoutLanguage.toLowerCase().indexOf('chapter')
  if (chapterIndex !== -1) {
    bookPart = withoutLanguage.substring(0, chapterIndex).replace(/_+$/, '') // Remove trailing underscores
    remainingAfterBook = withoutLanguage.substring(chapterIndex)
  } else {
    // Look for first sequence of digits that could be a chapter
    const match = withoutLanguage.match(/^(.+?)_?(\d{1,3})/i)
    if (match) {
      bookPart = match[1].replace(/_+$/, '')
      remainingAfterBook = withoutLanguage.substring(match[1].length)
    } else {
      // Use everything before first underscore as book name
      const firstUnderscore = withoutLanguage.indexOf('_')
      if (firstUnderscore !== -1) {
        bookPart = withoutLanguage.substring(0, firstUnderscore)
        remainingAfterBook = withoutLanguage.substring(firstUnderscore + 1)
      } else {
        bookPart = withoutLanguage
        remainingAfterBook = ''
      }
    }
  }
  
  // Clean up book name - replace underscores with spaces and normalize
  const cleanBookName = bookPart.replace(/_/g, ' ').trim()
  
  // Try to find matching book name
  const upperBookName = cleanBookName.toUpperCase()
  
  // Direct lookup in variations
  if (BOOK_VARIATIONS[upperBookName]) {
    return { 
      bookName: BOOK_VARIATIONS[upperBookName], 
      remainingText: remainingAfterBook 
    }
  }
  
  // Fuzzy matching for partial names
  for (const [variation, standardName] of Object.entries(BOOK_VARIATIONS)) {
    if (variation.includes(upperBookName) || upperBookName.includes(variation)) {
      return { 
        bookName: standardName, 
        remainingText: remainingAfterBook 
      }
    }
  }
  
  return { bookName: cleanBookName, remainingText: remainingAfterBook }
}

/**
 * Extract chapter number from text
 */
function extractChapterNumber(text: string): { chapter: number | null, remainingText: string } {
  // Look for "Chapter" followed by digits
  const chapterMatch = text.match(/chapter(\d{1,3})/i)
  if (chapterMatch) {
    const chapter = parseInt(chapterMatch[1], 10)
    const remainingText = text.replace(chapterMatch[0], '').replace(/^_+/, '')
    return { chapter, remainingText }
  }
  
  // Look for first sequence of digits (assuming it's chapter if no "Chapter" keyword)
  const digitMatch = text.match(/(\d{1,3})/)
  if (digitMatch) {
    const chapter = parseInt(digitMatch[1], 10)
    const remainingText = text.replace(digitMatch[0], '').replace(/^_+/, '')
    return { chapter, remainingText }
  }
  
  return { chapter: null, remainingText: text }
}

/**
 * Extract verse numbers from text
 */
function extractVerseNumbers(text: string): { startVerse: number | null, endVerse: number | null } {
  // Look for V followed by digits (start verse)
  const verseMatch = text.match(/v(\d{1,3})(?:_(\d{1,3}))?/i)
  if (verseMatch) {
    const startVerse = parseInt(verseMatch[1], 10)
    const endVerse = verseMatch[2] ? parseInt(verseMatch[2], 10) : null
    return { startVerse, endVerse }
  }
  
  // Look for two sequences of digits separated by underscore
  const twoDigitsMatch = text.match(/(\d{1,3})_(\d{1,3})/)
  if (twoDigitsMatch) {
    const num1 = parseInt(twoDigitsMatch[1], 10)
    const num2 = parseInt(twoDigitsMatch[2], 10)
    
    // Assume first is start verse, second is end verse
    return { startVerse: num1, endVerse: num2 }
  }
  
  // Look for single sequence of digits (could be start verse)
  const singleDigitMatch = text.match(/(\d{1,3})/)
  if (singleDigitMatch) {
    const verse = parseInt(singleDigitMatch[1], 10)
    return { startVerse: verse, endVerse: null }
  }
  
  return { startVerse: null, endVerse: null }
}

/**
 * Parse BSB format filename: BSB_XX_AAA_XXX_H.mp3
 * Where XX = book number, AAA = book abbreviation, XXX = chapter, H = designation
 */
function parseBSBFormat(filename: string): ParsedFilename | null {
  // Pattern: BSB_XX_AAA_XXX_H.mp3
  const bsbPattern = /^BSB_(\d{2})_([A-Za-z0-9]{3})_(\d{3})_([A-Z])$/i
  const match = filename.match(bsbPattern)
  
  if (!match) {
    return null
  }
  
  const [, bookNumber, bookAbbr, chapterStr] = match
  
  const result: ParsedFilename = {
    originalFilename: filename + '.mp3',
    detectedLanguage: 'BSB',
    confidence: 'high',
    errors: [],
    matchedPattern: 'BSB_BookNumber_BookAbbr_Chapter_Designation'
  }
  
  // Parse chapter number
  const chapter = parseInt(chapterStr, 10)
  result.detectedChapter = chapter
  
  if (chapter < 1 || chapter > 150) {
    result.errors?.push(`Invalid chapter number: ${chapter}`)
    result.confidence = 'low'
  }
  
  // Try to get book name from book number first (more reliable)
  let bookName = BSB_BOOK_NUMBER_TO_NAME[bookNumber]
  
  // If not found by number, try abbreviation
  if (!bookName) {
    bookName = BSB_ABBREVIATION_TO_NAME[bookAbbr]
  }
  
  // Cross-validate if we have both
  if (bookName && BSB_BOOK_NUMBER_TO_NAME[bookNumber] && BSB_ABBREVIATION_TO_NAME[bookAbbr]) {
    const bookByNumber = BSB_BOOK_NUMBER_TO_NAME[bookNumber]
    const bookByAbbr = BSB_ABBREVIATION_TO_NAME[bookAbbr]
    
    if (bookByNumber !== bookByAbbr) {
      result.errors?.push(`Book number ${bookNumber} (${bookByNumber}) doesn't match abbreviation ${bookAbbr} (${bookByAbbr})`)
      result.confidence = 'medium'
      // Use book number as it's generally more reliable
      bookName = bookByNumber
    }
  }
  
  if (bookName) {
    result.detectedBook = bookName
    result.detectedBookOsis = BOOK_NAME_TO_OSIS[bookName]
    
    if (!result.detectedBookOsis) {
      result.errors?.push(`Book "${bookName}" not found in OSIS mapping`)
      result.confidence = 'medium'
    }
  } else {
    result.errors?.push(`Unknown book number ${bookNumber} or abbreviation ${bookAbbr}`)
    result.confidence = 'low'
  }
  
  // For BSB format, no verses are specified, so assume full chapter
  // This means startVerse = 1 and endVerse should be looked up from database
  result.detectedStartVerse = 1
  result.detectedEndVerse = undefined
  result.isFullChapter = true
  result.verseRange = 'full chapter'
  
  return result
}

/**
 * Main parsing function supporting multiple formats:
 * 1. BSB format: BSB_XX_AAA_XXX_H.mp3
 * 2. Original format: Language_BookName_ChapterXXX_VXXX_XXX.mp3
 */
export function parseFilename(filename: string): ParsedFilename {
  // Remove file extension for pattern matching
  const cleanFilename = filename.replace(/\.[^/.]+$/, '').trim()
  
  // Try BSB format first
  const bsbResult = parseBSBFormat(cleanFilename)
  if (bsbResult) {
    return bsbResult
  }
  
  // Fall back to original format parsing
  const result: ParsedFilename = {
    originalFilename: filename,
    confidence: 'none',
    errors: []
  }
  
  try {
    // Extract language (first part before underscore)
    const firstUnderscore = cleanFilename.indexOf('_')
    if (firstUnderscore !== -1) {
      result.detectedLanguage = cleanFilename.substring(0, firstUnderscore)
    }
    
    // Extract book name
    const { bookName, remainingText } = extractBookName(cleanFilename)
    if (bookName) {
      result.detectedBook = bookName
      result.detectedBookOsis = BOOK_NAME_TO_OSIS[bookName]
      
      if (result.detectedBookOsis) {
        result.confidence = 'high'
      } else {
        result.confidence = 'medium'
        result.errors?.push(`Book "${bookName}" not found in OSIS mapping`)
      }
    }
    
    // Extract chapter
    const { chapter, remainingText: afterChapter } = extractChapterNumber(remainingText)
    if (chapter) {
      result.detectedChapter = chapter
      
      // Validate chapter number
      if (chapter < 1 || chapter > 150) {
        result.errors?.push(`Invalid chapter number: ${chapter}`)
        result.confidence = 'low'
      }
    }
    
    // Extract verses
    const { startVerse, endVerse } = extractVerseNumbers(afterChapter)
    if (startVerse) {
      result.detectedStartVerse = startVerse
      result.detectedEndVerse = endVerse ?? startVerse
      
      if (endVerse) {
        result.verseRange = `${startVerse}-${endVerse}`
      } else {
        result.verseRange = startVerse.toString()
      }
      
      // Validate verse numbers
      if (startVerse < 1 || startVerse > 200) {
        result.errors?.push(`Invalid start verse: ${startVerse}`)
        result.confidence = 'low'
      }
      
      if (endVerse && (endVerse < 1 || endVerse > 200 || endVerse < startVerse)) {
        result.errors?.push(`Invalid end verse: ${endVerse}`)
        result.confidence = 'low'
      }
    }
    
    // Set matched pattern and handle full chapter cases
    if (result.detectedBook && result.detectedChapter && result.detectedStartVerse) {
      result.matchedPattern = 'Language_Book_Chapter_Verses'
      if (result.confidence === 'none') {
        result.confidence = 'high'
      }
    } else if (result.detectedBook && result.detectedChapter) {
      result.matchedPattern = 'Language_Book_Chapter'
      // If we have book and chapter but no verses, assume full chapter
      result.detectedStartVerse = 1
      result.detectedEndVerse = undefined
      result.isFullChapter = true
      result.verseRange = 'full chapter'
      if (result.confidence === 'none') {
        result.confidence = 'medium'
      }
    } else if (result.detectedBook) {
      result.matchedPattern = 'Language_Book_Only'
      if (result.confidence === 'none') {
        result.confidence = 'low'
      }
    }
    
  } catch (error) {
    result.errors?.push(`Parsing error: ${error}`)
    result.confidence = 'none'
  }
  
  return result
}

/**
 * Parse multiple filenames and return results
 */
export function parseFilenames(filenames: string[]): ParsedFilename[] {
  return filenames.map(parseFilename)
}

/**
 * Get parsing statistics for a batch of files
 */
export function getParsingStats(results: ParsedFilename[]) {
  const stats = {
    total: results.length,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    noMatch: 0,
    withErrors: 0,
    booksDetected: 0,
    chaptersDetected: 0,
    versesDetected: 0,
    osisMapping: 0
  }
  
  results.forEach(result => {
    switch (result.confidence) {
      case 'high':
        stats.highConfidence++
        break
      case 'medium':
        stats.mediumConfidence++
        break
      case 'low':
        stats.lowConfidence++
        break
      case 'none':
        stats.noMatch++
        break
    }
    
    if (result.errors && result.errors.length > 0) {
      stats.withErrors++
    }
    
    if (result.detectedBook) stats.booksDetected++
    if (result.detectedChapter) stats.chaptersDetected++
    if (result.detectedStartVerse) stats.versesDetected++
    if (result.detectedBookOsis) stats.osisMapping++
  })
  
  return stats
}

/**
 * Get supported book names for validation
 */
export function getSupportedBooks(): string[] {
  return Object.keys(BOOK_NAME_TO_OSIS).sort()
}

/**
 * Get OSIS ID for a book name
 */
export function getOsisId(bookName: string): string | undefined {
  return BOOK_NAME_TO_OSIS[bookName]
}

// In-memory cache for chapter lookups within the same session
// Key: `${bibleVersionId}-${bookName}-${chapterNumber}` -> total_verses
const chapterCache = new Map<string, number>();

/**
 * Clear the chapter cache (useful for testing or when bible version changes)
 */
export function clearChapterCache(): void {
  chapterCache.clear();
}

/**
 * Resolve end verse numbers for multiple full chapter recordings in a single batch query
 * Uses in-memory caching to avoid repeated database queries for the same chapters
 * @param parsedResults - Array of ParsedFilename results
 * @param bibleVersionId - The bible version ID to look up chapter data
 * @returns Array of updated ParsedFilename with resolved end verses
 */
export async function resolveFullChapterEndVersesBatch(
  parsedResults: ParsedFilename[],
  bibleVersionId: string
): Promise<ParsedFilename[]> {
  if (!bibleVersionId || parsedResults.length === 0) {
    return parsedResults;
  }

  // Filter files that need resolution and extract unique chapter combinations
  const filesToResolve = parsedResults.filter(result => 
    result.isFullChapter && 
    result.detectedBookOsis && 
    result.detectedChapter && 
    result.detectedBook
  );

  if (filesToResolve.length === 0) {
    return parsedResults;
  }

  // Check cache first and collect uncached chapters
  const uncachedChapters = new Map<string, { book: string; chapter: number }>();
  const cachedResults = new Map<string, number>();
  
  filesToResolve.forEach(result => {
    const cacheKey = `${bibleVersionId}-${result.detectedBook}-${result.detectedChapter}`;
    const resultKey = `${result.detectedBook}-${result.detectedChapter}`;
    
    if (chapterCache.has(cacheKey)) {
      cachedResults.set(resultKey, chapterCache.get(cacheKey)!);
    } else if (!uncachedChapters.has(resultKey)) {
      uncachedChapters.set(resultKey, {
        book: result.detectedBook!,
        chapter: result.detectedChapter!
      });
    }
  });

  console.log(`📋 Cache status: ${cachedResults.size} cached, ${uncachedChapters.size} need lookup`);

  if (uncachedChapters.size === 0) {
    // All results are cached, apply them directly
    return parsedResults.map(result => {
      if (!result.isFullChapter || !result.detectedBook || !result.detectedChapter) {
        return result;
      }

      const key = `${result.detectedBook}-${result.detectedChapter}`;
      const totalVerses = cachedResults.get(key);

      if (totalVerses) {
        return {
          ...result,
          detectedEndVerse: totalVerses,
          verseRange: `1-${totalVerses}`,
        };
      }
      return result;
    });
  }

  try {
    // Import supabase dynamically to avoid circular dependencies
    const { supabase } = await import('./supabase');
    
    console.log(`🔍 Resolving ${uncachedChapters.size} unique chapters for ${filesToResolve.length} files...`);
    const startTime = Date.now();

    // Build batch query using OR conditions for up to 20 combinations
    // For larger batches, we'll chunk them
    const chapterArray = Array.from(uncachedChapters.values());
    const chunkSize = 20;
    const newChapterData = new Map<string, number>(); // key -> total_verses

    for (let i = 0; i < chapterArray.length; i += chunkSize) {
      const chunk = chapterArray.slice(i, i + chunkSize);
      
      if (chunk.length === 1) {
        // Single query for one chapter
        const chapter = chunk[0];
        const { data, error } = await supabase
          .from('chapters')
          .select(`
            total_verses,
            chapter_number,
            books!inner (
              name,
              bible_version_id
            )
          `)
          .eq('books.bible_version_id', bibleVersionId)
          .eq('chapter_number', chapter.chapter)
          .eq('books.name', chapter.book)
          .single();

        if (!error && data) {
          const key = `${chapter.book}-${chapter.chapter}`;
          const cacheKey = `${bibleVersionId}-${chapter.book}-${chapter.chapter}`;
          newChapterData.set(key, data.total_verses);
          chapterCache.set(cacheKey, data.total_verses);
        }
      } else {
        // Batch query using OR conditions
        const orConditions: string[] = [];
        
        chunk.forEach(chapter => {
          orConditions.push(`and(books.name.eq.${chapter.book},chapter_number.eq.${chapter.chapter})`);
        });
        
        const { data, error } = await supabase
          .from('chapters')
          .select(`
            total_verses,
            chapter_number,
            books!inner (
              name,
              bible_version_id
            )
          `)
          .eq('books.bible_version_id', bibleVersionId)
          .or(orConditions.join(','));

        if (!error && data) {
          data.forEach(record => {
            const key = `${record.books.name}-${record.chapter_number}`;
            const cacheKey = `${bibleVersionId}-${record.books.name}-${record.chapter_number}`;
            newChapterData.set(key, record.total_verses);
            chapterCache.set(cacheKey, record.total_verses);
          });
        }
      }
    }

    const queryTime = Date.now() - startTime;
    console.log(`✅ Resolved ${newChapterData.size}/${uncachedChapters.size} new chapters in ${queryTime}ms`);

    // Combine cached and newly fetched data
    const allChapterData = new Map([...cachedResults, ...newChapterData]);

    // Apply results to all parsed filenames
    return parsedResults.map(result => {
      if (!result.isFullChapter || !result.detectedBook || !result.detectedChapter) {
        return result;
      }

      const key = `${result.detectedBook}-${result.detectedChapter}`;
      const totalVerses = allChapterData.get(key);

      if (totalVerses) {
        return {
          ...result,
          detectedEndVerse: totalVerses,
          verseRange: `1-${totalVerses}`,
        };
      } else {
        return {
          ...result,
          errors: [...(result.errors || []), `Chapter ${result.detectedBook} ${result.detectedChapter} not found in database`]
        };
      }
    });

  } catch (error) {
    console.warn('Error resolving chapter verses batch:', error);
    
    // Return original results with error annotations
    return parsedResults.map(result => {
      if (result.isFullChapter) {
        return {
          ...result,
          errors: [...(result.errors || []), `Error resolving chapter verses: ${error}`]
        };
      }
      return result;
    });
  }
}

/**
 * Resolve end verse number for full chapter recordings by looking up chapter's total_verses
 * @param parsedResult - The result from parseFilename
 * @param bibleVersionId - The bible version ID to look up chapter data
 * @returns Updated ParsedFilename with resolved end verse, or original if not applicable
 */
export async function resolveFullChapterEndVerse(
  parsedResult: ParsedFilename,
  bibleVersionId: string
): Promise<ParsedFilename> {
  // Use batch function for single item
  const results = await resolveFullChapterEndVersesBatch([parsedResult], bibleVersionId);
  return results[0];
} 