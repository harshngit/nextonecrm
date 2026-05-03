import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { ArrowLeft, Phone, Mail, Calendar, User, Shield, Clock, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { fetchUserById, clearCurrentUser } from '../store/userSlice'
import Badge from '../components/ui/Badge'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()

  const { currentUser: user, detailLoading } = useSelector(s => s.users)

  useEffect(() => {
    dispatch(fetchUserById(id))
    return () => dispatch(clearCurrentUser())
  }, [dispatch, id])

  if (detailLoading && !user) return (
    <div className="flex flex-col items-center justify-center h-[60vh]">
      <Loader2 className="animate-spin text-brand mb-4" size={40} />
      <p className="text-gray-500 font-medium">Loading user profile...</p>
    </div>
  )

  if (!user && !detailLoading) return (
    <div className="flex items-center justify-center h-[60vh] text-gray-400 dark:text-[#888]">
      <div className="text-center max-w-sm px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">👤</div>
        <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white mb-2">User not found</h3>
        <Button variant="outline" onClick={() => navigate('/team')} className="mt-4 rounded-xl">Back to Team</Button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <button
        onClick={() => navigate('/team')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-brand transition-colors group"
      >
        <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center group-hover:border-brand/30 transition-all">
          <ArrowLeft size={16} />
        </div>
        Back to Team
      </button>

      {user && (
        <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-[24px] overflow-hidden shadow-sm">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-brand opacity-10 dark:opacity-20" />
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row md:items-end gap-6 -mt-12">
              <div className="p-1.5 bg-white dark:bg-[#1a1a1a] rounded-[28px] shadow-xl">
                <Avatar name={`${user.first_name} ${user.last_name}`} size="2xl" className="rounded-[22px] w-24 h-24 md:w-32 md:h-32 text-3xl" />
              </div>
              <div className="flex-1 space-y-2 mb-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">
                    {user.first_name} {user.last_name}
                  </h1>
                  <Badge label={user.is_active ? 'Active' : 'Inactive'} variant={user.is_active ? 'success' : 'danger'} />
                </div>
                <p className="text-brand font-bold uppercase tracking-widest text-xs">{user.role?.replace(/_/g, ' ')}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
              <div className="space-y-6">
                <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Contact Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                      <Mail size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Email</div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600">
                      <Phone size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Phone</div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{user.phone_number || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Account Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-900/20 flex items-center justify-center text-teal-600">
                      <Clock size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Last Login</div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                      <Shield size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">User ID</div>
                      <div className="text-sm font-mono text-gray-500">{user.id}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
