import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Button,
  LoadingSpinner,
  CSVUpload,
  Alert,
  Progress
} from '../../../../shared/design-system/components';
import { useToast } from '../../../../shared/design-system/hooks/useToast';
import { useSelectedProject } from '../../../dashboard/hooks/useSelectedProject';
import { useBulkInsertVerseTimestamps, useMediaFilesByProject } from '../../../../shared/hooks/query/media-files';
import { CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';

// OSIS book mappings from bible ID structure
const OSIS_BOOKS: Record<string, string> = {
  'genesis': 'gen',
  'exodus': 'exod',
  'leviticus': 'lev',
  'numbers': 'num',
  'deuteronomy': 'deut',
  'joshua': 'josh',
  'judges': 'judg',
  'ruth': 'ruth',
  '1samuel': '1sam',
  '2samuel': '2sam',
  '1kings': '1kgs',
  '2kings': '2kgs',
  '1chronicles': '1chr',
  '2chronicles': '2chr',
  'ezra': 'ezra',
  'nehemiah': 'neh',
  'esther': 'esth',
  'job': 'job',
  'psalms': 'ps',
  'proverbs': 'prov',
  'ecclesiastes': 'eccl',
  'songofsongscanticleofcanticles': 'song',
  'isaiah': 'isa',
  'jeremiah': 'jer',
  'lamentations': 'lam',
  'ezekiel': 'ezek',
  'daniel': 'dan',
  'hosea': 'hos',
  'joel': 'joel',
  'amos': 'amos',
  'obadiah': 'obad',
  'jonah': 'jonah',
  'micah': 'mic',
  'nahum': 'nah',
  'habakkuk': 'hab',
  'zephaniah': 'zeph',
  'haggai': 'hag',
  'zechariah': 'zech',
  'malachi': 'mal',
  'matthew': 'matt',
  'mark': 'mark',
  'luke': 'luke',
  'john': 'john',
  'acts': 'acts',
  'romans': 'rom',
  '1corinthians': '1cor',
  '2corinthians': '2cor',
  'galatians': 'gal',
  'ephesians': 'eph',
  'philippians': 'phil',
  'colossians': 'col',
  '1thessalonians': '1thess',
  '2thessalonians': '2thess',
  '1timothy': '1tim',
  '2timothy': '2tim',
  'titus': 'titus',
  'philemon': 'phlm',
  'hebrews': 'heb',
  'james': 'jas',
  '1peter': '1pet',
  '2peter': '2pet',
  '1john': '1john',
  '2john': '2john',
  '3john': '3john',
  'jude': 'jude',
  'revelation': 'rev'
};

// Book number mappings (1-66)
const BOOK_NUMBERS: Record<string, string> = {
  '1': 'gen', '2': 'exod', '3': 'lev', '4': 'num', '5': 'deut',
  '6': 'josh', '7': 'judg', '8': 'ruth', '9': '1sam', '10': '2sam',
  '11': '1kgs', '12': '2kgs', '13': '1chr', '14': '2chr', '15': 'ezra',
  '16': 'neh', '17': 'esth', '18': 'job', '19': 'ps', '20': 'prov',
  '21': 'eccl', '22': 'song', '23': 'isa', '24': 'jer', '25': 'lam',
  '26': 'ezek', '27': 'dan', '28': 'hos', '29': 'joel', '30': 'amos',
  '31': 'obad', '32': 'jonah', '33': 'mic', '34': 'nah', '35': 'hab',
  '36': 'zeph', '37': 'hag', '38': 'zech', '39': 'mal', '40': 'matt',
  '41': 'mark', '42': 'luke', '43': 'john', '44': 'acts', '45': 'rom',
  '46': '1cor', '47': '2cor', '48': 'gal', '49': 'eph', '50': 'phil',
  '51': 'col', '52': '1thess', '53': '2thess', '54': '1tim', '55': '2tim',
  '56': 'titus', '57': 'phlm', '58': 'heb', '59': 'jas', '60': '1pet',
  '61': '2pet', '62': '1john', '63': '2john', '64': '3john', '65': 'jude',
  '66': 'rev'
};

// Processed row with validation results
interface ProcessedRow {
  book_name?: string;
  book_number?: string;
  chapter_number: string;
  verseTimestamps: Array<{
    verseNumber: number;
    timestamp: number;
    verseId?: string;
    mediaFileId?: string;
  }>;
  error?: string;
  rowIndex: number;
}

interface VerseTimestampImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
  selectedAudioVersionId?: string; // Add this prop to pass the selected audio version
}

export function VerseTimestampImportModal({ 
  open, 
  onOpenChange, 
  onImportComplete,
  selectedAudioVersionId
}: VerseTimestampImportModalProps) {
  const { toast } = useToast();
  const { selectedProject } = useSelectedProject();
  const { data: allMediaFiles } = useMediaFilesByProject(selectedProject?.id || null);
  const bulkInsertMutation = useBulkInsertVerseTimestamps();
  
  // Filter media files by selected audio version
  const mediaFiles = useMemo(() => {
    if (!allMediaFiles || !selectedAudioVersionId) return [];
    return allMediaFiles.filter(file => file.audio_version_id === selectedAudioVersionId);
  }, [allMediaFiles, selectedAudioVersionId]);
  
  // States
  const [csvData, setCsvData] = useState<ProcessedRow[]>([]);
  const [isProcessingCSV, setIsProcessingCSV] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<{ success: number; errors: ProcessedRow[] } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ completed: number; total: number; phase: string } | null>(null);

  // Validate CSV structure
  const validateCSVStructure = useCallback((data: Record<string, string>[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!data || data.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors };
    }

    const headers = Object.keys(data[0]).map(col => col.toLowerCase().trim().replace(/\s+/g, '_'));
    
    // Check for book identifier (either book_name or book_number)
    const hasBookName = headers.some(h => ['book_name', 'book', 'book_id'].includes(h));
    const hasBookNumber = headers.some(h => ['book_number', 'book_num'].includes(h));
    
    if (!hasBookName && !hasBookNumber) {
      errors.push('Missing book identifier column (book_name or book_number)');
    }

    // Check for required columns
    if (!headers.includes('chapter_number') && !headers.includes('chapter') && !headers.includes('chapter_num')) {
      errors.push('Missing chapter_number column');
    }

    // Check for verse columns (verse_1, verse_2, etc.)
    const verseColumns = headers.filter(h => h.match(/^verse_\d+$/));
    if (verseColumns.length === 0) {
      errors.push('Missing verse timestamp columns (verse_1, verse_2, etc.)');
    }

    return { isValid: errors.length === 0, errors };
  }, []);

  // Normalize column names
  const normalizeColumnName = useCallback((columnName: string): string => {
    const normalized = columnName.toLowerCase().trim().replace(/\s+/g, '_');
    const mapping: Record<string, string> = {
      'book': 'book_name',
      'book_id': 'book_name',
      'book_num': 'book_number',
      'chapter': 'chapter_number',
      'chapter_num': 'chapter_number',
      'ch': 'chapter_number'
    };
    return mapping[normalized] || normalized;
  }, []);

  // Find verse ID from book, chapter, verse
  const findVerseId = useCallback((bookIdentifier: string, chapterNum: number, verseNum: number, isBookNumber: boolean = false): string | null => {
    let osisId: string;
    
    if (isBookNumber) {
      // Map book number to OSIS ID
      osisId = BOOK_NUMBERS[bookIdentifier];
      if (!osisId) return null;
    } else {
      // Handle book name - try direct lookup first, then fallback to input
      const normalizedBookName = bookIdentifier.toLowerCase().replace(/\s+/g, '');
      osisId = OSIS_BOOKS[normalizedBookName] || bookIdentifier.toLowerCase();
    }
    
    // The verse ID follows the pattern: {book}-{chapter}-{verse}
    const verseId = `${osisId}-${chapterNum}-${verseNum}`;
    return verseId;
  }, []);

  // Find media file that matches a specific verse
  const findMatchingMediaFile = useCallback((verseId: string) => {
    if (!mediaFiles) return null;

    // Find all media files that could contain this verse
    const matchingFiles = mediaFiles.filter(file => {
      if (!file.start_verse_id || !file.end_verse_id) return false;
      
      // Parse verse IDs to compare properly (format: book-chapter-verse)
      const parseVerseId = (id: string) => {
        const parts = id.split('-');
        if (parts.length < 3) return null;
        return {
          book: parts[0],
          chapter: parseInt(parts[1]),
          verse: parseInt(parts[2])
        };
      };

      const targetVerse = parseVerseId(verseId);
      const startVerse = parseVerseId(file.start_verse_id);
      const endVerse = parseVerseId(file.end_verse_id);

      if (!targetVerse || !startVerse || !endVerse) return false;

      // Must be in the same book and chapter
      if (targetVerse.book !== startVerse.book || targetVerse.chapter !== startVerse.chapter) {
        return false;
      }

      // Check if the verse number is within the range
      return targetVerse.verse >= startVerse.verse && targetVerse.verse <= endVerse.verse;
    });

    if (matchingFiles.length === 0) return null;

    // If multiple files match, return the one with the highest version
    return matchingFiles.reduce((highest, current) => {
      const currentVersion = current.version || 0;
      const highestVersion = highest.version || 0;
      return currentVersion > highestVersion ? current : highest;
    });
  }, [mediaFiles]);

  // Process CSV data
  const processCSVData = useCallback((rawData: Record<string, string>[]): ProcessedRow[] => {
    if (!rawData || rawData.length === 0) return [];

    return rawData.map((row, index) => {
      const processedRow: ProcessedRow = {
        chapter_number: '',
        verseTimestamps: [],
        rowIndex: index + 2 // +2 because we skipped header row and arrays are 0-indexed
      };

      // Normalize column names and extract data
      Object.keys(row).forEach(key => {
        const normalizedKey = normalizeColumnName(key);
        const value = String(row[key] || '').trim();
        
        if (normalizedKey === 'book_name') {
          processedRow.book_name = value;
        } else if (normalizedKey === 'book_number') {
          processedRow.book_number = value;
        } else if (normalizedKey === 'chapter_number') {
          processedRow.chapter_number = value;
        } else if (normalizedKey.match(/^verse_\d+$/)) {
          // Extract verse number from column name (verse_1 -> 1)
          const verseNumber = parseInt(normalizedKey.replace('verse_', ''));
          if (!isNaN(verseNumber) && value !== '') {
            const timestamp = parseFloat(value);
            if (!isNaN(timestamp) && timestamp >= 0) {
              processedRow.verseTimestamps.push({
                verseNumber,
                timestamp
              });
            }
          }
        }
      });

      // Validate required fields
      if (!processedRow.chapter_number) {
        processedRow.error = `Row ${processedRow.rowIndex}: Missing chapter_number`;
        return processedRow;
      }

      // Check for book identifier
      if (!processedRow.book_name && !processedRow.book_number) {
        processedRow.error = `Row ${processedRow.rowIndex}: Missing book identifier`;
        return processedRow;
      }

      // Check if we have at least one verse timestamp
      if (processedRow.verseTimestamps.length === 0) {
        processedRow.error = `Row ${processedRow.rowIndex}: No valid verse timestamps found`;
        return processedRow;
      }

      // Validate numeric fields
      const chapterNum = parseInt(processedRow.chapter_number);
      
      if (isNaN(chapterNum) || chapterNum <= 0) {
        processedRow.error = `Row ${processedRow.rowIndex}: Invalid chapter number`;
        return processedRow;
      }

      // Sort verse timestamps by verse number
      processedRow.verseTimestamps.sort((a, b) => a.verseNumber - b.verseNumber);

      // Find verse IDs and matching media files for each timestamp
      const bookIdentifier = processedRow.book_name || processedRow.book_number!;
      const isBookNumber = !!processedRow.book_number;

      // Track which verses have media files and which don't
      const validVerses: typeof processedRow.verseTimestamps = [];
      const invalidVerses: number[] = [];

      for (const verseTimestamp of processedRow.verseTimestamps) {
        const verseId = findVerseId(bookIdentifier, chapterNum, verseTimestamp.verseNumber, isBookNumber);
        
        if (!verseId) {
          invalidVerses.push(verseTimestamp.verseNumber);
          continue;
        }

        // Find matching media file for this verse
        const matchingMediaFile = findMatchingMediaFile(verseId);
        if (!matchingMediaFile) {
          invalidVerses.push(verseTimestamp.verseNumber);
          continue;
        }

        verseTimestamp.verseId = verseId;
        verseTimestamp.mediaFileId = matchingMediaFile.id;
        validVerses.push(verseTimestamp);
      }

      // Update the row with only valid verses
      processedRow.verseTimestamps = validVerses;

      // If no valid verses, mark as error
      if (validVerses.length === 0) {
        const bookDisplay = isBookNumber ? `Book #${bookIdentifier}` : bookIdentifier;
        processedRow.error = `Row ${processedRow.rowIndex}: No matching audio files found for ${bookDisplay} Chapter ${chapterNum} verses ${processedRow.verseTimestamps.map(v => v.verseNumber).join(', ')} in the selected audio version`;
        return processedRow;
      }

      // If some verses were invalid, add a warning (but don't mark as error)
      if (invalidVerses.length > 0) {
        const bookDisplay = isBookNumber ? `Book #${bookIdentifier}` : bookIdentifier;
        processedRow.error = `Row ${processedRow.rowIndex}: Verses ${invalidVerses.join(', ')} from ${bookDisplay} Chapter ${chapterNum} not found in selected audio version (${validVerses.length}/${processedRow.verseTimestamps.length + invalidVerses.length} verses will be imported)`;
      }

      return processedRow;
    });
  }, [normalizeColumnName, findVerseId, findMatchingMediaFile]);

  // Handle CSV upload
  const handleCSVUpload = useCallback(async (uploadedData: Record<string, string>[]) => {
    setIsProcessingCSV(true);
    setUploadResults(null);
    
    try {
      const validation = validateCSVStructure(uploadedData);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        setCsvData([]);
        return;
      }

      const processedData = processCSVData(uploadedData);
      setCsvData(processedData);
      setValidationErrors([]);
      
      const validCount = processedData.filter(row => !row.error).length;
      const totalTimestamps = processedData.reduce((acc, row) => acc + (row.error ? 0 : row.verseTimestamps.length), 0);
      const errorCount = processedData.filter(row => row.error).length;
      
      if (validCount > 0) {
        toast({
          title: 'CSV processed successfully',
          description: `Found ${totalTimestamps} verse timestamps from ${validCount} chapters${errorCount > 0 ? ` with ${errorCount} errors` : ''}`,
          variant: 'success'
        });
      } else {
        toast({
          title: 'No valid data found',
          description: 'Please check your CSV format and data',
          variant: 'warning'
        });
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      toast({
        title: 'Processing failed',
        description: 'Failed to process CSV file. Please try again.',
        variant: 'error'
      });
      setValidationErrors(['Failed to process CSV file']);
      setCsvData([]);
    } finally {
      setIsProcessingCSV(false);
    }
  }, [validateCSVStructure, processCSVData, toast]);

  // Calculate duration between verses
  const calculateVerseDurations = useCallback((timestamps: Array<{ verseNumber: number; timestamp: number }>): Array<{ verseNumber: number; timestamp: number; duration: number }> => {
    if (timestamps.length === 0) return [];

    return timestamps.map((verse, index) => {
      let duration: number;
      
      if (index === timestamps.length - 1) {
        // Last verse: assume 30 seconds or use a reasonable default
        // In a real implementation, you might want to get the actual audio duration
        duration = 30;
      } else {
        // Other verses: duration from verse start to next verse start
        const nextVerse = timestamps[index + 1];
        duration = parseFloat(Math.max(0.1, nextVerse.timestamp - verse.timestamp).toFixed(2));
      }
      
      return { 
        verseNumber: verse.verseNumber,
        timestamp: verse.timestamp,
        duration 
      };
    });
  }, []);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!csvData) return;
    
    const validRows = csvData.filter(row => !row.error);
    
    if (validRows.length === 0) {
      toast({
        title: 'No valid rows to upload',
        description: 'Please ensure all rows have valid verse references and timestamps',
        variant: 'warning'
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({ completed: 0, total: 0, phase: 'Preparing data...' });

    try {
      // Prepare verse timestamp records for bulk insert
      const allVerseTimestamps: Array<{
        media_file_id: string;
        verse_id: string;
        start_time_seconds: number;
        duration_seconds: number;
      }> = [];

      for (const row of validRows) {
        const versesWithDurations = calculateVerseDurations(row.verseTimestamps);
        
        for (const verse of versesWithDurations) {
          if (verse.verseNumber && verse.timestamp !== undefined && verse.duration) {
            const verseTimestamp = row.verseTimestamps.find(v => v.verseNumber === verse.verseNumber);
            if (verseTimestamp?.verseId && verseTimestamp?.mediaFileId) {
              allVerseTimestamps.push({
                media_file_id: verseTimestamp.mediaFileId,
                verse_id: verseTimestamp.verseId,
                start_time_seconds: verse.timestamp,
                duration_seconds: verse.duration
              });
            }
          }
        }
      }

      console.log('Attempting to insert verse timestamps:', allVerseTimestamps);

      // Use optimized bulk insert with progress tracking
      // Choose batch size based on dataset size
      const batchSize = allVerseTimestamps.length > 10000 ? 500 : allVerseTimestamps.length > 5000 ? 750 : 1000;
      
      await bulkInsertMutation.mutateAsync(allVerseTimestamps, {
        onProgress: (progress) => {
          setUploadProgress(progress);
        },
        batchSize
      });

      setUploadResults({
        success: allVerseTimestamps.length,
        errors: []
      });

      toast({
        title: 'Import Complete!',
        description: `Successfully imported ${allVerseTimestamps.length} verse timestamps`,
        variant: 'success'
      });

      // Call the callback if provided
      onImportComplete?.();

    } catch (error: unknown) {
      console.error('Upload error:', error);
      
      const errorRows = validRows.map(row => ({
        ...row,
        error: error instanceof Error ? error.message : 'Upload failed: Unknown error'
      }));

      setUploadResults({
        success: 0,
        errors: errorRows
      });

      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  }, [csvData, calculateVerseDurations, bulkInsertMutation, toast, onImportComplete]);

  // Download sample CSV
  const downloadSampleCSV = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/assets/verse_upload_format.csv';
    link.download = 'verse_upload_format.csv';
    link.click();
  }, []);

  // Clear all data
  const clearAllData = useCallback(() => {
    setCsvData([]);
    setValidationErrors([]);
    setUploadResults(null);
    setUploadProgress(null);
    setIsProcessingCSV(false);
    setIsUploading(false);
  }, []);

  // Handle modal close/open change
  const handleOpenChange = useCallback((newOpen: boolean) => {
    if (!newOpen && !isUploading && !isProcessingCSV) {
      // Reset all state when closing modal (unless still processing)
      clearAllData();
    }
    onOpenChange(newOpen);
  }, [onOpenChange, isUploading, isProcessingCSV, clearAllData]);

  // Computed values
  const hasData = csvData.length > 0;
  const validRows = csvData.filter(row => !row.error);
  const errorRows = csvData.filter(row => row.error);
  const totalTimestamps = validRows.reduce((acc, row) => acc + row.verseTimestamps.length, 0);
  const canUpload = validRows.length > 0 && !isUploading && !isProcessingCSV;

  // Show warning if no audio version is selected
  if (!selectedAudioVersionId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <ClockIcon className="h-6 w-6" />
              <span>Import Verse Timestamps</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-8">
            <Alert variant="destructive">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <div>
                <h4 className="font-medium mb-2">No Audio Version Selected</h4>
                <p className="text-sm">
                  Please select an audio version before importing verse timestamps. 
                  Verse timestamps can only be added to existing audio files within a specific audio version.
                </p>
              </div>
            </Alert>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="6xl" className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <ClockIcon className="h-6 w-6" />
            <span>Import Verse Timestamps</span>
          </DialogTitle>
          <DialogDescription>
            Import verse timestamps via CSV with automatic validation and verse matching
          </DialogDescription>
        </DialogHeader>

        {/* Main content area */}
        <div className="min-h-[400px] flex flex-col">
          {/* Upload Stats */}
          {hasData && (
            <div className="grid grid-cols-4 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {csvData.length}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {validRows.length}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Valid Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {totalTimestamps}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Timestamps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {errorRows.length}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400">Errors</div>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && uploadProgress && (
            <div className="space-y-4 mb-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    {uploadProgress.phase}
                  </h4>
                  <span className="text-sm text-blue-600 dark:text-blue-400">
                    {uploadProgress.total > 0 && (
                      `${uploadProgress.completed}/${uploadProgress.total} (${Math.round((uploadProgress.completed / uploadProgress.total) * 100)}%)`
                    )}
                  </span>
                </div>
                {uploadProgress.total > 0 && (
                  <Progress 
                    value={(uploadProgress.completed / uploadProgress.total) * 100} 
                    className="w-full"
                  />
                )}
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                  Please keep this window open while the import is in progress. Large imports may take several minutes.
                </p>
              </div>
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <div className="space-y-4 mb-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <h4 className="font-medium text-green-800 dark:text-green-200">
                    Import Complete!
                  </h4>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Successfully imported {uploadResults.success} verse timestamps
                  {uploadResults.errors.length > 0 && ` with ${uploadResults.errors.length} errors`}
                </p>
              </div>

              {uploadResults.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 max-h-40 overflow-y-auto">
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Import errors:</h4>
                  {uploadResults.errors.map((row, index) => (
                    <div key={index} className="text-sm text-red-700 dark:text-red-300 mb-1">
                      {row.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CSV Upload Area */}
          {!hasData && !uploadResults && (
            <div className="space-y-4">
              <div className="text-center">
                <Button variant="outline" onClick={downloadSampleCSV} className="mb-4">
                  Download Sample CSV
                </Button>
              </div>

              <CSVUpload
                onFileUpload={handleCSVUpload}
                acceptedFormats={['.csv', '.txt', '.tsv']}
                maxFileSize={10}
                disabled={isProcessingCSV || isUploading}
              />

              {isProcessingCSV && (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner className="mr-2" />
                  <span>Processing CSV file and validating verses...</span>
                </div>
              )}

              {validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <ExclamationTriangleIcon className="h-5 w-5" />
                  <div>
                    <h4 className="font-medium mb-2">Validation Errors:</h4>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </Alert>
              )}
            </div>
          )}

          {/* Preview Data */}
          {hasData && !uploadResults && !isUploading && (
            <div className="space-y-4">
              {validRows.length > 0 && (
                <div>
                  <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                    Valid Rows ({validRows.length}):
                  </h4>
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 max-h-60 overflow-y-auto">
                    {validRows.slice(0, 5).map((row, index) => (
                      <div key={index} className="text-sm text-green-700 dark:text-green-300 mb-2">
                        <div className="font-medium">
                          {row.book_name || `Book #${row.book_number}`} Chapter {row.chapter_number}
                        </div>
                        <div className="ml-2 text-xs">
                          {row.verseTimestamps.map(v => `v${v.verseNumber}@${v.timestamp}s`).join(', ')}
                        </div>
                      </div>
                    ))}
                    {validRows.length > 5 && (
                      <div className="text-sm text-green-600 dark:text-green-400">
                        ... and {validRows.length - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              )}

              {errorRows.length > 0 && (
                <div>
                  <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">
                    Rows with Errors ({errorRows.length}):
                  </h4>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 max-h-40 overflow-y-auto">
                    {errorRows.map((row, index) => (
                      <div key={index} className="text-sm text-red-700 dark:text-red-300 mb-1">
                        {row.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg mt-4">
            <h4 className="font-medium text-neutral-900 dark:text-neutral-100">CSV Format Requirements:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Required columns: book_name (or book_number), chapter_number, verse_1, verse_2, etc.</li>
              <li>First row must contain column headers</li>
              <li>Supports both comma-separated (.csv) and tab-separated (.tsv) files</li>
              <li>Book names should match OSIS abbreviations (e.g., 'gen' for Genesis, 'matt' for Matthew)</li>
              <li>Alternatively, use book_number (1-66) instead of book_name</li>
              <li>Verse columns should contain timestamps in seconds (e.g., 12.5 for 12.5 seconds)</li>
              <li>Empty verse columns will be ignored</li>
              <li><strong>Important:</strong> Only verses that fall within existing audio files in the selected audio version will be imported</li>
              <li>Verses outside the range of existing audio files will be shown as errors</li>
              <li>If multiple audio files cover the same verses, timestamps will be added to the file with the highest version number</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
          {hasData && !uploadResults && (
            <Button
              variant="outline"
              onClick={clearAllData}
              disabled={isUploading}
            >
              Clear Data
            </Button>
          )}
          <DialogClose asChild>
            <Button variant="outline" disabled={isUploading}>
              {uploadResults ? 'Close' : 'Cancel'}
            </Button>
          </DialogClose>
          {hasData && !uploadResults && (
            <Button 
              onClick={handleUpload}
              disabled={!canUpload}
              className="flex items-center space-x-2"
            >
              {isUploading && <LoadingSpinner className="h-4 w-4" />}
              <span>
                {isUploading 
                  ? (uploadProgress?.phase || 'Importing...') 
                  : `Import ${totalTimestamps} Timestamps`
                }
              </span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 