import React, { useState } from 'react';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { calculateMacros } from '../utils/calculations';

interface Props {
  onComplete: (profile: UserProfile) => void;
  initialData?: UserProfile;
}

export default function Onboarding({ onComplete, initialData }: Props) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<UserProfile>>(initialData || {
    goal: 'fat_loss',
    workouts_per_week: 0,
    eat_out_often: false,
    lifestyle: 'busy',
    budget: 'medium',
    track_cycle: false,
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.age || !formData.height || !formData.weight) {
        alert('Vui lòng điền đủ thông tin cơ bản nha!');
        return;
      }
      setStep(2);
    } else {
      calculateAndComplete();
    }
  };

  const calculateAndComplete = () => {
    const { age, height, weight, workouts_per_week, goal } = formData as UserProfile;
    
    const { tdee, target_macros } = calculateMacros(
      age, 
      height, 
      weight, 
      workouts_per_week, 
      goal
    );

    const finalProfile: UserProfile = {
      ...formData as UserProfile,
      tdee,
      target_macros,
      current_mode: 'standard',
      role: 'user'
    };

    onComplete(finalProfile);
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 flex flex-col max-w-md mx-auto">
      <div className="mb-8 mt-4">
        <h1 className="text-2xl font-serif font-medium text-white">
          {step === 1 ? 'Chào bạn, cùng thiết lập mục tiêu nhé!' : 'Một chút thông tin thêm (Không bắt buộc)'}
        </h1>
        <div className="flex gap-2 mt-4">
          <div className="h-1.5 flex-1 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(255,0,127,0.5)]"></div>
          <div className={`h-1.5 flex-1 rounded-full ${step === 2 ? 'bg-pink-500 shadow-[0_0_8px_rgba(255,0,127,0.5)]' : 'bg-zinc-800'}`}></div>
        </div>
      </div>

      <motion.div 
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 space-y-6"
      >
        {step === 1 ? (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Tuổi</label>
                <input type="number" value={formData.age || ''} className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-pink-500" 
                  onChange={e => setFormData({...formData, age: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Cao (cm)</label>
                <input type="number" value={formData.height || ''} className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-pink-500"
                  onChange={e => setFormData({...formData, height: Number(e.target.value)})} />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Nặng (kg)</label>
                <input type="number" value={formData.weight || ''} className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-pink-500"
                  onChange={e => setFormData({...formData, weight: Number(e.target.value)})} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Mục tiêu của bạn</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'fat_loss', label: 'Giảm mỡ' },
                  { id: 'tone', label: 'Săn chắc' },
                  { id: 'muscle_gain', label: 'Tăng cơ' }
                ].map(g => (
                  <button key={g.id} 
                    onClick={() => setFormData({...formData, goal: g.id as any})}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${formData.goal === g.id ? 'bg-pink-500/20 text-pink-400 border-2 border-pink-500' : 'bg-zinc-900 border-2 border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Số buổi tập/tuần</label>
              <input type="range" min="0" max="7" value={formData.workouts_per_week || 0} 
                onChange={e => setFormData({...formData, workouts_per_week: Number(e.target.value)})}
                className="w-full accent-pink-500" />
              <div className="text-center mt-2 font-medium text-zinc-300">{formData.workouts_per_week} buổi</div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-zinc-400">Thói quen ăn uống</label>
              <button onClick={() => setFormData({...formData, eat_out_often: !formData.eat_out_often})}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors">
                <span className="text-zinc-300">Tôi hay ăn ngoài</span>
                {formData.eat_out_often && <CheckCircle2 className="text-pink-500 w-5 h-5" />}
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setFormData({...formData, lifestyle: 'busy'})}
                  className={`p-4 rounded-xl border text-sm font-medium transition-colors ${formData.lifestyle === 'busy' ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>
                  Tôi rất bận
                </button>
                <button onClick={() => setFormData({...formData, lifestyle: 'can_cook'})}
                  className={`p-4 rounded-xl border text-sm font-medium transition-colors ${formData.lifestyle === 'can_cook' ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}>
                  Tôi nấu được
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Món bạn không thích / dị ứng (cách nhau bằng dấu phẩy)</label>
              <input type="text" value={formData.disliked_foods?.join(', ') || ''} placeholder="VD: Hành, hải sản..." className="w-full p-4 rounded-xl border border-zinc-800 bg-zinc-900 text-white focus:outline-none focus:border-pink-500"
                onChange={e => setFormData({...formData, disliked_foods: e.target.value.split(',').map(s => s.trim())})} />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Ngân sách đi chợ</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'low', label: 'Tiết kiệm' },
                  { id: 'medium', label: 'Vừa phải' },
                  { id: 'high', label: 'Thoải mái' }
                ].map(b => (
                  <button key={b.id} 
                    onClick={() => setFormData({...formData, budget: b.id as any})}
                    className={`p-3 rounded-xl text-sm font-medium transition-colors ${formData.budget === b.id ? 'bg-pink-500/20 text-pink-400 border-2 border-pink-500' : 'bg-zinc-900 border-2 border-transparent text-zinc-400 hover:bg-zinc-800'}`}>
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button onClick={() => setFormData({...formData, track_cycle: !formData.track_cycle})}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-colors">
                <span className="text-zinc-300">Theo dõi chu kỳ kinh nguyệt</span>
                {formData.track_cycle && <CheckCircle2 className="text-pink-500 w-5 h-5" />}
              </button>
              <p className="text-xs text-zinc-500 mt-2 px-1">Giúp app gợi ý món ăn giảm mệt mỏi trong những ngày "dâu".</p>
            </div>
          </>
        )}
      </motion.div>

      <div className="mt-8 pb-6">
        <button 
          onClick={handleNext}
          className="w-full bg-pink-600 text-white p-4 rounded-2xl font-medium flex items-center justify-center gap-2 hover:bg-pink-700 transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]"
        >
          {step === 1 ? 'Tiếp tục' : 'Hoàn thành'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
