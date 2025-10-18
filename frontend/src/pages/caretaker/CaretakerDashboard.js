import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';
import { Play, LogOut, TrendingUp } from 'lucide-react';

const CaretakerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await gameService.getBasicStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-secondary-600 to-primary-600 rounded-2xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Caretaker Dashboard</h1>
              <p className="text-purple-100">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition shadow-lg">
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-secondary-600" />
                Your Stats
              </h2>
              {stats && (
                <div className="space-y-4">
                  <div className="bg-secondary-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Level</p>
                    <p className="text-4xl font-bold text-secondary-600">{stats.level}</p>
                  </div>
                  <div className="bg-primary-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Total Score</p>
                    <p className="text-4xl font-bold text-primary-600">{stats.totalScore}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-1">Sessions Played</p>
                    <p className="text-4xl font-bold text-green-600">{stats.recentSessions?.length || 0}</p>
                  </div>
                </div>
              )}
            </div>

            <button onClick={() => navigate('/game')} className="w-full flex items-center justify-center gap-3 px-8 py-6 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl font-bold text-xl hover:from-success-600 hover:to-success-700 transition shadow-2xl">
              <Play className="w-8 h-8" />
              Play Game
            </button>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Sessions</h2>
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Correct</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Incorrect</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Unattempted</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentSessions.slice(-7).reverse().map((session, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">{new Date(session.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">{session.correctResponses}</span></td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">{session.incorrectResponses}</span></td>
                          <td className="py-3 px-4"><span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">{session.unattemptedResponses}</span></td>
                          <td className="py-3 px-4 font-bold text-secondary-600">{session.score}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="mb-4">No sessions yet. Start playing to see your progress!</p>
                  <button onClick={() => navigate('/game')} className="inline-flex items-center gap-2 px-6 py-3 bg-secondary-500 text-white rounded-lg hover:bg-secondary-600 transition">
                    <Play className="w-5 h-5" />
                    Play Your First Game
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaretakerDashboard;
