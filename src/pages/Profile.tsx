import { UserProfile } from '../types';
import { User, Mail, Shield, Calendar, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';

interface ProfileProps {
  profile: UserProfile | null;
}

export function Profile({ profile }: ProfileProps) {
  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-3xl mx-auto mb-6">
          {profile.displayName?.[0] || 'U'}
        </div>
        <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
        <p className="text-gray-500 mt-1">{profile.email}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
          <Shield className="w-3 h-3" />
          {profile.role}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Account Details</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Full Name</p>
                <p className="text-sm font-medium text-gray-900">{profile.displayName}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Email Address</p>
                <p className="text-sm font-medium text-gray-900">{profile.email}</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Joined On</p>
                <p className="text-sm font-medium text-gray-900">{format(new Date(profile.createdAt), 'MMMM do, yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Status</p>
                <p className={cn(
                  "text-sm font-bold uppercase tracking-wider",
                  profile.status === 'active' ? "text-green-600" : "text-red-600"
                )}>
                  {profile.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
