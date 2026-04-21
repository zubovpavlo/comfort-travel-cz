import { useState } from 'react';
import { X, CreditCard, CheckCircle, Loader2 } from 'lucide-react';

interface PaymentModalProps {
  totalPrice: number;
  onConfirm: () => Promise<{ orderId: number; paymentRef: string }>;
  onSuccess: (orderId: number, paymentRef: string) => void;
  onClose: () => void;
}

function formatCardNumber(value: string): string {
  return value
    .replace(/\D/g, '')
    .slice(0, 16)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return digits;
}

export default function PaymentModal({ totalPrice, onConfirm, onSuccess, onClose }: PaymentModalProps) {
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ orderId: number; paymentRef: string } | null>(null);
  const [error, setError] = useState('');

  const isValid =
    cardName.trim().length >= 3 &&
    cardNumber.replace(/\s/g, '').length === 16 &&
    expiry.length === 5 &&
    cvv.length >= 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError('');

    // Simulate payment delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    try {
      const result = await onConfirm();
      setSuccess(result);
    } catch {
      setError('Platba se nezdařila. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <CheckCircle className="mx-auto text-green-500 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Objednávka potvrzena!</h2>
          <p className="text-gray-500 mb-1">Číslo objednávky: <strong>{success.orderId}</strong></p>
          <p className="text-gray-500 mb-6 text-sm">Referenční číslo platby: <code className="bg-gray-100 px-2 py-0.5 rounded">{success.paymentRef}</code></p>
          <button
            onClick={() => onSuccess(success.orderId, success.paymentRef)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            Přejít na moje objednávky
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <CreditCard className="text-blue-600" size={24} />
            <h2 className="text-lg font-bold text-gray-900">Platba kartou</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Amount */}
        <div className="px-6 py-4 bg-blue-50 flex items-center justify-between">
          <span className="text-gray-600">Celková částka</span>
          <span className="text-2xl font-bold text-blue-700">{totalPrice.toLocaleString('cs-CZ')} Kč</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Jméno na kartě</label>
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Jan Novák"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Číslo karty</label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              placeholder="1234 5678 9012 3456"
              maxLength={19}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platnost (MM/RR)</label>
              <input
                type="text"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="12/27"
                maxLength={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CVV</label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="123"
                maxLength={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <p className="text-xs text-gray-400 text-center">
            Toto je simulace platby. Žádné skutečné transakce neprobíhají.
          </p>

          <button
            type="submit"
            disabled={!isValid || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Zpracovávám platbu…
              </>
            ) : (
              `Zaplatit ${totalPrice.toLocaleString('cs-CZ')} Kč`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
