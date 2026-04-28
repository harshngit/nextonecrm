import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Eye, EyeOff, Lock, Mail, ChevronDown, Sun, Moon, Phone } from 'lucide-react'
import { login, clearError } from '../store/authSlice'
import { useTheme } from '../context/ThemeContext'

// Swiper imports
import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Pagination, EffectFade } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import 'swiper/css/effect-fade'

// Custom Swiper pagination styles
const swiperPaginationStyles = `
  .swiper-pagination-bullet {
    background-color: rgba(255, 255, 255, 0.6);
    opacity: 1;
    width: 8px;
    height: 8px;
    transition: all 0.3s ease;
  }
  .swiper-pagination-bullet-active {
    background-color: var(--color-brand); /* Assuming --color-brand is defined in your CSS */
    width: 24px;
    border-radius: 4px;
  }
`

// Image imports
import logo from '../asset/image.png'
import img1 from '../asset/ADANI LINKBAY.png'
import img2 from '../asset/Bharat Altavista.png'
import img3 from '../asset/Bharat Auravista.png'
import img4 from '../asset/DLF Andheri West.png'
import img5 from '../asset/DOODHWALA.png'
import img6 from '../asset/Mahindra_Marine_64.png'
import img7 from '../asset/Veena One Luxe.png'
import img8 from '../asset/Veera_Desai.png'
import img9 from '../asset/Westcenter Kandivali West.png'

const roles = ['Super Admin', 'Admin', 'Sales Manager', 'Sales Executive', 'External Caller']
const showcaseImages = [
  { url: img1, title: 'Adani Linkbay' },
  { url: img2, title: 'Bharat Altavista' },
  { url: img3, title: 'Bharat Auravista' },
  { url: img4, title: 'DLF Andheri West' },
  { url: img5, title: 'Doodhwala' },
  { url: img6, title: 'Mahindra Marine 64' },
  { url: img7, title: 'Veena One Luxe' },
  { url: img8, title: 'Veera Desai' },
  { url: img9, title: 'Westcenter Kandivali West' },
]

export default function Login() {
  const [loginMethod, setLoginMethod] = useState('email') // 'email' or 'phone'
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth)
  const dispatch = useDispatch()
  const { isDark, toggleTheme } = useTheme()
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
    <>
      <style>{swiperPaginationStyles}</style>
      <div className="h-screen w-screen bg-white dark:bg-[#0f0f0f] flex items-center justify-center relative overflow-hidden">
      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 z-50 w-9 h-9 flex items-center justify-center rounded-xl bg-white/80 dark:bg-[#1a1a1a]/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 text-gray-500 hover:text-brand shadow-brand/10 shadow-lg transition-all"
      >
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      <div className="flex w-full h-full overflow-hidden">
        {/* Left Side - Swiper (Desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-[#1a1a1a] h-full overflow-hidden">
          <Swiper
            modules={[Autoplay, Pagination, EffectFade]}
            effect="fade"
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            className="w-full h-full"
          >
            {showcaseImages.map((img, index) => (
              <SwiperSlide key={index} className="h-full w-full">
                <div className="relative w-full h-full overflow-hidden">
                  <div className={`absolute inset-0 z-10 bg-gradient-to-t ${isDark ? 'from-black via-black/40' : 'from-brand/80 via-brand/20'} to-transparent transition-colors duration-300`} />
                  <img 
                    src={img.url} 
                    alt={img.title}
                    className="w-full h-full object-cover transform scale-105"
                  />
                  <div className="absolute bottom-16 left-12 z-20 max-w-md">
                    <h2 className={`text-4xl font-display font-bold mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)] ${isDark ? 'text-brand' : 'text-white'} transition-colors duration-300`}>{img.title}</h2>
                    <p className={`text-lg drop-shadow-[0_1px_2px_rgba(0,0,0,0.7)] ${isDark ? 'text-brand/90' : 'text-white/90'} transition-colors duration-300`}>Experience luxury living with Next One Realty's premium properties.</p>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          {/* Decorative pattern overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative h-full">
          {/* Background decoration for mobile/tablet */}
          <div className="absolute inset-0 lg:hidden overflow-hidden pointer-events-none">
            <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand/5 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-brand/8 blur-3xl" />
          </div>

          <div className="w-full max-w-[420px] relative py-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-brand/20 shadow-2xl mb-1 overflow-hidden border border-gray-200 dark:border-gray-800">
                <img src={logo} alt="Next One Realty" className="w-full h-full object-contain" />
              </div>
              <h1 className="font-display text-3xl font-semibold text-gray-900 dark:text-white mb-1">Next One Realty</h1>
              <p className="text-sm text-gray-500 dark:text-[#888]">Sign in to your CRM workspace</p>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-brand/10 shadow-2xl p-8">
              {/* Login Method Toggle */}
              <div className="flex p-1 bg-gray-50 dark:bg-[#0f0f0f] rounded-xl mb-6 border border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setLoginMethod('email')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Email Login
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMethod('phone')}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white dark:bg-[#1a1a1a] text-brand shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Phone Login
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                {/* Email or Phone */}
                {loginMethod === 'email' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@n1r.com"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand dark:focus:border-brand transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 00000 00000"
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand dark:focus:border-brand transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400"
                      />
                    </div>
                  </div>
                )}

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-sm bg-gray-50 dark:bg-[#0f0f0f] border border-gray-200 dark:border-gray-800 rounded-xl outline-none focus:border-brand dark:focus:border-brand transition-colors text-gray-900 dark:text-gray-100 placeholder-gray-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password */}
                <div className="text-right">
                  <button type="button" className="text-sm text-brand hover:underline">Forgot password?</button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-70 text-white font-medium rounded-xl transition-all duration-150 flex items-center justify-center gap-2 text-sm shadow-brand/20 shadow-lg hover:shadow-brand/40"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </button>
              </form>
            </div>

            <p className="text-center text-xs text-gray-400 dark:text-[#888] mt-6">
              © 2024 Next One Realty. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
