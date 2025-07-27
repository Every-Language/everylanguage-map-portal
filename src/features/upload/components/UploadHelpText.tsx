import { Card, CardContent } from '../../../shared/design-system/components';

export function UploadHelpText() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4">
          <div>
            <h4 className="font-medium">Supported Audio Formats:</h4>
            <p>MP3, WAV, M4A, AAC, OGG, WebM</p>
          </div>
          
          <div>
            <h4 className="font-medium">File Requirements:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Maximum file size: 500MB per file</li>
              <li>Maximum 50 files per upload session</li>
              <li>Files should be audio recordings of Bible chapters or verses</li>
              <li>Each file must have book, chapter, and verse range selected</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium">Filename Conventions for Automatic Detection:</h4>
            <div className="space-y-2 mt-2">
              <div>
                <span className="font-medium text-green-600">High Confidence Patterns:</span>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><code>Language_Book_Chapter_V1-5.mp3</code> - Full format with verse range</li>
                  <li><code>Book_Chapter_Verses1-3.mp3</code> - Book, chapter, and verses</li>
                  <li><code>EN_Matthew_5_V1-12.mp3</code> - Language code included</li>
                </ul>
              </div>
              
              <div>
                <span className="font-medium text-yellow-600">Medium Confidence Patterns:</span>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><code>Matthew_Chapter5.mp3</code> - Book and chapter</li>
                  <li><code>EN_Genesis_1.mp3</code> - Language, book, chapter</li>
                  <li><code>John_3.mp3</code> - Simple book and chapter</li>
                </ul>
              </div>
              
              <div>
                <span className="font-medium text-orange-600">Low Confidence Patterns:</span>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><code>Matthew.mp3</code> - Book name only</li>
                  <li><code>Genesis_Recording.mp3</code> - Book with additional text</li>
                </ul>
              </div>
              
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-blue-800 dark:text-blue-200">
                  <strong>Tip:</strong> Use abbreviations like GEN, MAT, JOH, or full names like Genesis, Matthew, John. 
                  The system recognizes both standard 3-letter codes and full book names. Files with detected 
                  book/chapter/verse information will be auto-populated in the selectors below each file.
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 