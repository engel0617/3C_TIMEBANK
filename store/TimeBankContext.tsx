import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ChildProfile, Task, Transaction, Proof, FamilySettings, Role, TaskCategory, TaskStatus, AllowedApp } from '../types';

interface TimeBankContextType {
  currentUser: User | null;
  childrenProfiles: ChildProfile[];
  tasks: Task[];
  transactions: Transaction[];
  pendingProofs: Proof[];
  settings: FamilySettings;
  allowedApps: AllowedApp[];
  switchUser: (userId: string) => void;
  login: (userId: string, passwordInput: string) => boolean;
  updatePassword: (userId: string, newPassword: string) => void;
  addChild: (name: string, avatar: string) => void;
  deleteChild: (childId: string) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  submitProof: (proof: Omit<Proof, 'id' | 'status' | 'timestamp'>) => void;
  processProof: (proofId: string, approved: boolean) => void;
  spendCoins: (childId: string, amount: number, reason: string) => void;
  addCoins: (childId: string, amount: number, reason: string) => void; // New manual reward
  toggleLock: (childId: string) => void;
  updateSettings: (newSettings: Partial<FamilySettings>) => void;
  addAllowedApp: (appName: string, rule?: string) => void;
  removeAllowedApp: (appName: string) => void;
}

const TimeBankContext = createContext<TimeBankContextType | undefined>(undefined);

// Mock Data with Passwords
const MOCK_CHILDREN: ChildProfile[] = [
  { id: 'c1', name: '小李 (Leo)', role: Role.CHILD, avatar: 'https://picsum.photos/150/150?random=1', balance: 45, totalEarned: 120, level: 2, isLocked: false, weeklyAllowance: 30, password: '1234' },
  { id: 'c2', name: '小美 (Mia)', role: Role.CHILD, avatar: 'https://picsum.photos/150/150?random=2', balance: 10, totalEarned: 80, level: 1, isLocked: false, weeklyAllowance: 30, password: '1234' },
];

const MOCK_PARENT: User = { id: 'p1', name: '管理員家長', role: Role.PARENT, avatar: 'https://picsum.photos/150/150?random=3', password: '0000' };

const MOCK_TASKS: Task[] = [
  { id: 't1', title: '閱讀課外書', description: '閱讀 30 分鐘', reward: 15, category: TaskCategory.READING, isCustom: false, requiresProof: true, icon: 'book' },
  { id: 't2', title: '戶外運動', description: '戶外玩耍 1 小時', reward: 20, category: TaskCategory.OUTDOOR, isCustom: false, requiresProof: true, icon: 'sun' },
  { id: 't3', title: '整理餐具', description: '將乾淨的碗盤歸位', reward: 5, category: TaskCategory.CHORE, isCustom: false, requiresProof: false, icon: 'home' },
  { id: 't4', title: '數學練習', description: '完成一頁練習卷', reward: 10, category: TaskCategory.STUDY, isCustom: false, requiresProof: true, icon: 'pen' },
];

const DEFAULT_SETTINGS: FamilySettings = {
  exchangeRate: 1,
  weekdayCurfewStart: '16:00',
  weekdayCurfewEnd: '20:00',
  weekendCurfewStart: '10:00',
  weekendCurfewEnd: '21:00',
};

const DEFAULT_APPS: AllowedApp[] = [
  { name: 'YouTube', rule: '只能看英文教學頻道' },
  { name: 'Roblox', rule: '禁止在遊戲中聊天' },
  { name: 'Minecraft', rule: '' },
  { name: 'Netflix', rule: '' }
];

// Local Storage Helper
const getStored = <T,>(key: string, defaultVal: T): T => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : defaultVal;
};

export const TimeBankProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [parentProfile, setParentProfile] = useState<User>(() => getStored('tb_parent', MOCK_PARENT));
  const [childrenProfiles, setChildrenProfiles] = useState<ChildProfile[]>(() => getStored('tb_children', MOCK_CHILDREN));
  
  const [tasks, setTasks] = useState<Task[]>(() => getStored('tb_tasks', MOCK_TASKS));
  const [transactions, setTransactions] = useState<Transaction[]>(() => getStored('tb_transactions', [
    { id: 'tx1', childId: 'c1', amount: 30, description: '每週零用時間', timestamp: Date.now() - 86400000, type: 'EARN', category: 'Allowance' },
    { id: 'tx2', childId: 'c1', amount: 15, description: '閱讀課外書', timestamp: Date.now() - 3600000, type: 'EARN', category: TaskCategory.READING }
  ]));
  const [pendingProofs, setPendingProofs] = useState<Proof[]>(() => getStored('tb_pending_proofs', []));
  const [settings, setSettings] = useState<FamilySettings>(() => getStored('tb_settings', DEFAULT_SETTINGS));
  
  // Custom initialization logic for allowedApps to handle migration from string[] to AllowedApp[]
  const [allowedApps, setAllowedApps] = useState<AllowedApp[]>(() => {
    const stored = localStorage.getItem('tb_allowed_apps');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          // Migrate old string array to object array
          return parsed.map((app: string) => ({ name: app, rule: '' }));
        }
        return parsed;
      } catch (e) {
        return DEFAULT_APPS;
      }
    }
    return DEFAULT_APPS;
  });

  // Persistence Effects
  useEffect(() => localStorage.setItem('tb_parent', JSON.stringify(parentProfile)), [parentProfile]);
  useEffect(() => localStorage.setItem('tb_children', JSON.stringify(childrenProfiles)), [childrenProfiles]);
  useEffect(() => localStorage.setItem('tb_tasks', JSON.stringify(tasks)), [tasks]);
  useEffect(() => localStorage.setItem('tb_transactions', JSON.stringify(transactions)), [transactions]);
  useEffect(() => localStorage.setItem('tb_pending_proofs', JSON.stringify(pendingProofs)), [pendingProofs]);
  useEffect(() => localStorage.setItem('tb_settings', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('tb_allowed_apps', JSON.stringify(allowedApps)), [allowedApps]);

  const switchUser = (userId: string) => {
    if (userId === parentProfile.id) {
      setCurrentUser(parentProfile);
    } else {
      const child = childrenProfiles.find(c => c.id === userId);
      if (child) setCurrentUser(child);
    }
  };

  const login = (userId: string, passwordInput: string): boolean => {
    let user: User | undefined;
    if (userId === parentProfile.id) {
      user = parentProfile;
    } else {
      user = childrenProfiles.find(c => c.id === userId);
    }

    if (user && user.password === passwordInput) {
      setCurrentUser(user);
      return true;
    }
    return false;
  };

  const updatePassword = (userId: string, newPassword: string) => {
    if (userId === parentProfile.id) {
      setParentProfile({ ...parentProfile, password: newPassword });
      if (currentUser?.id === parentProfile.id) {
        setCurrentUser({ ...parentProfile, password: newPassword });
      }
    } else {
      setChildrenProfiles(prev => prev.map(child => {
        if (child.id === userId) {
          const updated = { ...child, password: newPassword };
          if (currentUser?.id === userId) {
             setCurrentUser(updated);
          }
          return updated;
        }
        return child;
      }));
    }
  };

  const addChild = (name: string, avatar: string) => {
    const newChild: ChildProfile = {
      id: `c${Date.now()}`,
      name,
      avatar: avatar || `https://picsum.photos/150/150?random=${Date.now()}`,
      role: Role.CHILD,
      balance: 0,
      totalEarned: 0,
      level: 1,
      isLocked: false,
      weeklyAllowance: 30,
      password: '1234'
    };
    setChildrenProfiles([...childrenProfiles, newChild]);
  };

  const deleteChild = (childId: string) => {
    setChildrenProfiles(prev => prev.filter(c => c.id !== childId));
  };

  const addTask = (task: Task) => {
    setTasks([...tasks, task]);
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const submitProof = (proof: Omit<Proof, 'id' | 'status' | 'timestamp'>) => {
    const newProof: Proof = {
      ...proof,
      id: `p${Date.now()}`,
      status: 'PENDING',
      timestamp: Date.now()
    };
    setPendingProofs([...pendingProofs, newProof]);
  };

  const processProof = (proofId: string, approved: boolean) => {
    const proof = pendingProofs.find(p => p.id === proofId);
    if (!proof) return;

    if (approved) {
      // 1. Add Transaction
      const transaction: Transaction = {
        id: `tx${Date.now()}`,
        childId: proof.childId,
        amount: proof.reward,
        description: `完成任務: ${proof.taskTitle}`,
        timestamp: Date.now(),
        type: 'EARN',
        category: 'Task'
      };
      setTransactions([...transactions, transaction]);

      // 2. Update Balance
      setChildrenProfiles(prev => prev.map(child => {
        if (child.id === proof.childId) {
          const newTotal = child.totalEarned + proof.reward;
          const newLevel = Math.floor(newTotal / 100) + 1;
          return {
            ...child,
            balance: child.balance + proof.reward,
            totalEarned: newTotal,
            level: newLevel
          };
        }
        return child;
      }));
    }

    // 3. Remove from pending
    setPendingProofs(prev => prev.filter(p => p.id !== proofId));
  };

  const spendCoins = (childId: string, amount: number, reason: string) => {
    setChildrenProfiles(prev => prev.map(child => {
      if (child.id === childId) {
        return { ...child, balance: Math.max(0, child.balance - amount) };
      }
      return child;
    }));

    const transaction: Transaction = {
        id: `tx${Date.now()}`,
        childId: childId,
        amount: amount,
        description: reason,
        timestamp: Date.now(),
        type: 'SPEND'
    };
    setTransactions(prev => [...prev, transaction]);
  };

  const addCoins = (childId: string, amount: number, reason: string) => {
    setChildrenProfiles(prev => prev.map(child => {
      if (child.id === childId) {
        return { ...child, balance: child.balance + amount, totalEarned: child.totalEarned + amount };
      }
      return child;
    }));

    const transaction: Transaction = {
        id: `tx${Date.now()}`,
        childId: childId,
        amount: amount,
        description: reason,
        timestamp: Date.now(),
        type: 'EARN'
    };
    setTransactions(prev => [...prev, transaction]);
  };

  const toggleLock = (childId: string) => {
    setChildrenProfiles(prev => prev.map(child => {
      if (child.id === childId) {
        return { ...child, isLocked: !child.isLocked };
      }
      return child;
    }));
  };

  const updateSettings = (newSettings: Partial<FamilySettings>) => {
    setSettings({ ...settings, ...newSettings });
  };

  const addAllowedApp = (appName: string, rule?: string) => {
    if (!allowedApps.some(app => app.name === appName)) {
      setAllowedApps([...allowedApps, { name: appName, rule }]);
    }
  };

  const removeAllowedApp = (appName: string) => {
    setAllowedApps(prev => prev.filter(app => app.name !== appName));
  };

  return (
    <TimeBankContext.Provider value={{
      currentUser,
      childrenProfiles,
      tasks,
      transactions,
      pendingProofs,
      settings,
      allowedApps,
      switchUser,
      login,
      updatePassword,
      addChild,
      deleteChild,
      addTask,
      deleteTask,
      submitProof,
      processProof,
      spendCoins,
      addCoins,
      toggleLock,
      updateSettings,
      addAllowedApp,
      removeAllowedApp
    }}>
      {children}
    </TimeBankContext.Provider>
  );
};

export const useTimeBank = () => {
  const context = useContext(TimeBankContext);
  if (!context) {
    throw new Error('useTimeBank must be used within a TimeBankProvider');
  }
  return context;
};