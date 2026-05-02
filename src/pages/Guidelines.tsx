import { BookOpen, FileText, Download, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { motion } from 'motion/react';

export function Guidelines() {
  const rules = [
    { title: 'Booking Duration', text: 'Each booking session is limited to 1 hour. You can book up to 2 sessions per day.', icon: CheckCircle },
    { title: 'Grace Period', text: 'You must arrive within 10 minutes of your start time. After 10 minutes, the booking is automatically cancelled.', icon: AlertCircle },
    { title: 'PC Usage', text: 'Only use the computer assigned to you. Do not switch computers without a valid reason.', icon: Info },
    { title: 'Lab Etiquette', text: 'Maintain silence and keep the lab clean. No food or drinks are allowed near the computers.', icon: CheckCircle },
    { title: 'Data Security', text: 'Always log out of your accounts before leaving. The system is not responsible for any data loss.', icon: AlertCircle },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-indigo-600 p-12 rounded-3xl text-white relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-4">Lab Usage Guidelines</h1>
          <p className="text-indigo-100 text-lg max-w-xl">
            Please read and follow these guidelines to ensure a smooth and productive environment for everyone in the computer lab.
          </p>
          <button className="mt-8 flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg active:scale-95">
            <Download className="w-5 h-5" />
            Download PDF Guide
          </button>
        </div>
        <BookOpen className="absolute -right-12 -bottom-12 w-64 h-64 text-indigo-500 opacity-20 rotate-12" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rules.map((rule, index) => (
          <motion.div
            key={rule.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-6"
          >
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 flex-shrink-0">
              <rule.icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{rule.title}</h3>
              <p className="text-gray-600 leading-relaxed">{rule.text}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Lab Timetable</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Time Slot</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Monday - Friday</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">Saturday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ['08:00 AM - 10:00 AM', 'Open Access', 'Open Access'],
                ['10:00 AM - 12:00 PM', 'Class Reserved', 'Open Access'],
                ['12:00 PM - 01:00 PM', 'Maintenance', 'Closed'],
                ['01:00 PM - 04:00 PM', 'Open Access', 'Open Access'],
                ['04:00 PM - 06:00 PM', 'Advanced Research', 'Closed'],
              ].map(([time, weekday, saturday]) => (
                <tr key={time} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{time}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{weekday}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{saturday}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
