import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import WordSetsManager from "@/components/teacher/WordSetsManager";
import GradingPanel from "@/components/teacher/GradingPanel";
import AnalyticsDashboard from "@/components/teacher/AnalyticsDashboard";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [teacherData, setTeacherData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/teacher-auth");
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate("/teacher-auth");
      return;
    }

    setUser(session.user);

    const { data: teacher } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", session.user.id)
      .single();

    setTeacherData(teacher);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  if (!user || !teacherData) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {teacherData.full_name}!</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <Tabs defaultValue="word-sets" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="word-sets">Word Sets</TabsTrigger>
            <TabsTrigger value="grading">Grade Submissions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="word-sets" className="mt-6">
            <WordSetsManager teacherId={user.id} />
          </TabsContent>

          <TabsContent value="grading" className="mt-6">
            <GradingPanel teacherId={user.id} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <AnalyticsDashboard teacherId={user.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
