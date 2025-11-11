// Force dynamic rendering - no static optimization or caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface DashboardViewPageProps {
  params: Promise<{
    view: string
  }>
}

export default function DashboardViewPage({ params }: DashboardViewPageProps) {
  // AppLayout handles all dashboard sub-page rendering based on the URL
  // This route exists solely to make Next.js recognize /dashboard/* URLs
  // params is not used since AppLayout reads from usePathname()
  return null
}
