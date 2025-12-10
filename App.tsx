import React, { useState } from 'react';
import { TimeBankProvider, useTimeBank } from './store/TimeBankContext';
import { ParentView } from './components/ParentView';
import { ChildView } from './components/ChildView';
import { Role } from './types';
import { Users, LogIn, KeyRound, ChevronLeft } from 'lucide-react';

const AppContent: React.FC = () => {
  const { currentUser, childrenProfiles, login } = useTimeBank();
  
  // Login UI States
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (selectedUser) {
      const success = login(selectedUser, passwordInput);
      if (success) {
        setPasswordInput('');
        setErrorMsg('');
        setSelectedUser(null);
      } else {
        setErrorMsg('密碼錯誤，請重試。');
      }
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md relative overflow-hidden">
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">3C時間銀行</h1>
            <p className="text-gray-500">
              {selectedUser ? '請輸入密碼' : '請問您是？'}
            </p>
          </div>

          {!selectedUser ? (
            /* User Selection Screen */
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => setSelectedUser('p1')} // MOCK_PARENT ID
                className="w-full bg-white border-2 border-gray-200 p-4 rounded-xl flex items-center gap-4 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-gray-800">家長 / 監護人</h3>
                  <p className="text-sm text-gray-500">管理任務與設定</p>
                </div>
              </button>

              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200"></span></div>
                <div className="relative flex justify-center"><span className="bg-white px-2 text-sm text-gray-400">孩子登入</span></div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {childrenProfiles.map(child => (
                  <button 
                    key={child.id}
                    onClick={() => setSelectedUser(child.id)}
                    className="flex flex-col items-center p-4 rounded-xl border-2 border-gray-100 hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95"
                  >
                    <img src={child.avatar} alt={child.name} className="w-16 h-16 rounded-full mb-3" />
                    <span className="font-bold text-gray-700">{child.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Password Entry Screen */
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <button 
                onClick={() => { setSelectedUser(null); setErrorMsg(''); setPasswordInput(''); }}
                className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 flex items-center gap-1 text-sm"
              >
                <ChevronLeft className="w-4 h-4" /> 返回
              </button>

              <div className="flex flex-col items-center mb-6">
                 {selectedUser === 'p1' ? (
                   <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4">
                      <Users className="w-10 h-10" />
                   </div>
                 ) : (
                   <img 
                    src={childrenProfiles.find(c => c.id === selectedUser)?.avatar} 
                    className="w-20 h-20 rounded-full mb-4 border-4 border-indigo-50" 
                    alt="User"
                   />
                 )}
                 <h3 className="font-bold text-xl text-gray-800">
                   {selectedUser === 'p1' ? '家長' : childrenProfiles.find(c => c.id === selectedUser)?.name}
                 </h3>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    autoFocus
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl outline-none transition-colors ${errorMsg ? 'border-red-300 focus:border-red-500 bg-red-50' : 'border-gray-200 focus:border-indigo-500'}`}
                    placeholder="請輸入密碼"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                  />
                </div>
                
                {errorMsg && (
                  <p className="text-red-500 text-sm text-center font-medium animate-pulse">{errorMsg}</p>
                )}

                <button 
                  type="submit"
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  登入
                </button>
                
                <div className="text-center text-xs text-gray-400 mt-4">
                  {selectedUser === 'p1' ? '預設密碼: 0000' : '預設密碼: 1234'}
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render Role-based View
  return (
    <>
      {currentUser.role === Role.PARENT ? (
        <ParentView />
      ) : (
        <ChildView child={currentUser as any} />
      )}
      
      {/* Quick Logout for Demo Purposes */}
      <button 
        onClick={() => window.location.reload()} 
        className="fixed top-4 right-4 z-50 bg-gray-800 text-white p-2 rounded-full opacity-50 hover:opacity-100 text-xs shadow-lg"
        title="登出"
      >
        <LogIn className="w-4 h-4" />
      </button>
    </>
  );
};

const App: React.FC = () => {
  return (
    <TimeBankProvider>
      <AppContent />
    </TimeBankProvider>
  );
};

export default App;