import React, { useState } from 'react';
import { useTimeBank } from '../store/TimeBankContext';
import { 
  Users, CheckCircle, Settings, BarChart2, Lock, Unlock, 
  Plus, Check, X, Sparkles, PlusCircle, ScanEye, Trash2, Key, History, Gift,
  MinusCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { generateWeeklyReport, suggestTasks, analyzeProofImage } from '../services/geminiService';
import { TaskCategory, Task } from '../types';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export const ParentView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'approvals' | 'analytics' | 'settings'>('overview');
  const { 
    currentUser, childrenProfiles, pendingProofs, processProof, toggleLock, transactions, 
    addTask, deleteTask, tasks, allowedApps, addAllowedApp, removeAllowedApp, updatePassword,
    addChild, deleteChild, addCoins, spendCoins
  } = useTimeBank();
  
  // AI States
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [taskSuggestionPrompt, setTaskSuggestionPrompt] = useState('');
  const [suggestedTasks, setSuggestedTasks] = useState<any[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [analyzingProofId, setAnalyzingProofId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{score: number; comment: string} | null>(null);

  // Parent Settings States
  const [newTask, setNewTask] = useState<Partial<Task>>({ title: '', description: '', reward: 10, category: TaskCategory.CHORE });
  const [newAppName, setNewAppName] = useState('');
  const [newAppRule, setNewAppRule] = useState('');
  const [parentNewPassword, setParentNewPassword] = useState('');
  const [parentConfirmPassword, setParentConfirmPassword] = useState('');

  // Modals State
  const [modalType, setModalType] = useState<'none' | 'addTask' | 'addMember' | 'manageBalance' | 'viewHistory' | 'resetChildPassword'>('none');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Modal specific form states
  const [newMemberName, setNewMemberName] = useState('');
  
  // Balance Management State
  const [balanceActionType, setBalanceActionType] = useState<'reward' | 'penalty'>('reward');
  const [balanceAmount, setBalanceAmount] = useState(10);
  const [balanceReason, setBalanceReason] = useState('');
  
  const [childNewPassword, setChildNewPassword] = useState('');

  // --- Handlers ---

  const handleApprove = (id: string) => processProof(id, true);
  const handleReject = (id: string) => processProof(id, false);

  const handleGenerateReport = async (childId: string, name: string) => {
    setIsGeneratingReport(true);
    setAiReport(null);
    const childTx = transactions.filter(t => t.childId === childId);
    const report = await generateWeeklyReport(name, childTx);
    setAiReport(report);
    setIsGeneratingReport(false);
  };

  const handleTaskSuggestion = async () => {
    if (!taskSuggestionPrompt) return;
    setIsSuggesting(true);
    const results = await suggestTasks(taskSuggestionPrompt);
    setSuggestedTasks(results);
    setIsSuggesting(false);
  };

  const addSuggestedTask = (task: any) => {
    addTask({
      id: `t${Date.now()}`,
      title: task.title,
      description: task.description,
      reward: task.reward,
      category: task.category,
      isCustom: true,
      requiresProof: true,
      icon: 'star'
    });
    setSuggestedTasks(prev => prev.filter(t => t.title !== task.title));
  };

  const handleCreateTask = () => {
    if(!newTask.title || !newTask.description) return;
    addTask({
      id: `t${Date.now()}`,
      title: newTask.title,
      description: newTask.description,
      reward: Number(newTask.reward),
      category: newTask.category as TaskCategory,
      isCustom: true,
      requiresProof: true,
      icon: 'star'
    });
    setModalType('none');
    setNewTask({ title: '', description: '', reward: 10, category: TaskCategory.CHORE });
  };

  const handleAnalyzeProof = async (proofId: string, imageUrl: string, taskTitle: string) => {
    setAnalyzingProofId(proofId);
    setAnalysisResult(null);
    const result = await analyzeProofImage(imageUrl, taskTitle);
    setAnalysisResult(result);
    setAnalyzingProofId(null);
  };

  const handleAddApp = () => {
    if (newAppName.trim()) {
      addAllowedApp(newAppName.trim(), newAppRule.trim());
      setNewAppName('');
      setNewAppRule('');
    }
  };

  const handleParentChangePassword = () => {
    if (parentNewPassword && parentNewPassword === parentConfirmPassword) {
      if (currentUser) {
        updatePassword(currentUser.id, parentNewPassword);
        alert('密碼已更新！');
        setParentNewPassword('');
        setParentConfirmPassword('');
      }
    } else {
      alert('密碼不一致，請重試。');
    }
  };

  // Family Management Handlers
  const handleAddMember = () => {
    if (newMemberName.trim()) {
      addChild(newMemberName.trim(), '');
      setNewMemberName('');
      setModalType('none');
    }
  };

  const handleManageBalance = () => {
    if (selectedChildId && balanceAmount > 0) {
      if (balanceActionType === 'reward') {
        addCoins(selectedChildId, balanceAmount, balanceReason || '家長獎勵');
      } else {
        spendCoins(selectedChildId, balanceAmount, balanceReason || '家長扣除/補登');
      }
      setModalType('none');
      setBalanceAmount(10);
      setBalanceReason('');
      setSelectedChildId(null);
    }
  };

  const openBalanceModal = (childId: string, type: 'reward' | 'penalty') => {
    setSelectedChildId(childId);
    setBalanceActionType(type);
    setBalanceReason(type === 'reward' ? '表現優異' : '未經允許使用3C');
    setModalType('manageBalance');
  };

  const handleResetChildPassword = () => {
    if (selectedChildId && childNewPassword) {
      updatePassword(selectedChildId, childNewPassword);
      alert('密碼已重設成功！');
      setChildNewPassword('');
      setModalType('none');
      setSelectedChildId(null);
    }
  };

  const getChildTransactions = () => {
    if (!selectedChildId) return [];
    return transactions.filter(t => t.childId === selectedChildId).sort((a,b) => b.timestamp - a.timestamp);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar / Mobile Nav */}
      <div className="bg-white border-r w-full md:w-64 flex-shrink-0">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Settings className="w-6 h-6 text-indigo-600" />
            家長管理中心
          </h1>
        </div>
        <nav className="p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'overview' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Users className="w-5 h-5" /> 家庭總覽
          </button>
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <CheckCircle className="w-5 h-5" /> 任務商店
          </button>
          <button 
            onClick={() => setActiveTab('approvals')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'approvals' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <div className="relative">
              <Settings className="w-5 h-5" />
              {pendingProofs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
            待審核
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'analytics' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <BarChart2 className="w-5 h-5" /> 分析與報表
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <Settings className="w-5 h-5" /> 系統設定
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">家庭成員</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {childrenProfiles.map(child => (
                <div key={child.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                      <img src={child.avatar} alt={child.name} className="w-16 h-16 rounded-full border-4 border-indigo-50" />
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{child.name}</h3>
                        <p className="text-sm text-gray-500">等級 {child.level}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => { setSelectedChildId(child.id); setModalType('resetChildPassword'); }}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                        title="重設密碼"
                      >
                        <Key className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => toggleLock(child.id)}
                        className={`p-2 rounded-lg transition-colors ${child.isLocked ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                      >
                        {child.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                      </button>
                      <button 
                        onClick={() => {
                           if(window.confirm(`確定要刪除成員「${child.name}」嗎？此操作無法復原。`)) {
                             deleteChild(child.id);
                           }
                        }}
                        className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        title="刪除成員"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-xl p-4 mb-4">
                    <p className="text-sm text-indigo-600 font-medium mb-1">時間錢包</p>
                    <p className="text-3xl font-bold text-indigo-900">{child.balance} <span className="text-base font-normal text-indigo-600">分鐘</span></p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => openBalanceModal(child.id, 'reward')}
                        className="flex-1 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium text-sm flex items-center justify-center gap-1"
                        title="發送獎勵"
                      >
                        <Gift className="w-4 h-4" /> 獎勵
                      </button>
                      <button 
                        onClick={() => openBalanceModal(child.id, 'penalty')}
                        className="flex-1 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium text-sm flex items-center justify-center gap-1"
                        title="補登扣款"
                      >
                        <MinusCircle className="w-4 h-4" /> 扣除
                      </button>
                    </div>
                    <button 
                      onClick={() => { setSelectedChildId(child.id); setModalType('viewHistory'); }}
                      className="w-full py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm flex items-center justify-center gap-1"
                    >
                      <History className="w-4 h-4" /> 查看交易紀錄
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-6 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors bg-gray-50/50 min-h-[250px]"
                onClick={() => setModalType('addMember')}
              >
                <PlusCircle className="w-12 h-12 mb-2" />
                <span className="font-medium">新增成員</span>
              </button>
            </div>
          </div>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">任務管理</h2>
              <button 
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-sm" 
                onClick={() => setModalType('addTask')}
              >
                <Plus className="w-4 h-4" /> 自訂任務
              </button>
            </div>

            {/* AI Generator */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-2xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-800">AI 任務靈感</h3>
              </div>
              <div className="flex gap-3 mb-4">
                <input 
                  type="text" 
                  placeholder="例如：科學實驗、戶外活動、雨天備案..." 
                  className="flex-1 p-3 border rounded-xl focus:ring-2 focus:ring-purple-200 outline-none"
                  value={taskSuggestionPrompt}
                  onChange={(e) => setTaskSuggestionPrompt(e.target.value)}
                />
                <button 
                  onClick={handleTaskSuggestion}
                  disabled={isSuggesting}
                  className="bg-purple-600 text-white px-6 rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 min-w-[100px] transition-colors"
                >
                  {isSuggesting ? '思考中...' : '生成'}
                </button>
              </div>
              
              {suggestedTasks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                  {suggestedTasks.map((task, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800">{task.title}</h4>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">+{task.reward}分</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1 mb-3">{task.description}</p>
                      <button 
                        onClick={() => addSuggestedTask(task)}
                        className="w-full py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
                      >
                        加入商店
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Task List */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
               <div className="p-4 bg-gray-50 border-b font-medium text-gray-500">現有任務列表 (可刪除)</div>
               <div className="divide-y">
                 {tasks.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">目前沒有任務，請新增。</div>
                 ) : (
                    tasks.map(task => (
                      <div key={task.id} className="p-4 flex items-center justify-between hover:bg-gray-50 group">
                         <div>
                           <div className="font-bold text-gray-800">{task.title}</div>
                           <div className="text-sm text-gray-500">{task.description}</div>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="text-sm px-2 py-1 bg-gray-100 rounded text-gray-600">{task.category}</span>
                           <span className="font-bold text-indigo-600">{task.reward} 分</span>
                           <button 
                             onClick={() => {
                               if(window.confirm(`確定要刪除「${task.title}」嗎？`)) {
                                 deleteTask(task.id);
                               }
                             }}
                             className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                             title="刪除任務"
                           >
                             <Trash2 className="w-5 h-5" />
                           </button>
                         </div>
                      </div>
                    ))
                 )}
               </div>
            </div>
          </div>
        )}

        {/* APPROVALS TAB */}
        {activeTab === 'approvals' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">待審核任務</h2>
            {pendingProofs.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-dashed">
                <CheckCircle className="w-12 h-12 text-green-200 mx-auto mb-3" />
                <p className="text-gray-400">目前沒有待審核項目！</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {pendingProofs.map(proof => (
                  <div key={proof.id} className="bg-white p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row gap-6">
                    {proof.imageUrl && (
                      <div className="w-full md:w-64 flex-shrink-0 space-y-3">
                        <div className="h-48 bg-gray-100 rounded-xl overflow-hidden border">
                           <img src={proof.imageUrl} alt="Proof" className="w-full h-full object-cover" />
                        </div>
                        {/* AI Verification Button */}
                        <button 
                           onClick={() => handleAnalyzeProof(proof.id, proof.imageUrl!, proof.taskTitle)}
                           disabled={analyzingProofId === proof.id}
                           className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
                        >
                           {analyzingProofId === proof.id ? (
                             <span className="animate-pulse">AI 分析中...</span>
                           ) : (
                             <>
                               <ScanEye className="w-4 h-4" /> AI 智能驗證
                             </>
                           )}
                        </button>
                        
                        {/* Analysis Result */}
                        {analyzingProofId === proof.id ? null : (
                          analysisResult && analyzingProofId === null && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm animate-in fade-in">
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-blue-800">可信度: {analysisResult.score}%</span>
                              </div>
                              <p className="text-blue-700">{analysisResult.comment}</p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{proof.taskTitle}</h3>
                          <p className="text-sm text-gray-500">提交人: {childrenProfiles.find(c => c.id === proof.childId)?.name}</p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">+{proof.reward} 分鐘</span>
                      </div>
                      
                      <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600 flex-1">
                        <p className="font-semibold mb-1">孩子留言：</p>
                        "{proof.notes || '無留言'}"
                      </div>
                      
                      <div className="mt-6 flex gap-3">
                        <button 
                          onClick={() => handleApprove(proof.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          <Check className="w-4 h-4" /> 批准
                        </button>
                        <button 
                          onClick={() => handleReject(proof.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 font-medium"
                        >
                          <X className="w-4 h-4" /> 駁回
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">數據與報表</h2>
            
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                   <Sparkles className="w-6 h-6 text-indigo-600" />
                   <h3 className="text-lg font-bold">每週智慧週報</h3>
                </div>
                <select 
                  className="border rounded-lg p-2 text-sm bg-gray-50"
                  onChange={(e) => {
                    if (e.target.value) {
                       const child = childrenProfiles.find(c => c.id === e.target.value);
                       if(child) handleGenerateReport(child.id, child.name);
                    }
                  }}
                >
                  <option value="">選擇要分析的孩子</option>
                  {childrenProfiles.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {isGeneratingReport ? (
                <div className="py-12 text-center text-gray-500 animate-pulse">
                  AI 正在分析交易紀錄...
                </div>
              ) : aiReport ? (
                <div className="prose prose-indigo max-w-none bg-indigo-50/50 p-6 rounded-xl border border-indigo-100">
                  <p className="whitespace-pre-line text-gray-700">{aiReport}</p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                  請選擇一位孩子以生成習慣分析報告。
                </div>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border shadow-sm h-80">
                <h3 className="text-gray-700 font-bold mb-4">任務完成狀況 (模擬數據)</h3>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: '週一', earned: 40 },
                    { name: '週二', earned: 30 },
                    { name: '週三', earned: 20 },
                    { name: '週四', earned: 50 },
                    { name: '週五', earned: 15 },
                    { name: '週六', earned: 60 },
                    { name: '週日', earned: 45 },
                  ]}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="earned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">系統與規則設定</h2>
            
            {/* Account Security Settings */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-800">帳號安全 - 修改家長密碼</h3>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6">
                <p className="text-sm text-yellow-800">
                  <span className="font-bold">提示：</span> 家長預設密碼為 <code>0000</code>。為了安全，請儘速修改。
                </p>
              </div>

              <div className="grid gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
                  <input 
                    type="password" 
                    className="w-full border rounded-lg p-2"
                    value={parentNewPassword}
                    onChange={(e) => setParentNewPassword(e.target.value)}
                    placeholder="輸入新密碼"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
                  <input 
                    type="password" 
                    className="w-full border rounded-lg p-2"
                    value={parentConfirmPassword}
                    onChange={(e) => setParentConfirmPassword(e.target.value)}
                    placeholder="再次輸入新密碼"
                  />
                </div>
                <button 
                  onClick={handleParentChangePassword}
                  disabled={!parentNewPassword || parentNewPassword !== parentConfirmPassword}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  更新密碼
                </button>
              </div>
            </div>

            {/* Allowed Apps Settings */}
            <div className="bg-white p-6 rounded-2xl border shadow-sm space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">允許使用的應用程式白名單</h3>
                <p className="text-sm text-gray-500 mb-4">設定孩子可以在計時器中選擇的活動或 App，並可設定個別規則。</p>
                
                <div className="flex flex-col gap-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="App 名稱 (例如：Disney+)" 
                      className="flex-1 border rounded-lg p-2"
                      value={newAppName}
                      onChange={(e) => setNewAppName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="使用規則 (選填)" 
                      className="flex-1 border rounded-lg p-2"
                      value={newAppRule}
                      onChange={(e) => setNewAppRule(e.target.value)}
                    />
                    <button 
                      onClick={handleAddApp}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700"
                    >
                      新增
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {allowedApps.map((app) => (
                    <div key={app.name} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <span className="font-medium text-gray-700">{app.name}</span>
                        {app.rule && (
                          <span className="ml-2 text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                            {app.rule}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => removeAllowedApp(app.name)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                        title="移除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* CREATE TASK MODAL */}
      {modalType === 'addTask' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">新增自訂任務</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任務名稱</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2"
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  placeholder="例如：摺棉被"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">任務分類</label>
                <select 
                  className="w-full border rounded-lg p-2"
                  value={newTask.category}
                  onChange={e => setNewTask({...newTask, category: e.target.value as TaskCategory})}
                >
                  {Object.values(TaskCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">獎勵時間 (分鐘)</label>
                <input 
                  type="number" 
                  className="w-full border rounded-lg p-2"
                  value={newTask.reward}
                  onChange={e => setNewTask({...newTask, reward: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea 
                  className="w-full border rounded-lg p-2"
                  rows={3}
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  placeholder="例如：起床後將棉被摺疊整齊..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalType('none')} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleCreateTask} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">建立任務</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {modalType === 'addMember' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">新增家庭成員</h3>
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">成員名稱 (暱稱)</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="例如：小明"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalType('none')} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleAddMember} disabled={!newMemberName} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">新增</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE BALANCE MODAL (REWARD / PENALTY) */}
      {modalType === 'manageBalance' && selectedChildId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              管理餘額 - {childrenProfiles.find(c => c.id === selectedChildId)?.name}
            </h3>
            
            {/* Toggle Type */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
              <button 
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${balanceActionType === 'reward' ? 'bg-white shadow-sm text-green-700' : 'text-gray-500'}`}
                onClick={() => { setBalanceActionType('reward'); setBalanceReason('表現優異'); }}
              >
                <Gift className="w-4 h-4" /> 給予獎勵
              </button>
              <button 
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${balanceActionType === 'penalty' ? 'bg-white shadow-sm text-red-700' : 'text-gray-500'}`}
                onClick={() => { setBalanceActionType('penalty'); setBalanceReason('事後補登 / 扣除'); }}
              >
                <MinusCircle className="w-4 h-4" /> 扣除 / 補登
              </button>
            </div>

            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {balanceActionType === 'reward' ? '獎勵金額' : '扣除金額'} (分鐘)
                </label>
                <input 
                  type="number" 
                  className="w-full border rounded-lg p-2 text-2xl font-bold text-center text-gray-700"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">理由 / 備註</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2"
                  value={balanceReason}
                  onChange={e => setBalanceReason(e.target.value)}
                  placeholder={balanceActionType === 'reward' ? "例如：幫忙洗車" : "例如：忘了計時 YouTube"}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalType('none')} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">取消</button>
                <button 
                  onClick={handleManageBalance} 
                  className={`flex-1 py-2 text-white rounded-lg font-medium ${balanceActionType === 'reward' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  確認{balanceActionType === 'reward' ? '發送' : '扣除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW HISTORY MODAL */}
      {modalType === 'viewHistory' && selectedChildId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">歷史紀錄 - {childrenProfiles.find(c => c.id === selectedChildId)?.name}</h3>
              <button onClick={() => setModalType('none')} className="p-1 hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-2 pr-2">
              {getChildTransactions().length === 0 ? (
                <div className="text-center py-8 text-gray-400">尚無紀錄</div>
              ) : (
                getChildTransactions().map(tx => (
                  <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <p className="font-medium text-gray-800">{tx.description}</p>
                      <p className="text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`font-bold ${tx.type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'EARN' ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* RESET CHILD PASSWORD MODAL */}
      {modalType === 'resetChildPassword' && selectedChildId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-2 mb-4 text-red-600">
               <Key className="w-6 h-6" />
               <h3 className="text-xl font-bold">重設成員密碼</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              您正在重設 <b>{childrenProfiles.find(c => c.id === selectedChildId)?.name}</b> 的密碼。
              <br/>這將會覆蓋舊密碼。
            </p>
            <div className="space-y-4">
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">設定新密碼</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2"
                  value={childNewPassword}
                  onChange={e => setChildNewPassword(e.target.value)}
                  placeholder="輸入新密碼 (例如: 1234)"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button onClick={() => setModalType('none')} className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">取消</button>
                <button onClick={handleResetChildPassword} disabled={!childNewPassword} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">確認重設</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};