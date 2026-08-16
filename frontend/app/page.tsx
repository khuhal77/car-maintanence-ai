'use client';

/**
 * Home Page
 * Image upload interface
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImageUpload } from '@/components/ImageUpload';
import { useApi } from '@/contexts/ApiContext';

export default function Home() {
  const router = useRouter();
  const { diagnose, loading, error } = useApi();
  const [localLoading, setLocalLoading] = useState(false);

  const handleImageSelect = async (base64: string) => {
    setLocalLoading(true);
    try {
      const result = await diagnose(base64);
      sessionStorage.setItem('diagnoseResult', JSON.stringify(result));
      router.push('/result');
    } catch (err) {
      alert('Failed to diagnose. Please try again.');
      console.error(err);
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">🔧</div>
            <h1 className="text-2xl font-bold text-gray-800">Car Maintenance AI</h1>
          </div>
          <div className="text-sm text-gray-600">
            Smart diagnosis • Best prices • Peace of mind
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            🚗 What&apos;s Wrong With Your Car?
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Upload a photo of the car part and our AI will diagnose the issue
          </p>
          <p className="text-gray-600">Plus find the best prices from multiple retailers</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <ImageUpload onImageSelect={handleImageSelect} loading={localLoading || loading} />

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded-lg text-red-700">
              <p className="font-semibold">Error:</p>
              <p>{error}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="font-bold text-lg mb-2">AI Diagnosis</h3>
            <p className="text-gray-600 text-sm">
              Advanced computer vision detects car part issues instantly
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">💰</div>
            <h3 className="font-bold text-lg mb-2">Price Comparison</h3>
            <p className="text-gray-600 text-sm">
              Compare prices across 4+ retailers and save money
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-md">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="font-bold text-lg mb-2">Instant Results</h3>
            <p className="text-gray-600 text-sm">
              Get diagnosis and prices in seconds, not hours
            </p>
          </div>
        </div>

        <div className="bg-indigo-50 rounded-lg p-8 border-2 border-indigo-200">
          <h3 className="font-bold text-lg mb-4 text-gray-800">Try These Car Parts:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { emoji: '🔋', name: 'Battery' },
              { emoji: '🛑', name: 'Brake Pads' },
              { emoji: '✨', name: 'Spark Plugs' },
              { emoji: '💨', name: 'Air Filter' },
              { emoji: '🛢️', name: 'Oil Filter' },
              { emoji: '🛞', name: 'Tire' },
              { emoji: '🧹', name: 'Wiper Blade' },
              { emoji: '❄️', name: 'Coolant' },
            ].map((part) => (
              <div
                key={part.name}
                className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-all cursor-pointer"
              >
                <div className="text-3xl mb-2">{part.emoji}</div>
                <p className="font-medium text-sm text-gray-700">{part.name}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>© 2026 Car Maintenance AI | Powered by YOLOv8 & TensorFlow</p>
        </div>
      </div>
    </main>
  );
}
