import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authService } from "../../services/authService";
import { LogIn, Mail, Lock, User, Stethoscope, Shield, Sun, Moon, Eye, EyeOff } from "lucide-react";

const LoginPage = () => {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, user, isDarkMode, toggleDarkMode } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.type === "doctor") navigate("/doctor/dashboard", { replace: true });
      else if (user.type === "patient") navigate("/patient/dashboard", { replace: true });
      else if (user.type === "caretaker") navigate("/caretaker/dashboard", { replace: true });
      else if (user.type === "admin") navigate("/admin/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await authService.login(formData);
      login(response.user, response.token);

      if (response.user.type === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (response.user.type === "patient") {
        navigate("/patient/dashboard", { replace: true });
      } else if (response.user.type === "caretaker") {
        navigate("/caretaker/dashboard", { replace: true });
      } else if (response.user.type === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (email, password) => {
    setError("");
    setLoading(true);
    setFormData({ email, password });

    try {
      const response = await authService.login({ email, password });
      login(response.user, response.token);

      if (response.user.type === "doctor") {
        navigate("/doctor/dashboard", { replace: true });
      } else if (response.user.type === "patient") {
        navigate("/patient/dashboard", { replace: true });
      } else if (response.user.type === "caretaker") {
        navigate("/caretaker/dashboard", { replace: true });
      } else if (response.user.type === "admin") {
        navigate("/admin/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      <button 
        onClick={toggleDarkMode}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-gray-500 dark:text-gray-300 transition-colors"
        title="Toggle Dark Mode"
      >
        {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
      </button>

      <div className={`border rounded-lg p-8 w-full max-w-md shadow-sm transition-colors duration-300 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#69CBEE] text-white mb-3 shadow-md">
            <LogIn className="w-7 h-7" />
          </div>
          <h2 className={`text-2xl font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>Welcome Back</h2>
          <p className={`text-sm mt-1 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>Sign in to continue</p>
        </div>

        <div className="text-center text-xs uppercase text-gray-400 my-6 flex items-center">
          <span className="border-t  border-gray-300 flex-grow mr-2"></span>
          Quick Demo Logins
          <span className="border-t border-gray-300 flex-grow ml-2"></span>
        </div>

        {/* Demo Buttons Section - 3 in a row */}
        <div className="mb-5">
          {/* <p className="text-center text-sm text-gray-600 mb-4">Quick Demo Logins</p> */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() =>
                handleDemoLogin("demo.patient@gmail.com", "demo.patient@123")
              }
              disabled={loading}
              className="flex items-center px-2 justify-center w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md text-sm font-medium transition disabled:opacity-50"
            >
              <User className="" />
              Demo as Patient
            </button>

            <button
              onClick={() =>
                handleDemoLogin("demo.doctor@gmail.com", "demo.doctor@123")
              }
              disabled={loading}
              className="flex items-center px-2 justify-center w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-md text-sm font-medium transition disabled:opacity-50"
            >
              <Stethoscope className="" />
              Demo as Doctor
            </button>

              <button
                type="button"
                onClick={() => handleDemoLogin("demo.caretaker@gmail.com", "demo.caretaker@123")}
                className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors border border-emerald-200"
              >
                <User className="w-4 h-4" />
                Caretaker Demo
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin("admin@gmail.com", "admin@123")}
                className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-purple-50 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors border border-purple-200"
              >
                <Shield className="w-4 h-4" />
                Admin Login
              </button>
          </div>
        </div>

        {/* Divider */}
        <div className="text-center text-xs text-gray-400 my-6 flex items-center">
          <span className="border-t border-gray-300 flex-grow mr-2"></span>
          OR SIGN IN MANUALLY
          <span className="border-t border-gray-300 flex-grow ml-2"></span>
        </div>

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Email
            </label>
            <div className="relative">
              <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-3 py-2 border rounded-md focus:ring-1 focus:ring-[#2F71EB] focus:border-[#2F71EB] text-sm outline-none transition-colors ${
                  isDarkMode 
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
              Password
            </label>
            <div className="relative">
              <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-400"}`} />
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-md focus:ring-1 focus:ring-[#2F71EB] focus:border-[#2F71EB] text-sm outline-none transition-colors ${
                  isDarkMode 
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400" 
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={`absolute right-3 top-1/2 -translate-y-1/2 hover:text-gray-500 transition-colors ${isDarkMode ? "text-gray-400" : "text-gray-400"}`}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Box */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2F71EB] hover:bg-[#2763CF] text-white py-2 rounded-md text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-5 text-center space-y-2">
          <Link
            to="/forgot-password"
            className="text-[#2F71EB] hover:underline text-sm"
          >
            Forgot your password?
          </Link>

          <div className="text-xs text-gray-400 flex items-center justify-center">
            <span className="border-t border-gray-300 flex-grow mr-2"></span>
            New here?
            <span className="border-t border-gray-300 flex-grow ml-2"></span>
          </div>

          <Link
            to="/register"
            className="text-[#2F71EB] hover:underline text-sm"
          >
            Create a Doctor Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
