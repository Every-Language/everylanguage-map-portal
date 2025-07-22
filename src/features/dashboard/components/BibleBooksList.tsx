import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Search, Book as BookIcon, Info, Upload, Edit3 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Progress,
  Button
} from '../../../shared/design-system'
import { 
  useBibleProjectDashboard,
  useBibleProjectDashboardRealtime,
  type BibleBookWithProgress,
  type ChapterWithStatus
} from '../../../shared/hooks/query/bible-structure'
import {
  getStatusColor,
  formatProgress,
  formatStatus
} from '../../../shared/utils/bible-progress'
import { cn } from '../../../shared/design-system/utils'

// Action buttons component for books and chapters
const ActionButtons: React.FC<{
  onUpload: () => void
  onEdit: () => void
  size?: 'sm' | 'md'
  variant?: 'book' | 'chapter'
}> = ({ onUpload, onEdit, size = 'sm', variant = 'chapter' }) => {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon-sm' : 'icon'}
        onClick={(e) => {
          e.stopPropagation()
          onUpload()
        }}
        className="h-6 w-6 p-0 hover:bg-green-100 dark:hover:bg-green-900"
        aria-label={`Upload audio for ${variant}`}
      >
        <Upload className="h-3 w-3 text-green-600 dark:text-green-400" />
      </Button>
      <Button
        variant="ghost"
        size={size === 'sm' ? 'icon-sm' : 'icon'}
        onClick={(e) => {
          e.stopPropagation()
          onEdit()
        }}
        className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
        aria-label={`Edit ${variant} details`}
      >
        <Edit3 className="h-3 w-3 text-blue-600 dark:text-blue-400" />
      </Button>
    </div>
  )
}

interface BibleBooksListProps {
  projectId: string
  className?: string
}

interface BookEntryProps {
  book: BibleBookWithProgress
  isExpanded: boolean
  onToggle: () => void
}

interface ChapterItemProps {
  chapter: ChapterWithStatus
  onUpload: (chapterId: string) => void
  onEdit: (chapterId: string) => void
  isHighlighted?: boolean
}

const ChapterItem: React.FC<ChapterItemProps> = ({ chapter, onUpload, onEdit, isHighlighted = false }) => {
  const statusColors = getStatusColor(chapter.status)
  
  return (
    <div className={cn(
      "group flex items-center justify-between py-2 px-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all duration-200",
      isHighlighted && "bg-yellow-50 dark:bg-yellow-900/30 animate-pulse"
    )}>
      <div className="flex items-center space-x-3">
        {/* Status Indicator */}
        <div
          className={cn(
            "w-3 h-3 rounded-full flex-shrink-0 cursor-help",
            statusColors.bg,
            statusColors.border,
            "border ring-offset-2 focus-visible:ring-2 focus-visible:ring-neutral-400"
          )}
          aria-label={`Chapter ${chapter.chapter_number} status: ${formatStatus(chapter.status)}`}
          tabIndex={0}
          role="button"
          title={`Chapter ${chapter.chapter_number} - ${formatStatus(chapter.status)} - ${formatProgress(chapter.progress)}`}
        />
        
        {/* Chapter Info */}
        <div className="flex-1">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            Chapter {chapter.chapter_number}
          </span>
          <span className="ml-2 text-sm text-neutral-600 dark:text-neutral-400">
            Verses 1-{chapter.total_verses}
          </span>
        </div>
      </div>
      
      {/* Progress Info and Actions */}
      <div className="flex items-center space-x-4 text-sm">
        <div
          className="text-neutral-600 dark:text-neutral-400 cursor-help"
          title={`${chapter.versesCovered > 0 
            ? `${formatProgress(chapter.progress)} of verses have been recorded`
            : 'No verses recorded yet'
          }`}
        >
          {chapter.versesCovered}/{chapter.total_verses} verses
        </div>
        
        <span 
          className={cn(
            "font-medium px-2 py-1 rounded-full text-xs",
            statusColors.bg,
            statusColors.text
          )}
          aria-label={`${formatProgress(chapter.progress)} complete`}
        >
          {formatProgress(chapter.progress)}
        </span>

        {/* Action Buttons */}
        <ActionButtons
          onUpload={() => onUpload(chapter.id)}
          onEdit={() => onEdit(chapter.id)}
          size="sm"
          variant="chapter"
        />
      </div>
    </div>
  )
}

const BookEntry: React.FC<BookEntryProps> = ({ book, isExpanded, onToggle }) => {
  const bookStatus = book.progress === 100 ? 'complete' : book.progress > 0 ? 'in_progress' : 'not_started'
  const statusColors = getStatusColor(bookStatus)
  
  return (
    <Card className="mb-3">
      {/* Book Header - Clickable */}
      <CardHeader 
        className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Expand/Collapse Icon */}
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6 p-0 transition-transform duration-200"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              aria-label={isExpanded ? `Collapse ${book.name}` : `Expand ${book.name}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform duration-200" />
              )}
            </Button>
            
            {/* Book Icon */}
            <BookIcon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
            
            {/* Book Title */}
            <CardTitle className="text-lg font-semibold">
              {book.name}
            </CardTitle>
          </div>
          
          {/* Progress Summary */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                {formatProgress(book.progress)}
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400">
                {book.completedChapters}/{book.totalChapters} chapters
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-24">
              <Progress 
                value={book.progress} 
                className="h-2"
                aria-label={`${book.name} progress: ${formatProgress(book.progress)}`}
              />
            </div>
            
            {/* Status Badge */}
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              statusColors.bg,
              statusColors.text
            )}>
              {formatStatus(bookStatus)}
            </span>
          </div>
        </div>
      </CardHeader>
      
      {/* Expandable Chapter List */}
      {isExpanded && (
        <CardContent className="pt-0">
          <div className="border-t border-neutral-200 dark:border-neutral-700 animate-in slide-in-from-top-2 duration-300">
            {/* Chapter List Header */}
            <div className="flex items-center justify-between py-3 px-4 bg-neutral-50 dark:bg-neutral-800 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              <span>Chapters ({book.chapters.length})</span>
              <span>Progress</span>
            </div>
            
            {/* Chapter Items */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {book.chapters.map((chapter, index) => (
                <div 
                  key={chapter.id}
                  className="animate-in fade-in slide-in-from-left-1 duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ChapterItem 
                    chapter={chapter} 
                    onUpload={() => {}} // Placeholder for actual upload handler
                    onEdit={() => {}} // Placeholder for actual edit handler
                  />
                </div>
              ))}
            </div>
            
            {/* Book Actions */}
            <div className="flex items-center justify-end space-x-2 p-4 bg-neutral-50 dark:bg-neutral-800 mt-2 rounded-b-lg animate-in fade-in duration-300" style={{ animationDelay: `${book.chapters.length * 50 + 100}ms` }}>
              <Button variant="outline" size="sm">
                Upload Audio
              </Button>
              <Button variant="outline" size="sm">
                Edit Details
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export const BibleBooksList: React.FC<BibleBooksListProps> = ({ 
  projectId, 
  className 
}) => {

  
  // All hooks must be called before any early returns
  const { data: bibleData, isLoading, error } = useBibleProjectDashboard(projectId)
  
  // Real-time subscription for live updates
  useBibleProjectDashboardRealtime(projectId)

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'complete'>('all')
  const [chapterStatusFilter, setChapterStatusFilter] = useState<'all' | 'not_started' | 'in_progress' | 'complete'>('all')
  const [expandedBooks, setExpandedBooks] = useState<Set<string>>(new Set())
  const [showLegend, setShowLegend] = useState(false)


  // Status legend data
  const statusLegend = [
    { status: 'complete', label: 'Complete', description: 'All verses recorded' },
    { status: 'in_progress', label: 'In Progress', description: 'Some verses recorded' },
    { status: 'not_started', label: 'Not Started', description: 'No verses recorded' }
  ] as const



  // Filter books by search and status - must be called before early returns
  const filteredBooks = useMemo(() => {
    if (!bibleData?.books) return []
    
    return bibleData.books.filter(book => {
      // Search filter
      const matchesSearch = !searchQuery || 
        book.name.toLowerCase().includes(searchQuery.toLowerCase())
      
      // Status filter - calculate book status from chapters
      const completedChapters = book.chapters.filter(ch => ch.status === 'complete').length
      const inProgressChapters = book.chapters.filter(ch => ch.status === 'in_progress').length
      const totalChapters = book.chapters.length
      
      let bookStatus: 'complete' | 'in_progress' | 'not_started' = 'not_started'
      if (completedChapters === totalChapters && totalChapters > 0) {
        bookStatus = 'complete'
      } else if (completedChapters > 0 || inProgressChapters > 0) {
        bookStatus = 'in_progress'
      }
      
      const matchesStatus = statusFilter === 'all' || bookStatus === statusFilter
      
      return matchesSearch && matchesStatus
    }).map(book => {
      // Filter chapters within each book if chapter filter is applied
      if (chapterStatusFilter === 'all') {
        return book
      }
      
      return {
        ...book,
        chapters: book.chapters.filter(chapter => chapter.status === chapterStatusFilter)
      }
    })
  }, [bibleData?.books, searchQuery, statusFilter, chapterStatusFilter])

  // Early returns after all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-600 dark:text-neutral-400">Loading Bible books...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600 dark:text-red-400">Error loading Bible books: {error.message}</div>
      </div>
    )
  }

  if (!bibleData?.books || bibleData.books.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-neutral-600 dark:text-neutral-400">No Bible books found for this project.</div>
      </div>
    )
  }

  const toggleBookExpansion = (bookId: string) => {
    setExpandedBooks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bookId)) {
        newSet.delete(bookId)
      } else {
        newSet.add(bookId)
      }
      return newSet
    })
  }

  const expandAll = () => {
    setExpandedBooks(new Set(bibleData.books.map(book => book.id)))
  }

  const collapseAll = () => {
    setExpandedBooks(new Set())
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header with Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
            Bible Books ({filteredBooks.length})
          </h2>
          
          <div className="flex items-center gap-2">
            {/* Legend Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLegend(!showLegend)}
              className="gap-2"
            >
              <Info className="h-4 w-4" />
              Legend
            </Button>
            
            {/* Expand/Collapse Controls */}
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expand All
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Collapse All
            </Button>
          </div>
        </div>

        {/* Status Legend */}
        {showLegend && (
          <Card className="bg-neutral-50 dark:bg-neutral-800">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-3">
                Status Legend
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {statusLegend.map(({ status, label, description }) => {
                  const colors = getStatusColor(status)
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-3 h-3 rounded-full border",
                          colors.bg,
                          colors.border
                        )}
                      />
                      <div>
                        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {label}
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          {description}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                placeholder="Search books..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Book Status Filter */}
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Books</option>
              <option value="complete">Complete</option>
              <option value="in_progress">In Progress</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
          
          {/* Chapter Status Filter */}
          <div className="w-full sm:w-48">
            <select
              value={chapterStatusFilter}
              onChange={(e) => setChapterStatusFilter(e.target.value as typeof chapterStatusFilter)}
              className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Chapters</option>
              <option value="complete">Complete</option>
              <option value="in_progress">In Progress</option>
              <option value="not_started">Not Started</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Books List */}
      {filteredBooks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              No Books Found
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Try adjusting your search or filter criteria.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-0">
          {filteredBooks.map((book) => (
            <BookEntry
              key={book.id}
              book={book}
              isExpanded={expandedBooks.has(book.id)}
              onToggle={() => toggleBookExpansion(book.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
} 