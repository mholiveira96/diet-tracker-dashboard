"use client";
import React, { useEffect, useState } from "react";
import { 
  Activity, 
  Utensils, 
  Target, 
  ChevronRight,
  ChevronLeft,
  Flame,
  Dumbbell,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Footprints,
  Zap,
  X,
  PieChart,
  Beef,
  Cookie,
  ArrowDown,
  ArrowUp,
  Edit2,
  Trash2,
  Save,
  AlertCircle
} from "lucide-react";
import {
  BarChart,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Area
} from "recharts";

// TypeScript workaround for Loader2/CheckCircle2
const LoaderIcon: React.FC<React.SVGAttributes<SVGSVGElement>> = (props) => <Activity {...props} />;
const CheckIcon: React.FC<React.SVGAttributes<SVGSVGElement>> = (props) => <CheckCircle2 {...props} />;

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const isModalWorkout = selectedItem?.type === 'workout';
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const fetchData = (date: string) => {
    setLoading(true);
    fetch(`/api/data?date=${date}`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        setLoading(false);
      });
  };

  const refreshData = () => {
    fetchData(selectedDate);
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const current = new Date(selectedDate + 'T12:00:00');
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setIsEditing(true);
    const itemDate = item.logged_at ? item.logged_at.split(' ')[0] : '';
    setEditFormData({
      description: item.description || item.modality,
      amount: item.amount || item.duration_min,
      unit: item.unit || 'min',
      calories: item.calories,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      date: itemDate
    });
  };

  const handleEditChange = (field: string, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = async () => {
    if (!selectedItem) return;
    
    try {
      setLoading(true);
      
      if (selectedItem.type === 'workout') {
        const workoutId = selectedItem.id.replace('w-', '');
        const response = await fetch(`/api/workouts/${workoutId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modality: editFormData.description,
            duration_min: parseInt(editFormData.amount),
            calories: parseInt(editFormData.calories),
            logged_at: editFormData.date ? `${editFormData.date} ${new Date().toTimeString().slice(0,8)}` : null
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update workout');
        }

      } else {
        const response = await fetch(`/api/meals/${selectedItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: editFormData.description,
            amount: parseFloat(editFormData.amount),
            unit: editFormData.unit,
            calories: parseFloat(editFormData.calories),
            protein: parseFloat(editFormData.protein),
            carbs: parseFloat(editFormData.carbs),
            fat: parseFloat(editFormData.fat),
            logged_at: editFormData.date ? `${editFormData.date} ${new Date().toTimeString().slice(0,8)}` : null
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update meal');
        }
      }

      setIsEditing(false);
      setSelectedItem(null);
      await refreshData();

    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Erro ao salvar alteração. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (item: any) => {
    if (confirm(`Tem certeza que deseja deletar "${item.description || item.modality}"?`)) {
      setDeletingId(item.id);
      
      setData((prevData: any) => {
        if (!prevData) return prevData;
        return {
          ...prevData,
          items: prevData.items.filter((i: any) => i.id !== item.id)
        };
      });

      const workoutId = item.type === 'workout' ? item.id.replace('w-', '') : item.id;
      const endpoint = item.type === 'workout' ? `/api/workouts/${workoutId}` : `/api/meals/${item.id}`;
      
      fetch(endpoint, { method: 'DELETE' })
        .then(res => {
          if (res.ok) {
            refreshData();
          } else {
            refreshData();
            alert('Erro ao deletar item.');
          }
        })
        .finally(() => {
          setDeletingId(null);
        });
    }
  };

  const closeEditModal = () => {
    setIsEditing(false);
    setSelectedItem(null);
    setEditFormData({});
  };

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="animate-pulse flex flex-col items-center">
        <LoaderIcon className="w-12 h-12 text-blue-500 mb-4 animate-spin" />
        <span className="text-xl font-mono tracking-tighter uppercase italic">Estagzinho Diet // Analisando Macros...</span>
      </div>
    </div>
  );

  const { summary, goals, items, history, activity, workouts } = data || {};
  const safeSummary = summary || { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const safeGoals = goals || { calories: 2200, protein: 180, carbs: 180, fat: 84 };
  const workoutInfo = workouts || { total: 0, duration: 0, count: 0 };

  // Compute monthly KPIs from history (which now has net_kcal per day)
  const monthlyKpis = (() => {
    const validHistory = (history || []).filter((d: any) => d.day && d.day !== 'None');
    const days_with_data = validHistory.length;
    const total_meals_kcal = validHistory.reduce((s: number, d: any) => s + (d.kcal || 0), 0);
    const total_workouts_kcal = validHistory.reduce((s: number, d: any) => s + (d.workouts_kcal || 0), 0);
    const total_net_kcal = total_meals_kcal - total_workouts_kcal;
    const avg_net_kcal = days_with_data > 0 ? total_net_kcal / days_with_data : 0;
    const days_within_goal = validHistory.filter((d: any) => d.net_kcal <= safeGoals.calories).length;
    // savings = sum of (goal - net_kcal) for all days — negative if over goal
    const monthly_savings = validHistory.reduce((s: number, d: any) => s + (safeGoals.calories - d.net_kcal), 0);
    return { days_with_data, total_meals_kcal, total_workouts_kcal, total_net_kcal, avg_net_kcal, days_within_goal, monthly_savings };
  })();
  
  const monthlySavings = monthlyKpis.monthly_savings || 0;
  const expectedWeightLoss = Math.max(monthlySavings, 0) / 7700;

  const caloriesIngested = safeSummary.kcal || 0;
  const caloriesBurned = workoutInfo.total || 0;
  const caloriesNet = Math.max(caloriesIngested - caloriesBurned, 0);
  
  const netPercent = Math.min((caloriesNet / safeGoals.calories) * 100, 100);
  const kcalPercent = Math.min(((safeSummary.kcal || 0) / safeGoals.calories) * 100, 100);
  const protPercent = Math.min(((safeSummary.protein || 0) / safeGoals.protein) * 100, 100);
  const formattedWorkoutDuration = Math.round(workoutInfo.duration);
  const averageWorkoutLength = workoutInfo.count ? (workoutInfo.duration / workoutInfo.count).toFixed(1) : '0.0';

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const calendarDays = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = history && history.find((h: any) => h.day === dateStr);
    return { day, dateStr, data: dayData };
  });

  const validHistory = history ? history : [];
  const avgKcal = validHistory.length > 0 ? validHistory.reduce((acc: number, curr: any) => acc + curr.kcal, 0) / validHistory.length : 0;
  const avgProt = validHistory.length > 0 ? validHistory.reduce((acc: number, curr: any) => acc + curr.protein, 0) / validHistory.length : 0;
  const targetDays = validHistory.filter((d: any) => d.protein >= safeGoals.protein).length;

  const steps = activity && activity.find((a: any) => a.type === 'steps')?.value || 0;
  const wearableBurned = activity && activity.find((a: any) => a.type === 'calories_burned')?.value || 0;
  const activeBurned = Math.round((wearableBurned || 0) + workoutInfo.total);

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 font-sans selection:bg-blue-500/30 pb-20">
      <nav className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/20">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-black tracking-tighter text-2xl uppercase italic leading-none block">DIETA<span className="text-blue-500">MATHEUSINHO</span></span>
              <span className="text-[9px] text-gray-500 font-mono uppercase tracking-[0.2em] opacity-60">Recomposição Corporal // Active</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] text-gray-600 font-mono uppercase">Database Sync: OK</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="bg-[#0a0a0a] border-b border-white/5 py-4">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-center">
          <div className="flex items-center gap-8 bg-[#0f0f0f] border border-white/5 p-2 rounded-2xl">
            <button 
              onClick={() => changeDate(-1)}
              className="p-3 hover:bg-white/5 rounded-xl transition-all hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </button>
            
            <div className="flex flex-col items-center min-w-[180px]">
              <div className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-1">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
              </div>
              <div className="text-xl font-black font-mono text-white uppercase tracking-tighter">
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>

            <button 
              onClick={() => changeDate(1)}
              disabled={selectedDate === new Date().toISOString().split('T')[0]}
              className="p-3 hover:bg-white/5 rounded-xl transition-all hover:scale-110 active:scale-95 disabled:opacity-10 disabled:scale-100"
            >
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">
        
        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-orange-500 rounded-full" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Calorias do Dia</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] p-6 hover:border-orange-500/20 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                  <ArrowDown className="w-5 h-5 text-orange-400" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Ingeridas</p>
              </div>
              <p className="text-4xl font-black tabular-nums tracking-tighter">{Math.round(caloriesIngested)}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-2">refeições registradas</p>
            </div>
            
            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] p-6 hover:border-blue-500/20 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                  <ArrowUp className="w-5 h-5 text-blue-400" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Gastas</p>
              </div>
              <p className="text-4xl font-black tabular-nums tracking-tighter">{Math.round(caloriesBurned)}</p>
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-2">treinos registrados</p>
            </div>
            
            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] p-6 hover:border-green-500/20 transition-all relative overflow-hidden">
              <div className="absolute -bottom-6 -right-6 opacity-[0.05]">
                <Flame className="w-24 h-24 text-green-500" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                    <Flame className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-green-400">Líquidas</p>
                </div>
                <p className="text-5xl font-black tabular-nums tracking-tighter">{Math.round(caloriesNet)}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em] mt-2">net calórico</p>
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                    <span className="text-gray-600">ADERÊNCIA</span>
                    <span className={netPercent > 100 ? 'text-red-400' : 'text-green-400'}>{netPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full transition-all duration-1000 ${netPercent > 100 ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{ width: `${Math.min(netPercent, 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-600 font-mono uppercase tracking-[0.3em] mt-3">
                    Meta: {safeGoals.calories} kcal
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-10 relative overflow-hidden group hover:border-blue-500/20 transition-all duration-700">
            <div className="absolute -bottom-10 -right-10 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-700 -rotate-12">
              <Dumbbell className="w-64 h-64 text-blue-500" />
            </div>
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div>
                  <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Meta Estrutural</p>
                  <h3 className="text-6xl font-black tabular-nums tracking-tighter">{Math.round(safeSummary.protein || 0)}g <span className="text-xl font-medium text-gray-700">/ {safeGoals.protein}g</span></h3>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-blue-500/5 flex items-center justify-center border border-blue-500/10 shadow-inner">
                  <Dumbbell className="text-blue-500 w-7 h-7" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-700 via-blue-500 to-indigo-400 transition-all duration-[1500ms] cubic-bezier(0.4, 0, 0.2, 1)" 
                    style={{ width: `${protPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-600 font-mono font-bold uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Activity className="w-3 h-3" /> {protPercent.toFixed(1)}% atingido</span>
                  <span>Restam: {Math.max(safeGoals.protein - safeSummary.protein, 0).toFixed(0)}g</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1 h-6 bg-purple-500 rounded-full" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Treinos do Dia</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 hover:border-orange-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                <Flame className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Calorias queimadas</p>
                <p className="text-3xl font-black tabular-nums tracking-tighter">{Math.round(workoutInfo.total)}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em]">{workoutInfo.count || 0} sessão(s)</p>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 hover:border-blue-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Tempo total</p>
                <p className="text-3xl font-black tabular-nums tracking-tighter">{formattedWorkoutDuration}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em]">minutos de treino</p>
              </div>
            </div>
            <div className="bg-[#0f0f0f] border border-white/5 rounded-[2rem] p-6 flex items-center gap-4 hover:border-green-500/30 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20">
                <Dumbbell className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Sessões</p>
                <p className="text-3xl font-black tabular-nums tracking-tighter">{workoutInfo.count || 0}</p>
                <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em]">{averageWorkoutLength} min média</p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3 bg-[#0f0f0f] border border-white/5 p-4 rounded-2xl shadow-sm hover:border-white/10 transition-all cursor-default">
           <div className="flex items-center gap-2">
             <Footprints className="w-3.5 h-3.5 text-green-400" />
             <span className="text-[10px] font-mono font-bold">{steps.toLocaleString()}</span>
             <span className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">passos</span>
           </div>
           <div className="w-px h-6 bg-white/5"></div>
           <div className="flex items-center gap-2">
             <Zap className="w-3.5 h-3.5 text-yellow-400" />
             <span className="text-[10px] font-mono font-bold">{activeBurned}</span>
             <span className="text-[9px] text-gray-600 font-mono uppercase tracking-tighter">kcal active</span>
           </div>
        </div>

        <section>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1 h-6 bg-indigo-500 rounded-full" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Análise de Performance Semanal</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 grid grid-cols-1 gap-4">
              <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 hover:bg-[#141414] transition-colors cursor-default">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2 opacity-50">Média Ingestão</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{Math.round(avgKcal)}</span>
                  <span className="text-[10px] text-gray-600 font-mono font-bold uppercase tracking-tighter">kcal / dia</span>
                </div>
              </div>
              <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6 hover:bg-[#141414] transition-colors cursor-default">
                <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em] mb-2 opacity-50">Média Proteica</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black">{Math.round(avgProt)}g</span>
                  <span className="text-[10px] text-gray-600 font-mono font-bold uppercase tracking-tighter">prot / dia</span>
                </div>
              </div>
              <div className="bg-blue-600/5 border border-blue-500/10 rounded-3xl p-6 hover:bg-blue-600/10 transition-all cursor-default group">
                <p className="text-[9px] text-blue-400/60 font-black uppercase tracking-[0.2em] mb-2">Aderência meta de Proteína</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-blue-500">{targetDays} <span className="text-sm font-medium text-blue-500/40">/ {history ? history.length : 0}</span></span>
                  <span className="text-[10px] text-blue-400/40 font-mono font-bold uppercase tracking-tighter">dias ok</span>
                </div>
              </div>
              <div className="bg-green-600/5 border border-green-500/10 rounded-3xl p-6 hover:bg-green-600/10 transition-all cursor-default group">
                <p className="text-[9px] text-green-400/60 font-black uppercase tracking-[0.2em] mb-2">Aderência Calorias Líquidas</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-green-500">
                    {monthlyKpis.days_within_goal} <span className="text-sm font-medium text-green-500/40">/ {monthlyKpis.days_with_data}</span>
                  </span>
                  <span className="text-[10px] text-green-400/40 font-mono font-bold uppercase tracking-tighter">dias ok</span>
                </div>
              </div>

              <div className="bg-orange-600/5 border border-orange-500/10 rounded-3xl p-6 hover:bg-orange-600/10 transition-all cursor-default group">
                <p className="text-[9px] text-orange-400/60 font-black uppercase tracking-[0.2em] mb-2">Economia Mensal</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-3xl font-black ${monthlySavings >= 0 ? 'text-orange-500' : 'text-red-500'}`}>
                      {monthlySavings > 0 ? '+' : ''}{Math.round(monthlySavings)}
                    </span>
                    <span className="text-[10px] text-orange-400/40 font-mono font-bold uppercase tracking-tighter">kcal salvas</span>
                  </div>
                  <div className="flex items-baseline gap-2 opacity-60">
                    <span className="text-sm font-bold text-orange-400 tracking-tighter italic">
                       ~ {expectedWeightLoss.toFixed(2)}kg gordura
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-9 bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-10 relative">
              <div className="absolute top-8 left-10 flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">KCAL</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full border border-indigo-400 bg-transparent" />
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">PROT</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-4 h-0 border-t-2 border-dashed border-red-500/50" />
                    <span className="text-[9px] text-gray-500 uppercase font-black tracking-widest">META CALORIAS</span>
                 </div>
              </div>
              <div className="h-[300px] w-full mt-6">
                <AreaChart data={history ? [...history].reverse().map(d => ({ ...d, calorie_goal: safeGoals.calories })) : []}>
                  <defs>
                    <linearGradient id="colorKcal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#181818" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="#333" 
                    fontSize={9} 
                    fontWeight="bold"
                    tickFormatter={(val) => val.split('-').slice(2)} 
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip 
                    cursor={{ stroke: '#333', strokeWidth: 1 }}
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: '16px', fontSize: '11px', padding: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                    itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                    labelClassName="text-gray-600 font-mono font-bold mb-2 uppercase text-[9px] tracking-widest"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="calorie_goal" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    strokeDasharray="5 5" 
                    dot={false}
                    activeDot={false}
                    opacity={0.5}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="kcal" 
                    stroke="#3b82f6" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorKcal)" 
                    animationDuration={2000}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="protein" 
                    stroke="#818cf8" 
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    fill="none" 
                    animationDuration={2500}
                  />
                </AreaChart>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2 mb-8">
            <div className="w-1 h-6 bg-green-500 rounded-full" />
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Calendário de Aderência (Calorias Líquidas)</h2>
          </div>

          <div className="bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-10">
            <div className="grid grid-cols-7 gap-4">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase text-gray-600 mb-4 tracking-widest">{d}</div>
              ))}
              
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {calendarDays && calendarDays.map((d) => {
                const hasData = !!d.data;
                const dayNetKcal = hasData ? Math.max(d.data.kcal - (d.data.workouts_kcal || 0), 0) : 0;
                const hit = hasData && dayNetKcal <= safeGoals.calories;
                const miss = hasData && dayNetKcal > safeGoals.calories;

                return (
                  <div 
                    key={d.day}
                    onClick={() => d.data && setSelectedDate(d.dateStr)}
                    className={`
                      aspect-square rounded-2xl flex flex-col items-center justify-center relative group transition-all cursor-pointer
                      ${hit ? 'bg-green-500/10 border border-green-500/20 hover:bg-green-500/20' : ''}
                      ${miss ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/20' : ''}
                      ${!hasData ? 'bg-white/[0.02] border border-white/5 opacity-20' : ''}
                      ${selectedDate === d.dateStr ? 'ring-2 ring-blue-500 ring-offset-4 ring-offset-black scale-105 z-10' : ''}
                    `}
                  >
                    <span className={`text-lg font-black tracking-tighter ${hasData ? 'text-white' : 'text-gray-700'}`}>
                      {d.day}
                    </span>
                    {d.data && (
                      <span className="text-[8px] font-mono font-bold opacity-40 mt-1 uppercase">
                        {Math.round(dayNetKcal)}
                      </span>
                    )}
                    
                    {d.data && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black border border-white/10 rounded-xl text-[9px] font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-2xl">
                         <p className="text-white font-bold">{Math.round(dayNetKcal)} kcal (líquido)</p>
                         <p className="text-blue-400">{Math.round(d.data.protein)}g prot</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-8 border-t border-white/5 pt-8">
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-green-500/20 border border-green-500/30" />
                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Meta Batida (Líquidas)</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-red-500/20 border border-red-500/30" />
                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Excedido (Líquidas)</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-md bg-white/[0.04] border border-white/10" />
                  <span className="text-[9px] font-black uppercase text-gray-500 tracking-widest">Sem Registro</span>
               </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 bg-[#0f0f0f] border border-white/5 rounded-[2.5rem] p-10">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <Utensils className="w-5 h-5 text-blue-500" />
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300">Journal Alimentar</h3>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-4 py-1.5 rounded-full border border-white/5">
                 <span className="text-[10px] font-mono font-bold text-gray-400">{items ? items.length : 0} REGISTROS</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {items && items.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-gray-700 space-y-6 opacity-30">
                  <Utensils className="w-16 h-16 stroke-[1px]" />
                  <p className="text-[10px] uppercase font-black tracking-[0.3em]">Aguardando dados...</p>
                </div>
              ) : items && items.map((item: any, i: number) => {
                const isWorkout = item.type === 'workout';
                const badgeText = `${item.amount}${item.unit}${isWorkout ? ' treino' : ''}`;
                return (
                  <div 
                    key={i} 
                    className="group flex items-center justify-between p-6 rounded-[1.5rem] bg-[#121212] border border-white/0 hover:border-white/5 hover:bg-[#161616] transition-all duration-300 cursor-default relative"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 flex flex-col items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
                        <span className="text-[10px] font-black leading-none">{new Date(item.logged_at).getHours()}</span>
                        <span className="text-[8px] font-mono opacity-40">{new Date(item.logged_at).getMinutes().toString().padStart(2, '0')}</span>
                      </div>
                      <div>
                        <p className="text-base font-bold text-gray-200 tracking-tight mb-1">{item.description || item.modality}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono font-bold text-gray-600 uppercase tracking-tighter">
                           <span className="bg-white/5 px-2 py-0.5 rounded text-gray-500">{badgeText}</span>
                           <span>•</span>
                           {isWorkout ? (
                             <span className="text-blue-500/60">{Math.round(item.calories)} kcal queimados</span>
                           ) : (
                             <>
                               <span className="text-blue-500/60">{Math.round(item.protein)}g PROTEÍNA</span>
                               <span>•</span>
                               <span className="text-orange-500/60">{Math.round(item.calories)} KCAL</span>
                             </>
                           )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openEditModal(item)}
                        className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 hover:bg-blue-600 hover:border-blue-500/50 transition-all"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-white" />
                      </button>
                      
                      <button 
                        onClick={() => handleDeleteClick(item)}
                        disabled={deletingId === item.id}
                        className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 hover:bg-red-600 hover:border-red-500/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Deletar"
                      >
                        {deletingId === item.id ? <LoaderIcon className="w-4 h-4 text-white animate-spin" /> : <Trash2 className="w-4 h-4 text-red-400" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
             <div className="bg-gradient-to-br from-[#0f0f0f] to-[#080808] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                <div className="flex items-center gap-3 mb-10">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-300">Insights IA</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                       <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em]">GAP PROTEICO</p>
                       <span className="text-[10px] font-mono text-gray-600 font-bold">{Math.max(safeGoals.protein - safeSummary.protein, 0).toFixed(0)}g LEFT</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed font-medium">
                      Para bater o target de <span className="text-white font-bold">{safeGoals.protein}g</span>, você ainda precisa de aproximadamente <span className="text-blue-500 font-bold">2.5 scoops</span> de Whey ou <span className="text-blue-500 font-bold">300g</span> de frango grelhado.
                    </p>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  <div className="space-y-3">
                    <p className="text-[9px] text-green-400 font-black uppercase tracking-[0.2em]">CONSISTÊNCIA (LÍQUIDAS)</p>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                         <CheckIcon className="w-5 h-5 text-green-500" />
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium pt-1">
                        Sua ingestão calórica média na semana está <span className="text-white font-bold">{avgKcal < safeGoals.calories ? 'abaixo' : 'acima'}</span> do limite planejado (calorias líquidas considerando treinos).
                      </p>
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  <div className="bg-white/5 p-6 rounded-3xl border border-white/5 italic">
                    <p className="text-xs text-gray-500 leading-relaxed">
                      "A vitória na balança é decidida no preparo da refeição, não no momento da fome."
                    </p>
                  </div>
                </div>
             </div>
          </div>
        </section>
      </main>

      {selectedItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            
            {!isEditing && (
              <>
                <div className="p-8 border-b border-white/5 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-blue-500 uppercase tracking-[0.3em] mb-2 block">Detalhamento Técnico</span>
                    <h2 className="text-3xl font-black tracking-tighter text-white">{selectedItem.description || selectedItem.modality}</h2>
                  </div>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="p-10 space-y-10">
                  <div className="flex items-center gap-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
                     <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                        {isModalWorkout ? <Dumbbell className="w-8 h-8 text-blue-500" /> : <Flame className="w-8 h-8 text-orange-500" />}
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{isModalWorkout ? 'Treino Registrado' : 'Impacto Energético'}</p>
                        <p className="text-4xl font-black">{Math.round(selectedItem.calories)} <span className="text-sm font-bold text-gray-600 font-mono">KCAL{isModalWorkout ? ' queimados' : ''}</span></p>
                     </div>
                     <div className="ml-auto text-right">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">{isModalWorkout ? 'Duração' : 'Porção'}</p>
                        <p className="text-xl font-bold text-white">{selectedItem.amount}{selectedItem.unit}</p>
                     </div>
                  </div>

                  {isModalWorkout ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Dumbbell className="w-5 h-5 text-blue-500" />
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Detalhes do Treino</span>
                      </div>
                      <div className="grid grid-cols-3 gap-6">
                        <div className="space-y-3">
                          <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest">Calorias</p>
                          <p className="text-3xl font-black text-blue-500">{Math.round(selectedItem.calories)} kcal</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[9px] text-green-400 font-black uppercase tracking-widest">Duração</p>
                          <p className="text-3xl font-black text-green-500">{selectedItem.amount}{selectedItem.unit}</p>
                        </div>
                        <div className="space-y-3">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Modalidade</p>
                          <p className="text-2xl font-bold text-gray-100">{selectedItem.description}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-3 gap-6">
                     <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <Beef className="w-4 h-4 text-blue-400" />
                           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Proteína</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                           <p className="text-2xl font-black text-blue-500">{Math.round(selectedItem.protein)}<span className="text-xs ml-1 font-mono">g</span></p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <PieChart className="w-4 h-4 text-green-400" />
                           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Carbos</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-green-500/5 border border-green-500/10">
                           <p className="text-2xl font-black text-green-500">{Math.round(selectedItem.carbs)}<span className="text-xs ml-1 font-mono">g</span></p>
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div className="flex items-center gap-2">
                           <Cookie className="w-4 h-4 text-yellow-400" />
                           <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Gorduras</span>
                        </div>
                        <div className="p-5 rounded-2xl bg-yellow-500/5 border border-yellow-500/10">
                           <p className="text-2xl font-black text-yellow-500">{Math.round(selectedItem.fat)}<span className="text-xs ml-1 font-mono">g</span></p>
                        </div>
                     </div>
                  </div>
                  )}

                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-tighter">
                     <Calendar className="w-3 h-3" />
                     <span>Registrado em: {new Date(selectedItem.logged_at).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
            
                <div className="p-8 bg-white/5 border-t border-white/5 flex justify-between">
                  <button 
                    onClick={openEditModal}
                    className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    <span>Editar</span>
                  </button>
                  <button 
                    onClick={() => setSelectedItem(null)}
                    className="px-10 py-3 rounded-xl bg-white text-gray-900 font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gray-200 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}

            {isEditing && (
              <>
                <div className="p-8 border-b border-white/5 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-blue-500 uppercase tracking-[0.3em] mb-2 block">
                      {isModalWorkout ? 'Editar Treino' : 'Editar Refeição'}
                    </span>
                    <h2 className="text-3xl font-black tracking-tighter text-white">
                      {isModalWorkout ? (selectedItem.modality || 'Novo Treino') : selectedItem.description}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={closeEditModal}
                      className="text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-px bg-white/5" />
                    <button
                      onClick={() => handleDeleteClick(selectedItem)}
                      disabled={deletingId === selectedItem.id}
                      className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="p-10 space-y-8">
                  {isModalWorkout ? (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Modalidade</label>
                        <input
                          type="text"
                          value={editFormData.description || ''}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                          placeholder="Ex: Musculação, Cardio"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Data do Treino</label>
                        <input
                          type="date"
                          value={editFormData.date || ''}
                          onChange={(e) => handleEditChange('date', e.target.value)}
                          className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Duração (minutos)</label>
                          <input 
                            type="number"
                            value={editFormData.amount || ''}
                            onChange={(e) => handleEditChange('amount', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="60"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Calorias Queimadas</label>
                          <input 
                            type="number"
                            value={editFormData.calories || ''}
                            onChange={(e) => handleEditChange('calories', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="400"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Descrição</label>
                        <input 
                          type="text"
                          value={editFormData.description || ''}
                          onChange={(e) => handleEditChange('description', e.target.value)}
                          className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                          placeholder="Ex: Frango grelhado, Arroz integral"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Data da Refeição</label>
                        <input
                          type="date"
                          value={editFormData.date || ''}
                          onChange={(e) => handleEditChange('date', e.target.value)}
                          className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Quantidade</label>
                          <input 
                            type="number"
                            value={editFormData.amount || ''}
                            onChange={(e) => handleEditChange('amount', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Unidade</label>
                          <input 
                            type="text"
                            value={editFormData.unit || ''}
                            onChange={(e) => handleEditChange('unit', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="g, ml, unidade"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Calorias</label>
                          <input 
                            type="number"
                            value={editFormData.calories || ''}
                            onChange={(e) => handleEditChange('calories', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="200"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Proteína (g)</label>
                          <input 
                            type="number"
                            value={editFormData.protein || ''}
                            onChange={(e) => handleEditChange('protein', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="30"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Carbos (g)</label>
                          <input 
                            type="number"
                            value={editFormData.carbs || ''}
                            onChange={(e) => handleEditChange('carbs', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Gorduras (g)</label>
                          <input 
                            type="number"
                            value={editFormData.fat || ''}
                            onChange={(e) => handleEditChange('fat', e.target.value)}
                            className="w-full px-6 py-4 rounded-xl bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-bold text-lg"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editFormData.amount && parseFloat(editFormData.amount) <= 0 && (
                    <div className="px-8 py-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      <p className="text-xs font-mono text-white">A quantidade deve ser maior que zero</p>
                    </div>
                  )}
                </div>
            
                <div className="flex gap-4 p-8 bg-white/5 border-t border-white/5">
                  <button 
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="flex-1 px-10 py-4 rounded-xl bg-green-600 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{loading ? 'Salvando...' : 'Salvar Alterações'}</span>
                  </button>
                  <button 
                    onClick={closeEditModal}
                    className="px-10 py-4 rounded-xl bg-gray-600 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => {
                      closeEditModal();
                      setTimeout(() => setSelectedItem(null), 200);
                    }}
                    disabled={loading}
                    className="px-10 py-4 rounded-xl bg-red-600 text-white font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    <span>Deletar</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
