import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ProgressRecord } from '../../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Scale, Percent, Ruler, Accessibility, User, PlusCircle, X, Camera, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { compressImage } from '../../utils/imageCompression';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  studentId: string;
}

export default function StudentProgressAdmin({ studentId }: Props) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    weight: '',
    body_fat: '',
    arm: '',
    waist: '',
    hip: '',
    butt: '',
    thigh: '',
    photos: [] as string[]
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'users', studentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setProfile(data);
          setFormData({
            weight: data.weight?.toString() || '',
            body_fat: '',
            waist: '',
            hip: '',
            thigh: '',
            photos: []
          });
        } else {
          // If no profile exists, we can create a basic one or just show empty state
          setProfile(null);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [studentId]);

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

  const handleSave = async () => {
    const newWeight = Number(formData.weight);
    if (!newWeight) return;

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

    let updatedProfile: UserProfile;
    
    if (profile) {
      updatedProfile = {
        ...profile,
        weight: newWeight,
        history: [...(profile.history || []), newRecord]
      };
    } else {
      // Create a minimal profile if it doesn't exist
      updatedProfile = {
        name: 'Học viên',
        age: 25,
        gender: 'male',
        weight: newWeight,
        height: 170,
        goal: 'fat_loss',
        workouts_per_week: 3,
        eat_out_often: false,
        lifestyle: 'active',
        budget: 'medium',
        track_cycle: false,
        calories: 2000,
        protein: 150,
        carbs: 200,
        fat: 60,
        target_macros: {},
        current_mode: 'standard',
        eaten_meals: {},
        tdee: 2500,
        history: [newRecord]
      };
    }

    try {
      await setDoc(doc(db, 'users', studentId), updatedProfile, { merge: true });
      setProfile(updatedProfile);
      setIsUpdating(false);
      setFormData({
        weight: newWeight.toString(),
        body_fat: '',
        waist: '',
        hip: '',
        thigh: '',
        photos: []
      });
    } catch (error) {
      console.error("Error saving progress:", error);
      alert("Lỗi khi lưu tiến độ");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-zinc-500">Đang tải dữ liệu...</div>;
  }

  const latestRecord = profile?.history && profile.history.length > 0 
    ? profile.history[profile.history.length - 1] 
    : null;

  const chartData = profile?.history?.map(record => ({
    date: new Date(record.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
    weight: record.weight,
    body_fat: record.body_fat || null
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Chỉ số hình thể</h3>
        <button 
          onClick={() => setIsUpdating(true)}
          className="bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-1"
        >
          <PlusCircle className="w-4 h-4" /> Cập nhật
        </button>
      </div>

      {!profile?.history || profile.history.length === 0 ? (
        <div className="text-center py-8 bg-zinc-900 border border-zinc-800 border-dashed rounded-xl">
          <Scale className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-sm">Chưa có dữ liệu tiến độ.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="w-4 h-4 text-pink-500" />
                <p className="text-zinc-400 text-xs font-medium uppercase">Cân nặng</p>
              </div>
              <p className="text-white text-xl font-bold">{latestRecord?.weight} kg</p>
            </div>
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Percent className="w-4 h-4 text-pink-500" />
                <p className="text-zinc-400 text-xs font-medium uppercase">Mỡ cơ thể</p>
              </div>
              <p className="text-white text-xl font-bold">{latestRecord?.body_fat ? `${latestRecord.body_fat}%` : '--'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Vòng tay</p>
              <p className="text-white font-medium">{latestRecord?.arm ? `${latestRecord.arm} cm` : '--'}</p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Vòng eo</p>
              <p className="text-white font-medium">{latestRecord?.waist ? `${latestRecord.waist} cm` : '--'}</p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Vòng hông</p>
              <p className="text-white font-medium">{latestRecord?.hip ? `${latestRecord.hip} cm` : '--'}</p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center">
              <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Vòng mông</p>
              <p className="text-white font-medium">{latestRecord?.butt ? `${latestRecord.butt} cm` : '--'}</p>
            </div>
            <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-center col-span-2">
              <p className="text-zinc-500 text-[10px] uppercase font-bold mb-1">Vòng đùi</p>
              <p className="text-white font-medium">{latestRecord?.thigh ? `${latestRecord.thigh} cm` : '--'}</p>
            </div>
          </div>

          {/* Chart Section */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Biểu đồ cân nặng</h4>
            <div className="w-full h-64 rounded-xl bg-zinc-900 border border-zinc-800 p-4 relative overflow-hidden">
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

          <div>
            <h4 className="text-sm font-bold text-white mb-3">Hình ảnh tiến độ</h4>
            {profile.history.some(r => r.photos && r.photos.length > 0) ? (
              <div className="space-y-6">
                {profile.history.filter(r => r.photos && r.photos.length > 0).slice(-3).reverse().map((record, idx) => (
                  <div key={record.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${idx === 0 ? 'bg-pink-500 text-zinc-900' : 'bg-zinc-800 text-zinc-300'}`}>
                        {idx === 0 ? 'Mới nhất (' : 'Lần trước ('}{new Date(record.date).toLocaleDateString('vi-VN')})
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md">{record.photos.length} ảnh</span>
                    </div>
                    <div className="flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2 hide-scrollbar">
                      {record.photos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative w-[75%] sm:w-[45%] aspect-[3/4] rounded-xl overflow-hidden bg-zinc-800 border border-zinc-700 snap-center shrink-0">
                          <img className="w-full h-full object-cover" alt={`Ảnh tiến độ ${record.date} - ${pIdx + 1}`} src={photo} />
                          {record.photos.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md">
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
              <div className="text-center py-6 bg-zinc-900 border border-zinc-800 border-dashed rounded-xl">
                <Camera className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                <p className="text-zinc-500 text-xs">Chưa có hình ảnh nào.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Update Modal */}
      <AnimatePresence>
        {isUpdating && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
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
              className="relative w-full max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-zinc-800 max-h-[90vh] overflow-y-auto"
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
