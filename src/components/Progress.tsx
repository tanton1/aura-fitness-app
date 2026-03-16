import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Calendar, Scale, Percent, Ruler, Accessibility, User, PlusCircle, X, Settings, LogOut, Camera, Trash2 } from 'lucide-react';
import { UserProfile, ProgressRecord } from '../types';
import { calculateMacros } from '../utils/calculations';
import { auth } from '../lib/firebase';
import { compressImage } from '../utils/imageCompression';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  profile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onResetProfile: () => void;
}

export default function Progress({ profile, onUpdateProfile, onResetProfile }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    weight: profile.weight?.toString() || '',
    body_fat: '',
    arm: '',
    waist: '',
    hip: '',
    butt: '',
    thigh: '',
    photos: [] as string[]
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsUploading(true);
      try {
        const newPhotos = [...formData.photos];
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          const base64 = await compressImage(file, 800, 0.7);
          newPhotos.push(base64);
        }
        setFormData({ ...formData, photos: newPhotos });
      } catch (error) {
        console.error('Error compressing image:', error);
        alert('Có lỗi xảy ra khi xử lý ảnh.');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...formData.photos];
    newPhotos.splice(index, 1);
    setFormData({ ...formData, photos: newPhotos });
  };

  const handleSave = () => {
    const newWeight = Number(formData.weight);
    if (!newWeight) return;

    // Recalculate TDEE and macros
    const { tdee, target_macros } = calculateMacros(
      profile.age, 
      profile.height, 
      newWeight, 
      profile.workouts_per_week, 
      profile.goal
    );

    const newRecord: ProgressRecord = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      weight: newWeight,
      photos: formData.photos,
      body_fat: formData.body_fat ? Number(formData.body_fat) : 0,
      arm: formData.arm ? Number(formData.arm) : 0,
      waist: formData.waist ? Number(formData.waist) : 0,
      hip: formData.hip ? Number(formData.hip) : 0,
      butt: formData.butt ? Number(formData.butt) : 0,
      thigh: formData.thigh ? Number(formData.thigh) : 0,
    };

    const updatedProfile: UserProfile = {
      ...profile,
      weight: newWeight,
      tdee,
      target_macros,
      history: [...(profile.history || []), newRecord]
    };

    onUpdateProfile(updatedProfile);
    setIsUpdating(false);
  };

  // Get latest record if exists
  const latestRecord = profile.history && profile.history.length > 0 
    ? profile.history[profile.history.length - 1] 
    : null;

  const chartData = profile.history?.map(record => ({
    date: new Date(record.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    weight: record.weight,
    body_fat: record.body_fat || null
  })) || [];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24 font-sans text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center bg-zinc-950/90 backdrop-blur-md p-4 justify-between border-b border-pink-500/20">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-zinc-800 cursor-pointer">
          <ArrowLeft className="w-6 h-6 text-pink-500 drop-shadow-[0_0_5px_rgba(255,0,127,0.8)]" />
        </div>
        <h2 className="text-lg font-bold text-white drop-shadow-[0_0_5px_rgba(255,0,127,0.8)]">
          Theo dõi tiến độ
        </h2>
        <div className="flex w-10 items-center justify-end">
          <button onClick={onResetProfile} className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-transparent hover:bg-zinc-800" title="Thiết lập lại mục tiêu">
            <Settings className="w-6 h-6 text-pink-500 drop-shadow-[0_0_5px_rgba(255,0,127,0.8)]" />
          </button>
        </div>
      </div>

      <main className="max-w-md mx-auto">
        {/* Encouragement Message */}
        <div className="px-4 pt-6 pb-2">
          <h3 className="text-2xl font-bold leading-tight text-center text-white">
            Bạn đang làm rất tốt, <span className="text-pink-500 drop-shadow-[0_0_5px_rgba(255,0,127,0.8)]">Aura</span> tự hào về bạn!
          </h3>
        </div>

        {/* Summary Cards */}
        <div className="flex flex-wrap gap-4 p-4">
          <div className="flex min-w-[150px] flex-1 flex-col gap-2 p-5 bg-zinc-900 border border-pink-500/20 rounded-xl transition-all hover:border-pink-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] shadow-[0_0_15px_rgba(0,255,255,0.05)]">
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-pink-500" />
              <p className="text-zinc-400 text-sm font-medium">Cân nặng</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-zinc-100 text-2xl font-bold">{profile.weight} kg</p>
            </div>
          </div>
          <div className="flex min-w-[150px] flex-1 flex-col gap-2 p-5 bg-zinc-900 border border-pink-500/20 rounded-xl transition-all hover:border-pink-500 hover:shadow-[0_0_20px_rgba(0,255,255,0.15)] shadow-[0_0_15px_rgba(0,255,255,0.05)]">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-pink-500" />
              <p className="text-zinc-400 text-sm font-medium">Mỡ cơ thể</p>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-zinc-100 text-2xl font-bold">{latestRecord?.body_fat ? `${latestRecord.body_fat}%` : '--'}</p>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-zinc-100 text-xl font-bold">Biểu đồ cân nặng</h2>
          </div>
          <div className="w-full h-64 rounded-xl bg-zinc-900 border border-pink-500/20 p-4 relative overflow-hidden shadow-[0_0_15px_rgba(0,255,255,0.05)]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#a1a1aa" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    domain={['dataMin - 2', 'dataMax + 2']}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#ec4899', borderRadius: '8px' }}
                    itemStyle={{ color: '#ec4899' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    name="Cân nặng (kg)"
                    stroke="#ec4899" 
                    strokeWidth={3}
                    dot={{ fill: '#18181b', stroke: '#ec4899', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, fill: '#ec4899' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">
                Chưa có dữ liệu biểu đồ
              </div>
            )}
          </div>
        </div>

        {/* Body Measurements */}
        <div className="px-4 py-4">
          <h2 className="text-zinc-100 text-xl font-bold mb-4">Chỉ số hình thể</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-pink-500/20 rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 border border-pink-500/30">
                  <Ruler className="w-5 h-5" />
                </div>
                <span className="font-medium text-zinc-200">Vòng tay</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{latestRecord?.arm ? `${latestRecord.arm} cm` : '--'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-pink-500/20 rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 border border-pink-500/30">
                  <Ruler className="w-5 h-5" />
                </div>
                <span className="font-medium text-zinc-200">Vòng eo</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{latestRecord?.waist ? `${latestRecord.waist} cm` : '--'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-pink-500/20 rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 border border-pink-500/30">
                  <Accessibility className="w-5 h-5" />
                </div>
                <span className="font-medium text-zinc-200">Vòng hông</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{latestRecord?.hip ? `${latestRecord.hip} cm` : '--'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-pink-500/20 rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.05)]">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 border border-pink-500/30">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium text-zinc-200">Vòng mông</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{latestRecord?.butt ? `${latestRecord.butt} cm` : '--'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-4 bg-zinc-900 border border-pink-500/20 rounded-xl shadow-[0_0_15px_rgba(0,255,255,0.05)] col-span-2">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-500 border border-pink-500/30">
                  <User className="w-5 h-5" />
                </div>
                <span className="font-medium text-zinc-200">Vòng đùi</span>
              </div>
              <div className="text-right">
                <p className="font-bold text-white">{latestRecord?.thigh ? `${latestRecord.thigh} cm` : '--'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Photo Progress */}
        <div className="px-4 py-4">
          <h2 className="text-zinc-100 text-xl font-bold mb-4">Hình ảnh thay đổi</h2>
          {profile.history && profile.history.some(r => r.photos && r.photos.length > 0) ? (
            <div className="space-y-8">
              {profile.history.filter(r => r.photos && r.photos.length > 0).slice(-2).reverse().map((record, idx) => (
                <div key={record.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-3 py-1 rounded-lg text-sm font-bold ${idx === 0 ? 'bg-pink-500 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}>
                      {idx === 0 ? 'Mới nhất (' : 'Lần trước ('}{new Date(record.date).toLocaleDateString('vi-VN')})
                    </span>
                    <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md">{record.photos.length} ảnh</span>
                  </div>
                  <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-4 hide-scrollbar -mx-4 px-4">
                    {record.photos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative w-[85%] max-w-[300px] aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700 snap-center shrink-0 shadow-lg">
                        <img className="w-full h-full object-cover" alt={`Ảnh tiến độ ${record.date} - ${pIdx + 1}`} src={photo} />
                        {record.photos.length > 1 && (
                          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-2 py-1 rounded-lg">
                            {pIdx + 1} / {record.photos.length}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-zinc-900 border border-zinc-800 border-dashed rounded-xl">
              <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-zinc-500 text-sm">Chưa có hình ảnh tiến độ nào.</p>
              <p className="text-zinc-600 text-xs mt-1">Cập nhật chỉ số để thêm ảnh.</p>
            </div>
          )}
        </div>

        {/* Update Button */}
        <div className="px-4 py-6 space-y-3">
          <button 
            onClick={() => setIsUpdating(true)}
            className="w-full bg-pink-500 hover:bg-pink-600 font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.4)] transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-zinc-950">
            <PlusCircle className="w-5 h-5" />
            Cập nhật chỉ số
          </button>
          
          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 font-bold py-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-zinc-400">
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </main>

      {/* Update Modal */}
      <AnimatePresence>
        {isUpdating && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsUpdating(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-zinc-800"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Cập nhật chỉ số</h3>
                <button onClick={() => setIsUpdating(false)} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Cân nặng (kg) *</label>
                  <input 
                    type="number" 
                    value={formData.weight}
                    onChange={e => setFormData({...formData, weight: e.target.value})}
                    className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Mỡ cơ thể (%)</label>
                    <input 
                      type="number" 
                      value={formData.body_fat}
                      onChange={e => setFormData({...formData, body_fat: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Vòng tay (cm)</label>
                    <input 
                      type="number" 
                      value={formData.arm}
                      onChange={e => setFormData({...formData, arm: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Vòng eo (cm)</label>
                    <input 
                      type="number" 
                      value={formData.waist}
                      onChange={e => setFormData({...formData, waist: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Vòng hông (cm)</label>
                    <input 
                      type="number" 
                      value={formData.hip}
                      onChange={e => setFormData({...formData, hip: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Vòng mông (cm)</label>
                    <input 
                      type="number" 
                      value={formData.butt}
                      onChange={e => setFormData({...formData, butt: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Vòng đùi (cm)</label>
                    <input 
                      type="number" 
                      value={formData.thigh}
                      onChange={e => setFormData({...formData, thigh: e.target.value})}
                      className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Hình ảnh tiến độ</label>
                  <div className="flex flex-wrap gap-3 mb-3">
                    {formData.photos.map((photo, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-zinc-700 group">
                        <img src={photo} alt="Progress" className="w-full h-full object-cover" />
                        <button 
                          onClick={() => removePhoto(idx)}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </div>
                    ))}
                    {formData.photos.length < 3 && (
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="w-20 h-20 rounded-lg border-2 border-dashed border-zinc-700 flex flex-col items-center justify-center text-zinc-500 hover:text-pink-500 hover:border-pink-500 transition-colors disabled:opacity-50"
                      >
                        {isUploading ? (
                          <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Camera className="w-6 h-6 mb-1" />
                            <span className="text-[10px] font-medium">Thêm ảnh</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                  />
                  <p className="text-xs text-zinc-500">Tối đa 3 ảnh. Kích thước sẽ được tự động tối ưu.</p>
                </div>
              </div>

              <div className="mt-8">
                <button 
                  onClick={handleSave}
                  disabled={!formData.weight}
                  className="w-full bg-pink-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white py-4 rounded-2xl font-medium hover:bg-pink-700 transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)]"
                >
                  Lưu thay đổi
                </button>
                <p className="text-xs text-center text-zinc-500 mt-3">
                  Lượng calo và thực đơn sẽ được tính toán lại dựa trên cân nặng mới.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
