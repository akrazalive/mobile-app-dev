'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, BookOpen, GraduationCap, Plus, Trash2, LogOut, Crown, LayoutGrid } from 'lucide-react'
import toast from 'react-hot-toast'
import { clearSession } from '@/lib/auth'
import StudentsTab from './students/StudentsTab'
import OverviewTab from './principal/OverviewTab'

type TabType = 'overview' | 'students' | 'teachers' | 'classes' | 'sections'

const tabs = [
  { id: 'overview',  label: 'Overview',  icon: LayoutGrid   },
  { id: 'students',  label: 'Students',  icon: GraduationCap },
  { id: 'teachers',  label: 'Teachers',  icon: Users         },
  { id: 'classes',   label: 'Classes',   icon: BookOpen      },
  { id: 'sections',  label: 'Sections',  icon: BookOpen      },
]

export default function PrincipalDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (activeTab !== 'students' && activeTab !== 'overview') fetchData() }, [activeTab])

  const fetchData = async () => {
    setLoading(true)
    let query
    switch (activeTab) {
      case 'teachers': query = supabase.from('users').select('*').eq('role', 'teacher'); break
      case 'classes':  query = supabase.from('classes').select('*'); break
      case 'sections': query = supabase.from('sections').select('*, classes(name)'); break
      default: return
    }
    const { data: result, error } = await query
    if (!error) setData(result || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure?')) return
    const table = activeTab === 'teachers' ? 'users' : activeTab
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Deleted'); fetchData() }
  }

  const handleLogout = () => { clearSession(); window.location.href = '/' }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 min-h-screen">
        <div className="bg-purple-600 px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-700 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Principal</p>
              <p className="text-purple-200 text-xs">Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                activeTab === id ? 'bg-purple-50 text-purple-700' : 'text-gray-600 hover:bg-gray-50'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            <LogOut className="w-4 h-4" />Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <div className="lg:hidden bg-purple-600 text-white px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Crown className="w-5 h-5" />
            <span className="font-bold">Principal Dashboard</span>
          </div>
          <button onClick={handleLogout} className="bg-purple-700 p-2 rounded-xl">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:flex items-center justify-between px-8 py-6 bg-white border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 capitalize">
            {activeTab === 'overview' ? 'Dashboard Overview' : activeTab}
          </h1>
        </div>

        {/* Mobile tabs */}
        <div className="lg:hidden flex bg-white border-b overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id as TabType)}
              className={`flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap transition ${
                activeTab === id ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-500'}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 lg:p-8">
          {activeTab === 'overview' ? (
            <OverviewTab onNavigate={(tab) => setActiveTab(tab as TabType)} />
          ) : activeTab === 'students' ? (
            <StudentsTab />
          ) : (
            <div>
              <button onClick={() => {}} className="w-full lg:w-auto mb-4 bg-purple-600 text-white px-4 py-2 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-purple-700 transition">
                <Plus className="w-4 h-4" />Add New {activeTab.slice(0, -1)}
              </button>
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-16 text-gray-400">Loading...</div>
                ) : data.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">No {activeTab} found</div>
                ) : data.map((item: any) => (
                  <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-800">{item.name}</h3>
                      {activeTab === 'teachers' && <p className="text-sm text-gray-500 mt-0.5">{item.email}</p>}
                      {activeTab === 'sections' && <p className="text-sm text-gray-500 mt-0.5">{item.classes?.name} · Room {item.room_number}</p>}
                    </div>
                    <button onClick={() => handleDelete(item.id)} className="text-red-400 p-2 hover:text-red-600 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
