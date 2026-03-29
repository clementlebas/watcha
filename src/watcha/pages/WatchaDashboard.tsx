import React, { useState, useMemo } from 'react';
import { useQuery, useAction } from 'wasp/client/operations';
import { getNotes, createNote, deleteNote, getDownloadFileSignedURL } from 'wasp/client/operations';
import { Search, Plus, Trash2, Clock, Tag, Calendar, Image as ImageIcon, X, Upload } from 'lucide-react';
import { uploadFileWithProgress, validateFile, type FileWithValidType } from '../../file-upload/fileUploading';

export default function DashboardPage() {
  const { data: notes, isLoading } = useQuery(getNotes);
  const createNoteFn = useAction(createNote);
  const deleteNoteFn = useAction(deleteNote);

  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Today's date check mapping exact Wewatch logic
  const dateOfTheDay = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const noteOfTheDayDone = (notes?.length ?? 0) > 0 && notes?.[0]?.date === dateOfTheDay;

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

      await createNoteFn({
        title: title || (selectedFile ? 'Image Note' : 'Untitled'),
        text,
        date: dateOfTheDay,
        color: '#8dafce',
        categories: [],
        fileId,
      });
      setTitle('');
      setText('');
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (err) {
      console.error('Upload failed:', err);
      alert("L'image n'a pas pu être uploadée. Veuillez vérifier votre connexion ou choisir une autre image.");
    } finally {
      setIsUploading(false);
    }
  };

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    if (!searchValue) return notes;
    const searchLower = searchValue.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return notes.filter((n) =>
      n.title?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(searchLower)
    );
  }, [notes, searchValue]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-6 md:p-12 font-sans transition-colors duration-300">
      
      {/* HEADER */}
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent drop-shadow-sm">
          Welcome to Watcha
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2 text-lg">
          Track your daily learning progress and feed.
        </p>
      </header>

      {/* NOTE EDITION / STATUS */}
      <section className="mb-12">
        {noteOfTheDayDone ? (
          <div className="bg-gradient-to-tr from-green-500/20 to-emerald-500/10 border border-green-500/30 p-8 rounded-3xl backdrop-blur-md shadow-lg flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl font-semibold text-green-700 dark:text-green-400 flex items-center gap-3">
              🎉 Your watch of the day is done! See you next time.
            </h2>
          </div>
        ) : (
          <form 
            onSubmit={handleCreateNote} 
            className="bg-white dark:bg-neutral-800 p-6 md:p-8 rounded-3xl shadow-xl shadow-neutral-200/50 dark:shadow-black/50 border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-xl group relative overflow-hidden transition-all duration-300 hover:shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-blue-500" /> New Daily Note
            </h2>
            
            <input
              type="text"
              placeholder="What did you learn today?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl md:text-2xl font-semibold bg-transparent border-b-2 border-neutral-200 dark:border-neutral-700 focus:border-blue-500 outline-none pb-2 mb-6 transition-colors"
            />
            
            <textarea
              placeholder="Add some details, links, or thoughts..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-32 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl p-4 mb-6 focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
            />
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="w-full md:w-auto">
                <label className="flex items-center gap-2 cursor-pointer bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 px-4 py-2 rounded-xl transition-all border border-dashed border-neutral-300 dark:border-neutral-500">
                  <Upload size={18} className="text-blue-500" />
                  <span className="text-sm font-medium">
                    {selectedFile ? selectedFile.name : 'Add an image'}
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
                      className="ml-2 text-neutral-400 hover:text-red-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </label>
              </div>

              <button
                type="submit"
                disabled={isUploading}
                className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 flex items-center gap-2 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isUploading ? 'Uploading...' : 'Save Note'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* SEARCH BAR */}
      <div className="relative max-w-xl mx-auto md:mx-0 mb-10 group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500 transition-colors" size={20} />
        <input
          type="text"
          placeholder="Search your notes..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full bg-white dark:bg-neutral-800 border-2 border-transparent focus:border-blue-500 outline-none rounded-full py-3 pl-12 pr-6 shadow-md transition-all duration-300"
        />
      </div>

      {/* NOTES GRID */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="text-center py-20 text-neutral-400 dark:text-neutral-500 text-xl font-medium">
          No watchs or notes found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className="group relative bg-white dark:bg-neutral-800 rounded-3xl p-6 shadow-sm border border-neutral-100 dark:border-neutral-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col"
            >
              <div 
                className="absolute top-0 right-0 w-16 h-16 rounded-bl-[100px] rounded-tr-3xl opacity-50 transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: note.color || '#8dafce' }}
              />
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                <h3 className="text-xl font-bold line-clamp-2 pr-8">{note.title}</h3>
                <button 
                  onClick={() => deleteNoteFn({ id: note.id })}
                  className="p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete Note"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              
              {/* @ts-ignore */}
              {note.file && (
                <div className="mb-4 rounded-2xl overflow-hidden border border-neutral-100 dark:border-neutral-700 aspect-video bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
                  {/* @ts-ignore */}
                  <NoteImage fileKey={note.file.key} title={note.title} />
                </div>
              )}

              <p className="text-neutral-600 dark:text-neutral-300 flex-grow line-clamp-4 leading-relaxed">
                {note.text || 'No description provided.'}
              </p>
              
              <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700 flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} />
                  <span>{note.date || new Date(note.createdAt).toLocaleDateString()}</span>
                </div>
                {note.elapsedTime && (
                  <div className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-700 px-2.5 py-1 rounded-full text-xs font-semibold">
                    <Clock size={12} />
                    <span>{note.elapsedTime}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const NoteImage = ({ fileKey, title }: { fileKey: string; title?: string | null }) => {
  const { data: downloadUrl, isLoading } = useQuery(getDownloadFileSignedURL, { key: fileKey });
  
  if (isLoading || !downloadUrl) {
    return <div className="w-full h-full bg-neutral-100 dark:bg-neutral-800 animate-pulse flex items-center justify-center">
      <ImageIcon size={24} className="text-neutral-300" />
    </div>;
  }

  return (
    <img 
      src={downloadUrl} 
      className="w-full h-full object-cover transition-opacity duration-300" 
      alt={title || 'Note image'}
      onLoad={(e) => (e.currentTarget.style.opacity = '1')}
      style={{ opacity: 0 }}
    />
  );
};
