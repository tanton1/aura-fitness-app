import React, { useState, useEffect } from 'react';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../../firebase-applet-config.json';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { User as UserIcon, Building, Plus, Trash2, Edit2, ShieldCheck, Users, Package, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { Trainer, Branch, StaffMember } from '../../types';
import PackageSettings from './PackageSettings';
import { LOGO_URL } from '../../constants';
import { useDatabase } from '../../contexts/DatabaseContext';

interface Props {
  user: FirebaseUser | null;
}

export default function HRManagement({ user }: Props) {
  const {
    trainers,
    branches,
    staff,
    addTrainer,
    updateTrainer,
    deleteTrainer,
    addBranch,
    updateBranch,
    deleteBranch,
    addStaff,
    updateStaff,
    deleteStaff,
    updateUserProfile
  } = useDatabase();

  const [activeSubTab, setActiveSubTab] = useState<'trainers' | 'branches' | 'staff' | 'packages'>('trainers');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Trainer | Branch | StaffMember> | null>(null);
  const [formData, setFormData] = useState<Partial<Trainer | Branch | StaffMember>>({});
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'staff' | 'branch'} | null>(null);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleSave = async () => {
    if (!user) return;
    console.log('Saving...', activeSubTab, formData);
    
    if (activeSubTab === 'trainers') {
      if (editingItem?.id) {
        const updatedTrainer = { ...editingItem, ...formData } as Trainer;
        
        // Sync with staff array
        const staffMember = staff.find(s => s.id === editingItem.id);
        if (staffMember) {
            await updateStaff({
              ...staffMember,
              name: updatedTrainer.name,
              email: updatedTrainer.email || staffMember.email,
              phone: updatedTrainer.phone || staffMember.phone,
              branchId: updatedTrainer.branchId || staffMember.branchId,
              status: updatedTrainer.status
            });
        }

        // Sync with users collection
        await updateUserProfile(editingItem.id, {
          name: updatedTrainer.name,
          branchId: updatedTrainer.branchId || '',
          employeeCode: updatedTrainer.employeeCode || '',
        });

        try {
          await updateTrainer(updatedTrainer);
          setAlertMessage('Đã lưu thông tin PT thành công!');
        } catch (e) {
          console.error("Error saving trainers:", e);
          setError("Lỗi lưu dữ liệu PT: " + (e as Error).message);
          return;
        }
      } else {
        const newTrainer = {
          id: Date.now().toString(),
          status: 'active',
          commissionRate: 5,
          commissionPerSession: 50000,
          ...formData
        } as Trainer;
        try {
          await addTrainer(newTrainer);
          setAlertMessage('Đã lưu thông tin PT thành công!');
        } catch (e) {
          console.error("Error saving trainers:", e);
          setError("Lỗi lưu dữ liệu PT: " + (e as Error).message);
          return;
        }
      }
      
      setIsAdding(false);
      setEditingItem(null);
      setFormData({});
    } else if (activeSubTab === 'branches') {
      if (editingItem?.id) {
        try {
          await updateBranch({ ...editingItem, ...formData } as Branch);
          setAlertMessage('Đã lưu thông tin chi nhánh thành công!');
        } catch (e) {
          console.error("Error saving branches:", e);
          setError("Lỗi lưu dữ liệu chi nhánh: " + (e as Error).message);
          return;
        }
      } else {
        const newBranch = {
          id: Date.now().toString(),
          ...formData
        } as Branch;
        try {
          await addBranch(newBranch);
          setAlertMessage('Đã lưu thông tin chi nhánh thành công!');
        } catch (e) {
          console.error("Error saving branches:", e);
          setError("Lỗi lưu dữ liệu chi nhánh: " + (e as Error).message);
          return;
        }
      }
      setIsAdding(false);
      setEditingItem(null);
      setFormData({});
    } else if (activeSubTab === 'staff') {
      let staffUid = (editingItem as StaffMember)?.id;

      if (!editingItem?.id) {
        // Create Firebase Auth user
        if (formData.email && formData.phone) {
          if (formData.phone.length < 6) {
            setError("Số điện thoại (dùng làm mật khẩu) phải có ít nhất 6 ký tự.");
            return;
          }
          try {
            const secondaryApp = getApps().length > 1 ? getApp("Secondary") : initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);
            const userCred = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.phone);
            staffUid = userCred.user.uid;
            await secondaryAuth.signOut();
          } catch (e: any) {
            console.error("Error creating auth user:", e);
            setError("Lỗi tạo tài khoản: " + (e.message || "Email đã tồn tại hoặc không hợp lệ."));
            return;
          }
        } else {
          setError("Vui lòng nhập Email và Số điện thoại.");
          return;
        }
      }

      if (staffUid) {
        const role = (formData as StaffMember).role || 'trainer';
        // Update User Profile in Firestore
        await setDoc(doc(db, 'users', staffUid), {
          name: formData.name,
          role: role,
          branchId: (formData as StaffMember).branchId || '', // Empty means all branches
        }, { merge: true });

        const sanitize = (obj: any) => {
          const newObj = { ...obj };
          Object.keys(newObj).forEach(key => {
            if (newObj[key] === undefined) {
              newObj[key] = null;
            }
          });
          return newObj;
        };

        const newMember = sanitize({
          id: staffUid,
          status: 'active',
          ...formData,
          role: role // Ensure role is explicitly set in the object
        }) as StaffMember;

        try {
          if (editingItem?.id) {
            await updateStaff(newMember);
          } else {
            await addStaff(newMember);
          }

          // Sync with trainers array
          const existingTrainer = trainers.find(t => t.id === staffUid);
          
          if (existingTrainer) {
            // If they are already in the trainers list, update their info regardless of their new role
            await updateTrainer({
              ...existingTrainer,
              name: newMember.name,
              email: newMember.email,
              phone: newMember.phone,
              branchId: newMember.branchId,
              status: newMember.status,
              // Preserve commission fields and employee code if they exist
              commissionRate: (formData as any).commissionRate ?? existingTrainer.commissionRate ?? 5,
              commissionPerSession: (formData as any).commissionPerSession ?? existingTrainer.commissionPerSession ?? 50000,
              employeeCode: (formData as any).employeeCode ?? existingTrainer.employeeCode ?? ''
            });
          } else if (role === 'trainer') {
            // If they are not in the trainers list, only add them if their role is 'trainer'
            await addTrainer({
              id: staffUid,
              name: newMember.name,
              email: newMember.email,
              phone: newMember.phone,
              branchId: newMember.branchId,
              status: newMember.status,
              commissionRate: (formData as any).commissionRate ?? 5,
              commissionPerSession: (formData as any).commissionPerSession ?? 50000,
              employeeCode: (formData as any).employeeCode ?? ''
            });
          }

          setAlertMessage('Đã lưu thông tin nhân viên thành công!');
        } catch (e) {
          console.error("Error saving staff:", e);
          setError("Lỗi lưu dữ liệu nhân viên: " + (e as Error).message);
          return;
        }
        setIsAdding(false);
        setEditingItem(null);
        setFormData({});
      }
    }
    
    setIsAdding(false);
    setEditingItem(null);
    setFormData({});
    setError(null);
  };

  const executeDelete = async () => {
    if (!user || !itemToDelete) return;
    const { id, type } = itemToDelete;

    try {
      if (activeSubTab === 'trainers' || activeSubTab === 'staff') {
        await deleteStaff(id);
        const trainer = trainers.find(t => t.id === id);
        if (trainer) {
          await deleteTrainer(id);
        }
        
        try {
          await deleteDoc(doc(db, 'users', id));
        } catch (e) {
          console.error("Error deleting user doc:", e);
        }
      } else if (activeSubTab === 'branches') {
        await deleteBranch(id);
      }
      
      setAlertMessage('Đã xóa thành công!');
    } catch (e) {
      console.error("Error deleting item:", e);
      setAlertMessage("Lỗi khi xóa: " + (e as Error).message);
    }
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleDelete = async (id: string) => {
    setItemToDelete({ id, type: 'staff' }); // type is ignored in executeDelete anyway since it uses activeSubTab
    setShowDeleteConfirm(true);
  };

  const handleRestoreRoles = async () => {
    if (!user) return;
    try {
      setAlertMessage('Đang khôi phục phân quyền...');
      let count = 0;
      for (const s of staff) {
        if (s.id && s.role) {
          await setDoc(doc(db, 'users', s.id), { role: s.role }, { merge: true });
          count++;
        }
      }
      setAlertMessage(`Đã khôi phục phân quyền cho ${count} tài khoản thành công!`);
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      console.error("Error restoring roles:", error);
      setError("Lỗi khi khôi phục phân quyền.");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Aura" className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-3xl md:text-4xl font-serif font-medium text-white tracking-tight">
              Cài đặt hệ thống
            </h1>
            <p className="text-zinc-400 mt-2">Quản lý nhân sự, chi nhánh và các gói tập</p>
          </div>
        </div>
        <button
          onClick={handleRestoreRoles}
          className="bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors border border-pink-500/20"
        >
          Khôi phục phân quyền
        </button>
      </div>

      <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveSubTab('trainers')}
          className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'trainers' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Nhân sự PT
        </button>
        <button
          onClick={() => setActiveSubTab('staff')}
          className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'staff' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Tài Khoản
        </button>
        <button
          onClick={() => setActiveSubTab('branches')}
          className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'branches' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Building className="w-4 h-4" />
          Chi nhánh
        </button>
        <button
          onClick={() => setActiveSubTab('packages')}
          className={`flex-1 min-w-max flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeSubTab === 'packages' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Gói tập
        </button>
      </div>

      <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-white">Công cụ hệ thống</h2>
            <p className="text-zinc-400 text-sm">Dọn dẹp dữ liệu thừa hoặc bị lỗi trong database</p>
          </div>
          <button
            onClick={() => setShowCleanupConfirm(true)}
            className="px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-colors text-sm"
          >
            Dọn dẹp dữ liệu
          </button>
        </div>
      </div>

      {activeSubTab === 'packages' ? (
        <PackageSettings user={user} />
      ) : (
        <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)] border-b-2 border-pink-500/30 pb-2 inline-block shadow-[0_4px_0_rgba(236,72,153,0.2)]">
              {activeSubTab === 'trainers' ? 'Danh sách PT (Hoa hồng)' : 
               activeSubTab === 'staff' ? 'Tài khoản nhân viên' : 'Danh sách chi nhánh'}
            </h2>
          {activeSubTab !== 'trainers' && (
            <button 
              onClick={() => {
                setEditingItem(null);
                setFormData({});
                setError(null);
                setIsAdding(true);
              }}
              className="bg-pink-500 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-pink-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm mới
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {activeSubTab === 'trainers' ? (
            trainers.length > 0 ? trainers.map(t => (
              <div key={t.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">{t.name} {t.employeeCode && <span className="text-zinc-500 text-xs">({t.employeeCode})</span>}</h3>
                  <p className="text-zinc-500 text-sm">{t.email} - {t.commissionRate}% - {(t.commissionPerSession || 0).toLocaleString()}đ/buổi</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(t); setFormData(t); setError(null); setIsAdding(true); }} className="p-2 text-zinc-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-2 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )) : <div className="text-center py-10 text-zinc-500">Chưa có dữ liệu PT.</div>
          ) : activeSubTab === 'staff' ? (
            staff.length > 0 ? staff.map(s => (
              <div key={s.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-medium">{s.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700">
                      {s.role}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-sm">{s.email} • {s.phone}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(s); setFormData(s); setError(null); setIsAdding(true); }} className="p-2 text-zinc-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(s.id)} className="p-2 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )) : <div className="text-center py-10 text-zinc-500">Chưa có tài khoản nhân viên nào.</div>
          ) : (
            branches.length > 0 ? branches.map(b => (
              <div key={b.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex justify-between items-center">
                <div>
                  <h3 className="text-white font-medium">{b.name}</h3>
                  <p className="text-zinc-500 text-sm">{b.address}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setEditingItem(b); setFormData(b); setError(null); setIsAdding(true); }} className="p-2 text-zinc-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(b.id)} className="p-2 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            )) : <div className="text-center py-10 text-zinc-500">Chưa có dữ liệu chi nhánh.</div>
          )}
        </div>
      </div>
      )}

      {/* Add Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 p-6 rounded-3xl w-full max-w-md border border-zinc-800 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingItem ? 'Sửa' : 'Thêm'} {
                activeSubTab === 'trainers' ? 'PT' : 
                activeSubTab === 'staff' ? 'Tài khoản' : 'chi nhánh'
              }
            </h3>
            
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              {activeSubTab !== 'trainers' && (
                <input 
                  type="text" 
                  placeholder="Tên" 
                  value={formData.name || ''}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              )}
              {activeSubTab === 'trainers' ? (
                <>
                  <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-800 text-zinc-300 mb-4">
                    <p className="font-medium text-white">{formData.name}</p>
                    <p className="text-sm">{formData.email} • {formData.phone}</p>
                  </div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Mã nhân viên (Dùng để tính hoa hồng giới thiệu)</label>
                  <input type="text" placeholder="VD: PT001" value={formData.employeeCode || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, employeeCode: e.target.value})} />

                  <label className="block text-sm font-medium text-zinc-400 mb-1 mt-3">Độ ưu tiên (PT1, PT2...)</label>
                  <input type="number" placeholder="Độ ưu tiên" value={formData.priority || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, priority: Number(e.target.value)})} min="1" />

                  <label className="block text-sm font-medium text-zinc-400 mb-1 mt-3">Hoa hồng giới thiệu (%)</label>
                  <input type="number" placeholder="Hoa hồng giới thiệu (%)" value={formData.commissionRate || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})} />
                  
                  <label className="block text-sm font-medium text-zinc-400 mb-1 mt-3">Hoa hồng/buổi (VNĐ)</label>
                  <input type="number" placeholder="Hoa hồng/buổi (VNĐ)" value={formData.commissionPerSession || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, commissionPerSession: Number(e.target.value)})} />
                </>
              ) : activeSubTab === 'staff' ? (
                <>
                  <input type="email" placeholder="Email (Tài khoản đăng nhập)" value={formData.email || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, email: e.target.value})} />
                  <input type="tel" placeholder="SĐT (Mật khẩu mặc định)" value={formData.phone || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, phone: e.target.value})} />
              <select 
                value={(formData as StaffMember).role || 'trainer'}
                onChange={e => setFormData({...formData, role: e.target.value as any})}
                className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
              >
                <option value="trainer">PT (Huấn luyện viên)</option>
                <option value="sales">Sales (Kinh doanh)</option>
                <option value="manager">Quản lý cơ sở</option>
                <option value="admin">Admin (Toàn quyền)</option>
              </select>
                  <select 
                    value={(formData as StaffMember).branchId || ''}
                    onChange={e => setFormData({...formData, branchId: e.target.value})}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  >
                    <option value="">-- Chọn cơ sở --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </>
              ) : (
                <input type="text" placeholder="Địa chỉ" value={formData.address || ''} className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-white" onChange={e => setFormData({...formData, address: e.target.value})} />
              )}
              <div className="flex gap-3 pt-4">
                <button onClick={() => setIsAdding(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-white">Hủy</button>
                <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-pink-500 text-white">Lưu</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div key="delete-confirm" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-red-500/30 text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Xác nhận xóa</h3>
              <p className="text-zinc-400 mb-6">
                Bạn có chắc chắn muốn xóa mục này?
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  Đồng ý xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirm Cleanup Modal */}
      <AnimatePresence>
        {showCleanupConfirm && (
          <div key="cleanup-confirm" className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowCleanupConfirm(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-red-500/30 text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Xác nhận dọn dẹp</h3>
              <p className="text-zinc-400 mb-6">
                Bạn có muốn dọn dẹp dữ liệu PT và nhân viên bị thừa? Hệ thống sẽ xóa các mục trùng lặp hoặc không hợp lệ.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCleanupConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-zinc-400 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={async () => {
                    setShowCleanupConfirm(false);
                    
                    // Remove duplicates and invalid entries
                    const cleanTrainers = trainers.filter((t, index, self) => 
                      t.id && self.findIndex(s => s.id === t.id) === index
                    );
                    const cleanStaff = staff.filter((s, index, self) => 
                      s.id && self.findIndex(item => item.id === s.id) === index
                    );
                    
                    try {
                      // We don't have a bulk update in DatabaseContext, so we'll just delete the duplicates
                      const duplicateTrainers = trainers.filter(t => !cleanTrainers.includes(t));
                      const duplicateStaff = staff.filter(s => !cleanStaff.includes(s));
                      
                      await Promise.all([
                        ...duplicateTrainers.map(t => deleteTrainer(t.id)),
                        ...duplicateStaff.map(s => deleteStaff(s.id))
                      ]);
                      setAlertMessage('Đã dọn dẹp dữ liệu thành công!');
                    } catch (e) {
                      setAlertMessage('Lỗi khi dọn dẹp: ' + (e as Error).message);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                >
                  Đồng ý dọn dẹp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Modal */}
      <AnimatePresence>
        {alertMessage && (
          <div key="alert-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setAlertMessage(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-800 text-center"
            >
              <div className="w-16 h-16 bg-pink-500/20 text-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-white font-medium mb-6">{alertMessage}</p>
              <button 
                onClick={() => setAlertMessage(null)}
                className="w-full py-3 rounded-xl font-medium text-white bg-pink-500 hover:bg-pink-600 transition-colors shadow-[0_0_15px_rgba(236,72,153,0.4)]"
              >
                Đóng
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
