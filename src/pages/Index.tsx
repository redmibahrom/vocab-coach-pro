import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, BookOpen, Users } from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-4 pt-12">
          <div className="flex items-center justify-center gap-3">
            <GraduationCap className="w-16 h-16 text-primary" />
            <h1 className="text-6xl font-bold">VocabExams</h1>
          </div>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Master vocabulary through timed sentence creation. Teachers create word sets, 
            students practice under pressure, and everyone improves.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-8 space-y-4 hover:border-primary transition cursor-pointer" onClick={() => navigate("/student-exam")}>
            <div className="flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-primary" />
              <h2 className="text-2xl font-bold">I'm a Student</h2>
            </div>
            <p className="text-muted-foreground">
              Choose your teacher, start an exam, and create sentences using vocabulary words. 
              Each word has a time limit—think fast!
            </p>
            <Button className="w-full" size="lg">
              Start Exam
            </Button>
          </Card>

          <Card className="p-8 space-y-4 hover:border-primary transition cursor-pointer" onClick={() => navigate("/teacher-auth")}>
            <div className="flex items-center gap-3">
              <Users className="w-10 h-10 text-primary" />
              <h2 className="text-2xl font-bold">I'm a Teacher</h2>
            </div>
            <p className="text-muted-foreground">
              Create word sets with custom time limits, review student submissions, 
              and track progress with analytics.
            </p>
            <Button className="w-full" size="lg" variant="outline">
              Teacher Login
            </Button>
          </Card>
        </div>

        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li><strong>1. Teachers</strong> create word sets and set time limits for each word</li>
            <li><strong>2. Students</strong> select their teacher and start a timed exam</li>
            <li><strong>3. For each word</strong>, students must create a sentence before time runs out</li>
            <li><strong>4. Teachers</strong> review all submissions and provide grades with feedback</li>
            <li><strong>5. Analytics</strong> help track student progress and identify areas for improvement</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
