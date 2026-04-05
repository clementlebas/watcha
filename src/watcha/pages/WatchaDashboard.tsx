import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { getNotes, createNote, deleteNote, updateNote, getDownloadFileSignedURL } from 'wasp/client/operations';
import { SubscriptionStatus } from '../../payment/plans';
import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import { Search, Plus, Trash2, Clock, Calendar, Image as ImageIcon, X, Pencil, Bookmark, BookmarkCheck, Play, Square, RotateCcw, AlertTriangle } from 'lucide-react';
import { uploadFileWithProgress, validateFile, type FileWithValidType } from '../../file-upload/fileUploading';

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Progress } from '../../components/ui/progress';
import { cn } from '../../lib/utils';
import { Label } from '../../components/ui/label';
import NotionEditor from '../components/LexicalEditor/NotionEditor';

const PREDEFINED_COLORS = ['#8dafce', '#f87171', '#fb923c', '#facc15', '#4ade80', '#a78bfa', '#f472b6', '#94a3b8'];

function getPlainTextFromLexical(jsonString: string | null | undefined): string {
  if (!jsonString) return '';
  
  // Rapide check si c'est du JSON Lexical
  if (!jsonString.trim().startsWith('{"root"')) {
    return jsonString;
  }

  try {
    const json = JSON.parse(jsonString);
    
    // Fonction récursive pour extraire le texte de l'arbre Lexical
    const extractText = (node: any): string => {
      if (node.text) return node.text;
      if (node.children) {
        return node.children.map(extractText).join(' ');
      }
      return '';
    };

    return extractText(json.root).trim();
  } catch (e) {
    return jsonString;
  }
}

const DRAFT_KEY = 'watcha-note-draft';

type Draft = {
  title: string;
  text: string;
  color: string;
  topics: string[];
  remainingSeconds: number;
  isTimerRunning: boolean;
  timerStartedAt: number | null; // timestamp
};

function loadDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as Draft;
    // Migration: handle old 'categories' or 'categoriesInput'
    if ((draft as any).categories) {
      draft.topics = (draft as any).categories;
    }
    if (typeof (draft as any).categoriesInput === 'string') {
      draft.topics = (draft as any).categoriesInput.split(',').map((c: string) => c.trim()).filter(Boolean);
    }
    // Migration: elapsedSeconds to remainingSeconds
    if ((draft as any).elapsedSeconds !== undefined && draft.remainingSeconds === undefined) {
      draft.remainingSeconds = (draft as any).elapsedSeconds;
    }
    
    // Recalculate remaining if timer was running
    if (draft.isTimerRunning && draft.timerStartedAt) {
      const now = Date.now();
      const lostSeconds = Math.floor((now - draft.timerStartedAt) / 1000);
      draft.remainingSeconds = Math.max(0, draft.remainingSeconds - lostSeconds);
      draft.timerStartedAt = now;
    }
    return draft;
  } catch { return null; }
}

function saveDraft(draft: Draft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function formatTimer(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatElapsedReadable(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

export default function DashboardPage() {
  const { data: user } = useAuth();

  const [searchValue, setSearchValue] = useState('');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [bookmarkFilter, setBookmarkFilter] = useState<boolean>(false);

  const { data: notes, isLoading } = useQuery(getNotes, {
    search: searchValue || undefined,
    topic: topicFilter !== 'all' ? topicFilter : undefined,
    color: colorFilter !== 'all' ? colorFilter : undefined,
    isBookmark: bookmarkFilter ? true : undefined,
  });

  const createNoteFn = useAction(createNote);
  const deleteNoteFn = useAction(deleteNote);
  const updateNoteFn = useAction(updateNote);

  // Draft restoration
  const initialDraft = useRef(loadDraft());

  // Note form state
  const [title, setTitle] = useState(initialDraft.current?.title || '');
  const [text, setText] = useState(initialDraft.current?.text || '');
  const [color, setColor] = useState(initialDraft.current?.color || '#8dafce');
  const [topics, setTopics] = useState<string[]>(initialDraft.current?.topics || []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  // Timer state
  const defaultSeconds = (user?.defaultTimer || 25) * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(initialDraft.current?.remainingSeconds ?? defaultSeconds);
  const [isTimerRunning, setIsTimerRunning] = useState(initialDraft.current?.isTimerRunning || false);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(initialDraft.current?.timerStartedAt || null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Force form open even if note of the day exists
  // Auto-open if we have a saved draft with content
  const hasDraftContent = !!(initialDraft.current?.title || initialDraft.current?.text || (initialDraft.current?.topics && initialDraft.current.topics.length > 0));
  const [forceNewNote, setForceNewNote] = useState(hasDraftContent);

  const dateOfTheDay = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const { data: allNotes } = useQuery(getNotes, {
    search: undefined,
    topic: undefined,
    color: undefined,
    isBookmark: undefined,
  });

  const noteOfTheDayDone = !forceNewNote && (allNotes?.length ?? 0) > 0 && allNotes?.[0]?.date === dateOfTheDay;

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 0) {
            setIsTimerRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isTimerRunning]);

  // Save draft on form field changes
  useEffect(() => {
    saveDraft({
      title,
      text,
      color,
      topics,
      remainingSeconds,
      isTimerRunning,
      timerStartedAt: isTimerRunning ? Date.now() : null,
    });
  }, [title, text, color, topics, remainingSeconds, isTimerRunning]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const id = setInterval(() => {
      saveDraft({
        title,
        text,
        color,
        topics,
        remainingSeconds,
        isTimerRunning: true,
        timerStartedAt: Date.now(),
      });
    }, 5000);
    return () => clearInterval(id);
  }, [isTimerRunning, title, text, color, topics, remainingSeconds]);

  const handleStartTimer = () => {
    setIsTimerRunning(true);
    setTimerStartedAt(Date.now());
  };

  const handleStopTimer = () => {
    setIsTimerRunning(false);
    setTimerStartedAt(null);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimerStartedAt(null);
    setRemainingSeconds(defaultSeconds);
  };

  const resetForm = () => {
    setTitle('');
    setText('');
    setColor('#8dafce');
    setTopics([]);
    setSelectedFile(null);
    setUploadProgress(0);
    setRemainingSeconds(defaultSeconds);
    setEditorKey(prev => prev + 1); // Reset de l'éditeur
    setIsTimerRunning(false);
    setTimerStartedAt(null);
    clearDraft();
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !text && !selectedFile) return;

    // Stop timer if still running
    handleStopTimer();

    setIsUploading(true);
    try {
      let fileId: string | undefined = undefined;

      if (selectedFile) {
        const validationError = validateFile(selectedFile);
        if (validationError) {
          alert(validationError.message);
          setIsUploading(false);
          return;
        }

        const result = await uploadFileWithProgress({
          file: selectedFile as FileWithValidType,
          setUploadProgressPercent: setUploadProgress
        });
        // @ts-ignore
        fileId = result.fileId;
      }

      const elapsedSeconds = defaultSeconds - remainingSeconds;

      await createNoteFn({
        title: title || (selectedFile ? 'Image Note' : 'Untitled'),
        text,
        date: dateOfTheDay,
        color,
        topics,
        elapsedTimeInSecond: elapsedSeconds,
        elapsedTime: formatElapsedReadable(elapsedSeconds),
        fileId,
      });
      resetForm();
      setForceNewNote(false);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleBookmarkToggle = async (noteId: string, currentStatus: boolean) => {
    await updateNoteFn({
      id: noteId,
      isBookmark: !currentStatus,
    });
  }

  const uniqueTopics = useMemo(() => {
    if (!notes) return [];
    const tops = new Set<string>();
    notes.forEach(note => note.topics.forEach(t => tops.add(t)));
    return Array.from(tops);
  }, [notes]);

  const showForm = !noteOfTheDayDone || forceNewNote;

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans transition-colors duration-300">
      {/* HEADER */}
      <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent flex items-center gap-4 justify-center md:justify-start">
            Welcome to Watcha
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Track your daily learning progress and feed.
          </p>
        </div>
        {user?.subscriptionStatus === SubscriptionStatus.Active ? (
          <Badge variant="default" className="text-sm px-4 py-1">PRO</Badge>
        ) : (
          <WaspRouterLink to={routes.PricingPageRoute.to}>
            <Badge variant="secondary" className="text-sm px-4 py-1 cursor-pointer hover:bg-secondary/80 transition-transform hover:-translate-y-0.5">
              FREE
            </Badge>
          </WaspRouterLink>
        )}
      </header>

      {/* NOTE EDITION */}
      <section className="mb-12">
        {/* Success banner (always visible when note of the day exists, even with filters) */}
        {noteOfTheDayDone && (
          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-dashed border-amber-300 dark:border-amber-700/50 shadow-none mb-6">
            <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-xl font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-3">
                🎉 Your watch of the day is done!
              </h2>
              <Button
                variant="outline"
                onClick={() => { setForceNewNote(true); resetForm(); }}
                className="text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40"
              >
                <Plus className="size-4 mr-2" />
                Start another watch
              </Button>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card className="relative overflow-hidden group sketch-shadow mb-8">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: color }} />
            <form onSubmit={handleCreateNote}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Plus className="size-5 text-primary shrink-0" />
                    <input
                      type="text"
                      placeholder="New Daily Note"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-2xl font-extrabold text-primary bg-transparent border-none outline-none focus:ring-0 focus:outline-none placeholder:text-primary/50 w-full"
                    />
                  </div>
                  {/* TIMER */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className={cn(
                      "font-mono text-lg tabular-nums px-2 py-0.5 rounded-md flex items-center gap-1.5",
                      isTimerRunning
                        ? "bg-primary/10 text-primary animate-pulse"
                        : remainingSeconds < defaultSeconds
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                    )}>
                      <Clock className="size-4" />
                      {formatTimer(remainingSeconds)}
                    </div>
                    {!isTimerRunning ? (
                      <button type="button" onClick={handleStartTimer} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={remainingSeconds < defaultSeconds ? 'Resume' : 'Start'}>
                        <Play className="size-4" />
                      </button>
                    ) : (
                      <button type="button" onClick={handleStopTimer} className="p-1.5 rounded-md text-destructive hover:bg-destructive/10 transition-colors" title="Stop">
                        <Square className="size-4" />
                      </button>
                    )}
                    {remainingSeconds < defaultSeconds && !isTimerRunning && (
                      <button type="button" onClick={handleResetTimer} className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors" title="Reset">
                        <RotateCcw className="size-3.5" />
                      </button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="min-h-[500px]">
                  <NotionEditor 
                    key={editorKey}
                    initialValue={text} 
                    onChange={setText} 
                  />
                </div>

                <div className="flex items-center gap-2">
                  {topics.length === 0 && <Plus className="size-4 text-primary shrink-0" />}
                  <div className="flex-1 min-w-[200px]">
                    <TopicInput topics={topics} onChange={setTopics} userTopics={user?.topics} placeholder="Topics..." className="w-full" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-10 justify-start px-3">
                        <span className="flex items-center gap-2">
                          <div className={cn(
                            "w-3.5 h-3.5 rounded-full border transition-all",
                            !PREDEFINED_COLORS.includes(color) ? "border-2 border-dotted border-foreground bg-transparent" : "border-border"
                          )} style={{ backgroundColor: PREDEFINED_COLORS.includes(color) ? color : 'transparent' }} />
                          Colors
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                      <div className="grid grid-cols-4 gap-4 p-1">
                        <button
                          className={cn(
                            "w-6 h-6 rounded-full border-2 border-dotted border-foreground shadow-sm flex items-center justify-center transition-all hover:border-primary hover:scale-110",
                            !PREDEFINED_COLORS.includes(color) ? "ring-2 ring-primary ring-offset-2 border-solid" : ""
                          )}
                          onClick={(e) => { e.preventDefault(); setColor(''); }}
                          title="No Color"
                        />
                        {PREDEFINED_COLORS.map(c => (
                          <button
                            key={c}
                            className={cn("w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110 focus:outline-none", color === c ? "ring-2 ring-primary ring-offset-2" : "")}
                            style={{ backgroundColor: c }}
                            onClick={(e) => { e.preventDefault(); setColor(c); }}
                            aria-label={`Select color ${c}`}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Label className="flex items-center gap-2 cursor-pointer bg-muted hover:bg-accent px-3 py-2 rounded-md transition-all border border-dashed border-border h-10 shrink-0">
                    <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate max-w-[120px]">
                      {selectedFile ? selectedFile.name : 'Add image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    {selectedFile && (
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                        className="ml-auto text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </Label>
                </div>
                {uploadProgress > 0 && <Progress value={uploadProgress} className='w-full h-2' />}
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                {forceNewNote && (
                  <Button type="button" variant="ghost" onClick={() => { setForceNewNote(false); resetForm(); }}>
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={isUploading}
                  className="w-full sm:w-auto rounded-full px-8"
                >
                  {isUploading ? 'Uploading...' : 'Save Note'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </section>

      {/* FILTERS */}
      <div className="mb-10 flex flex-col md:flex-row gap-4 items-center bg-card p-4 rounded-xl shadow-sm border border-border">
        {/* Search */}
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
          <Input
            placeholder="Search your notes..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9 w-full"
          />
        </div>

        {/* Topics Select */}
        {uniqueTopics.length > 0 && (
          <div className="w-full md:w-auto min-w-[150px]">
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {uniqueTopics.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Colors Select */}
        <div className="w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start md:w-[120px] px-3">
                <span className="flex items-center gap-2 text-sm">
                  <div className={cn(
                    "w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center",
                    colorFilter === 'all' ? "border-2 border-dotted border-foreground bg-transparent" : "border-solid border-border"
                  )} style={{ backgroundColor: colorFilter === 'all' ? 'transparent' : colorFilter }} />
                  Colors
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-4 p-1">
                <button
                  className={cn(
                    "w-6 h-6 rounded-full border-2 border-dotted border-foreground shadow-sm flex items-center justify-center transition-all hover:border-primary hover:scale-110",
                    colorFilter === 'all' ? "ring-2 ring-primary ring-offset-2 border-solid" : ""
                  )}
                  onClick={() => setColorFilter('all')}
                  title="Any Color"
                />
                {PREDEFINED_COLORS.map(c => (
                  <button
                    key={c}
                    className={cn("w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110", colorFilter === c ? "ring-2 ring-primary ring-offset-2" : "")}
                    style={{ backgroundColor: c }}
                    onClick={() => setColorFilter(c)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Favorites Toggle */}
        <div className="flex items-center gap-2 px-2 shrink-0">
          <Label htmlFor="bookmark-filter" className="cursor-pointer flex items-center gap-1.5 text-sm">
            <BookmarkCheck className={bookmarkFilter ? "text-primary size-4" : "text-muted-foreground size-4"} />
            Favorites
          </Label>
          <Switch id="bookmark-filter" checked={bookmarkFilter} onCheckedChange={setBookmarkFilter} />
        </div>
      </div>

      {/* NOTES GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64 rounded-3xl" />
          ))}
        </div>
      ) : notes?.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-xl font-medium">
          No notes found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {notes?.map((note) => (
            <Card key={note.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col h-full border-l-[6px]" style={{ borderLeftColor: note.color || '#8dafce' }}>
              <CardHeader className="pb-3 px-5 pt-5 flex flex-row items-start justify-between space-y-0 relative z-10">
                <CardTitle className="text-xl font-bold line-clamp-2 pr-6 leading-tight">{note.title}</CardTitle>
                <div className="absolute right-4 top-4 flex gap-1 items-center opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm p-1 rounded-full shadow-sm border border-border">
                  <button onClick={() => handleBookmarkToggle(note.id, note.isBookmark)} className="p-1.5 text-muted-foreground hover:text-yellow-500 rounded-full hover:bg-accent transition-colors" title={note.isBookmark ? "Remove Bookmark" : "Bookmark"}>
                    {note.isBookmark ? <BookmarkCheck className="text-yellow-500 size-4" /> : <Bookmark className="size-4" />}
                  </button>
                  <EditNoteDialog note={note} updateNoteFn={updateNoteFn} />
                  <DeleteNoteButton noteId={note.id} noteTitle={note.title} deleteNoteFn={deleteNoteFn} />
                </div>
              </CardHeader>

              <CardContent className="px-5 pb-5 flex-grow">
                {/* @ts-ignore */}
                {note.file && (
                  <div className="mb-4 mt-2 rounded-xl overflow-hidden border border-border aspect-video bg-muted flex items-center justify-center">
                    {/* @ts-ignore */}
                    <NoteImage fileKey={note.file.key} title={note.title} />
                  </div>
                )}
                <p className="text-muted-foreground line-clamp-4 leading-relaxed text-sm">
                  {getPlainTextFromLexical(note.text) || 'No description provided.'}
                </p>
                {note.topics && note.topics.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {note.topics.map(top => (
                      <Badge key={top} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm font-normal">#{top}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="px-5 py-3 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground mt-auto">
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3" />
                  <span>{note.date || new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                {note.elapsedTime && (
                  <div className="flex items-center gap-1.5 bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-semibold">
                    <Clock className="size-3" />
                    <span>{note.elapsedTime}</span>
                  </div>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

const NoteImage = ({ fileKey, title }: { fileKey: string; title?: string | null }) => {
  const { data: downloadUrl, isLoading } = useQuery(getDownloadFileSignedURL, { key: fileKey });

  if (isLoading || !downloadUrl) {
    return <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
      <ImageIcon className="size-6 text-muted-foreground/30" />
    </div>;
  }

  return (
    <img
      src={downloadUrl}
      className="w-full h-full object-cover transition-opacity duration-500"
      alt={title || 'Note image'}
      onLoad={(e) => (e.currentTarget.style.opacity = '1')}
      style={{ opacity: 0 }}
    />
  );
};

function DeleteNoteButton({ noteId, noteTitle, deleteNoteFn }: { noteId: string; noteTitle?: string | null; deleteNoteFn: any }) {
  const [open, setOpen] = useState(false);

  const handleConfirmDelete = async () => {
    await deleteNoteFn({ id: noteId });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors" title="Delete Note">
          <Trash2 className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" />
            Delete Note
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Are you sure you want to delete <strong className="text-foreground">"{noteTitle || 'Untitled'}"</strong>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditNoteDialog({ note, updateNoteFn }: { note: any, updateNoteFn: any }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(note.title || '');
  const [text, setText] = useState(note.text || '');
  const [topics, setTopics] = useState<string[]>(note.topics || []);
  const [color, setColor] = useState(note.color || '#8dafce');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle(note.title || '');
      setText(note.text || '');
      setTopics(note.topics || []);
      setColor(note.color || '#8dafce');
      setSelectedFile(null);
    }
  }, [open, note]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let fileId: string | undefined = undefined;
      if (selectedFile) {
        const { validateFile, uploadFileWithProgress } = await import('../../file-upload/fileUploading');
        const validationError = validateFile(selectedFile);
        if (validationError) {
          alert(validationError.message);
          setIsSaving(false);
          return;
        }
        const result = await uploadFileWithProgress({
          file: selectedFile as any,
          setUploadProgressPercent: () => {},
        });
        // @ts-ignore
        fileId = result.fileId;
      }

      await updateNoteFn({
        id: note.id,
        title,
        text,
        topics,
        color,
        ...(fileId && { fileId }),
      });
      setOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update note.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1.5 text-muted-foreground hover:text-primary rounded-full hover:bg-accent transition-colors" title="Edit Note">
          <Pencil className="size-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Note</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="text-lg font-bold"
          />
          <div className="min-h-[300px] border rounded-md overflow-hidden">
            <NotionEditor
              key={open ? 'active' : 'inactive'}
              initialValue={text}
              onChange={setText}
            />
          </div>
          <div className="flex items-center gap-2">
            {topics.length === 0 && <Plus className="size-4 text-primary shrink-0" />}
            <div className="flex-1 min-w-[200px]">
              <TopicInput topics={topics} onChange={setTopics} userTopics={useAuth().data?.topics} placeholder="Topics..." className="w-full" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-10 justify-start px-3">
                  <span className="flex items-center gap-2">
                    <div className={cn(
                      "w-3.5 h-3.5 rounded-full border transition-all flex items-center justify-center",
                      !PREDEFINED_COLORS.includes(color) ? "border-2 border-dotted border-foreground bg-transparent" : "border-border"
                    )} style={{ backgroundColor: PREDEFINED_COLORS.includes(color) ? color : 'transparent' }} />
                    Colors
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="start">
                <div className="grid grid-cols-4 gap-4 p-1">
                  <button
                    className={cn(
                      "w-6 h-6 rounded-full border-2 border-dotted border-foreground shadow-sm flex items-center justify-center transition-all hover:border-primary hover:scale-110",
                      !PREDEFINED_COLORS.includes(color) ? "ring-2 ring-primary ring-offset-2 border-solid" : ""
                    )}
                    onClick={(e) => { e.preventDefault(); setColor(''); }}
                    title="No Color"
                  />
                  {PREDEFINED_COLORS.map(c => (
                    <button
                      key={c}
                      className={cn("w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110", color === c ? "ring-2 ring-primary ring-offset-2" : "")}
                      style={{ backgroundColor: c }}
                      onClick={(e) => { e.preventDefault(); setColor(c); }}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Image section with action overlay */}
          {/* @ts-ignore */}
          {note.file && (
            <div className="relative rounded-lg overflow-hidden border border-border aspect-video bg-muted flex items-center justify-center max-h-[200px] group/img">
              {!selectedFile ? (
                <>
                  {/* @ts-ignore */}
                  <NoteImage fileKey={note.file.key} title={note.title} />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
                    <label className="p-1.5 bg-background/80 backdrop-blur-sm rounded-full cursor-pointer hover:bg-background text-muted-foreground hover:text-primary transition-colors border border-border shadow-sm" title="Change image">
                      <Pencil className="size-3.5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => updateNoteFn({ id: note.id, removeImage: true }).then(() => setOpen(false))}
                      className="p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background text-muted-foreground hover:text-destructive transition-colors border border-border shadow-sm"
                      title="Remove image"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2">
                  <ImageIcon className="size-8 text-primary/50" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <button type="button" onClick={() => setSelectedFile(null)} className="text-xs text-destructive hover:underline">Cancel</button>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TopicInput({ topics, onChange, userTopics, placeholder, className }: { topics: string[], onChange: (topics: string[]) => void, userTopics?: string[], placeholder?: string, className?: string }) {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const addTopic = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !topics.includes(trimmed)) {
      onChange([...topics, trimmed]);
    }
    setInputValue('');
  };

  const removeTopic = (index: number) => {
    onChange(topics.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      addTopic(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && topics.length > 0) {
      removeTopic(topics.length - 1);
    }
  };

  return (
    <div className="w-full relative">
      <div className={cn("flex flex-wrap items-center gap-1.5 p-1.5 px-0 min-h-10 transition-all", className)}>
        {topics.map((topic, idx) => (
          <Badge key={idx} variant="secondary" className="gap-1 px-2 py-1 rounded-md h-7 text-xs font-medium bg-zinc-100 dark:bg-zinc-800 border-none">
            #{topic}
            <button type="button" onClick={() => removeTopic(idx)} className="hover:text-destructive transition-colors">
              <X className="size-3.5" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          placeholder={topics.length === 0 ? placeholder : 'Add more...'}
          className="flex-1 bg-transparent border-none outline-none text-sm min-w-[80px] h-7 py-0 px-1 focus:ring-0 focus-visible:ring-0 focus:ring-offset-0"
        />
      </div>

      {isFocused && userTopics && userTopics.length > 0 && userTopics.some(t => !topics.includes(t)) && (
        <div className="absolute top-full left-0 w-full z-50 mt-1 p-2 bg-white dark:bg-zinc-950 border-none rounded-md shadow-lg flex flex-wrap gap-2">
          {userTopics.filter(t => !topics.includes(t)).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => addTopic(t)}
              className="text-[10px] font-bold px-2 py-1 rounded-lg border border-primary/20 hover:border-primary hover:bg-primary/5 transition-all text-primary/70 hover:text-primary"
            >
              + {t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
