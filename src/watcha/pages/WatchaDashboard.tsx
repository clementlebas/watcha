import React, { useState, useMemo } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { getNotes, createNote, deleteNote, updateNote, getDownloadFileSignedURL } from 'wasp/client/operations';
import { SubscriptionStatus } from '../../payment/plans';
import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import { Search, Plus, Trash2, Clock, Calendar, Image as ImageIcon, X, Upload, Pencil, Bookmark, BookmarkCheck } from 'lucide-react';
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

const PREDEFINED_COLORS = ['#8dafce', '#f87171', '#fb923c', '#facc15', '#4ade80', '#a78bfa', '#f472b6', '#94a3b8'];

export default function DashboardPage() {
  const { data: user } = useAuth();
  
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [bookmarkFilter, setBookmarkFilter] = useState<boolean>(false);

  const { data: notes, isLoading } = useQuery(getNotes, {
    search: searchValue || undefined,
    category: categoryFilter !== 'all' ? categoryFilter : undefined,
    color: colorFilter !== 'all' ? colorFilter : undefined,
    isBookmark: bookmarkFilter ? true : undefined,
  });

  const createNoteFn = useAction(createNote);
  const deleteNoteFn = useAction(deleteNote);
  const updateNoteFn = useAction(updateNote);

  // New Note State
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [color, setColor] = useState('#8dafce');
  const [categoriesInput, setCategoriesInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const dateOfTheDay = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const { data: allNotes } = useQuery(getNotes, {
    search: undefined,
    category: undefined,
    color: undefined,
    isBookmark: undefined,
  });

  const noteOfTheDayDone = (allNotes?.length ?? 0) > 0 && allNotes?.[0]?.date === dateOfTheDay;

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !text && !selectedFile) return;
    
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

      const parsedCategories = categoriesInput.split(',').map(c => c.trim()).filter(Boolean);

      await createNoteFn({
        title: title || (selectedFile ? 'Image Note' : 'Untitled'),
        text,
        date: dateOfTheDay,
        color,
        categories: parsedCategories,
        fileId,
      });
      setTitle('');
      setText('');
      setColor('#8dafce');
      setCategoriesInput('');
      setSelectedFile(null);
      setUploadProgress(0);
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

  const uniqueCategories = useMemo(() => {
    if (!notes) return [];
    const cats = new Set<string>();
    notes.forEach(n => n.categories.forEach(c => cats.add(c)));
    return Array.from(cats);
  }, [notes]);

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
          <Badge variant="default" className="text-sm px-4 py-1 sketch-shadow border-2">PRO</Badge>
        ) : (
          <WaspRouterLink to={routes.PricingPageRoute.to}>
            <Badge variant="secondary" className="text-sm px-4 py-1 cursor-pointer hover:bg-secondary/80 sketch-shadow border-2 transition-transform hover:-translate-y-0.5">
              FREE
            </Badge>
          </WaspRouterLink>
        )}
      </header>

      {/* NOTE EDITION */}
      <section className="mb-12">
        {noteOfTheDayDone ? (
          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-dashed border-2 border-amber-300 dark:border-amber-700/50 shadow-none sketch-shadow">
            <CardContent className="p-8 flex items-center justify-center">
              <h2 className="text-2xl font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-3">
                🎉 Your watch of the day is done! See you next time.
              </h2>
            </CardContent>
          </Card>
        ) : (
          <Card className="relative overflow-hidden group sketch-shadow border-2 border-border mb-8">
            <div className="absolute top-0 left-0 w-2 h-full" style={{ backgroundColor: color }} />
            <form onSubmit={handleCreateNote}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl text-primary">
                  <Plus /> New Daily Note
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="What did you learn today?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xl font-semibold border-b-2 border-x-0 border-t-0 rounded-none focus-visible:ring-0 px-0 pb-2 shadow-none"
                />
                
                <Textarea
                  placeholder="Add some details, links, or thoughts..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[120px] resize-y"
                />

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <Input 
                    placeholder="Categories (comma separated)"
                    value={categoriesInput}
                    onChange={(e) => setCategoriesInput(e.target.value)}
                    className="w-full sm:w-48 sm:flex-none border-2"
                  />
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-10 h-10 rounded-full p-0 flex-shrink-0" style={{ backgroundColor: color }} aria-label="Pick color" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2">
                      <div className="grid grid-cols-4 gap-2">
                        {PREDEFINED_COLORS.map(c => (
                          <button
                            key={c}
                            className={cn("w-6 h-6 rounded-full border border-border shadow-sm hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2", color === c ? "ring-2 ring-primary ring-offset-2" : "")}
                            style={{ backgroundColor: c }}
                            onClick={(e) => { e.preventDefault(); setColor(c); }}
                            aria-label={`Select color ${c}`}
                          />
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                  
                  <div className="w-full sm:w-auto">
                    <Label className="flex items-center justify-center gap-2 cursor-pointer bg-muted hover:bg-accent px-4 py-2 rounded-md transition-all border border-dashed border-border flex-nowrap h-10 w-full sm:w-48 whitespace-nowrap overflow-hidden">
                      <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">
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
                </div>
                {uploadProgress > 0 && <Progress value={uploadProgress} className='w-full h-2' />}
              </CardContent>
              <CardFooter className="flex justify-end">
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

        {/* Categories Select */}
        {uniqueCategories.length > 0 && (
          <div className="w-full md:w-auto min-w-[150px]">
             <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Colors Select */}
        <div className="w-full md:w-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-start md:w-[140px] px-3">
                <span className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colorFilter === 'all' ? 'transparent' : colorFilter, border: colorFilter === 'all' ? '1px dashed currentColor' : 'none' }} />
                  {colorFilter === 'all' ? 'All Colors' : 'Color Filter'}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-4 gap-2">
                <button
                   className={cn("w-6 h-6 rounded-full border border-dashed border-border shadow-sm flex items-center justify-center text-[10px]", colorFilter === 'all' ? "ring-2 ring-primary ring-offset-2" : "")}
                   onClick={() => setColorFilter('all')}
                   title="All Colors"
                >
                  All
                </button>
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
                  <button onClick={() => deleteNoteFn({ id: note.id })} className="p-1.5 text-muted-foreground hover:text-destructive rounded-full hover:bg-destructive/10 transition-colors" title="Delete Note">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardHeader>
              
              <CardContent className="px-5 pb-5 flex-grow">
                {/* @ts-ignore */}
                {note.file && (
                  <div className="mb-4 rounded-xl overflow-hidden border border-border aspect-video bg-muted flex items-center justify-center">
                    {/* @ts-ignore */}
                    <NoteImage fileKey={note.file.key} title={note.title} />
                  </div>
                )}
                <p className="text-muted-foreground line-clamp-4 leading-relaxed text-sm">
                  {note.text || 'No description provided.'}
                </p>
                {note.categories && note.categories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {note.categories.map(cat => (
                      <Badge key={cat} variant="secondary" className="text-[10px] px-1.5 py-0 rounded-sm font-normal">#{cat}</Badge>
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

function EditNoteDialog({ note, updateNoteFn }: { note: any, updateNoteFn: any }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(note.title || '');
  const [text, setText] = useState(note.text || '');
  const [categoriesInput, setCategoriesInput] = useState((note.categories || []).join(', '));
  const [color, setColor] = useState(note.color || '#8dafce');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if note prop changes while dialog is open natively
  React.useEffect(() => {
    if (open) {
      setTitle(note.title || '');
      setText(note.text || '');
      setCategoriesInput((note.categories || []).join(', '));
      setColor(note.color || '#8dafce');
    }
  }, [open, note]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const parsedCategories = categoriesInput.split(',').map((c: string) => c.trim()).filter(Boolean);
      await updateNoteFn({
        id: note.id,
        title,
        text,
        categories: parsedCategories,
        color,
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
      <DialogContent className="sm:max-w-[500px]">
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
          <Textarea 
            value={text} 
            onChange={e => setText(e.target.value)} 
            placeholder="Content"
            className="min-h-[150px]"
          />
          <div className="flex gap-4">
            <Input 
              value={categoriesInput} 
              onChange={e => setCategoriesInput(e.target.value)} 
              placeholder="Categories (comma separated)"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-10 h-10 rounded-full p-0 flex-shrink-0" style={{ backgroundColor: color }} aria-label="Pick color" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="grid grid-cols-4 gap-2">
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
