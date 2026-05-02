import { useEffect, useState } from 'react';
import { UserProfile, Booking, Lab } from '../types';
import { firestoreService } from '../services/firestoreService';
import { where, orderBy, limit } from 'firebase/firestore';
import { 
  Calendar, 
  Clock, 
  Monitor, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Users,
  Computer
} from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface DashboardProps {
  profile: UserProfile | null;
}

export function Dashboard({ profile }: DashboardProps) {
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;

    // Auto-cancel logic for no-shows (10 minutes late)
    const checkNoShows = async () => {
      const now = new Date();
      const allBookings = await firestoreService.getCollection<Booking>('bookings', [
        where('status', '==', 'confirmed')
      ]);

      for (const booking of allBookings) {
        const startTime = parseISO(booking.startTime);
        const lateLimit = new Date(startTime.getTime() + 10 * 60000); // 10 minutes later

        if (isAfter(now, lateLimit)) {
          await firestoreService.updateDocument('bookings', booking.id, { status: 'no-show' });
          await firestoreService.updateDocument(`labs/${booking.labId}/computers`, booking.computerId, { status: 'available' });
        }
      }
    };

    checkNoShows();
    const interval = setInterval(checkNoShows, 60000); // Check every minute

    const constraints = [
      where('userId', '==', profile.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    ];

    const unsubscribeBookings = firestoreService.subscribeToCollection<Booking>(
      'bookings',
      constraints,
      (data) => setRecentBookings(data),
      (error) => console.error(error)
    );

    const unsubscribeLabs = firestoreService.subscribeToCollection<Lab>(
      'labs',
      [],
      (data) => setLabs(data),
      (error) => console.error(error)
    );

    setLoading(false);

    return () => {
      clearInterval(interval);
      unsubscribeBookings();
      unsubscribeLabs();
    };
  }, [profile]);

  const stats = [
    { name: 'Active Bookings', value: recentBookings.filter(b => b.status === 'confirmed').length, icon: Calendar, color: 'bg-blue-500' },
    { name: 'Total Labs', value: labs.length, icon: Users, color: 'bg-indigo-500' },
    { name: 'Completed', value: recentBookings.filter(b => b.status === 'completed').length, icon: CheckCircle2, color: 'bg-green-500' },
    { name: 'Cancelled', value: recentBookings.filter(b => b.status === 'cancelled').length, icon: XCircle, color: 'bg-red-500' },
  ];

  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancelBooking = async (booking: Booking) => {
    try {
      await firestoreService.updateDocument('bookings', booking.id, { status: 'cancelled' });
      await firestoreService.updateDocument(`labs/${booking.labId}/computers`, booking.computerId, { status: 'available' });
      setCancellingId(null);
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      alert('Failed to cancel booking. Please try again.');
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
      >
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {profile?.displayName}!</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your lab bookings today.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-900">{format(new Date(), 'EEEE, MMMM do')}</p>
            <p className="text-xs text-gray-500">System Status: Online</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center text-white", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Recent Bookings</h2>
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View All</button>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {recentBookings.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        booking.status === 'confirmed' ? "bg-blue-50 text-blue-600" :
                        booking.status === 'completed' ? "bg-green-50 text-green-600" :
                        "bg-red-50 text-red-600"
                      )}>
                        <Monitor className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">PC-{booking.computerId.slice(-2)}</p>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(parseISO(booking.startTime), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-medium capitalize",
                        booking.status === 'confirmed' ? "bg-blue-100 text-blue-700" :
                        booking.status === 'completed' ? "bg-green-100 text-green-700" :
                        booking.status === 'no-show' ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {booking.status}
                      </span>
                      {booking.status === 'confirmed' && (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={async () => {
                              await firestoreService.updateDocument('bookings', booking.id, { status: 'completed' });
                              await firestoreService.updateDocument(`labs/${booking.labId}/computers`, booking.computerId, { status: 'available' });
                            }}
                            className="text-[10px] font-bold text-green-600 hover:underline"
                          >
                            Mark as Arrived
                          </button>
                          {cancellingId === booking.id ? (
                            <div className="flex items-center gap-2 mt-1">
                              <button
                                onClick={() => handleCancelBooking(booking)}
                                className="text-[10px] font-bold text-red-600 hover:underline"
                              >
                                Yes, Cancel
                              </button>
                              <button
                                onClick={() => setCancellingId(null)}
                                className="text-[10px] font-bold text-gray-500 hover:underline"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setCancellingId(booking.id)}
                              className="text-[10px] font-bold text-red-600 hover:underline"
                            >
                              Cancel Booking
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent bookings found.</p>
                <button className="mt-4 text-indigo-600 font-medium">Book your first PC</button>
              </div>
            )}
          </div>
        </div>

        {/* Lab Availability */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Lab Status</h2>
          <div className="space-y-4">
            {labs.map((lab) => (
              <div key={lab.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">{lab.name}</h3>
                  <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                    {lab.location}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Availability</span>
                    <span className="font-medium text-gray-900">85%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-indigo-600 h-2 rounded-full w-[85%]"></div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {lab.totalPCs} total computers available
                  </p>
                </div>
              </div>
            ))}
            {labs.length === 0 && (
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center py-12">
                <Computer className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No labs configured yet.</p>
                <button 
                  onClick={async () => {
                    const { collection, doc, setDoc } = await import('firebase/firestore');
                    const { db } = await import('../firebase');
                    
                    const labRef = doc(collection(db, 'labs'));
                    const labId = labRef.id;
                    await setDoc(labRef, {
                      id: labId,
                      name: 'Main Lab (Lab A)',
                      description: 'Primary computer lab for general access.',
                      totalPCs: 24,
                      location: 'Building 1, Floor 2'
                    });

                    for (let i = 1; i <= 24; i++) {
                      const pcRef = doc(collection(db, `labs/${labId}/computers`));
                      await setDoc(pcRef, {
                        id: pcRef.id,
                        labId: labId,
                        pcNumber: i,
                        status: 'available'
                      });
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                >
                  Quick Start: Create Sample Lab
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
