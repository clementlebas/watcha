import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAction, updateUserSettings } from 'wasp/client/operations';
import type { User } from 'wasp/entities';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { ChevronRight, ChevronLeft, Check, Clock, Calendar, Hash, User as UserIcon } from 'lucide-react';

import AboutYouSetting from '../components/AboutYouSetting';
import TopicSelector from '../components/TopicSelector';
import TimerSetting from '../components/TimerSetting';
import RoutineEstablisher from '../components/RoutineEstablisher';

export default function OnboardingPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const updateSettings = useAction(updateUserSettings);

  useEffect(() => {
    // Check if user has already finished the final step (routine or topics)
    if (user.topics && user.topics.length > 0 && user.name) {
      navigate('/watcha', { replace: true });
    }
  }, [user, navigate]);
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user.name || '');
  const [about, setAbout] = useState(user.about || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.picture || '');
  const [selectedTopics, setSelectedTopics] = useState<string[]>(user.topics || []);
  const [timer, setTimer] = useState<number>(user.defaultTimer || 25);
  const [routine, setRoutine] = useState<Record<string, string>>(
    (user.routine as Record<string, string>) || {}
  );

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleFinish();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = async () => {
    try {
      await updateSettings({
        name,
        about,
        avatarUrl,
        topics: selectedTopics,
        defaultTimer: timer,
        routine: routine,
      });
      navigate('/watcha');
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic) 
        : [...prev, topic]
    );
  };

  const toggleDay = (day: string) => {
    setRoutine(prev => {
      const newRoutine = { ...prev };
      if (newRoutine[day]) {
        delete newRoutine[day];
      } else {
        newRoutine[day] = "09:00";
      }
      return newRoutine;
    });
  };

  const updateDayTime = (day: string, time: string) => {
    setRoutine(prev => ({
      ...prev,
      [day]: time
    }));
  };

  const progressValue = (step / 4) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-muted-foreground px-1">
            <span>Étape {step} sur 4</span>
          </div>
          <Progress value={progressValue} className="h-2 bg-secondary" />
        </div>

        <Card className="sketch-shadow border-none bg-card relative overflow-hidden group">
          {/* Notebook line decoration */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/10 border-r border-primary/20" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-32 border-l-2 border-primary/5 rounded-l-full opacity-30 group-hover:opacity-100 transition-opacity" />
          
          <CardHeader className="pl-12">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                {step === 1 && <UserIcon className="size-6 text-primary" />}
                {step === 2 && <Hash className="size-6 text-primary" />}
                {step === 3 && <Clock className="size-6 text-primary" />}
                {step === 4 && <Calendar className="size-6 text-primary" />}
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {step === 1 && "Faisons connaissance"}
                {step === 2 && "Quels sujets vous intéressent ?"}
                {step === 3 && "Votre temps de mise au point"}
                {step === 4 && "Votre routine de veille"}
              </CardTitle>
            </div>
            <CardDescription className="text-base ml-12">
              {step === 1 && "Présentez-vous brièvement pour personnaliser votre expérience."}
              {step === 2 && "Sélectionnez les thématiques que vous souhaitez suivre pour personnaliser votre flux."}
              {step === 3 && "Définissez la durée par défaut de vos sessions de lecture et de prise de notes."}
              {step === 4 && "Planifiez les moments de la semaine où vous souhaitez recevoir vos rappels."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pl-12 pt-6 min-h-[350px]">
            {step === 1 && (
              <AboutYouSetting 
                name={name} 
                about={about} 
                avatarUrl={avatarUrl}
                onNameChange={setName}
                onAboutChange={setAbout}
                onAvatarUrlChange={setAvatarUrl}
              />
            )}

            {step === 2 && (
              <TopicSelector selectedTopics={selectedTopics} onToggle={toggleTopic} />
            )}

            {step === 3 && (
              <TimerSetting timer={timer} onChange={setTimer} />
            )}

            {step === 4 && (
              <RoutineEstablisher 
                routine={routine} 
                onToggleDay={toggleDay} 
                onUpdateTime={updateDayTime} 
              />
            )}
          </CardContent>

          <CardFooter className="pl-12 pb-8 pt-6 border-t border-dashed flex justify-between bg-muted/30">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="font-bold border-2 border-transparent hover:border-primary/20"
            >
              <ChevronLeft className="mr-2 size-4" />
              Retour
            </Button>
            <Button
              onClick={handleNext}
              disabled={
                (step === 1 && !name) || 
                (step === 2 && selectedTopics.length === 0)
              }
              className="font-bold px-8 h-12 text-lg sketch-shadow border-2 border-primary active:translate-y-0.5 transition-all"
            >
              {step === 4 ? "Terminer" : "Suivant"}
              {step !== 4 && <ChevronRight className="ml-2 size-4" />}
              {step === 4 && <Check className="ml-2 size-4" />}
            </Button>
          </CardFooter>
        </Card>
        
        <p className="text-center text-xs text-muted-foreground uppercase tracking-widest font-bold">
          WatchaV2 &copy; 2026
        </p>
      </div>
    </div>
  );
}
