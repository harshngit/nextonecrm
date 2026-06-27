import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'
import api from '../api/axios'
import logo from '../asset/image.png'

export default function ForgotPassword() {
  const navigate = useNavigate()

  const [step, setStep] = useState('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/forgot-password', { email })
      setToken(res.data.data.token)
      setStep('reset')
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, new_password: newPassword })
      setStep('done')
      setSuccess('Password reset successfully!')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Token may have expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#f8f9fa] flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#0082f3 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

      <div className="w-full max-w-[440px] z-10">
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,130,243,0.1)] border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="pt-10 pb-6 px-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-6 border border-gray-50 p-2">
              <img src={logo} alt="Next One Realty" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight">
              {step === 'done' ? 'All Done!' : 'Reset Password'}
            </h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">
              {step === 'email' && 'Enter your email to verify your account'}
              {step === 'reset' && 'Set your new password'}
              {step === 'done' && 'Your password has been updated'}
            </p>
          </div>

          <div className="px-8 pb-10">

            {/* Step 1: Email verification */}
            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                    Email Address
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0082f3] transition-colors">
                      <Mail size={18} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full pl-12 pr-4 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#0082f3] focus:ring-4 focus:ring-[#0082f3]/5 transition-all text-gray-900 placeholder-gray-400"
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-[#0082f3] hover:bg-[#0068c2] disabled:opacity-70 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-sm shadow-[0_10px_20px_rgba(0,130,243,0.2)] hover:shadow-[0_15px_25px_rgba(0,130,243,0.3)]">
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> VERIFYING...</>
                  ) : (
                    'VERIFY EMAIL'
                  )}
                </button>
              </form>
            )}

            {/* Step 2: New password */}
            {step === 'reset' && (
              <form onSubmit={handleResetSubmit} className="space-y-5">
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 border border-green-100">
                  <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                  <p className="text-xs font-medium text-green-600">Email verified! Set your new password below.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
                    <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
                    <p className="text-xs font-medium text-red-600">{error}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                    New Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0082f3] transition-colors">
                      <Lock size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full pl-12 pr-12 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#0082f3] focus:ring-4 focus:ring-[#0082f3]/5 transition-all text-gray-900 placeholder-gray-400"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                    Confirm Password
                  </label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#0082f3] transition-colors">
                      <ShieldCheck size={18} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-12 pr-4 py-3.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-[#0082f3] focus:ring-4 focus:ring-[#0082f3]/5 transition-all text-gray-900 placeholder-gray-400"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-4 bg-[#0082f3] hover:bg-[#0068c2] disabled:opacity-70 text-white font-bold rounded-xl transition-all duration-300 flex items-center justify-center gap-3 text-sm shadow-[0_10px_20px_rgba(0,130,243,0.2)] hover:shadow-[0_15px_25px_rgba(0,130,243,0.3)]">
                  {loading ? (
                    <><Loader2 size={18} className="animate-spin" /> RESETTING...</>
                  ) : (
                    'RESET PASSWORD'
                  )}
                </button>
              </form>
            )}

            {/* Step 3: Success */}
            {step === 'done' && (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={32} className="text-green-500" />
                </div>
                <p className="text-sm text-gray-600">Your password has been reset successfully. You can now sign in with your new password.</p>
                <button onClick={() => navigate('/login')}
                  className="w-full py-4 bg-[#0082f3] hover:bg-[#0068c2] text-white font-bold rounded-xl transition-all duration-300 text-sm shadow-[0_10px_20px_rgba(0,130,243,0.2)]">
                  BACK TO LOGIN
                </button>
              </div>
            )}

            {/* Back to login link */}
            {step !== 'done' && (
              <div className="mt-6 text-center">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0082f3] hover:text-[#0068c2] transition-colors">
                  <ArrowLeft size={14} /> Back to Login
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            © 2024 Next One Realty
          </p>
        </div>
      </div>
    </div>
  )
}
