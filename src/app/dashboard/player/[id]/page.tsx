'use client';

import { use } from 'react';
import { PlayerDetailCard } from '@/components/PlayerCard';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface PlayerPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PlayerPage({ params }: PlayerPageProps) {
  const { id } = use(params);
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation Header */}
      <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="h-6 w-px bg-gray-600" />
          <h1 className="text-lg font-semibold text-white">Player Profile</h1>
        </div>
      </div>

      {/* Player Card Content */}
      <div className="p-6">
        <PlayerDetailCard lordId={id} />
      </div>
    </div>
  );
}