import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { BookOpen, Clock, Send } from "lucide-react";

interface WordSet {
  id: string;
  name: string;
  teacher: { full_name: string };
}

interface Word {
  id: string;
  word_text: string;
  time_limit_seconds: number;
  order_index: number;
}

export default function StudentExam() {
  const navigate = useNavigate();
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [examStarted, setExamStarted] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [sentence, setSentence] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [examId, setExamId] = useState("");
  const [answers, setAnswers] = useState<{ word_id: string; sentence: string; time_taken: number }[]>([]);

  useEffect(() => {
    loadWordSets();
  }, []);

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && examStarted && currentWordIndex < words.length) {
      handleNextWord();
    }
  }, [timeLeft, examStarted, currentWordIndex]);

  const loadWordSets = async () => {
    const { data, error } = await supabase
      .from("word_sets")
      .select(`
        id,
        name,
        teachers:teacher_id (full_name)
      `);

    if (error) {
      toast.error("Failed to load word sets");
      return;
    }

    setWordSets(data.map((ws: any) => ({
      id: ws.id,
      name: ws.name,
      teacher: ws.teachers
    })));
  };

  const startExam = async () => {
    if (!selectedSetId || !studentName.trim()) {
      toast.error("Please select a teacher and enter your name");
      return;
    }

    const { data: wordsData, error: wordsError } = await supabase
      .from("words")
      .select("*")
      .eq("word_set_id", selectedSetId)
      .order("order_index");

    if (wordsError || !wordsData || wordsData.length === 0) {
      toast.error("No words found for this word set");
      return;
    }

    const { data: examData, error: examError } = await supabase
      .from("exams")
      .insert({
        word_set_id: selectedSetId,
        student_name: studentName.trim(),
        total_words: wordsData.length
      })
      .select()
      .single();

    if (examError || !examData) {
      toast.error("Failed to create exam");
      return;
    }

    setExamId(examData.id);
    setWords(wordsData);
    setTimeLeft(wordsData[0].time_limit_seconds);
    setExamStarted(true);
    toast.success("Exam started! Good luck!");
  };

  const handleNextWord = async () => {
    const currentWord = words[currentWordIndex];
    const timeTaken = currentWord.time_limit_seconds - timeLeft;

    const newAnswer = {
      word_id: currentWord.id,
      sentence: sentence.trim() || "[No answer]",
      time_taken: timeTaken
    };

    setAnswers([...answers, newAnswer]);

    await supabase.from("exam_answers").insert({
      exam_id: examId,
      word_id: currentWord.id,
      word_text: currentWord.word_text,
      student_sentence: sentence.trim() || "[No answer]",
      time_taken_seconds: timeTaken
    });

    if (currentWordIndex < words.length - 1) {
      setCurrentWordIndex(currentWordIndex + 1);
      setTimeLeft(words[currentWordIndex + 1].time_limit_seconds);
      setSentence("");
    } else {
      await supabase
        .from("exams")
        .update({ completed_at: new Date().toISOString() })
        .eq("id", examId);

      toast.success("Exam completed! Your teacher will review your answers.");
      navigate("/");
    }
  };

  const currentWord = words[currentWordIndex];

  if (!examStarted) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold flex items-center justify-center gap-2">
              <BookOpen className="w-10 h-10 text-primary" />
              VocabExams
            </h1>
            <p className="text-muted-foreground">Start your vocabulary exam</p>
          </div>

          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="teacher">Choose your teacher</Label>
              <Select value={selectedSetId} onValueChange={setSelectedSetId}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="Select a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {wordSets.map((ws) => (
                    <SelectItem key={ws.id} value={ws.id}>
                      {ws.teacher.full_name} - {ws.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Your full name</Label>
              <Input
                id="name"
                placeholder="e.g., Aisha Karim"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

            <Button onClick={startExam} className="w-full" size="lg">
              Start Exam
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            Word {currentWordIndex + 1} of {words.length}
          </h2>
          <div className="flex items-center gap-2 text-2xl font-bold">
            <Clock className="w-6 h-6 text-primary" />
            <span className={timeLeft <= 10 ? "text-destructive" : "text-foreground"}>
              {timeLeft}s
            </span>
          </div>
        </div>

        <Card className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Make a sentence using this word:</p>
            <h3 className="text-5xl font-bold text-primary">{currentWord.word_text}</h3>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sentence">Your sentence</Label>
            <Input
              id="sentence"
              placeholder="Type your sentence here..."
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNextWord()}
              autoFocus
            />
          </div>

          <Button onClick={handleNextWord} className="w-full" size="lg">
            <Send className="w-4 h-4 mr-2" />
            {currentWordIndex < words.length - 1 ? "Next Word" : "Submit Exam"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
