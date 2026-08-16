'use client';

/**
 * Results Page
 * Shows diagnosis results and price comparison
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DiagnosisCard } from '@/components/DiagnosisCard';
import { PriceComparison } from '@/components/PriceComparison';
import { useApi } from '@/contexts/ApiContext';

interface DiagnoseResult {
  diagnosis: any;
  parts: string[];
  avg_price: number;
  part_type: string;
}

interface PriceItem {
  retailer: string;
  logo: string;
  price: number;
  rating: number;
  delivery: string;
  link: string;
}

export default function ResultPage() {
  const router = useRouter();
  const { getPrices, loading: apiLoading } = useApi();

  const [result, setResult] = useState<DiagnoseResult | null>(null);
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const diagnoseResult = sessionStorage.getItem('diagnoseResult');

    if (!diagnoseResult) {
      router.push('/');
      return;
    }

    const parsedResult: DiagnoseResult = JSON.parse(diagnoseResult);
    setResult(parsedResult);

    const fetchPrices = async () => {
      try {
        const fetchedPrices = await getPrices(parsedResult.part_type, parsedResult.avg_price);
        setPrices(fetchedPrices);
      } catch (err) {
        setError('Failed to fetch prices');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (loading || !result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-gray-700 font-semibold">Finding best prices...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push('/')}
              className="text-2xl hover:scale-110 transition-transform"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-gray-800">Results</h1>
          </div>
          <button
            onClick={() => {
              sessionStorage.removeItem('diagnoseResult');
              router.push('/');
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Analyze Another Part
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🎯 Diagnosis Results</h1>
          <p className="text-gray-600">
            Detected part:{' '}
            <span className="font-semibold text-indigo-600">
              {result.diagnosis.detected_object || result.part_type}
            </span>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
            <p>{error}</p>
          </div>
        )}

        <DiagnosisCard diagnosis={result.diagnosis} />

        <PriceComparison prices={prices} loading={apiLoading || prices.length === 0} />

        <div className="bg-white rounded-lg p-6 shadow-md mb-6">
          <h3 className="font-bold text-lg mb-4">💡 Tips & Recommendations</h3>
          <div className="space-y-3">
            <div className="flex space-x-3">
              <div className="text-2xl">🔍</div>
              <div>
                <p className="font-semibold text-gray-800">Get Professional Opinion</p>
                <p className="text-sm text-gray-600">
                  Always consult a certified mechanic for accurate diagnosis
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="text-2xl">📋</div>
              <div>
                <p className="font-semibold text-gray-800">Compare Shipping</p>
                <p className="text-sm text-gray-600">
                  Factor in delivery time and cost along with product price
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <div className="text-2xl">⭐</div>
              <div>
                <p className="font-semibold text-gray-800">Check Reviews</p>
                <p className="text-sm text-gray-600">
                  Read seller reviews before making a purchase decision
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => {
              sessionStorage.removeItem('diagnoseResult');
              router.push('/');
            }}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-all"
          >
            ← Back to Home
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 transition-all"
          >
            🖨️ Print Results
          </button>
        </div>
      </div>
    </main>
  );
}
