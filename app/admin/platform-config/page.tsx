import { Metadata } from 'next'
import PlatformConfigDashboard from '@/components/admin/PlatformConfigDashboard'

export const metadata: Metadata = {
  title: 'Platform Configuration - Admin | MzansiGig',
  description: 'Manage platform-wide configuration settings',
}

export default function PlatformConfigPage() {
  return <PlatformConfigDashboard />
}
