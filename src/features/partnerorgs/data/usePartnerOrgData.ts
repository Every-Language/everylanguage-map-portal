import React from 'react'

export type PartnerOrgProject = {
  id: string
  language: string
  project: string
  version: string
  chaptersDone: number
  chaptersTotal: number
  fundingTotal: number
  fundingFunded: number
  stage: 'Translation' | 'Distribution' | 'Multiplication'
}

export type BudgetItem = { item: string; amount: number }

export type UpdatePost = {
  id: string
  when: string
  title: string
  body: string
  mediaUrl?: string
  mediaUrls?: string[]
  kind?: 'milestone' | 'report'
  language?: string
  project?: string
}

export type DistributionPoint = { lon: number; lat: number; intensity?: number; kind?: 'distribution' | 'church'; count?: number; village?: string; startedAt?: string }

export interface PartnerOrgMockData {
  projects: PartnerOrgProject[]
  updates: UpdatePost[]
  distributionPoints: DistributionPoint[]
  budgetByProject: Record<string, BudgetItem[]>
  summary: {
    biblesDistributed: number
    listeningHours: number
    churchesPlanted: number
  }
}

function buildMock(): PartnerOrgMockData {
  const projects: PartnerOrgProject[] = [
    { id: 'p1', language: 'Bachama', project: 'Bachama NT Recording', version: 'Audio v1', chaptersDone: 1189, chaptersTotal: 1189, fundingTotal: 3000, fundingFunded: 3000, stage: 'Distribution' },
    { id: 'p2', language: 'Bileh', project: 'Bileh Gospel Project', version: 'Audio v1', chaptersDone: 842, chaptersTotal: 1189, fundingTotal: 3000, fundingFunded: 3000, stage: 'Translation' },
    { id: 'p3', language: 'Wakka', project: 'Wakka OT Selections', version: 'Audio v2', chaptersDone: 320, chaptersTotal: 1189, fundingTotal: 3000, fundingFunded: 1100, stage: 'Translation' },
    { id: 'p4', language: 'Balli', project: 'Balli NT Pilot', version: 'Audio v0.9', chaptersDone: 76, chaptersTotal: 1189, fundingTotal: 3000, fundingFunded: 0, stage: 'Translation' },
  ]

  const updates: UpdatePost[] = [
    {
      id: 'u1',
      when: '2d ago',
      title: 'Book of John finished',
      body: 'We finished recording and quality checks for the Gospel of John in Bachama. Thank you for faithfully funding this work—your generosity helped us complete this milestone. We are packaging the files for release and will begin sharing with local churches next week.',
      kind: 'milestone',
      language: 'Bachama',
      project: 'Bachama NT Recording',
      mediaUrls: [
        '/assets/mock_images/075faf0c-2d8a-46c1-8c63-7969e157cdce.JPG',
        '/assets/mock_images/9795db26-57eb-4578-b05b-9aabb1da3ad3.JPG',
      ],
    },
    {
      id: 'u2',
      when: '5d ago',
      title: 'Community celebration',
      body: 'We gathered with our community to celebrate hearing God’s Word in Bachama. It was a joyful time of singing, prayer, and testimonies. Thank you for making moments like this possible through your support.',
      kind: 'report',
      language: 'Bachama',
      project: 'Bachama NT Recording',
      mediaUrls: ['/assets/mock_images/987af1a4-58aa-4e4e-b550-a184eb29a74b.JPG'],
    },
    {
      id: 'u3',
      when: '1d ago',
      title: 'Equipment upgrade',
      body: 'Our new microphones arrived, and the difference is already noticeable in our test sessions. Because of your giving, we can capture clearer audio and reduce retakes. Thank you for investing in quality that serves listeners for years to come.',
      kind: 'report',
      language: 'Bileh',
      project: 'Bileh Gospel Project',
    },
    {
      id: 'u4',
      when: '8h ago',
      title: 'Volunteer training',
      body: 'This morning we completed training for new volunteer readers in Wakka. We practiced pronunciation, pacing, and storytelling. Your partnership helps us equip local voices to share Scripture with excellence—thank you!',
      kind: 'report',
      language: 'Wakka',
      project: 'Wakka OT Selections',
      mediaUrls: [
        '/assets/mock_images/31a2449e-a15f-42d2-8421-c7a7b535912f.JPG',
        '/assets/mock_images/98b29740-467d-4d73-b914-c1f98a77e1eb.JPG',
      ],
    },
    {
      id: 'u5',
      when: '3d ago',
      title: 'Kickoff meeting',
      body: 'We officially kicked off the Balli NT Pilot with local leaders and translators. Together we set a weekly rhythm and prayed for unity and perseverance. Thank you for believing in this project from the very beginning.',
      kind: 'report',
      language: 'Balli',
      project: 'Balli NT Pilot',
      mediaUrls: ['/assets/mock_images/f8e37e80-1cc3-4190-a82e-b702a35ead61.JPG'],
    },
  ]

  const distributionPoints: DistributionPoint[] = [
    // Heatmap points (intensity + approximate counts)
    { lon: 6.54, lat: 9.24, intensity: 1.0, kind: 'distribution', count: 120 },
    { lon: 7.10, lat: 9.60, intensity: 0.8, kind: 'distribution', count: 95 },
    { lon: 5.40, lat: 8.95, intensity: 0.6, kind: 'distribution', count: 70 },
    { lon: 4.90, lat: 9.35, intensity: 0.5, kind: 'distribution', count: 55 },
    { lon: 8.10, lat: 9.00, intensity: 0.7, kind: 'distribution', count: 80 },
    // Churches planted (pins with metadata)
    { lon: 6.92, lat: 9.35, kind: 'church', village: 'Gwani Village', startedAt: '2025-06-12' },
    { lon: 6.70, lat: 9.45, kind: 'church', village: 'Doma', startedAt: '2025-08-01' },
  ]

  // Keep "budget used" below total funding (e.g., under 3k)
  const budgetTemplate = (base: number): BudgetItem[] => ([
    { item: 'Translator food', amount: Math.round(base * 0.22) },
    { item: 'Translator housing', amount: Math.round(base * 0.24) },
    { item: 'Transport', amount: Math.round(base * 0.18) },
    { item: 'Equipment', amount: Math.round(base * 0.16) },
    { item: 'Distribution', amount: Math.round(base * 0.12) },
  ])

  const budgetByProject: Record<string, BudgetItem[]> = {
    p1: budgetTemplate(2200),
    p2: budgetTemplate(2000),
    p3: budgetTemplate(1700),
    p4: budgetTemplate(800),
  }

  const summary = { biblesDistributed: 1200, listeningHours: 340, churchesPlanted: 2 }
  return { projects, updates, distributionPoints, budgetByProject, summary }
}

export function usePartnerOrgData(): PartnerOrgMockData {
  // Centralized mock data; easy to swap for real data later
  return React.useMemo(() => buildMock(), [])
}


