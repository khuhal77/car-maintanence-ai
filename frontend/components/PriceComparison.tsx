'use client';

/**
 * Price Comparison Component
 * Shows prices from different retailers
 */

import React from 'react';

interface PriceItem {
  retailer: string;
  logo: string;
  price: number;
  rating: number;
  delivery: string;
  link: string;
}

interface PriceComparisonProps {
  prices: PriceItem[];
  loading?: boolean;
}

export const PriceComparison: React.FC<PriceComparisonProps> = ({ prices, loading = false }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md text-center">
        <div className="animate-spin text-3xl">⚙️</div>
        <p className="text-gray-600 mt-2">Searching for best prices...</p>
      </div>
    );
  }

  if (!prices || prices.length === 0) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md text-center">
        <p className="text-gray-600">No prices available</p>
      </div>
    );
  }

  const minPrice = Math.min(...prices.map((p) => p.price));
  const maxPrice = Math.max(...prices.map((p) => p.price));
  const savings = maxPrice - minPrice;

  return (
    <div className="bg-white rounded-lg p-6 shadow-md mb-6">
      <div className="mb-6">
        <h3 className="text-2xl font-bold mb-2">💰 Best Prices Available</h3>
        <p className="text-sm text-gray-600">
          Save up to <span className="font-bold text-green-600">₹{savings}</span> by choosing
          the best retailer
        </p>
      </div>

      <div className="space-y-3">
        {prices.map((price, idx) => (
          <div
            key={idx}
            className={`
              border rounded-lg p-4 transition-all hover:shadow-md
              ${idx === 0 ? 'border-green-400 bg-green-50 ring-1 ring-green-200' : 'border-gray-200'}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="text-2xl">{price.logo}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-gray-800">{price.retailer}</h4>
                    {idx === 0 && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                        BEST PRICE
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    <span>⭐ {price.rating}</span>
                    <span className="mx-2">•</span>
                    <span>📦 {price.delivery}</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">₹{price.price}</div>
                <a
                  href={price.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`
                    inline-block mt-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                    ${
                      idx === 0
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }
                  `}
                >
                  View on {price.retailer} →
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-gray-600 text-sm">Lowest Price</p>
            <p className="text-2xl font-bold text-green-600">₹{minPrice}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Highest Price</p>
            <p className="text-2xl font-bold text-red-600">₹{maxPrice}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">You Save</p>
            <p className="text-2xl font-bold text-blue-600">₹{savings}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
