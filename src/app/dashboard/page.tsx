import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to overview page as the default dashboard view
  redirect('/dashboard/overview');
}