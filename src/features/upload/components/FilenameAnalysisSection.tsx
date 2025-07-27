import { Card, CardHeader, CardTitle, CardContent } from '../../../shared/design-system/components';
import { type AudioUploadStats } from '../utils/audioUploadUtils';

interface FilenameAnalysisSectionProps {
  uploadStats: AudioUploadStats;
}

export function FilenameAnalysisSection({ uploadStats }: FilenameAnalysisSectionProps) {
  if (!uploadStats.parsingStats || uploadStats.totalFiles === 0) {
    return null;
  }

  const { parsingStats } = uploadStats;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Filename Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Confidence Level Stats */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detection Confidence
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
              {parsingStats.highConfidence > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                  <div className="text-xl font-bold text-green-600">
                    {parsingStats.highConfidence}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300">High Confidence</div>
                </div>
              )}
              {parsingStats.mediumConfidence > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                  <div className="text-xl font-bold text-yellow-600">
                    {parsingStats.mediumConfidence}
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300">Medium Confidence</div>
                </div>
              )}
              {parsingStats.lowConfidence > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3">
                  <div className="text-xl font-bold text-orange-600">
                    {parsingStats.lowConfidence}
                  </div>
                  <div className="text-xs text-orange-700 dark:text-orange-300">Low Confidence</div>
                </div>
              )}
              {parsingStats.noMatch > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  <div className="text-xl font-bold text-gray-600">
                    {parsingStats.noMatch}
                  </div>
                  <div className="text-xs text-gray-700 dark:text-gray-400">No Match</div>
                </div>
              )}
            </div>
          </div>

          {/* Detection Results */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Detected Elements
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-xl font-bold text-blue-600">
                  {parsingStats.booksDetected}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Books</div>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
                <div className="text-xl font-bold text-indigo-600">
                  {parsingStats.chaptersDetected}
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300">Chapters</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="text-xl font-bold text-purple-600">
                  {parsingStats.versesDetected}
                </div>
                <div className="text-xs text-purple-700 dark:text-purple-300">Verse Ranges</div>
              </div>
            </div>
          </div>

          {/* Parsing Quality Indicator */}
          {uploadStats.totalFiles > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Overall Detection Rate:</span>
                <span className={`font-semibold ${
                  ((parsingStats.highConfidence + parsingStats.mediumConfidence) / uploadStats.totalFiles) >= 0.8
                    ? 'text-green-600'
                    : ((parsingStats.highConfidence + parsingStats.mediumConfidence) / uploadStats.totalFiles) >= 0.5
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {Math.round(((parsingStats.highConfidence + parsingStats.mediumConfidence) / uploadStats.totalFiles) * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 