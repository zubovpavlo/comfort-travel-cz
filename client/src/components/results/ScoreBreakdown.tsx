interface Props {
  scores: {
    price: number;
    travel_time: number;
    comfort: number;
    rating: number;
  };
}

const items: { key: keyof Props['scores']; label: string; color: string }[] = [
  { key: 'price', label: 'Cena', color: 'bg-green-500' },
  { key: 'travel_time', label: 'Čas', color: 'bg-blue-500' },
  { key: 'comfort', label: 'Komfort', color: 'bg-purple-500' },
  { key: 'rating', label: 'Hodnocení', color: 'bg-yellow-500' },
];

export default function ScoreBreakdown({ scores }: Props) {
  return (
    <div className="space-y-1.5">
      {items.map(({ key, label, color }) => (
        <div key={key} className="flex items-center gap-2 text-xs">
          <span className="w-16 text-gray-500">{label}</span>
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className={`${color} h-2 rounded-full transition-all`}
              style={{ width: `${scores[key] * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-medium">{(scores[key] * 100).toFixed(0)}</span>
        </div>
      ))}
    </div>
  );
}
