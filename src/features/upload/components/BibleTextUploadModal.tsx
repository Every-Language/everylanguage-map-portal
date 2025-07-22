import React, { useState, useCallback } from 'react';
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
  Input,
  Select,
  SelectItem
} from '../../../shared/design-system/components';
import { useToast } from '../../../shared/design-system/hooks/useToast';
import { useSelectedProject } from '../../dashboard/hooks/useSelectedProject';
import { useAuth } from '../../auth/hooks/useAuth';
import { 
  useTextVersionsByProject, 
  useBulkInsertVerseTexts,
  useCreateTextVersion
} from '../../../shared/hooks/query/text-versions';
import { useBibleVersions } from '../../../shared/hooks/query/bible-versions';

import { DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon, PlusIcon } from '@heroicons/react/24/outline';

// CSV row type for validation
interface CSVRow {
  book_name?: string;
  book_number?: string;
  chapter_number: string;
  verse_number: string;
  text: string;
}

// Processed row with validation results
interface ProcessedRow extends CSVRow {
  verse_id?: string;
  error?: string;
  rowIndex: number;
}

interface BibleTextUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: () => void;
}

// OSIS book mappings
const OSIS_BOOKS: Record<string, string> = {
  'genesis': 'gen', 'exodus': 'exod', 'leviticus': 'lev', 'numbers': 'num', 'deuteronomy': 'deut',
  'joshua': 'josh', 'judges': 'judg', 'ruth': 'ruth', '1samuel': '1sam', '2samuel': '2sam',
  '1kings': '1kgs', '2kings': '2kgs', '1chronicles': '1chr', '2chronicles': '2chr',
  'ezra': 'ezra', 'nehemiah': 'neh', 'esther': 'esth', 'job': 'job', 'psalms': 'ps',
  'proverbs': 'prov', 'ecclesiastes': 'eccl', 'songofsongs': 'song', 'isaiah': 'isa',
  'jeremiah': 'jer', 'lamentations': 'lam', 'ezekiel': 'ezek', 'daniel': 'dan',
  'hosea': 'hos', 'joel': 'joel', 'amos': 'amos', 'obadiah': 'obad', 'jonah': 'jonah',
  'micah': 'mic', 'nahum': 'nah', 'habakkuk': 'hab', 'zephaniah': 'zeph',
  'haggai': 'hag', 'zechariah': 'zech', 'malachi': 'mal', 'matthew': 'matt',
  'mark': 'mark', 'luke': 'luke', 'john': 'john', 'acts': 'acts', 'romans': 'rom',
  '1corinthians': '1cor', '2corinthians': '2cor', 'galatians': 'gal', 'ephesians': 'eph',
  'philippians': 'phil', 'colossians': 'col', '1thessalonians': '1thess', '2thessalonians': '2thess',
  '1timothy': '1tim', '2timothy': '2tim', 'titus': 'titus', 'philemon': 'phlm',
  'hebrews': 'heb', 'james': 'jas', '1peter': '1pet', '2peter': '2pet',
  '1john': '1john', '2john': '2john', '3john': '3john', 'jude': 'jude', 'revelation': 'rev'
};

// Book number to name mapping (1-66)
const BOOK_NUMBERS: Record<string, string> = {
  '1': 'gen', '2': 'exod', '3': 'lev', '4': 'num', '5': 'deut', '6': 'josh', '7': 'judg', '8': 'ruth',
  '9': '1sam', '10': '2sam', '11': '1kgs', '12': '2kgs', '13': '1chr', '14': '2chr', '15': 'ezra',
  '16': 'neh', '17': 'esth', '18': 'job', '19': 'ps', '20': 'prov', '21': 'eccl', '22': 'song',
  '23': 'isa', '24': 'jer', '25': 'lam', '26': 'ezek', '27': 'dan', '28': 'hos', '29': 'joel',
  '30': 'amos', '31': 'obad', '32': 'jonah', '33': 'mic', '34': 'nah', '35': 'hab', '36': 'zeph',
  '37': 'hag', '38': 'zech', '39': 'mal', '40': 'matt', '41': 'mark', '42': 'luke', '43': 'john',
  '44': 'acts', '45': 'rom', '46': '1cor', '47': '2cor', '48': 'gal', '49': 'eph', '50': 'phil',
  '51': 'col', '52': '1thess', '53': '2thess', '54': '1tim', '55': '2tim', '56': 'titus', '57': 'phlm',
  '58': 'heb', '59': 'jas', '60': '1pet', '61': '2pet', '62': '1john', '63': '2john', '64': '3john',
  '65': 'jude', '66': 'rev'
};

export function BibleTextUploadModal({ 
  open, 
  onOpenChange, 
  onUploadComplete 
}: BibleTextUploadModalProps) {
  // Data fetching
  const { user, dbUser } = useAuth();
  const { selectedProject } = useSelectedProject();
  const { toast } = useToast();
  const { data: textVersions, refetch: refetchTextVersions } = useTextVersionsByProject(selectedProject?.id || '');
  const { data: bibleVersions } = useBibleVersions();
  const bulkInsertMutation = useBulkInsertVerseTexts();
  const createTextVersionMutation = useCreateTextVersion();
  
  // States
  const [csvData, setCsvData] = useState<ProcessedRow[]>([]);
  const [isProcessingCSV, setIsProcessingCSV] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [uploadResults, setUploadResults] = useState<{ success: number; errors: ProcessedRow[] } | null>(null);
  const [showCreateTextVersion, setShowCreateTextVersion] = useState(false);
  const [selectedBibleVersion, setSelectedBibleVersion] = useState<string>('');
  const [newTextVersionName, setNewTextVersionName] = useState('');
  const [isCreatingTextVersion, setIsCreatingTextVersion] = useState(false);

  // Check if we need to show text version creation
  const needsTextVersion = !textVersions || textVersions.length === 0;

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
    const requiredColumns = ['chapter_number', 'verse_number'] as const;
    const altColumns: Record<string, string[]> = {
      'chapter_number': ['chapter', 'chapter_num', 'ch'],
      'verse_number': ['verse', 'verse_num', 'v']
    };

    requiredColumns.forEach(col => {
      const alternatives = [col, ...(altColumns[col] || [])];
      const found = alternatives.some(alt => headers.includes(alt));
      if (!found) {
        errors.push(`Missing column: ${col} (or ${alternatives.slice(1).join(', ')})`);
      }
    });

    // Check for text column (flexible)
    const textColumns = ['text', 'texts', 'verse_text', 'verse_texts', 'content'];
    const hasTextColumn = textColumns.some(col => headers.includes(col));
    if (!hasTextColumn) {
      errors.push(`Missing text column (accepted: ${textColumns.join(', ')})`);
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
      'ch': 'chapter_number',
      'verse': 'verse_number',
      'verse_num': 'verse_number',
      'v': 'verse_number',
      'texts': 'text',
      'verse_text': 'text',
      'verse_texts': 'text',
      'content': 'text'
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

  // Process CSV data
  const processCSVData = useCallback((rawData: Record<string, string>[]): ProcessedRow[] => {
    if (!rawData || rawData.length === 0) return [];

    return rawData.map((row, index) => {
      const processedRow: ProcessedRow = {
        chapter_number: '',
        verse_number: '',
        text: '',
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
        } else if (['chapter_number', 'verse_number', 'text'].includes(normalizedKey)) {
          processedRow[normalizedKey as keyof CSVRow] = value;
        }
      });

      // Validate required fields
      if (!processedRow.chapter_number || !processedRow.verse_number || !processedRow.text) {
        processedRow.error = `Row ${processedRow.rowIndex}: Missing required fields`;
        return processedRow;
      }

      // Check for book identifier
      if (!processedRow.book_name && !processedRow.book_number) {
        processedRow.error = `Row ${processedRow.rowIndex}: Missing book identifier`;
        return processedRow;
      }

      // Validate numeric fields
      const chapterNum = parseInt(processedRow.chapter_number);
      const verseNum = parseInt(processedRow.verse_number);
      
      if (isNaN(chapterNum) || chapterNum <= 0) {
        processedRow.error = `Row ${processedRow.rowIndex}: Invalid chapter number`;
        return processedRow;
      }
      
      if (isNaN(verseNum) || verseNum <= 0) {
        processedRow.error = `Row ${processedRow.rowIndex}: Invalid verse number`;
        return processedRow;
      }

      // Find verse ID
      const bookIdentifier = processedRow.book_name || processedRow.book_number!;
      const isBookNumber = !!processedRow.book_number;
      const verseId = findVerseId(bookIdentifier, chapterNum, verseNum, isBookNumber);
      
      if (!verseId) {
        const bookDisplay = isBookNumber ? `Book #${bookIdentifier}` : bookIdentifier;
        processedRow.error = `Row ${processedRow.rowIndex}: Could not find verse ${bookDisplay} ${chapterNum}:${verseNum}`;
        return processedRow;
      }

      processedRow.verse_id = verseId;
      return processedRow;
    });
  }, [normalizeColumnName, findVerseId]);

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
      const errorCount = processedData.filter(row => row.error).length;
      
      if (validCount > 0) {
        toast({
          title: 'CSV processed successfully',
          description: `Found ${validCount} valid verses${errorCount > 0 ? ` and ${errorCount} errors` : ''}`,
          variant: 'success'
        });
      } else {
        toast({
          title: 'No valid verses found',
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

  // Create text version
  const handleCreateTextVersion = useCallback(async () => {
    if (!selectedProject || !newTextVersionName.trim() || !selectedBibleVersion || !dbUser) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'error'
      });
      return;
    }

    setIsCreatingTextVersion(true);

    try {
      // Use the project's target language entity
      const targetLanguageEntityId = selectedProject.target_language_entity_id;
      
      if (!targetLanguageEntityId) {
        toast({
          title: 'Project configuration error',
          description: 'Project does not have a target language configured',
          variant: 'error'
        });
        setIsCreatingTextVersion(false);
        return;
      }

      await createTextVersionMutation.mutateAsync({
        name: newTextVersionName.trim(),
        language_entity_id: targetLanguageEntityId,
        bible_version_id: selectedBibleVersion,
        text_version_source: 'user_submitted',
        created_by: dbUser.id
      });

      toast({
        title: 'Text version created',
        description: `Successfully created text version "${newTextVersionName}"`,
        variant: 'success'
      });

      // Reset form and refresh data
      setNewTextVersionName('');
      setSelectedBibleVersion('');
      setShowCreateTextVersion(false);
      await refetchTextVersions();
      setIsCreatingTextVersion(false);
    } catch (error: unknown) {
      console.error('Error creating text version:', error);
      toast({
        title: 'Failed to create text version',
        description: error instanceof Error ? error.message : 'An unknown error occured',
        variant: 'error'
      });
      setIsCreatingTextVersion(false);
    }
  }, [selectedProject, newTextVersionName, selectedBibleVersion, createTextVersionMutation, dbUser, toast, refetchTextVersions]);

  // Handle upload
  const handleUpload = useCallback(async () => {
    if (!user || !dbUser || !csvData) return;
    
    const validRows = csvData.filter(row => !row.error && row.verse_id);
    
    if (validRows.length === 0) {
      toast({
        title: 'No valid rows to upload',
        description: 'Please ensure all rows have valid verse references',
        variant: 'warning'
      });
      return;
    }

    setIsUploading(true);

    try {
      // Check if we have text versions, if not, we need to create one first
      const textVersionId = textVersions?.[0]?.id;
      
      if (!textVersionId) {
        // We need a text version to associate with verse texts
        // For now, let's show an error message
        toast({
          title: 'No text version available',
          description: 'Please create a text version first before uploading verses',
          variant: 'error'
        });
        setIsUploading(false);
        return;
      }

      const verseTextsToInsert = validRows.map(row => ({
        verse_id: row.verse_id!,
        text_version_id: textVersionId,
        verse_text: row.text,
        created_by: dbUser.id  // Use database user ID
      }));

      console.log('Attempting to insert verse texts:', verseTextsToInsert);

      await bulkInsertMutation.mutateAsync(verseTextsToInsert);

      setUploadResults({
        success: validRows.length,
        errors: []
      });

      toast({
        title: 'Upload Complete!',
        description: `Successfully uploaded ${validRows.length} verse texts`,
        variant: 'success'
      });

      // Call the callback if provided
      onUploadComplete?.();

    } catch (error) {
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
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'error'
      });
    } finally {
      setIsUploading(false);
    }
  }, [user, dbUser, csvData, textVersions, bulkInsertMutation, toast, onUploadComplete]);

  // Download sample CSV
  const downloadSampleCSV = useCallback(() => {
    const link = document.createElement('a');
    link.href = '/assets/bible_text_upload_format.csv';
    link.download = 'bible_text_upload_format.csv';
    link.click();
  }, []);

  // Clear all data
  const clearAllData = useCallback(() => {
    setCsvData([]);
    setValidationErrors([]);
    setUploadResults(null);
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
  const canUpload = validRows.length > 0 && !isUploading && !isProcessingCSV;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="6xl" className="max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DocumentTextIcon className="h-6 w-6" />
            <span>Upload Bible Text</span>
          </DialogTitle>
          <DialogDescription>
            Upload verse texts via CSV with automatic validation and verse matching
          </DialogDescription>
        </DialogHeader>

        {/* Main content area */}
        <div className="min-h-[400px] flex flex-col">
          {/* Check for user authentication */}
          {!user || !dbUser ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Authentication Required
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {!user ? 'Please log in to upload Bible text.' : 'Loading user profile...'}
                </p>
              </div>
            </div>
          ) : needsTextVersion ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <PlusIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-800 dark:text-blue-200">
                    {needsTextVersion ? 'Create Text Version First' : 'Create New Text Version'}
                  </h4>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                  {needsTextVersion 
                    ? 'No text versions exist for this project. Please create one to organize your verse texts.'
                    : 'Create a new text version to organize different translations or versions of the text.'}
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="textVersionName" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Text Version Name
                    </label>
                    <Input
                      id="textVersionName"
                      type="text"
                      placeholder="e.g., English Standard Version, Local Translation"
                      value={newTextVersionName}
                      onChange={(e) => setNewTextVersionName(e.target.value)}
                      disabled={isCreatingTextVersion}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bibleVersion" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Bible Version
                    </label>
                    <Select value={selectedBibleVersion} onValueChange={setSelectedBibleVersion}>
                      <option value="">Select a Bible version...</option>
                      {bibleVersions?.map((version) => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.name}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button
                      onClick={handleCreateTextVersion}
                      disabled={!newTextVersionName || !selectedBibleVersion || isCreatingTextVersion}
                      className="flex items-center space-x-2"
                    >
                      {isCreatingTextVersion && <LoadingSpinner className="h-4 w-4" />}
                      <span>
                        {isCreatingTextVersion ? 'Creating...' : 'Create Text Version'}
                      </span>
                    </Button>
                    
                    {!needsTextVersion && (
                      <Button
                        variant="outline"
                        onClick={() => setShowCreateTextVersion(false)}
                        disabled={isCreatingTextVersion}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Upload Stats */}
              {hasData && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
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
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {errorRows.length}
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">Errors</div>
                  </div>
                </div>
              )}

              {/* Show option to create text version if some exist but user wants to create another */}
              {!needsTextVersion && !showCreateTextVersion && !hasData && !uploadResults && (
                <div className="flex justify-between items-center p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      Using text version: <span className="font-medium">{textVersions?.[0]?.name}</span>
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCreateTextVersion(true)}
                    className="flex items-center space-x-1"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Create New</span>
                  </Button>
                </div>
              )}

              {/* Text Version Creation Form (when user clicks "Create New") */}
              {showCreateTextVersion && !hasData && !uploadResults && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-md p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-blue-800 dark:text-blue-200">
                        Create New Text Version
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowCreateTextVersion(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        Cancel
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">
                          Text Version Name *
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., Simplified Version, Audio Transcription..."
                          value={newTextVersionName}
                          onChange={(e) => setNewTextVersionName(e.target.value)}
                          className="dark:bg-blue-800/10 dark:border-blue-600 dark:text-blue-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">
                          Bible Version *
                        </label>
                        <Select value={selectedBibleVersion} onValueChange={setSelectedBibleVersion}>
                          <SelectItem value="">Select a Bible version...</SelectItem>
                          {bibleVersions?.map((version) => (
                            <SelectItem key={version.id} value={version.id}>
                              {version.name}
                            </SelectItem>
                          ))}
                        </Select>
                      </div>

                      <Button
                        onClick={handleCreateTextVersion}
                        disabled={isCreatingTextVersion || !newTextVersionName.trim() || !selectedBibleVersion}
                        className="w-full"
                      >
                        {isCreatingTextVersion ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Creating Text Version...
                          </>
                        ) : (
                          'Create Text Version'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Results */}
              {uploadResults && (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <h4 className="font-medium text-green-800 dark:text-green-200">
                        Upload Complete!
                      </h4>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Successfully uploaded {uploadResults.success} verse texts
                      {uploadResults.errors.length > 0 && ` with ${uploadResults.errors.length} errors`}
                    </p>
                  </div>

                  {uploadResults.errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 max-h-40 overflow-y-auto">
                      <h4 className="font-medium text-red-800 dark:text-red-200 mb-2">Upload errors:</h4>
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
              {!hasData && !uploadResults && !showCreateTextVersion && !needsTextVersion && (
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
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                        <h4 className="font-medium text-red-800 dark:text-red-200">Validation Errors:</h4>
                      </div>
                      <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
                        {validationErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Data */}
              {hasData && !uploadResults && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Data Preview</h3>
                  
                  {/* Valid Rows Preview */}
                  {validRows.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                        Valid Entries (showing first 5 of {validRows.length}):
                      </h4>
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 max-h-60 overflow-y-auto">
                        {validRows.slice(0, 5).map((row, index) => (
                          <div key={index} className="mb-3 text-sm border-b border-green-200 dark:border-green-700 pb-2 last:border-b-0">
                            <div className="font-medium text-green-900 dark:text-green-100">
                              {row.book_name || `Book #${row.book_number}`} {row.chapter_number}:{row.verse_number}
                            </div>
                            <div className="text-green-700 dark:text-green-300 mt-1">
                              {row.text.substring(0, 100)}...
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Error Rows */}
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
              <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <h4 className="font-medium text-neutral-900 dark:text-neutral-100">CSV Format Requirements:</h4>
                <ul className="list-disc list-inside space-y-1">
                  <li>Required columns: book_name (or book_number), chapter_number, verse_number, text</li>
                  <li>First row must contain column headers</li>
                  <li>Supports both comma-separated (.csv) and tab-separated (.tsv) files</li>
                  <li>Book names should match OSIS abbreviations (e.g., 'gen' for Genesis, 'matt' for Matthew)</li>
                  <li>Alternatively, use book_number (1-66) instead of book_name</li>
                  <li>Text column alternatives: text, texts, verse_text, verse_texts, content</li>
                </ul>
              </div>
            </>
          )}
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
                  ? 'Uploading...' 
                  : `Upload ${validRows.length} Verses`
                }
              </span>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 