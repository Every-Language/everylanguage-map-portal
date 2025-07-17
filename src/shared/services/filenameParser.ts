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
 * Main parsing function for the specific format: Language_BookName_ChapterXXX_VXXX_XXX.mp3
 */
export function parseFilename(filename: string): ParsedFilename {
  // Remove file extension
  const cleanFilename = filename.replace(/\.[^/.]+$/, '').trim()
  
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
      result.detectedEndVerse = endVerse || startVerse
      
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
    
    // Set matched pattern
    if (result.detectedBook && result.detectedChapter && result.detectedStartVerse) {
      result.matchedPattern = 'Language_Book_Chapter_Verses'
      if (result.confidence === 'none') {
        result.confidence = 'high'
      }
    } else if (result.detectedBook && result.detectedChapter) {
      result.matchedPattern = 'Language_Book_Chapter'
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