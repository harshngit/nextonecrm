import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Eye, EyeOff, Lock, Mail, Phone } from 'lucide-react'
import { login, clearError } from '../store/authSlice'
import logo from '../asset/image.png'

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
    return () => {
      dispatch(clearError())
    }
  }, [isAuthenticated, navigate, dispatch])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const credentials = loginMethod === 'email' 
      ? { email, password } 
      : { phone_number: phone, password }

    dispatch(login(credentials))
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] flex items-center justify-center p-4">
      {/* Background Subtle Pattern */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#b1916c 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      
      <div className="w-full max-w-[440px] z-10">
        {/* Card Container */}
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(177,145,108,0.1)] border border-gray-100 overflow-hidden">
          
          {/* Header/Logo Section */}
          <div className="pt-10 pb-6 px-8 text-center bg-white">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 border border-gray-50 p-2">
              <img src={logo} alt="Next One Realty" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight">Next One Realty</h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">CRM Workspace Login</p>
          </div>

          <div className="px-8 pb-10">
            {/* Login Method Tabs */}
            <div className="flex p-1 bg-gray-50 rounded-xl mb-8 border border-gray-100">
              <button
                type="button"
                onClick={() => setLoginMethod('email')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  loginMethod === 'email' 
                    ? 'bg-white text-[#b1916c] shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                EMAIL ADDRESS
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  loginMethod === 'phone' 
                    ? 'bg-white text-[#b1916c] shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                PHONE NUMBER
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-xs font-medium text-red-600 animate-shake">
                  {error}
                </div>
              )}

              {/* Email or Phone Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                  {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#b1916c] transition-colors">
                    {loginMethod === 'email' ? <Mail size={18} /> : <Phone size={18} />}
                  </div>
                  <input
                    type={loginMethod === 'email' ? 'email' : 'tel'}
                    value={loginMethod === 'email' ? email : phone}
                    onChange={e => loginMethod === 'email' ? setEmail(e.target.value) : setPhone(e.target.value)}
                    placeholder={loginMethod === 'email' ? 'name@company.com' : '+91 00000 00000'}
                    className="w-full pl-12 pr-4 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#b1916c] focus:ring-4 focus:ring-[#b1916c]/5 transition-all text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between mb-2 ml-1">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button type="button" className="text-xs font-semibold text-[#b1916c] hover:text-[#9a7a58] transition-colors">
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#b1916c] transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#b1916c] focus:ring-4 focus:ring-[#b1916c]/5 transition-all text-gray-900 placeholder-gray-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#b1916c] hover:bg-[#9a7a58] disabled:opacity-70 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-sm shadow-[0_10px_20px_rgba(177,145,108,0.2)] hover:shadow-[0_15px_25px_rgba(177,145,108,0.3)] mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    AUTHENTICATING...
                  </>
                ) : (
                  'SIGN INTO WORKSPACE'
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            © 2024 Next One Realty • Secure Environment
          </p>
        </div>
      </div>
    </div>
  )
}
