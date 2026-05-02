import { useEffect, useState } from 'react';
import { Lab, Computer, UserProfile, Booking, TimetableEntry } from '../types';
import { firestoreService } from '../services/firestoreService';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Users, 
  Monitor, 
  Settings, 
  BarChart3,
  Search,
  MoreVertical,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Calendar,
  Wrench
} from 'lucide-react';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function AdminPanel() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'labs' | 'users' | 'bookings' | 'timetable' | 'analytics'>('labs');
  const [isAddLabModalOpen, setIsAddLabModalOpen] = useState(false);
  const [isEditLabModalOpen, setIsEditLabModalOpen] = useState(false);
  const [isManagePCsModalOpen, setIsManagePCsModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isDeleteTimetableConfirmModalOpen, setIsDeleteTimetableConfirmModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [selectedLabForPCs, setSelectedLabForPCs] = useState<Lab | null>(null);
  const [labToDelete, setLabToDelete] = useState<string | null>(null);
  const [timetableToDelete, setTimetableToDelete] = useState<string | null>(null);
  const [labComputers, setLabComputers] = useState<Computer[]>([]);
  const [isAddTimetableModalOpen, setIsAddTimetableModalOpen] = useState(false);
  const [newLab, setNewLab] = useState({ name: '', description: '', totalPCs: 20, location: '' });
  const [newTimetable, setNewTimetable] = useState<Omit<TimetableEntry, 'id'>>({
    labId: '',
    dayOfWeek: 'Monday',
    startTime: '09:00',
    endTime: '10:00',
    title: '',
    description: '',
    reservedFor: ''
  });

  useEffect(() => {
    const unsubscribeLabs = firestoreService.subscribeToCollection<Lab>(
      'labs',
      [],
      (data) => setLabs(data),
      (error) => console.error(error)
    );

    const unsubscribeUsers = firestoreService.subscribeToCollection<UserProfile>(
      'users',
      [],
      (data) => setUsers(data),
      (error) => console.error(error)
    );

    const unsubscribeBookings = firestoreService.subscribeToCollection<Booking>(
      'bookings',
      [],
      (data) => setBookings(data),
      (error) => console.error(error)
    );

    const unsubscribeTimetable = firestoreService.subscribeToCollection<TimetableEntry>(
      'timetable',
      [],
      (data) => setTimetable(data),
      (error) => console.error(error)
    );

    return () => {
      unsubscribeLabs();
      unsubscribeUsers();
      unsubscribeBookings();
      unsubscribeTimetable();
    };
  }, []);

  useEffect(() => {
    if (!selectedLabForPCs) {
      setLabComputers([]);
      return;
    }

    const unsubscribeComputers = firestoreService.subscribeToCollection<Computer>(
      `labs/${selectedLabForPCs.id}/computers`,
      [],
      (data) => setLabComputers(data.sort((a, b) => a.pcNumber - b.pcNumber)),
      (error) => console.error(error)
    );

    return () => unsubscribeComputers();
  }, [selectedLabForPCs]);

  const handleAddLab = async () => {
    try {
      const labRef = doc(collection(db, 'labs'));
      const labData: Lab = {
        ...newLab,
        id: labRef.id
      };
      await setDoc(labRef, labData);

      // Create computers for the lab
      for (let i = 1; i <= newLab.totalPCs; i++) {
        const pcRef = doc(collection(db, `labs/${labRef.id}/computers`));
        const pcData: Computer = {
          id: pcRef.id,
          labId: labRef.id,
          pcNumber: i,
          status: 'available'
        };
        await setDoc(pcRef, pcData);
      }

      setIsAddLabModalOpen(false);
      setNewLab({ name: '', description: '', totalPCs: 20, location: '' });
    } catch (error) {
      console.error('Failed to add lab:', error);
    }
  };

  const handleDeleteLab = async () => {
    if (!labToDelete) return;
    
    try {
      const id = labToDelete;
      // 1. Delete computers subcollection
      const computersSnapshot = await getDocs(collection(db, `labs/${id}/computers`));
      const deletePCPromises = computersSnapshot.docs.map(pcDoc => deleteDoc(pcDoc.ref));
      await Promise.all(deletePCPromises);

      // 2. Delete timetable entries for this lab
      const timetableSnapshot = await getDocs(query(collection(db, 'timetable'), where('labId', '==', id)));
      const deleteTimetablePromises = timetableSnapshot.docs.map(tDoc => deleteDoc(tDoc.ref));
      await Promise.all(deleteTimetablePromises);

      // 3. Delete bookings for this lab
      const bookingsSnapshot = await getDocs(query(collection(db, 'bookings'), where('labId', '==', id)));
      const deleteBookingPromises = bookingsSnapshot.docs.map(bDoc => deleteDoc(bDoc.ref));
      await Promise.all(deleteBookingPromises);

      // 4. Delete the lab itself
      await firestoreService.deleteDocument('labs', id);
      
      setIsDeleteConfirmModalOpen(false);
      setLabToDelete(null);
    } catch (error) {
      console.error('Error deleting lab:', error);
    }
  };

  const handleUpdateLab = async () => {
    if (!editingLab) return;
    try {
      await firestoreService.updateDocument('labs', editingLab.id, {
        name: editingLab.name,
        description: editingLab.description,
        location: editingLab.location,
        totalPCs: editingLab.totalPCs
      });
      setIsEditLabModalOpen(false);
      setEditingLab(null);
    } catch (error) {
      console.error('Failed to update lab:', error);
    }
  };

  const handleUpdatePCStatus = async (pc: Computer, newStatus: Computer['status']) => {
    if (!selectedLabForPCs) return;
    try {
      await firestoreService.updateDocument(`labs/${selectedLabForPCs.id}/computers`, pc.id, {
        status: newStatus
      });
    } catch (error) {
      console.error('Failed to update PC status:', error);
    }
  };

  const handleUpdatePCSpecs = async (pc: Computer, specs: string) => {
    if (!selectedLabForPCs) return;
    try {
      await firestoreService.updateDocument(`labs/${selectedLabForPCs.id}/computers`, pc.id, {
        specs: specs
      });
    } catch (error) {
      console.error('Failed to update PC specs:', error);
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    await firestoreService.updateDocument('users', user.uid, { status: newStatus });
  };

  const handleAddTimetable = async () => {
    try {
      const timetableRef = doc(collection(db, 'timetable'));
      const timetableData: TimetableEntry = {
        ...newTimetable,
        id: timetableRef.id
      };
      await setDoc(timetableRef, timetableData);
      setIsAddTimetableModalOpen(false);
      setNewTimetable({
        labId: labs[0]?.id || '',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        title: '',
        description: '',
        reservedFor: ''
      });
    } catch (error) {
      console.error('Failed to add timetable entry:', error);
    }
  };

  const handleDeleteTimetable = async () => {
    if (!timetableToDelete) return;
    try {
      await firestoreService.deleteDocument('timetable', timetableToDelete);
      setIsDeleteTimetableConfirmModalOpen(false);
      setTimetableToDelete(null);
    } catch (error) {
      console.error('Failed to delete timetable entry:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Control Panel</h1>
          <p className="text-gray-500">Manage lab resources, user access, and system settings.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {[
            { id: 'labs', icon: Monitor, label: 'Labs' },
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'bookings', icon: BarChart3, label: 'Bookings' },
            { id: 'timetable', icon: Calendar, label: 'Timetable' },
            { id: 'analytics', icon: Settings, label: 'Analytics' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'labs' && (
          <motion.div
            key="labs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Manage Labs</h2>
              <button
                onClick={() => setIsAddLabModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add New Lab
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {labs.map((lab) => (
                <div key={lab.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingLab(lab);
                          setIsEditLabModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setLabToDelete(lab.id);
                          setIsDeleteConfirmModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{lab.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{lab.description}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSelectedLabForPCs(lab);
                        setIsManagePCsModalOpen(true);
                      }}
                      className="w-full py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                    >
                      <Monitor className="w-4 h-4" />
                      Manage Computers
                    </button>
                  </div>
                  <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                      <Monitor className="w-4 h-4" />
                      {lab.totalPCs} Computers
                    </div>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {lab.location}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">User Management</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {user.displayName?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{user.displayName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-gray-600 capitalize">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          user.status === 'active' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleToggleUserStatus(user)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            user.status === 'active' ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"
                          )}
                        >
                          {user.status === 'active' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'timetable' && (
          <motion.div
            key="timetable"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Lab Timetables</h2>
              <button
                onClick={() => {
                  setNewTimetable(prev => ({ ...prev, labId: labs[0]?.id || '' }));
                  setIsAddTimetableModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Lab</th>
                      <th className="px-6 py-4">Day</th>
                      <th className="px-6 py-4">Time</th>
                      <th className="px-6 py-4">Event</th>
                      <th className="px-6 py-4">Reserved For</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {timetable.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {labs.find(l => l.id === entry.labId)?.name || 'Unknown Lab'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{entry.dayOfWeek}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{entry.startTime} - {entry.endTime}</td>
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-gray-900">{entry.title}</p>
                          <p className="text-xs text-gray-500">{entry.description}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                            {entry.reservedFor}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => {
                              setTimetableToDelete(entry.id);
                              setIsDeleteTimetableConfirmModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Lab Modal */}
      {isEditLabModalOpen && editingLab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Edit Lab</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Lab Name</label>
                <input
                  type="text"
                  value={editingLab.name}
                  onChange={(e) => setEditingLab({ ...editingLab, name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Location</label>
                <input
                  type="text"
                  value={editingLab.location}
                  onChange={(e) => setEditingLab({ ...editingLab, location: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Description</label>
                <textarea
                  value={editingLab.description}
                  onChange={(e) => setEditingLab({ ...editingLab, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => {
                  setIsEditLabModalOpen(false);
                  setEditingLab(null);
                }}
                className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateLab}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
              >
                Update Lab
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Manage PCs Modal */}
      {isManagePCsModalOpen && selectedLabForPCs && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-4xl max-h-[80vh] rounded-2xl shadow-2xl p-8 overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Manage Computers - {selectedLabForPCs.name}</h3>
                <p className="text-sm text-gray-500">Update PC status and specifications.</p>
              </div>
              <button 
                onClick={() => {
                  setIsManagePCsModalOpen(false);
                  setSelectedLabForPCs(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {labComputers.map((pc) => (
                  <div key={pc.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                          pc.status === 'available' ? "bg-green-100 text-green-700" :
                          pc.status === 'occupied' ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-600"
                        )}>
                          {pc.pcNumber}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">PC-{pc.pcNumber.toString().padStart(2, '0')}</p>
                          <p className="text-xs text-gray-500 capitalize">{pc.status}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdatePCStatus(pc, pc.status === 'maintenance' ? 'available' : 'maintenance')}
                          className={cn(
                            "p-2 rounded-lg transition-all",
                            pc.status === 'maintenance' 
                              ? "bg-green-600 text-white shadow-md" 
                              : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                          )}
                          title={pc.status === 'maintenance' ? "Remove from Maintenance" : "Put in Maintenance"}
                        >
                          <Wrench className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Specifications</label>
                      <textarea
                        defaultValue={pc.specs || ''}
                        onBlur={(e) => handleUpdatePCSpecs(pc, e.target.value)}
                        placeholder="e.g. i7, 16GB RAM, RTX 3060"
                        className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 h-16 resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {isAddLabModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add New Lab</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Lab Name</label>
                <input
                  type="text"
                  value={newLab.name}
                  onChange={(e) => setNewLab({ ...newLab, name: e.target.value })}
                  placeholder="e.g. Computer Lab A"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Location</label>
                <input
                  type="text"
                  value={newLab.location}
                  onChange={(e) => setNewLab({ ...newLab, location: e.target.value })}
                  placeholder="e.g. Building 4, Floor 2"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Total PCs</label>
                <input
                  type="number"
                  value={newLab.totalPCs}
                  onChange={(e) => setNewLab({ ...newLab, totalPCs: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Description</label>
                <textarea
                  value={newLab.description}
                  onChange={(e) => setNewLab({ ...newLab, description: e.target.value })}
                  placeholder="Brief description of the lab..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setIsAddLabModalOpen(false)}
                className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLab}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
              >
                Create Lab
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Timetable Modal */}
      {isAddTimetableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6">Add Timetable Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Select Lab</label>
                <select
                  value={newTimetable.labId}
                  onChange={(e) => setNewTimetable({ ...newTimetable, labId: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {labs.map(lab => (
                    <option key={lab.id} value={lab.id}>{lab.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Day</label>
                  <select
                    value={newTimetable.dayOfWeek}
                    onChange={(e) => setNewTimetable({ ...newTimetable, dayOfWeek: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <option key={day} value={day}>{day}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Reserved For</label>
                  <input
                    type="text"
                    value={newTimetable.reservedFor}
                    onChange={(e) => setNewTimetable({ ...newTimetable, reservedFor: e.target.value })}
                    placeholder="e.g. Class 10A"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newTimetable.startTime}
                    onChange={(e) => setNewTimetable({ ...newTimetable, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase block mb-1">End Time</label>
                  <input
                    type="time"
                    value={newTimetable.endTime}
                    onChange={(e) => setNewTimetable({ ...newTimetable, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Title</label>
                <input
                  type="text"
                  value={newTimetable.title}
                  onChange={(e) => setNewTimetable({ ...newTimetable, title: e.target.value })}
                  placeholder="e.g. Physics Practical"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Description</label>
                <textarea
                  value={newTimetable.description}
                  onChange={(e) => setNewTimetable({ ...newTimetable, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20 resize-none"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setIsAddTimetableModalOpen(false)}
                className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTimetable}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg active:scale-95 transition-all"
              >
                Add Entry
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Lab?</h3>
            <p className="text-gray-500 text-center mb-8">
              Are you sure you want to delete this lab and all its associated data (computers, timetable, bookings)? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsDeleteConfirmModalOpen(false);
                  setLabToDelete(null);
                }}
                className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLab}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg active:scale-95 transition-all"
              >
                Delete Everything
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Delete Timetable Confirmation Modal */}
      {isDeleteTimetableConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-8"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Delete Entry?</h3>
            <p className="text-gray-500 text-center mb-8">
              Are you sure you want to delete this timetable entry? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setIsDeleteTimetableConfirmModalOpen(false);
                  setTimetableToDelete(null);
                }}
                className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-50 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTimetable}
                className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg active:scale-95 transition-all"
              >
                Delete Entry
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
