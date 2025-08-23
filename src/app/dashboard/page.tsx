import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to alliance dashboard as the default dashboard view
  redirect('/dashboard/alliance');
}