import React, { useState, useEffect } from 'react';
import { StudentContract, TrainingPackage, Trainer, Branch } from '../../types';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  contract: StudentContract;
  packages: TrainingPackage[];
  trainers: Trainer[];
  branches: Branch[];
  onClose: () => void;
  onSave: (contract: StudentContract) => void;
}

export default function EditContractModal({ contract, packages, trainers, branches, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<StudentContract>({ ...contract });

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Chỉnh sửa hợp đồng</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Gói tập</label>
            <select 
              value={formData.packageId}
              onChange={e => {
                const pkg = packages.find(p => p.id === e.target.value);
                setFormData({ ...formData, packageId: e.target.value, packageName: pkg?.name || '', totalSessions: pkg?.totalSessions || 0, totalPrice: pkg?.price || 0 });
              }}
              className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
            >
              {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">PT</label>
            <select 
              value={formData.trainerId || ''}
              onChange={e => setFormData({ ...formData, trainerId: e.target.value })}
              className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500"
            >
              <option value="">-- Bất kỳ PT nào --</option>
              {trainers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Ngày bắt đầu</label>
              <input 
                type="date" 
                value={formData.startDate}
                onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Ngày kết thúc</label>
              <input 
                type="date" 
                value={formData.endDate}
                onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Tổng tiền (VNĐ)</label>
            <input 
              type="number" 
              value={formData.totalPrice}
              onChange={e => setFormData({ ...formData, totalPrice: Number(e.target.value) })}
              className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Đã thanh toán (VNĐ)</label>
            <input 
              type="number" 
              value={formData.paidAmount}
              onChange={e => setFormData({ ...formData, paidAmount: Number(e.target.value) })}
              className="w-full p-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:outline-none focus:border-pink-500" 
            />
          </div>

          <button 
            onClick={handleSave}
            className="w-full py-3 rounded-xl font-medium text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-[0_0_15px_rgba(255,0,127,0.4)] mt-4"
          >
            Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </div>
  );
}
