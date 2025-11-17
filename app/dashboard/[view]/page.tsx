// Force dynamic rendering - no static optimization or caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function DashboardViewPage() {
  // AppLayout handles all dashboard sub-page rendering based on the URL
  // This route exists solely to make Next.js recognize /dashboard/* URLs
  // params is not used since AppLayout reads from usePathname()
  return null
}
