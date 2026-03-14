import React, { useState } from 'react';
import { UserProfile } from '../types';
import { ShoppingCart, CheckCircle2, Circle } from 'lucide-react';
import { foodDb } from '../data/foodDb';

interface Props {
  profile: UserProfile;
}

export default function GroceryList({ profile }: Props) {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Mock grocery list
  const groceryItems = [
    { id: 'f2', amount: '1.5 kg' },
    { id: 'f5', amount: '2 vỉ (20 quả)' },
    { id: 'f3', amount: '3 bó' },
    { id: 'f6', amount: '2 lốc (8 hộp)' },
    { id: 'f9', amount: '2 kg' },
    { id: 'f8', amount: '4 hộp' }
  ];

  const toggleItem = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const categories = {
    protein: 'Thịt, Cá, Trứng, Đậu',
    carb: 'Tinh bột',
    veg: 'Rau củ',
    snack: 'Đồ ăn vặt, Sữa'
  };

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      <div className="bg-zinc-900 p-6 rounded-b-3xl shadow-sm mb-6">
        <h1 className="text-2xl font-serif font-medium text-white flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-pink-500" />
          Đi chợ tuần này
        </h1>
        <p className="text-zinc-400 text-sm mt-2">Đã tính toán dựa trên ngân sách "{profile.budget === 'low' ? 'Tiết kiệm' : profile.budget === 'medium' ? 'Vừa phải' : 'Thoải mái'}" của bạn.</p>
      </div>

      <div className="p-6 space-y-6">
        {Object.entries(categories).map(([catKey, catName]) => {
          const itemsInCat = groceryItems.filter(gi => {
            const food = foodDb.find(f => f.id === gi.id);
            return food?.category === catKey;
          });

          if (itemsInCat.length === 0) return null;

          return (
            <div key={catKey} className="bg-zinc-900 p-5 rounded-2xl shadow-sm border border-zinc-800">
              <h2 className="font-medium text-white mb-4 pb-2 border-b border-zinc-800">{catName}</h2>
              <div className="space-y-3">
                {itemsInCat.map(item => {
                  const food = foodDb.find(f => f.id === item.id);
                  const isChecked = checkedItems[item.id];
                  return (
                    <button 
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      className="w-full flex items-center justify-between p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-pink-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-zinc-600" />
                        )}
                        <span className={`text-sm font-medium ${isChecked ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                          {food?.name}
                        </span>
                      </div>
                      <span className={`text-sm ${isChecked ? 'text-zinc-500' : 'text-zinc-400'}`}>
                        {item.amount}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
