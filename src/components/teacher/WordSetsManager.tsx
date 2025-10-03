import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Edit } from "lucide-react";

interface WordSet {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface Word {
  id: string;
  word_text: string;
  time_limit_seconds: number;
  order_index: number;
}

export default function WordSetsManager({ teacherId }: { teacherId: string }) {
  const [wordSets, setWordSets] = useState<WordSet[]>([]);
  const [selectedSet, setSelectedSet] = useState<WordSet | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isWordDialogOpen, setIsWordDialogOpen] = useState(false);

  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  
  const [newWord, setNewWord] = useState("");
  const [newTimeLimit, setNewTimeLimit] = useState("60");

  useEffect(() => {
    loadWordSets();
  }, [teacherId]);

  useEffect(() => {
    if (selectedSet) {
      loadWords(selectedSet.id);
    }
  }, [selectedSet]);

  const loadWordSets = async () => {
    const { data, error } = await supabase
      .from("word_sets")
      .select("*")
      .eq("teacher_id", teacherId)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load word sets");
      return;
    }

    setWordSets(data);
  };

  const loadWords = async (wordSetId: string) => {
    const { data, error } = await supabase
      .from("words")
      .select("*")
      .eq("word_set_id", wordSetId)
      .order("order_index");

    if (error) {
      toast.error("Failed to load words");
      return;
    }

    setWords(data);
  };

  const createWordSet = async () => {
    if (!newSetName.trim()) {
      toast.error("Please enter a word set name");
      return;
    }

    const { error } = await supabase
      .from("word_sets")
      .insert({
        teacher_id: teacherId,
        name: newSetName.trim(),
        description: newSetDescription.trim() || null,
      });

    if (error) {
      toast.error("Failed to create word set");
      return;
    }

    toast.success("Word set created!");
    setNewSetName("");
    setNewSetDescription("");
    setIsCreateOpen(false);
    loadWordSets();
  };

  const addWord = async () => {
    if (!selectedSet || !newWord.trim()) {
      toast.error("Please enter a word");
      return;
    }

    const orderIndex = words.length;

    const { error } = await supabase
      .from("words")
      .insert({
        word_set_id: selectedSet.id,
        word_text: newWord.trim(),
        time_limit_seconds: parseInt(newTimeLimit),
        order_index: orderIndex,
      });

    if (error) {
      toast.error("Failed to add word");
      return;
    }

    toast.success("Word added!");
    setNewWord("");
    setNewTimeLimit("60");
    setIsWordDialogOpen(false);
    loadWords(selectedSet.id);
  };

  const deleteWord = async (wordId: string) => {
    const { error } = await supabase
      .from("words")
      .delete()
      .eq("id", wordId);

    if (error) {
      toast.error("Failed to delete word");
      return;
    }

    toast.success("Word deleted");
    if (selectedSet) loadWords(selectedSet.id);
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Word Sets</h2>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Set
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Word Set</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="set-name">Word Set Name</Label>
                  <Input
                    id="set-name"
                    placeholder="e.g., Week 1 Vocabulary"
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="set-desc">Description (optional)</Label>
                  <Input
                    id="set-desc"
                    placeholder="Description"
                    value={newSetDescription}
                    onChange={(e) => setNewSetDescription(e.target.value)}
                  />
                </div>
                <Button onClick={createWordSet} className="w-full">Create Word Set</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {wordSets.map((set) => (
            <button
              key={set.id}
              onClick={() => setSelectedSet(set)}
              className={`w-full text-left p-4 rounded-lg border transition ${
                selectedSet?.id === set.id
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <h3 className="font-semibold">{set.name}</h3>
              {set.description && (
                <p className="text-sm text-muted-foreground">{set.description}</p>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        {selectedSet ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Words in "{selectedSet.name}"</h2>
              <Dialog open={isWordDialogOpen} onOpenChange={setIsWordDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Word
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Word</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="word">Word</Label>
                      <Input
                        id="word"
                        placeholder="e.g., beautiful"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time-limit">Time Limit (seconds)</Label>
                      <Input
                        id="time-limit"
                        type="number"
                        min="10"
                        max="300"
                        value={newTimeLimit}
                        onChange={(e) => setNewTimeLimit(e.target.value)}
                      />
                    </div>
                    <Button onClick={addWord} className="w-full">Add Word</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {words.map((word, index) => (
                <div
                  key={word.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div>
                    <span className="font-semibold">{index + 1}. {word.word_text}</span>
                    <span className="text-sm text-muted-foreground ml-3">
                      ({word.time_limit_seconds}s)
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteWord(word.id)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {words.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No words yet. Add your first word!
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a word set to view and manage words
          </div>
        )}
      </Card>
    </div>
  );
}
