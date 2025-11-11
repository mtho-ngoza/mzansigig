// Force dynamic rendering - no static optimization or caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DashboardViewPageProps {
  params: {
    view: string
  }
}

export default function DashboardViewPage({ params }: DashboardViewPageProps) {
  // AppLayout handles all dashboard sub-page rendering based on the URL
  // This route exists solely to make Next.js recognize /dashboard/* URLs
  return null
}
