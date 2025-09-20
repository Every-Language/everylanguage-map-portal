import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card'
import { AnimatedProgress } from '../components/AnimatedProgress'
import { CountUp } from '../components/CountUp'
import { SelectItem } from '@/shared/components/ui/Select'
import { TitleSelect } from '@/shared/components/ui/TitleSelect'
import { usePartnerOrgData } from '../data/usePartnerOrgData'

type BookRow = { id: string; name: string; chaptersTotal: number; chaptersDone: number }

// 66-book list with chapter counts (abbrev set); totals sum to 1189
const SAMPLE_BOOKS: Array<{ id: string; name: string; chapters: number }> = [
  { id: 'gen', name: 'Genesis', chapters: 50 }, { id: 'exod', name: 'Exodus', chapters: 40 }, { id: 'lev', name: 'Leviticus', chapters: 27 }, { id: 'num', name: 'Numbers', chapters: 36 }, { id: 'deut', name: 'Deuteronomy', chapters: 34 }, { id: 'josh', name: 'Joshua', chapters: 24 }, { id: 'judg', name: 'Judges', chapters: 21 }, { id: 'ruth', name: 'Ruth', chapters: 4 }, { id: '1sam', name: '1 Samuel', chapters: 31 }, { id: '2sam', name: '2 Samuel', chapters: 24 }, { id: '1kgs', name: '1 Kings', chapters: 22 }, { id: '2kgs', name: '2 Kings', chapters: 25 }, { id: '1chr', name: '1 Chronicles', chapters: 29 }, { id: '2chr', name: '2 Chronicles', chapters: 36 }, { id: 'ezra', name: 'Ezra', chapters: 10 }, { id: 'neh', name: 'Nehemiah', chapters: 13 }, { id: 'esth', name: 'Esther', chapters: 10 }, { id: 'job', name: 'Job', chapters: 42 }, { id: 'ps', name: 'Psalms', chapters: 150 }, { id: 'prov', name: 'Proverbs', chapters: 31 }, { id: 'eccl', name: 'Ecclesiastes', chapters: 12 }, { id: 'song', name: 'Song of Songs', chapters: 8 }, { id: 'isa', name: 'Isaiah', chapters: 66 }, { id: 'jer', name: 'Jeremiah', chapters: 52 }, { id: 'lam', name: 'Lamentations', chapters: 5 }, { id: 'ezek', name: 'Ezekiel', chapters: 48 }, { id: 'dan', name: 'Daniel', chapters: 12 }, { id: 'hos', name: 'Hosea', chapters: 14 }, { id: 'joel', name: 'Joel', chapters: 3 }, { id: 'amos', name: 'Amos', chapters: 9 }, { id: 'obad', name: 'Obadiah', chapters: 1 }, { id: 'jonah', name: 'Jonah', chapters: 4 }, { id: 'mic', name: 'Micah', chapters: 7 }, { id: 'nah', name: 'Nahum', chapters: 3 }, { id: 'hab', name: 'Habakkuk', chapters: 3 }, { id: 'zeph', name: 'Zephaniah', chapters: 3 }, { id: 'hag', name: 'Haggai', chapters: 2 }, { id: 'zech', name: 'Zechariah', chapters: 14 }, { id: 'mal', name: 'Malachi', chapters: 4 }, { id: 'matt', name: 'Matthew', chapters: 28 }, { id: 'mark', name: 'Mark', chapters: 16 }, { id: 'luke', name: 'Luke', chapters: 24 }, { id: 'john', name: 'John', chapters: 21 }, { id: 'acts', name: 'Acts', chapters: 28 }, { id: 'rom', name: 'Romans', chapters: 16 }, { id: '1cor', name: '1 Corinthians', chapters: 16 }, { id: '2cor', name: '2 Corinthians', chapters: 13 }, { id: 'gal', name: 'Galatians', chapters: 6 }, { id: 'eph', name: 'Ephesians', chapters: 6 }, { id: 'phil', name: 'Philippians', chapters: 4 }, { id: 'col', name: 'Colossians', chapters: 4 }, { id: '1thess', name: '1 Thessalonians', chapters: 5 }, { id: '2thess', name: '2 Thessalonians', chapters: 3 }, { id: '1tim', name: '1 Timothy', chapters: 6 }, { id: '2tim', name: '2 Timothy', chapters: 4 }, { id: 'titus', name: 'Titus', chapters: 3 }, { id: 'phlm', name: 'Philemon', chapters: 1 }, { id: 'heb', name: 'Hebrews', chapters: 13 }, { id: 'jas', name: 'James', chapters: 5 }, { id: '1pet', name: '1 Peter', chapters: 5 }, { id: '2pet', name: '2 Peter', chapters: 3 }, { id: '1john', name: '1 John', chapters: 5 }, { id: '2john', name: '2 John', chapters: 1 }, { id: '3john', name: '3 John', chapters: 1 }, { id: 'jude', name: 'Jude', chapters: 1 }, { id: 'rev', name: 'Revelation', chapters: 22 },
]

export const PartnerOrgTranslationPage: React.FC = () => {
  const data = usePartnerOrgData()

  const [projectId, setProjectId] = React.useState<string>(data.projects[0]?.id ?? '')
  React.useEffect(() => {
    if (!data.projects.find(p => p.id === projectId)) {
      setProjectId(data.projects[0]?.id ?? '')
    }
  }, [data.projects, projectId])

  const project = React.useMemo(() => data.projects.find(p => p.id === projectId), [data.projects, projectId])

  const books: BookRow[] = React.useMemo(() => {
    // Mock: spread project chapter progress across sample books
    const done = project?.chaptersDone ?? 0
    const total = project?.chaptersTotal ?? 1
    return SAMPLE_BOOKS.map((b, idx) => {
      const share = Math.round((done / total) * b.chapters * (0.6 + (idx % 4) * 0.1))
      const bounded = Math.max(0, Math.min(share, b.chapters))
      return { id: b.id, name: b.name, chaptersTotal: b.chapters, chaptersDone: bounded }
    })
  }, [project?.chaptersDone, project?.chaptersTotal])

  const booksDone = books.filter(b => b.chaptersDone >= b.chaptersTotal).length
  const booksTotal = books.length
  const chaptersDone = books.reduce((a, b) => a + b.chaptersDone, 0)
  const chaptersTotal = books.reduce((a, b) => a + b.chaptersTotal, 0)

  return (
    <div className="space-y-6">
      {/* Project selector as title */}
      <TitleSelect
        value={projectId}
        onValueChange={setProjectId}
        placeholder="Select project"
        className="inline-flex"
      >
        {data.projects.map(p => (
          <SelectItem key={p.id} value={p.id}>{`${p.language} • ${p.project} • ${p.version}`}</SelectItem>
        ))}
      </TitleSelect>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-sm text-neutral-500">Books Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight"><CountUp value={booksDone} />/{booksTotal}</div>
            <div className="mt-3"><AnimatedProgress value={booksDone} max={booksTotal} color="accent" /></div>
          </CardContent>
        </Card>
        <Card className="border border-neutral-200 dark:border-neutral-800">
          <CardHeader>
            <CardTitle className="text-sm text-neutral-500">Chapters Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight"><CountUp value={chaptersDone} />/{chaptersTotal}</div>
            <div className="mt-3"><AnimatedProgress value={chaptersDone} max={chaptersTotal} color="accent" /></div>
          </CardContent>
        </Card>
      </div>

      {/* Books table */}
      <Card className="border border-neutral-200 dark:border-neutral-800">
        <CardHeader>
          <CardTitle>Books</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-2 px-2 sm:px-0">Book</th>
                  <th className="py-2 px-2 sm:px-0">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {books.map((b) => {
                  const percent = Math.round((b.chaptersDone / b.chaptersTotal) * 100)
                  return (
                    <tr key={b.id}>
                      <td className="py-3 pr-3 whitespace-nowrap">{b.name}</td>
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-56 sm:w-80"><AnimatedProgress value={b.chaptersDone} max={b.chaptersTotal} color="accent" /></div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 whitespace-nowrap">{b.chaptersDone}/{b.chaptersTotal} ({percent}%)</div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PartnerOrgTranslationPage


