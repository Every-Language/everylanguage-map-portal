/**
 * Type-safe utility functions for exporting data from tables to various formats
 */

export interface ExportColumn {
  key: string;
  header: string;
  formatter?: (value: unknown) => string;
}

export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
}

/**
 * Converts data to CSV format
 */
export function convertToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): string {
  const { includeHeaders = true } = options;
  
  const csvRows: string[] = [];
  
  // Add headers if requested
  if (includeHeaders) {
    const headers = columns.map(col => `"${col.header}"`);
    csvRows.push(headers.join(','));
  }
  
  // Add data rows
  data.forEach(row => {
    const values = columns.map(col => {
      let value = row[col.key];
      
      // Apply custom formatter if provided
      if (col.formatter) {
        value = col.formatter(value);
      } else {
        // Default formatting
        if (value === null || value === undefined) {
          value = '';
        } else if (value instanceof Date) {
          value = value.toISOString();
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        } else {
          value = String(value);
        }
      }
      
      // Escape CSV values
      const stringValue = String(value).replace(/"/g, '""');
      return `"${stringValue}"`;
    });
    
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

/**
 * Downloads data as CSV file
 */
export function downloadCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions = {}
): void {
  const { filename = 'export.csv' } = options;
  
  const csvContent = convertToCSV(data, columns, options);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  
  downloadBlob(blob, filename);
}

/**
 * Downloads data as JSON file
 */
export function downloadJSON(
  data: Record<string, unknown>[],
  options: ExportOptions = {}
): void {
  const { filename = 'export.json' } = options;
  
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  
  downloadBlob(blob, filename);
}

/**
 * Generic blob download function
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  window.URL.revokeObjectURL(url);
}

/**
 * Format functions for common data types
 */
export const formatters = {
  date: (value: unknown): string => {
    if (!value) return '';
    const date = new Date(value as string | Date);
    return date.toLocaleDateString();
  },
  
  dateTime: (value: unknown): string => {
    if (!value) return '';
    const date = new Date(value as string | Date);
    return date.toLocaleString();
  },
  
  boolean: (value: unknown): string => {
    return value ? 'Yes' : 'No';
  },
  
  status: (value: unknown): string => {
    if (!value) return '';
    return String(value).replace(/_/g, ' ').toUpperCase();
  },
  
  duration: (seconds: unknown): string => {
    if (!seconds || typeof seconds !== 'number') return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },
  
  tags: (value: unknown): string => {
    if (!Array.isArray(value)) return '';
    return value.map(tag => 
      typeof tag === 'object' && tag !== null && 'name' in tag 
        ? (tag as { name: string }).name 
        : String(tag)
    ).join(', ');
  }
};

/**
 * Helper function to generate filename with timestamp
 */
export function generateFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
} 