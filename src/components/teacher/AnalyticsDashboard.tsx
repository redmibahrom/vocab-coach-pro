import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, CheckCircle, TrendingUp } from "lucide-react";

interface Stats {
  totalWordSets: number;
  totalExams: number;
  averageScore: number;
  completionRate: number;
}

export default function AnalyticsDashboard({ teacherId }: { teacherId: string }) {
  const [stats, setStats] = useState<Stats>({
    totalWordSets: 0,
    totalExams: 0,
    averageScore: 0,
    completionRate: 0,
  });

  useEffect(() => {
    loadStats();
  }, [teacherId]);

  const loadStats = async () => {
    const { data: wordSets } = await supabase
      .from("word_sets")
      .select("id")
      .eq("teacher_id", teacherId);

    if (!wordSets) return;

    const wordSetIds = wordSets.map((ws) => ws.id);

    const { data: exams } = await supabase
      .from("exams")
      .select("*")
      .in("word_set_id", wordSetIds);

    if (!exams) return;

    const completedExams = exams.filter((e) => e.completed_at);
    const avgScore =
      completedExams.length > 0
        ? completedExams.reduce((sum, e) => sum + (e.total_score || 0), 0) / completedExams.length
        : 0;

    const completionRate =
      exams.length > 0
        ? (completedExams.length / exams.length) * 100
        : 0;

    setStats({
      totalWordSets: wordSets.length,
      totalExams: completedExams.length,
      averageScore: Math.round(avgScore * 10) / 10,
      completionRate: Math.round(completionRate),
    });
  };

  const statCards = [
    {
      title: "Word Sets",
      value: stats.totalWordSets,
      icon: BookOpen,
      color: "text-primary",
    },
    {
      title: "Completed Exams",
      value: stats.totalExams,
      icon: Users,
      color: "text-accent",
    },
    {
      title: "Avg Score",
      value: `${stats.averageScore}%`,
      icon: CheckCircle,
      color: "text-success",
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      icon: TrendingUp,
      color: "text-warning",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Analytics Overview</h2>
      <div className="grid md:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
