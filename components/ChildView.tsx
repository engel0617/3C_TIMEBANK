import React, { useState, useEffect, useRef } from 'react';
import { useTimeBank } from '../store/TimeBankContext';
import { 
  Play, Pause, Clock, Camera, CheckCircle, 
  Trophy, BookOpen, Bike, Home as HomeIcon, Star,
  AlertTriangle, History, Zap, Settings, Key,
  CalendarClock, Info
} from 'lucide-react';
import { ChildProfile, Task, TaskCategory } from '../types';

interface ChildViewProps {
  child: ChildProfile;
}

export const ChildView: React.FC<ChildViewProps> = ({ child }) => {
  const { tasks, submitProof, spendCoins, transactions, toggleLock, allowedApps, updatePassword } = useTimeBank();
  const [view, setView] = useState<'home' | 'tasks' | 'wallet'>('home');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0); // seconds
  const [selectedApp, setSelectedApp] = useState('');
  
  // Password Change State
  const [showSettings, setShowSettings] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Retroactive Entry State
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualApp, setManualApp] = useState('');
  const [manualDuration, setManualDuration] = useState(10);
  
  const timerRef = useRef<number | null>(null);

  // Consumption Timer Logic
  useEffect(() => {
    // Priority Check: If balance is <= 0, ensure session is stopped immediately
    if (child.balance <= 0) {
      if (sessionActive) {
        setSessionActive(false);
        setSessionTime(0);
        alert("時間用光了！請先完成任務賺取更多時間吧。");
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return; // Stop execution
    }

    if (sessionActive && !child.isLocked) {
      timerRef.current = window.setInterval(() => {
        setSessionTime(prev => prev + 1);
        
        // Check current session time to deduct balance
        // Note: checking (sessionTime + 1) because the state update is async/batched
        // We prefer using the callback value logic, but here we need to trigger spendCoins side effect
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionActive, child.isLocked, child.balance]); 

  // Separate effect to handle deduction to avoid dependency loop with interval
  useEffect(() => {
    if (sessionActive && sessionTime > 0 && sessionTime % 60 === 0) {
      spendCoins(child.id, 1, `使用 ${selectedApp}`);
    }
  }, [sessionTime, sessionActive, child.id, selectedApp, spendCoins]);

  const handleStartSession = () => {
    if (child.balance <= 0) {
      alert("餘額不足！請先去解任務賺取時間。");
      return;
    }
    if (!selectedApp) {
      alert("請先選擇應用程式");
      return;
    }
    setSessionActive(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Use FileReader to convert to Base64 for persistence and Gemini API
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitProof = () => {
    if (activeTask && proofImage) {
      submitProof({
        childId: child.id,
        taskId: activeTask.id,
        taskTitle: activeTask.title,
        reward: activeTask.reward,
        imageUrl: proofImage,
        notes: '我完成了！'
      });
      setActiveTask(null);
      setProofImage(null);
      alert("太棒了！已送出給家長審核。");
    }
  };

  const handleChangePassword = () => {
    if (oldPassword === child.password) {
       if (newPassword && newPassword === confirmPassword) {
         updatePassword(child.id, newPassword);
         alert("密碼修改成功！");
         setShowSettings(false);
         setOldPassword('');
         setNewPassword('');
         setConfirmPassword('');
       } else {
         alert("新密碼不一致，請重試。");
       }
    } else {
      alert("舊密碼錯誤。");
    }
  };

  const handleManualEntry = () => {
    if (manualApp && manualDuration > 0) {
      spendCoins(child.id, manualDuration, `補登: ${manualApp}`);
      alert("補登成功！");
      setShowManualEntry(false);
      setManualApp('');
      setManualDuration(10);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current app rule
  const currentAppRule = selectedApp ? allowedApps.find(app => app.name === selectedApp)?.rule : '';

  // Level Progress Calculation (Assuming 100 points per level)
  const currentLevelProgress = child.totalEarned % 100;
  const progressPercent = currentLevelProgress; // 0-100

  // Render Logic
  if (child.isLocked) {
    return (
      <div className="h-screen bg-red-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-red-100 p-6 rounded-full mb-4">
          <AlertTriangle className="w-16 h-16 text-red-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">裝置已鎖定</h1>
        <p className="text-gray-600">家長已暫時鎖定您的使用權限。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 font-sans pb-24">
      {/* Header */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex justify-between items-center px-6 rounded-b-3xl">
        <div className="flex items-center gap-3">
          <div className="relative">
             <img src={child.avatar} className="w-12 h-12 rounded-full border-2 border-orange-400" alt="Avatar" />
             <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full border border-white">
               {child.level}
             </div>
          </div>
          <div>
             <h2 className="font-bold text-gray-800 text-lg">{child.name}</h2>
             
             {/* Level Progress Bar */}
             <div className="w-24 h-2 bg-gray-100 rounded-full mt-1 overflow-hidden">
               <div 
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500" 
                  style={{ width: `${progressPercent}%` }}
               />
             </div>
             <p className="text-[10px] text-gray-400 mt-0.5">距離升級還差 {100 - currentLevelProgress} 分</p>
          </div>
        </div>
        <div className="flex gap-2">
           <button 
             onClick={() => setShowSettings(true)}
             className="p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200"
           >
             <Settings className="w-5 h-5" />
           </button>
           <div className="bg-gradient-to-r from-orange-400 to-pink-500 text-white px-4 py-2 rounded-2xl shadow-md flex items-center gap-2">
             <Clock className="w-5 h-5" />
             <span className="text-xl font-black tracking-wider">{child.balance}</span>
             <span className="text-xs opacity-90">分鐘</span>
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 max-w-2xl mx-auto">
        
        {/* VIEW: HOME */}
        {view === 'home' && (
          <div className="space-y-6">
            
            {/* Session Timer Widget */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-orange-100 relative overflow-hidden group hover:shadow-md transition-shadow">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500" />
              <h3 className="text-gray-500 font-bold text-sm mb-4 uppercase tracking-wide flex items-center gap-2">
                 <Zap className="w-4 h-4 text-yellow-500" />
                 開始使用 3C
              </h3>
              
              {!sessionActive ? (
                <div className="space-y-4">
                  <select 
                    className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-medium text-gray-700 focus:ring-2 focus:ring-orange-200 outline-none"
                    onChange={(e) => setSelectedApp(e.target.value)}
                    value={selectedApp}
                  >
                    <option value="" disabled>選擇應用程式...</option>
                    {allowedApps.map(app => (
                      <option key={app.name} value={app.name}>{app.name}</option>
                    ))}
                  </select>

                  {/* App Rule Display */}
                  {selectedApp && currentAppRule && (
                    <div className="flex items-start gap-2 bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 border border-yellow-100 animate-in fade-in slide-in-from-top-2">
                      <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-bold">注意：</span> {currentAppRule}
                      </div>
                    </div>
                  )}

                  <button 
                    disabled={!selectedApp || child.balance <= 0}
                    onClick={handleStartSession}
                    className={`w-full py-4 rounded-2xl font-bold text-lg transition-transform active:scale-[0.98] flex justify-center items-center gap-2 
                      ${child.balance <= 0 
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                        : 'bg-gray-900 text-white hover:bg-black'}`}
                  >
                    {child.balance <= 0 ? (
                      <>
                        <AlertTriangle className="w-5 h-5" /> 餘額不足
                      </>
                    ) : (
                      <>
                        <Play className="fill-current w-5 h-5" /> 開始計時
                      </>
                    )}
                  </button>
                  
                  {/* Retroactive Entry Button */}
                  <div className="pt-2 flex justify-center">
                    <button 
                      onClick={() => setShowManualEntry(true)}
                      className="text-sm text-gray-400 hover:text-orange-500 flex items-center gap-1 underline"
                    >
                      <CalendarClock className="w-3 h-3" /> 忘了計時？補登使用紀錄
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                   <p className="text-gray-400 text-sm mb-2">正在使用：<span className="text-gray-800 font-bold">{selectedApp}</span></p>
                   <div className="text-6xl font-black text-gray-800 font-mono mb-6 tracking-tight">
                     {formatTime(sessionTime)}
                   </div>
                   <button 
                     onClick={() => setSessionActive(false)}
                     className="w-full py-3 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                   >
                     <Pause className="w-5 h-5 fill-current" /> 停止使用
                   </button>
                </div>
              )}
            </div>

            {/* Daily Tasks Shortcut */}
            <div>
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-xl text-gray-800">今日任務</h3>
                 <button onClick={() => setView('tasks')} className="text-orange-600 font-bold text-sm">查看全部</button>
               </div>
               <div className="grid gap-3">
                 {tasks.slice(0, 3).map(task => (
                   <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className={`p-3 rounded-xl ${task.category === TaskCategory.READING ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                         {task.category === TaskCategory.READING ? <BookOpen size={20} /> : <Star size={20} />}
                       </div>
                       <div>
                         <h4 className="font-bold text-gray-800">{task.title}</h4>
                         <span className="text-xs text-gray-500">{task.description}</span>
                       </div>
                     </div>
                     <button 
                       onClick={() => { setActiveTask(task); setView('tasks'); }}
                       className="bg-orange-50 text-orange-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-100"
                     >
                       +{task.reward}
                     </button>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}

        {/* VIEW: TASKS (Detail) */}
        {view === 'tasks' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">任務佈告欄</h2>
            
            {activeTask ? (
              <div className="bg-white rounded-3xl p-6 shadow-lg border-2 border-orange-100 animate-in slide-in-from-bottom-5 duration-300">
                <button onClick={() => setActiveTask(null)} className="mb-4 text-gray-400 text-sm hover:text-gray-600">← 返回列表</button>
                <div className="flex justify-between items-start mb-6">
                  <h1 className="text-2xl font-black text-gray-800">{activeTask.title}</h1>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-bold">+{activeTask.reward} 分鐘</span>
                </div>
                <p className="text-gray-600 mb-8 text-lg">{activeTask.description}</p>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300 text-center">
                  {proofImage ? (
                     <div className="relative">
                       <img src={proofImage} className="w-full h-48 object-cover rounded-lg mb-4" alt="Proof" />
                       <button onClick={() => setProofImage(null)} className="absolute top-2 right-2 bg-white rounded-full p-2 shadow hover:bg-gray-100">
                         <span className="sr-only">移除</span> ✕
                       </button>
                     </div>
                  ) : (
                    <label className="cursor-pointer block py-8 hover:bg-gray-100 rounded-xl transition-colors">
                       <Camera className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                       <span className="text-gray-500 font-medium">拍攝證明照片</span>
                       <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>

                <button 
                  disabled={!proofImage}
                  onClick={handleSubmitProof}
                  className="w-full mt-6 py-4 bg-green-500 text-white rounded-2xl font-bold text-lg shadow-green-200 shadow-xl disabled:opacity-50 disabled:shadow-none hover:bg-green-600 transition-all active:scale-[0.98]"
                >
                  提交任務
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                 {tasks.map(task => (
                   <div 
                     key={task.id} 
                     onClick={() => setActiveTask(task)}
                     className="bg-white p-5 rounded-2xl shadow-sm border-2 border-transparent hover:border-orange-200 transition-all cursor-pointer flex flex-col items-center text-center gap-3 active:scale-[0.98]"
                   >
                     <div className="p-4 bg-gray-50 rounded-full">
                       {task.category === TaskCategory.OUTDOOR ? <Bike className="text-purple-500" /> : <Star className="text-yellow-500" />}
                     </div>
                     <div>
                       <h3 className="font-bold text-lg">{task.title}</h3>
                       <p className="text-gray-400 text-sm">{task.description}</span>
                     </div>
                     <span className="mt-2 bg-orange-50 text-orange-600 px-4 py-1 rounded-full font-bold">
                       +{task.reward} 金幣
                     </span>
                   </div>
                 ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW: WALLET */}
        {view === 'wallet' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">我的存摺</h2>
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl text-white mb-6 shadow-xl">
                 <p className="text-indigo-200 text-sm font-medium mb-1">目前餘額</p>
                 <div className="text-5xl font-black mb-2">{child.balance} <span className="text-xl font-medium">分鐘</span></div>
                 <p className="text-indigo-100 text-xs">累積賺取: {child.totalEarned} 分鐘</p>
            </div>

            <div className="space-y-3">
              {transactions
                .filter(t => t.childId === child.id)
                .sort((a,b) => b.timestamp - a.timestamp)
                .map(tx => (
                  <div key={tx.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === 'EARN' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {tx.type === 'EARN' ? <CheckCircle className="w-4 h-4 text-green-600" /> : <History className="w-4 h-4 text-red-600" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{tx.description}</p>
                        <p className="text-xs text-gray-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <span className={`font-bold ${tx.type === 'EARN' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'EARN' ? '+' : ''}{tx.amount}
                    </span>
                  </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Manual Entry Modal (Retroactive) */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <CalendarClock className="w-5 h-5" /> 
                補登使用紀錄
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                誠實是美德！如果你剛才忘了計時，請在這裡補上。
              </p>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">剛才用了什麼 App？</label>
                   <select 
                    className="w-full p-2 bg-gray-50 rounded border border-gray-200 outline-none"
                    onChange={(e) => setManualApp(e.target.value)}
                    value={manualApp}
                   >
                    <option value="" disabled>選擇應用程式...</option>
                    {allowedApps.map(app => (
                      <option key={app.name} value={app.name}>{app.name}</option>
                    ))}
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">用了多久 (分鐘)？</label>
                   <input 
                      type="number"
                      className="w-full p-2 bg-gray-50 rounded border border-gray-200 outline-none"
                      value={manualDuration}
                      onChange={e => setManualDuration(Number(e.target.value))}
                    />
                 </div>
                 
                 <div className="flex gap-2 pt-2">
                   <button onClick={() => setShowManualEntry(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm font-bold">
                     取消
                   </button>
                   <button 
                    onClick={handleManualEntry} 
                    disabled={!manualApp || manualDuration <= 0}
                    className="flex-1 py-2 bg-orange-500 rounded-lg text-white text-sm font-bold disabled:opacity-50"
                   >
                     確認扣除
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
           <div className="bg-white rounded-2xl w-full max-w-sm p-6">
              <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                <Settings className="w-5 h-5" /> 
                設定
              </h3>
              
              <div className="space-y-4">
                 <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                    <h4 className="font-bold text-orange-800 text-sm mb-2 flex items-center gap-1">
                      <Key className="w-4 h-4" /> 修改密碼
                    </h4>
                    <input 
                      type="password"
                      placeholder="舊密碼"
                      className="w-full mb-2 p-2 rounded border border-orange-200 text-sm"
                      value={oldPassword}
                      onChange={e => setOldPassword(e.target.value)}
                    />
                    <input 
                      type="password"
                      placeholder="新密碼"
                      className="w-full mb-2 p-2 rounded border border-orange-200 text-sm"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <input 
                      type="password"
                      placeholder="確認新密碼"
                      className="w-full p-2 rounded border border-orange-200 text-sm"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex gap-2">
                   <button onClick={() => setShowSettings(false)} className="flex-1 py-2 bg-gray-100 rounded-lg text-gray-600 text-sm font-bold">
                     關閉
                   </button>
                   <button onClick={handleChangePassword} className="flex-1 py-2 bg-orange-500 rounded-lg text-white text-sm font-bold">
                     儲存
                   </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-full shadow-2xl p-2 px-6 flex gap-8 border border-gray-100 z-50">
        <button 
          onClick={() => setView('home')} 
          className={`p-3 rounded-full transition-colors ${view === 'home' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <HomeIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('tasks')} 
          className={`p-3 rounded-full transition-colors ${view === 'tasks' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <Star className="w-6 h-6" />
        </button>
        <button 
          onClick={() => setView('wallet')} 
          className={`p-3 rounded-full transition-colors ${view === 'wallet' ? 'bg-orange-100 text-orange-600' : 'text-gray-400 hover:bg-gray-50'}`}
        >
          <BookOpen className="w-6 h-6" />
        </button>
      </nav>
    </div>
  );
};