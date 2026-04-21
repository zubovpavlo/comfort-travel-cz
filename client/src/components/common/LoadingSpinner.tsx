import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Načítání...' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <p className="mt-3 text-gray-500">{text}</p>
    </div>
  );
}
