-- Create teachers table with authentication
CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create word_sets table
CREATE TABLE public.word_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create words table
CREATE TABLE public.words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_set_id UUID NOT NULL REFERENCES public.word_sets(id) ON DELETE CASCADE,
  word_text TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 60,
  order_index INTEGER NOT NULL DEFAULT 0
);

-- Create exams table
CREATE TABLE public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_set_id UUID NOT NULL REFERENCES public.word_sets(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_score INTEGER DEFAULT 0,
  total_words INTEGER DEFAULT 0
);

-- Create exam_answers table
CREATE TABLE public.exam_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.words(id) ON DELETE CASCADE,
  word_text TEXT NOT NULL,
  student_sentence TEXT NOT NULL,
  time_taken_seconds INTEGER,
  is_correct BOOLEAN,
  teacher_feedback TEXT,
  checked_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.word_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_answers ENABLE ROW LEVEL SECURITY;

-- Teachers can view their own data
CREATE POLICY "Teachers can view own data"
  ON public.teachers FOR SELECT
  USING (auth.uid()::text = id::text);

-- Teachers can view and manage their word sets
CREATE POLICY "Teachers can manage own word sets"
  ON public.word_sets FOR ALL
  USING (auth.uid()::text = teacher_id::text);

-- Teachers can manage words in their sets
CREATE POLICY "Teachers can manage own words"
  ON public.words FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.word_sets
      WHERE word_sets.id = words.word_set_id
      AND word_sets.teacher_id::text = auth.uid()::text
    )
  );

-- Anyone can view word sets and words for exams (public access for students)
CREATE POLICY "Public can view word sets"
  ON public.word_sets FOR SELECT
  USING (true);

CREATE POLICY "Public can view words"
  ON public.words FOR SELECT
  USING (true);

-- Students can create exams
CREATE POLICY "Anyone can create exams"
  ON public.exams FOR INSERT
  WITH CHECK (true);

-- Public can view exams
CREATE POLICY "Public can view exams"
  ON public.exams FOR SELECT
  USING (true);

-- Teachers can update exams for their word sets
CREATE POLICY "Teachers can update own exams"
  ON public.exams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.word_sets
      WHERE word_sets.id = exams.word_set_id
      AND word_sets.teacher_id::text = auth.uid()::text
    )
  );

-- Students can create exam answers
CREATE POLICY "Anyone can create answers"
  ON public.exam_answers FOR INSERT
  WITH CHECK (true);

-- Public can view answers
CREATE POLICY "Public can view answers"
  ON public.exam_answers FOR SELECT
  USING (true);

-- Teachers can update answers for their exams
CREATE POLICY "Teachers can update answers"
  ON public.exam_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.exams
      JOIN public.word_sets ON word_sets.id = exams.word_set_id
      WHERE exams.id = exam_answers.exam_id
      AND word_sets.teacher_id::text = auth.uid()::text
    )
  );

-- Create indexes for performance
CREATE INDEX idx_word_sets_teacher ON public.word_sets(teacher_id);
CREATE INDEX idx_words_word_set ON public.words(word_set_id);
CREATE INDEX idx_exams_word_set ON public.exams(word_set_id);
CREATE INDEX idx_exam_answers_exam ON public.exam_answers(exam_id);

-- Enable realtime for teacher dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.exams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_answers;