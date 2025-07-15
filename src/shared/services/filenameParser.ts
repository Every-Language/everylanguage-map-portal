/**
 * Filename Parser Service
 * 
 * Extracts book, chapter, and verse information from audio filenames
 * using common naming patterns found in Bible translation projects.
 */

export interface ParsedFilename {
  originalFilename: string
  detectedBook?: string
  detectedChapter?: number
  detectedVerses?: number[]
  verseRange?: string
  confidence: 'high' | 'medium' | 'low' | 'none'
  matchedPattern?: string
  errors?: string[]
}

export interface FilenamePattern {
  name: string
  regex: RegExp
  extractor: (match: RegExpMatchArray) => Partial<ParsedFilename>
  confidence: 'high' | 'medium' | 'low'
}

// Common Bible book abbreviations and mappings
const BIBLE_BOOKS = {
  // Old Testament
  'GEN': 'Genesis', 'GENESIS': 'Genesis',
  'EXO': 'Exodus', 'EXODUS': 'Exodus', 'EX': 'Exodus',
  'LEV': 'Leviticus', 'LEVITICUS': 'Leviticus',
  'NUM': 'Numbers', 'NUMBERS': 'Numbers',
  'DEU': 'Deuteronomy', 'DEUTERONOMY': 'Deuteronomy', 'DT': 'Deuteronomy',
  'JOS': 'Joshua', 'JOSHUA': 'Joshua',
  'JDG': 'Judges', 'JUDGES': 'Judges',
  'RUT': 'Ruth', 'RUTH': 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel',
  '1SAMUEL': '1 Samuel', '2SAMUEL': '2 Samuel',
  '1KI': '1 Kings', '2KI': '2 Kings',
  '1KINGS': '1 Kings', '2KINGS': '2 Kings',
  '1CH': '1 Chronicles', '2CH': '2 Chronicles',
  '1CHRONICLES': '1 Chronicles', '2CHRONICLES': '2 Chronicles',
  'EZR': 'Ezra', 'EZRA': 'Ezra',
  'NEH': 'Nehemiah', 'NEHEMIAH': 'Nehemiah',
  'EST': 'Esther', 'ESTHER': 'Esther',
  'JOB': 'Job',
  'PSA': 'Psalms', 'PSALMS': 'Psalms', 'PS': 'Psalms',
  'PRO': 'Proverbs', 'PROVERBS': 'Proverbs',
  'ECC': 'Ecclesiastes', 'ECCLESIASTES': 'Ecclesiastes',
  'SOG': 'Song of Songs', 'SONG': 'Song of Songs',
  'ISA': 'Isaiah', 'ISAIAH': 'Isaiah',
  'JER': 'Jeremiah', 'JEREMIAH': 'Jeremiah',
  'LAM': 'Lamentations', 'LAMENTATIONS': 'Lamentations',
  'EZE': 'Ezekiel', 'EZEKIEL': 'Ezekiel',
  'DAN': 'Daniel', 'DANIEL': 'Daniel',
  
  // New Testament
  'MAT': 'Matthew', 'MATTHEW': 'Matthew', 'MT': 'Matthew',
  'MAR': 'Mark', 'MARK': 'Mark', 'MK': 'Mark',
  'LUK': 'Luke', 'LUKE': 'Luke', 'LK': 'Luke',
  'JOH': 'John', 'JOHN': 'John', 'JN': 'John',
  'ACT': 'Acts', 'ACTS': 'Acts',
  'ROM': 'Romans', 'ROMANS': 'Romans',
  '1CO': '1 Corinthians', '2CO': '2 Corinthians',
  '1CORINTHIANS': '1 Corinthians', '2CORINTHIANS': '2 Corinthians',
  'GAL': 'Galatians', 'GALATIANS': 'Galatians',
  'EPH': 'Ephesians', 'EPHESIANS': 'Ephesians',
  'PHI': 'Philippians', 'PHILIPPIANS': 'Philippians',
  'COL': 'Colossians', 'COLOSSIANS': 'Colossians',
  '1TH': '1 Thessalonians', '2TH': '2 Thessalonians',
  '1THESSALONIANS': '1 Thessalonians', '2THESSALONIANS': '2 Thessalonians',
  '1TI': '1 Timothy', '2TI': '2 Timothy',
  '1TIMOTHY': '1 Timothy', '2TIMOTHY': '2 Timothy',
  'TIT': 'Titus', 'TITUS': 'Titus',
  'PHM': 'Philemon', 'PHILEMON': 'Philemon',
  'HEB': 'Hebrews', 'HEBREWS': 'Hebrews',
  'JAS': 'James', 'JAMES': 'James',
  '1PE': '1 Peter', '2PE': '2 Peter',
  '1PETER': '1 Peter', '2PETER': '2 Peter',
  '1JO': '1 John', '2JO': '2 John', '3JO': '3 John',
  '1JOHN': '1 John', '2JOHN': '2 John', '3JOHN': '3 John',
  'JUD': 'Jude', 'JUDE': 'Jude',
  'REV': 'Revelation', 'REVELATION': 'Revelation'
} as const

// Filename patterns ordered by confidence level
const FILENAME_PATTERNS: FilenamePattern[] = [
  // High confidence patterns
  {
    name: 'Language_Book_Chapter_Verses',
    regex: /^(?<lang>[A-Za-z]{2,4})_(?<book>[A-Za-z0-9]+)_(?:Chapter)?(?<chapter>\d{1,3})_V(?<startVerse>\d{1,3})(?:[-_](?<endVerse>\d{1,3}))?/i,
    confidence: 'high',
    extractor: (match) => {
      const { book, chapter, startVerse, endVerse } = match.groups || {}
      return {
        detectedBook: normalizeBookName(book),
        detectedChapter: parseInt(chapter, 10),
        detectedVerses: generateVerseRange(parseInt(startVerse, 10), endVerse ? parseInt(endVerse, 10) : undefined),
        verseRange: endVerse ? `${startVerse}-${endVerse}` : startVerse
      }
    }
  },
  
  {
    name: 'Book_Chapter_Verses_Detailed',
    regex: /^(?<book>[A-Za-z0-9]+)(?:_Chapter)?(?<chapter>\d{1,3})(?:_Verses?)?(?<startVerse>\d{1,3})(?:(?:[-_]|to)(?<endVerse>\d{1,3}))?/i,
    confidence: 'high',
    extractor: (match) => {
      const { book, chapter, startVerse, endVerse } = match.groups || {}
      return {
        detectedBook: normalizeBookName(book),
        detectedChapter: parseInt(chapter, 10),
        detectedVerses: generateVerseRange(parseInt(startVerse, 10), endVerse ? parseInt(endVerse, 10) : undefined),
        verseRange: endVerse ? `${startVerse}-${endVerse}` : startVerse
      }
    }
  },

  // Medium confidence patterns
  {
    name: 'Language_Book_Chapter',
    regex: /^(?<lang>[A-Za-z]{2,4})_(?<book>[A-Za-z0-9]+)_(?:Chapter)?(?<chapter>\d{1,3})/i,
    confidence: 'medium',
    extractor: (match) => {
      const { book, chapter } = match.groups || {}
      return {
        detectedBook: normalizeBookName(book),
        detectedChapter: parseInt(chapter, 10)
      }
    }
  },

  {
    name: 'Book_Chapter_Only',
    regex: /^(?<book>[A-Za-z0-9]+)(?:_Chapter|_Ch|_)?(?<chapter>\d{1,3})(?:[^0-9]|$)/i,
    confidence: 'medium',
    extractor: (match) => {
      const { book, chapter } = match.groups || {}
      return {
        detectedBook: normalizeBookName(book),
        detectedChapter: parseInt(chapter, 10)
      }
    }
  },

  // Low confidence patterns
  {
    name: 'Book_Name_Only',
    regex: /^(?<book>[A-Za-z0-9]+)(?:_|$)/i,
    confidence: 'low',
    extractor: (match) => {
      const { book } = match.groups || {}
      return {
        detectedBook: normalizeBookName(book)
      }
    }
  },

  // Specific format patterns
  {
    name: 'Numbered_Format',
    regex: /(?<book>[A-Za-z]+)(?<chapter>\d{2,3})(?<startVerse>\d{2,3})(?<endVerse>\d{2,3})?/i,
    confidence: 'medium',
    extractor: (match) => {
      const { book, chapter, startVerse, endVerse } = match.groups || {}
      return {
        detectedBook: normalizeBookName(book),
        detectedChapter: parseInt(chapter, 10),
        detectedVerses: generateVerseRange(parseInt(startVerse, 10), endVerse ? parseInt(endVerse, 10) : undefined),
        verseRange: endVerse ? `${startVerse}-${endVerse}` : startVerse
      }
    }
  }
]

/**
 * Normalize book name using the Bible books mapping
 */
function normalizeBookName(bookInput: string): string | undefined {
  if (!bookInput) return undefined
  
  const upperBook = bookInput.toUpperCase()
  
  // Direct lookup
  if (BIBLE_BOOKS[upperBook as keyof typeof BIBLE_BOOKS]) {
    return BIBLE_BOOKS[upperBook as keyof typeof BIBLE_BOOKS]
  }
  
  // Fuzzy matching for partial names
  for (const [abbrev, fullName] of Object.entries(BIBLE_BOOKS)) {
    if (abbrev.startsWith(upperBook) || fullName.toUpperCase().startsWith(upperBook)) {
      return fullName
    }
  }
  
  // Return original if no match found
  return bookInput
}

/**
 * Generate array of verse numbers from start to end
 */
function generateVerseRange(start: number, end?: number): number[] {
  if (!end || end === start) return [start]
  
  const verses: number[] = []
  for (let i = start; i <= end; i++) {
    verses.push(i)
  }
  return verses
}

/**
 * Main parsing function
 */
export function parseFilename(filename: string): ParsedFilename {
  // Remove file extension and clean filename
  const cleanFilename = filename.replace(/\.[^/.]+$/, '').trim()
  
  const result: ParsedFilename = {
    originalFilename: filename,
    confidence: 'none',
    errors: []
  }
  
  // Try each pattern in order of confidence
  for (const pattern of FILENAME_PATTERNS) {
    const match = cleanFilename.match(pattern.regex)
    
    if (match) {
      try {
        const extracted = pattern.extractor(match)
        
        // Merge extracted data
        Object.assign(result, extracted, {
          confidence: pattern.confidence,
          matchedPattern: pattern.name
        })
        
        // Validate extracted data
        const validationErrors = validateParsedData(result)
        if (validationErrors.length === 0) {
          break // Use first successful match
        } else {
          result.errors = validationErrors
          // Continue to try other patterns if validation fails
        }
      } catch (error) {
        result.errors?.push(`Error parsing with pattern ${pattern.name}: ${error}`)
      }
    }
  }
  
  return result
}

/**
 * Validate parsed data for logical consistency
 */
function validateParsedData(parsed: ParsedFilename): string[] {
  const errors: string[] = []
  
  if (parsed.detectedChapter !== undefined) {
    if (parsed.detectedChapter < 1 || parsed.detectedChapter > 150) {
      errors.push(`Invalid chapter number: ${parsed.detectedChapter}`)
    }
  }
  
  if (parsed.detectedVerses && parsed.detectedVerses.length > 0) {
    const invalidVerses = parsed.detectedVerses.filter(v => v < 1 || v > 200)
    if (invalidVerses.length > 0) {
      errors.push(`Invalid verse numbers: ${invalidVerses.join(', ')}`)
    }
    
    // Check verse order
    const sortedVerses = [...parsed.detectedVerses].sort((a, b) => a - b)
    if (JSON.stringify(sortedVerses) !== JSON.stringify(parsed.detectedVerses)) {
      errors.push('Verses are not in sequential order')
    }
  }
  
  return errors
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
    versesDetected: 0
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
    if (result.detectedVerses && result.detectedVerses.length > 0) stats.versesDetected++
  })
  
  return stats
} 