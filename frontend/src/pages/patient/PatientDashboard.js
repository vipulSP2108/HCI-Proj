import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';
import { Play, LogOut, TrendingUp, Clock, Target, Award } from 'lucide-react';

const PatientDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await gameService.getBasicStats();
      setStats(response.stats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl shadow-2xl p-8 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">Patient Dashboard</h1>
              <p className="text-primary-100 text-lg">{user?.email}</p>
              <p className="text-primary-200 text-sm mt-2">
                Response Time: <span className="font-semibold text-white">{stats?.currentlevelspan || 5} seconds</span>
              </p>
            </div>
            <button 
              onClick={handleLogout} 
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition shadow-lg"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Stats Cards Column */}
          <div className="lg:col-span-1 space-y-4">
            {/* Main Stats */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary-600" />
                Your Stats
              </h2>
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-4 border-2 border-primary-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-semibold">Level</p>
                    <Award className="w-5 h-5 text-primary-600" />
                  </div>
                  <p className="text-5xl font-bold text-primary-600">{stats?.level || 1}</p>
                </div>

                <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-lg p-4 border-2 border-secondary-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-semibold">Total Score</p>
                    <Target className="w-5 h-5 text-secondary-600" />
                  </div>
                  <p className="text-5xl font-bold text-secondary-600">{stats?.totalScore || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-2 border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-semibold">Sessions Played</p>
                    <Play className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-5xl font-bold text-green-600">{stats?.recentSessions?.length || 0}</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600 font-semibold">Response Time</p>
                    <Clock className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-4xl font-bold text-orange-600">{stats?.currentlevelspan || 5}s</p>
                  <p className="text-xs text-gray-500 mt-1">Time allowed per attempt</p>
                </div>
              </div>
            </div>

            {/* Play Game Button */}
            <button 
              onClick={() => navigate('/game')} 
              className="w-full flex items-center justify-center gap-3 px-8 py-8 bg-gradient-to-r from-success-500 to-success-600 text-white rounded-xl font-bold text-2xl hover:from-success-600 hover:to-success-700 transition shadow-2xl transform hover:scale-105"
            >
              <Play className="w-10 h-10" />
              Play Game
            </button>
          </div>

          {/* Recent Sessions Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Sessions</h2>
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                      <p className="text-xs text-green-700 font-semibold mb-1">Total Correct</p>
                      <p className="text-2xl font-bold text-green-600">
                        {stats.recentSessions.reduce((sum, s) => sum + s.correct, 0)}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                      <p className="text-xs text-red-700 font-semibold mb-1">Total Incorrect</p>
                      <p className="text-2xl font-bold text-red-600">
                        {stats.recentSessions.reduce((sum, s) => sum + s.incorrect, 0)}
                      </p>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center border border-yellow-200">
                      <p className="text-xs text-yellow-700 font-semibold mb-1">Total Not Done</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {stats.recentSessions.reduce((sum, s) => sum + s.notDone, 0)}
                      </p>
                    </div>
                  </div>

                  {/* Session Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200 bg-gray-50">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Attempts</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">✓ Correct</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">✗ Incorrect</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">⊘ Not Done</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Accuracy</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentSessions.slice().reverse().map((session, index) => {
                          const accuracy = session.correct + session.incorrect > 0
                            ? ((session.correct / (session.correct + session.incorrect)) * 100).toFixed(1)
                            : 0;

                          return (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {new Date(session.time).toLocaleDateString()}
                                <span className="block text-xs text-gray-400">
                                  {new Date(session.time).toLocaleTimeString()}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-semibold text-sm">
                                  {session.total}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold text-sm">
                                  {session.correct}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold text-sm">
                                  {session.incorrect}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-semibold text-sm">
                                  {session.notDone}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-bold text-lg ${
                                  accuracy >= 80 ? 'text-green-600' :
                                  accuracy >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {accuracy}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Performance Indicator */}
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-semibold mb-2">💡 Quick Tip:</p>
                    <p className="text-sm text-blue-700">
                      Try to respond within <span className="font-bold">{stats.currentlevelspan} seconds</span> to avoid "Not Done" entries. 
                      Practice regularly to improve your accuracy and response time!
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mb-6">
                    <Play className="w-24 h-24 text-gray-300 mx-auto" />
                  </div>
                  <p className="text-xl text-gray-400 mb-4 font-semibold">No sessions yet!</p>
                  <p className="text-gray-500 mb-6">Start playing to see your progress and statistics</p>
                  <button 
                    onClick={() => navigate('/game')} 
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg hover:from-primary-600 hover:to-secondary-600 transition shadow-lg font-semibold text-lg"
                  >
                    <Play className="w-6 h-6" />
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

export default PatientDashboard;
