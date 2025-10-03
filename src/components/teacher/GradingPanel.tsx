import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, Clock } from "lucide-react";

interface Exam {
  id: string;
  student_name: string;
  completed_at: string | null;
  word_set: { name: string };
}

interface Answer {
  id: string;
  word_text: string;
  student_sentence: string;
  time_taken_seconds: number;
  is_correct: boolean | null;
  teacher_feedback: string | null;
}

export default function GradingPanel({ teacherId }: { teacherId: string }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);

  useEffect(() => {
    loadExams();

    const channel = supabase
      .channel("exam-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "exams",
        },
        () => {
          loadExams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  useEffect(() => {
    if (selectedExam) {
      loadAnswers(selectedExam.id);
    }
  }, [selectedExam]);

  const loadExams = async () => {
    const { data, error } = await supabase
      .from("exams")
      .select(`
        id,
        student_name,
        completed_at,
        word_sets:word_set_id (name)
      `)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false });

    if (error) {
      toast.error("Failed to load exams");
      return;
    }

    const formattedExams = data.map((exam: any) => ({
      id: exam.id,
      student_name: exam.student_name,
      completed_at: exam.completed_at,
      word_set: exam.word_sets,
    }));

    const { data: wordSets } = await supabase
      .from("word_sets")
      .select("id")
      .eq("teacher_id", teacherId);

    if (!wordSets) return;

    const teacherWordSetIds = wordSets.map((ws) => ws.id);
    const { data: teacherExams } = await supabase
      .from("exams")
      .select(`
        id,
        student_name,
        completed_at,
        word_set_id
      `)
      .in("word_set_id", teacherWordSetIds)
      .not("completed_at", "is", null);

    if (!teacherExams) return;

    const finalExams: Exam[] = [];
    for (const exam of teacherExams) {
      const { data: wordSet } = await supabase
        .from("word_sets")
        .select("name")
        .eq("id", exam.word_set_id)
        .single();

      finalExams.push({
        id: exam.id,
        student_name: exam.student_name,
        completed_at: exam.completed_at,
        word_set: { name: wordSet?.name || "Unknown" },
      });
    }

    setExams(finalExams);
  };

  const loadAnswers = async (examId: string) => {
    const { data, error } = await supabase
      .from("exam_answers")
      .select("*")
      .eq("exam_id", examId)
      .order("submitted_at");

    if (error) {
      toast.error("Failed to load answers");
      return;
    }

    setAnswers(data);
  };

  const gradeAnswer = async (answerId: string, isCorrect: boolean, feedback: string) => {
    const { error } = await supabase
      .from("exam_answers")
      .update({
        is_correct: isCorrect,
        teacher_feedback: feedback.trim() || null,
        checked_at: new Date().toISOString(),
      })
      .eq("id", answerId);

    if (error) {
      toast.error("Failed to grade answer");
      return;
    }

    toast.success("Answer graded!");
    if (selectedExam) loadAnswers(selectedExam.id);

    const correctCount = answers.filter(a => a.id === answerId || a.is_correct).length + (isCorrect ? 1 : 0);
    await supabase
      .from("exams")
      .update({ total_score: correctCount })
      .eq("id", selectedExam!.id);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 space-y-4">
        <h2 className="text-2xl font-bold">Completed Exams</h2>
        <div className="space-y-2">
          {exams.map((exam) => (
            <button
              key={exam.id}
              onClick={() => setSelectedExam(exam)}
              className={`w-full text-left p-4 rounded-lg border transition ${
                selectedExam?.id === exam.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{exam.student_name}</h3>
                  <p className="text-sm text-muted-foreground">{exam.word_set.name}</p>
                </div>
                <Badge variant="secondary">
                  {new Date(exam.completed_at!).toLocaleDateString()}
                </Badge>
              </div>
            </button>
          ))}
          {exams.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No completed exams yet
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        {selectedExam ? (
          <>
            <h2 className="text-2xl font-bold">Grade Answers</h2>
            <div className="space-y-4">
              {answers.map((answer, index) => (
                <AnswerCard
                  key={answer.id}
                  answer={answer}
                  index={index}
                  onGrade={gradeAnswer}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an exam to grade
          </div>
        )}
      </Card>
    </div>
  );
}

function AnswerCard({
  answer,
  index,
  onGrade,
}: {
  answer: Answer;
  index: number;
  onGrade: (answerId: string, isCorrect: boolean, feedback: string) => void;
}) {
  const [feedback, setFeedback] = useState(answer.teacher_feedback || "");
  const isGraded = answer.is_correct !== null;

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Question {index + 1}</p>
          <h3 className="text-lg font-bold text-primary">{answer.word_text}</h3>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {answer.time_taken_seconds}s
        </div>
      </div>

      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-sm">{answer.student_sentence}</p>
      </div>

      {!isGraded ? (
        <>
          <Textarea
            placeholder="Add feedback (optional)"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              onClick={() => onGrade(answer.id, true, feedback)}
              className="flex-1 bg-success hover:bg-success/90"
            >
              <Check className="w-4 h-4 mr-2" />
              Correct
            </Button>
            <Button
              onClick={() => onGrade(answer.id, false, feedback)}
              variant="destructive"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Incorrect
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Badge variant={answer.is_correct ? "default" : "destructive"} className="w-full justify-center">
            {answer.is_correct ? "Correct" : "Incorrect"}
          </Badge>
          {answer.teacher_feedback && (
            <p className="text-sm text-muted-foreground italic">
              Feedback: {answer.teacher_feedback}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
