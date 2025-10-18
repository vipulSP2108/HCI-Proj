import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { gameService } from '../../services/gameService';
import { ArrowLeft, TrendingUp, Target, Clock, Zap, Settings } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

const PatientAnalytics = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLevelSpanModal, setShowLevelSpanModal] = useState(false);
  const [newLevelSpan, setNewLevelSpan] = useState(5);

  useEffect(() => {
    loadAnalytics();
  }, [patientId]);

  const loadAnalytics = async () => {
    try {
      const response = await gameService.getDetailedAnalytics(patientId);
      setAnalytics(response.analytics);
      setNewLevelSpan(response.analytics.user.currentlevelspan);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      alert('Failed to load patient analytics');
    } finally {
      setLoading(false);
    }
  };

  const updateLevelSpan = async () => {
    try {
      await gameService.updateLevelSpan(patientId, newLevelSpan);
      alert('Level span updated successfully!');
      setShowLevelSpanModal(false);
      loadAnalytics();
    } catch (error) {
      alert('Failed to update level span');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">No data available</div>
      </div>
    );
  }

  // Prepare data for visualizations
  const sessions = analytics.sessions || [];

  // 1. Response Time Scatter Plot Data (from latest session)
  const latestSession = sessions.length > 0 ? sessions[sessions.length - 1] : null;
  const scatterData = latestSession?.play?.map((entry, index) => ({
    attempt: index + 1,
    responsetime: entry.responsetime === -1 ? analytics.user.currentlevelspan + 0.5 : entry.responsetime,
    actualTime: entry.responsetime,
    correct: entry.correct,
    color: entry.correct === 1 ? '#10b981' : entry.correct === -1 ? '#ef4444' : '#f59e0b'
  })) || [];

  // 2. Session Performance Data
  const sessionPerformanceData = sessions.map((session, index) => {
    const correct = session.play.filter(p => p.correct === 1).length;
    const incorrect = session.play.filter(p => p.correct === -1).length;
    const notDone = session.play.filter(p => p.correct === 0).length;

    return {
      name: `Session ${index + 1}`,
      date: new Date(session.time).toLocaleDateString(),
      correct,
      incorrect,
      notDone,
      total: session.play.length
    };
  });

  // 3. Overall Distribution Pie Data
  const pieData = [
    { name: 'Correct', value: analytics.overallStats.totalCorrect, color: '#10b981' },
    { name: 'Incorrect', value: analytics.overallStats.totalIncorrect, color: '#ef4444' },
    { name: 'Not Done', value: analytics.overallStats.totalNotDone, color: '#f59e0b' }
  ];

  // 4. Average Response Time Trend
  const avgResponseTimeTrend = sessions.map((session, index) => {
    const validResponses = session.play.filter(p => p.responsetime !== -1);
    const avgTime = validResponses.length > 0
      ? (validResponses.reduce((sum, p) => sum + p.responsetime, 0) / validResponses.length).toFixed(2)
      : 0;

    return {
      session: `S${index + 1}`,
      avgResponseTime: parseFloat(avgTime),
      levelspan: session.levelspan
    };
  });

  // Custom tooltip for scatter plot
  const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-gray-200">
          <p className="font-semibold text-gray-800">Attempt #{data.attempt}</p>
          <p className="text-sm">
            Time: <span className="font-semibold text-blue-600">
              {data.actualTime === -1 ? 'Exceeded' : `${data.actualTime}s`}
            </span>
          </p>
          <p className="text-sm">
            Status: <span className={`font-semibold ${
              data.correct === 1 ? 'text-green-600' :
              data.correct === -1 ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {data.correct === 1 ? '✓ Correct' : data.correct === -1 ? '✗ Incorrect' : '⊘ Not Done'}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => navigate('/doctor/dashboard')} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
            <button
              onClick={() => setShowLevelSpanModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition shadow-lg"
            >
              <Settings className="w-5 h-5" />
              Update Level Span
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Patient Analytics</h1>
          <p className="text-gray-600 text-lg">{analytics.user.email}</p>
          <p className="text-sm text-gray-500 mt-1">
            Current Level Span: <span className="font-semibold text-primary-600">{analytics.user.currentlevelspan} seconds</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-primary-100">Total Sessions</p>
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold">{analytics.overallStats.totalSessions}</p>
          </div>

          <div className="bg-gradient-to-br from-success-500 to-success-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-green-100">Accuracy</p>
              <Target className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold">{analytics.overallStats.accuracy.toFixed(1)}%</p>
            <p className="text-xs text-green-100 mt-1">
              {analytics.overallStats.totalCorrect} correct / {analytics.overallStats.totalCorrect + analytics.overallStats.totalIncorrect} attempted
            </p>
          </div>

          <div className="bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-yellow-100">Avg Response</p>
              <Clock className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold">{analytics.overallStats.avgResponseTime}s</p>
            <p className="text-xs text-yellow-100 mt-1">Valid responses only</p>
          </div>

          <div className="bg-gradient-to-br from-secondary-500 to-secondary-600 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-purple-100">Total Score</p>
              <Zap className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold">{analytics.user.totalScore}</p>
            <p className="text-xs text-purple-100 mt-1">Level {analytics.user.level}</p>
          </div>
        </div>

        {/* Charts Row 1: Response Time Scatter + Session Performance */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Response Time Scatter Plot */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Response Time Analysis</h2>
            <p className="text-sm text-gray-600 mb-4">
              Latest Session - Individual response times
              <span className="block text-xs text-gray-500 mt-1">
                Green = Correct, Red = Incorrect, Yellow = Not Done (exceeded {analytics.user.currentlevelspan}s)
              </span>
            </p>
            {scatterData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="attempt" 
                    name="Attempt" 
                    label={{ value: 'Attempt Number', position: 'insideBottom', offset: -10 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="responsetime" 
                    name="Time" 
                    label={{ value: 'Response Time (s)', angle: -90, position: 'insideLeft' }}
                    domain={[0, analytics.user.currentlevelspan + 1]}
                  />
                  <Tooltip content={<CustomScatterTooltip />} />
                  <Scatter 
                    data={scatterData} 
                    fill="#8884d8"
                  >
                    {scatterData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No session data available
              </div>
            )}
          </div>

          {/* Session Performance Bar Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Session Performance</h2>
            <p className="text-sm text-gray-600 mb-4">Correct vs Incorrect vs Not Done per session</p>
            {sessionPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sessionPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="correct" fill="#10b981" name="Correct" />
                  <Bar dataKey="incorrect" fill="#ef4444" name="Incorrect" />
                  <Bar dataKey="notDone" fill="#f59e0b" name="Not Done" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No session data available
              </div>
            )}
          </div>
        </div>

        {/* Charts Row 2: Distribution Pie + Response Time Trend */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Overall Distribution Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Overall Distribution</h2>
            <p className="text-sm text-gray-600 mb-4">All attempts across all sessions</p>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Average Response Time Trend */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">Response Time Trend</h2>
            <p className="text-sm text-gray-600 mb-4">Average response time per session</p>
            {avgResponseTimeTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={avgResponseTimeTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="session" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    stroke="#667eea" 
                    strokeWidth={3} 
                    dot={{ fill: '#667eea', r: 6 }} 
                    name="Avg Response Time (s)" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="levelspan" 
                    stroke="#f59e0b" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    dot={{ fill: '#f59e0b', r: 4 }} 
                    name="Level Span (s)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                No trend data available
              </div>
            )}
          </div>
        </div>

        {/* Detailed Session Table */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Session History</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Level Span</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Attempts</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Correct</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Incorrect</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Not Done</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice().reverse().map((session, index) => {
                  const correct = session.play.filter(p => p.correct === 1).length;
                  const incorrect = session.play.filter(p => p.correct === -1).length;
                  const notDone = session.play.filter(p => p.correct === 0).length;
                  const accuracy = correct + incorrect > 0 ? ((correct / (correct + incorrect)) * 100).toFixed(1) : 0;

                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{new Date(session.time).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-semibold">
                          {session.levelspan}s
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold">{session.play.length}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded font-semibold">
                          {correct}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded font-semibold">
                          {incorrect}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded font-semibold">
                          {notDone}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-primary-600">{accuracy}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Level Span Update Modal */}
        {showLevelSpanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Update Level Span</h3>
              <p className="text-gray-600 mb-6">
                Adjust how many seconds the patient has to respond to each letter.
              </p>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Level Span: <span className="text-primary-600 text-3xl">{newLevelSpan}s</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={newLevelSpan}
                  onChange={(e) => setNewLevelSpan(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>1s (Harder)</span>
                  <span>5s (Medium)</span>
                  <span>10s (Easier)</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={updateLevelSpan}
                  className="flex-1 bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 rounded-lg font-semibold hover:from-primary-600 hover:to-secondary-600 transition shadow-lg"
                >
                  💾 Update Level Span
                </button>
                <button
                  onClick={() => {
                    setNewLevelSpan(analytics.user.currentlevelspan);
                    setShowLevelSpanModal(false);
                  }}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientAnalytics;
