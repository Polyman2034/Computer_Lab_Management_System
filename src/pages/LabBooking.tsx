import { useEffect, useState } from 'react';
import { UserProfile, Lab, Computer, Booking, PCStatus, TimetableEntry } from '../types';
import { firestoreService } from '../services/firestoreService';
import { where, collection, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { 
  Monitor, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  Calendar,
  XCircle
} from 'lucide-react';
import { format, addHours, startOfHour, isAfter, parseISO } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db } from '../firebase';

interface LabBookingProps {
  profile: UserProfile | null;
}

export function LabBooking({ profile }: LabBookingProps) {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [computers, setComputers] = useState<Computer[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [selectedPC, setSelectedPC] = useState<Computer | null>(null);
  const [viewingPC, setViewingPC] = useState<Computer | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>(format(startOfHour(addHours(new Date(), 1)), "yyyy-MM-dd'T'HH:mm"));
  const [loading, setLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success' | 'error'>('idle');

  useEffect(() => {
    const unsubscribeLabs = firestoreService.subscribeToCollection<Lab>(
      'labs',
      [],
      (data) => {
        setLabs(data);
        if (data.length > 0 && !selectedLab) {
          setSelectedLab(data[0]);
        }
        setLoading(false);
      },
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
      unsubscribeTimetable();
    };
  }, []);

  useEffect(() => {
    if (!selectedLab) return;

    const unsubscribeComputers = firestoreService.subscribeToCollection<Computer>(
      `labs/${selectedLab.id}/computers`,
      [],
      (data) => setComputers(data.sort((a, b) => a.pcNumber - b.pcNumber)),
      (error) => console.error(error)
    );

    return () => unsubscribeComputers();
  }, [selectedLab]);

  const handleBooking = async () => {
    if (!profile || !selectedLab || !selectedPC) return;

    setBookingStatus('booking');
    try {
      const startTime = parseISO(selectedTime);
      const endTime = addHours(startTime, 1);

      const bookingRef = doc(collection(db, 'bookings'));
      const bookingData: Booking = {
        id: bookingRef.id,
        userId: profile.uid,
        labId: selectedLab.id,
        computerId: selectedPC.id,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        status: 'confirmed',
        createdAt: new Date().toISOString(),
      };

      await setDoc(bookingRef, bookingData);
      
      // Update PC status to occupied (in a real app, this would be more complex with time slots)
      await firestoreService.updateDocument(`labs/${selectedLab.id}/computers`, selectedPC.id, {
        status: 'occupied'
      });

      setBookingStatus('success');
      setTimeout(() => {
        setBookingStatus('idle');
        setSelectedPC(null);
      }, 3000);
    } catch (error) {
      console.error('Booking failed:', error);
      setBookingStatus('error');
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-48 bg-gray-200 rounded-2xl"></div>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
        {[...Array(16)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Book a Computer</h1>
          <p className="text-gray-500">Select a lab and an available PC to reserve your spot.</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
          {labs.map((lab) => (
            <button
              key={lab.id}
              onClick={() => setSelectedLab(lab)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                selectedLab?.id === lab.id 
                  ? "bg-indigo-600 text-white shadow-md" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              {lab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* PC Grid */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-indigo-600" />
                Available Computers
              </h2>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-gray-500">Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-gray-500">Occupied</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-gray-500">Maintenance</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {computers.map((pc) => (
                <motion.div
                  key={pc.id}
                  className="relative group"
                >
                  <motion.button
                    whileHover={pc.status === 'available' ? { scale: 1.05 } : {}}
                    whileTap={pc.status === 'available' ? { scale: 0.95 } : {}}
                    onClick={() => pc.status === 'available' && setSelectedPC(pc)}
                    disabled={pc.status !== 'available'}
                    className={cn(
                      "w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all border-2",
                      pc.status === 'available' 
                        ? selectedPC?.id === pc.id
                          ? "bg-indigo-50 border-indigo-600 text-indigo-700"
                          : "bg-green-50 border-green-100 hover:border-green-300 text-green-700"
                        : pc.status === 'occupied'
                          ? "bg-red-50 border-transparent text-red-400 cursor-not-allowed"
                          : "bg-gray-50 border-transparent text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Monitor className="w-6 h-6" />
                    <span className="text-xs font-bold">PC-{pc.pcNumber.toString().padStart(2, '0')}</span>
                  </motion.button>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setViewingPC(pc);
                    }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full shadow-sm border border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors z-10"
                  >
                    <Info className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Lab Timetable */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-900">Lab Timetable</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timetable
                .filter(entry => entry.labId === selectedLab?.id)
                .sort((a, b) => {
                  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                  const dayDiff = days.indexOf(a.dayOfWeek) - days.indexOf(b.dayOfWeek);
                  if (dayDiff !== 0) return dayDiff;
                  return a.startTime.localeCompare(b.startTime);
                })
                .map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{entry.title}</p>
                      <p className="text-xs text-gray-500">{entry.dayOfWeek} • {entry.startTime} - {entry.endTime}</p>
                    </div>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-bold uppercase">
                      {entry.reservedFor}
                    </span>
                  </div>
                ))}
              {timetable.filter(entry => entry.labId === selectedLab?.id).length === 0 && (
                <div className="col-span-full py-8 text-center">
                  <CalendarIcon className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400 italic">No special reservations for this lab.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-2xl flex items-start gap-4">
            <Info className="w-6 h-6 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-indigo-900">Lab Guidelines</h4>
              <p className="text-sm text-indigo-700 mt-1">
                Bookings are limited to 1 hour per session. Please ensure you arrive within 10 minutes of your start time, or your booking will be automatically cancelled.
              </p>
            </div>
          </div>
        </div>

        {/* Booking Panel */}
        <div className="space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Reservation Details</h2>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Selected Lab</label>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Monitor className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedLab?.name}</p>
                    <p className="text-xs text-gray-500">{selectedLab?.location}</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Selected PC</label>
                <div className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all",
                  selectedPC 
                    ? "bg-indigo-50 border-indigo-100" 
                    : "bg-gray-50 border-gray-100"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm",
                    selectedPC ? "bg-white" : "bg-gray-100"
                  )}>
                    <Monitor className={cn("w-5 h-5", selectedPC ? "text-indigo-600" : "text-gray-300")} />
                  </div>
                  <div>
                    <p className={cn("text-sm font-bold", selectedPC ? "text-gray-900" : "text-gray-400")}>
                      {selectedPC ? `PC-${selectedPC.pcNumber.toString().padStart(2, '0')}` : 'Select a PC'}
                    </p>
                    <p className="text-xs text-gray-500">Available for booking</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Time Slot</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-2">Bookings are for 1 hour duration.</p>
              </div>

              <button
                disabled={!selectedPC || bookingStatus === 'booking' || bookingStatus === 'success'}
                onClick={handleBooking}
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2",
                  !selectedPC || bookingStatus === 'booking' || bookingStatus === 'success'
                    ? "bg-gray-300 cursor-not-allowed shadow-none"
                    : "bg-indigo-600 hover:bg-indigo-700 active:scale-95"
                )}
              >
                {bookingStatus === 'booking' ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : bookingStatus === 'success' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmed!
                  </>
                ) : bookingStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-5 h-5" />
                    Failed
                  </>
                ) : (
                  <>
                    Confirm Booking
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* PC Details Modal */}
      <AnimatePresence>
        {viewingPC && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center text-white",
                    viewingPC.status === 'available' ? "bg-green-500" :
                    viewingPC.status === 'occupied' ? "bg-red-500" : "bg-gray-400"
                  )}>
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">PC-{viewingPC.pcNumber.toString().padStart(2, '0')}</h3>
                    <p className="text-sm text-gray-500 capitalize">{viewingPC.status}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingPC(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <XCircle className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Specifications</label>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {viewingPC.specs || 'No specifications provided for this PC.'}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4">
                  <button
                    onClick={() => {
                      if (viewingPC.status === 'available') {
                        setSelectedPC(viewingPC);
                      }
                      setViewingPC(null);
                    }}
                    disabled={viewingPC.status !== 'available'}
                    className={cn(
                      "w-full py-3 rounded-xl font-bold text-white transition-all",
                      viewingPC.status === 'available'
                        ? "bg-indigo-600 hover:bg-indigo-700 shadow-lg active:scale-95"
                        : "bg-gray-300 cursor-not-allowed"
                    )}
                  >
                    {viewingPC.status === 'available' ? 'Select this PC' : 'Currently Unavailable'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
