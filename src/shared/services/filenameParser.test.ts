/**
 * Test examples for filename parsing service
 * Run this file to see parsing results for various filename patterns
 */

import { describe, it, expect } from 'vitest';
import { parseFilename, parseFilenames, getParsingStats, getSupportedBooks, getOsisId } from './filenameParser';

describe('Filename Parser', () => {
  describe('User Format Examples', () => {
    it('should correctly parse Bajhangi_2 Kings_Chapter001_V001_018.mp3', () => {
      const result = parseFilename('Bajhangi_2 Kings_Chapter001_V001_018.mp3');
      
      expect(result.detectedLanguage).toBe('Bajhangi');
      expect(result.detectedBook).toBe('2 Kings');
      expect(result.detectedBookOsis).toBe('2kgs');
      expect(result.detectedChapter).toBe(1);
      expect(result.detectedStartVerse).toBe(1);
      expect(result.detectedEndVerse).toBe(18);
      expect(result.verseRange).toBe('1-18');
      expect(result.confidence).toBe('high');
    });

    it('should correctly parse Bajhangi_Psalms_Chapter089_V027_052.mp3', () => {
      const result = parseFilename('Bajhangi_Psalms_Chapter089_V027_052.mp3');
      
      expect(result.detectedLanguage).toBe('Bajhangi');
      expect(result.detectedBook).toBe('Psalms');
      expect(result.detectedBookOsis).toBe('ps');
      expect(result.detectedChapter).toBe(89);
      expect(result.detectedStartVerse).toBe(27);
      expect(result.detectedEndVerse).toBe(52);
      expect(result.verseRange).toBe('27-52');
      expect(result.confidence).toBe('high');
    });

    it('should handle single verse files', () => {
      const result = parseFilename('English_John_Chapter003_V016.mp3');
      
      expect(result.detectedLanguage).toBe('English');
      expect(result.detectedBook).toBe('John');
      expect(result.detectedBookOsis).toBe('john');
      expect(result.detectedChapter).toBe(3);
      expect(result.detectedStartVerse).toBe(16);
      expect(result.detectedEndVerse).toBe(16);
      expect(result.verseRange).toBe('16');
      expect(result.confidence).toBe('high');
    });

    it('should handle numbered books correctly', () => {
      const result = parseFilename('Spanish_1 Corinthians_Chapter013_V001_013.mp3');
      
      expect(result.detectedLanguage).toBe('Spanish');
      expect(result.detectedBook).toBe('1 Corinthians');
      expect(result.detectedBookOsis).toBe('1cor');
      expect(result.detectedChapter).toBe(13);
      expect(result.detectedStartVerse).toBe(1);
      expect(result.detectedEndVerse).toBe(13);
    });
  });

  describe('Book Name Variations', () => {
    it('should handle various book name spellings', () => {
      const testCases = [
        { input: 'Lang_Psalms_Chapter001_V001.mp3', expected: 'Psalms', osis: 'ps' },
        { input: 'Lang_Psalm_Chapter001_V001.mp3', expected: 'Psalms', osis: 'ps' },
        { input: 'Lang_Genesis_Chapter001_V001.mp3', expected: 'Genesis', osis: 'gen' },
        { input: 'Lang_Revelation_Chapter001_V001.mp3', expected: 'Revelation', osis: 'rev' },
        { input: 'Lang_Matthew_Chapter001_V001.mp3', expected: 'Matthew', osis: 'matt' }
      ];

      testCases.forEach(({ input, expected, osis }) => {
        const result = parseFilename(input);
        expect(result.detectedBook).toBe(expected);
        expect(result.detectedBookOsis).toBe(osis);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle files without chapter keyword', () => {
      const result = parseFilename('Lang_Genesis_001_V001_031.mp3');
      
      expect(result.detectedBook).toBe('Genesis');
      expect(result.detectedChapter).toBe(1);
      expect(result.detectedStartVerse).toBe(1);
      expect(result.detectedEndVerse).toBe(31);
    });

    it('should handle files with missing verse info', () => {
      const result = parseFilename('Lang_Genesis_Chapter001.mp3');
      
      expect(result.detectedBook).toBe('Genesis');
      expect(result.detectedChapter).toBe(1);
      expect(result.detectedStartVerse).toBeUndefined();
      expect(result.confidence).toBe('high');
    });

    it('should handle invalid book names', () => {
      const result = parseFilename('Lang_InvalidBook_Chapter001_V001.mp3');
      
      expect(result.detectedBook).toBe('InvalidBook');
      expect(result.detectedBookOsis).toBeUndefined();
      expect(result.errors).toContain('Book "InvalidBook" not found in OSIS mapping');
    });

    it('should handle malformed filenames gracefully', () => {
      const result = parseFilename('malformed_filename.mp3');
      
      expect(result.confidence).toBe('medium');
      expect(result.originalFilename).toBe('malformed_filename.mp3');
    });
  });

  describe('Utility Functions', () => {
    it('should return supported books', () => {
      const books = getSupportedBooks();
      expect(books).toContain('Genesis');
      expect(books).toContain('Psalms');
      expect(books).toContain('Matthew');
      expect(books).toContain('2 Kings');
    });

    it('should return correct OSIS IDs', () => {
      expect(getOsisId('Genesis')).toBe('gen');
      expect(getOsisId('2 Kings')).toBe('2kgs');
      expect(getOsisId('Psalms')).toBe('ps');
      expect(getOsisId('John')).toBe('john');
      expect(getOsisId('InvalidBook')).toBeUndefined();
    });
  });

  describe('Batch Processing', () => {
    it('should parse multiple filenames', () => {
      const filenames = [
        'Lang_Genesis_Chapter001_V001_031.mp3',
        'Lang_Psalms_Chapter023_V001_006.mp3',
        'Lang_John_Chapter003_V016.mp3'
      ];

      const results = parseFilenames(filenames);
      expect(results).toHaveLength(3);
      expect(results[0].detectedBook).toBe('Genesis');
      expect(results[1].detectedBook).toBe('Psalms');
      expect(results[2].detectedBook).toBe('John');
    });

    it('should generate parsing statistics', () => {
      const filenames = [
        'Lang_Genesis_Chapter001_V001_031.mp3',
        'Lang_InvalidBook_Chapter001_V001.mp3',
        'malformed_filename.mp3'
      ];

      const results = parseFilenames(filenames);
      const stats = getParsingStats(results);

      expect(stats.total).toBe(3);
      expect(stats.booksDetected).toBe(3);
      expect(stats.osisMapping).toBe(1);
      expect(stats.withErrors).toBeGreaterThan(0);
    });
  });
}); 