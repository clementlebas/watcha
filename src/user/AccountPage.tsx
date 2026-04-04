import React, { useState } from 'react';
import { getCustomerPortalUrl, useQuery, useAction, updateUserSettings } from 'wasp/client/operations';
import { Link as WaspRouterLink, routes } from 'wasp/client/router';
import type { User } from 'wasp/entities';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { SubscriptionStatus, parsePaymentPlanId, prettyPaymentPlanName } from '../payment/plans';
import { Save, Hash, Clock, Calendar, User as UserIcon } from 'lucide-react';

import AboutYouSetting from '../watcha/components/AboutYouSetting';
import TopicSelector from '../watcha/components/TopicSelector';
import TimerSetting from '../watcha/components/TimerSetting';
import RoutineEstablisher from '../watcha/components/RoutineEstablisher';

export default function AccountPage({ user }: { user: User }) {
  const updateSettings = useAction(updateUserSettings);
  const [isSaving, setIsSaving] = useState(false);
  
  const [name, setName] = useState(user.name || '');
  const [about, setAbout] = useState(user.about || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.picture || '');

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        name,
        about,
        avatarUrl,
      });
      toast.success('Profil mis à jour !');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la mise à jour du profil.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className='mt-10 px-6 space-y-8 pb-20'>
      {/* Account & Profile */}
      <Card className='mb-4 lg:mx-8 sketch-shadow border-none bg-card overflow-hidden'>
        <CardHeader className="border-b border-dashed">
          <CardTitle className='text-xl font-bold flex items-center gap-2'>
            <UserIcon className="size-5 text-primary" />
            Informations du compte
          </CardTitle>
          <CardDescription>
            Gérez vos informations personnelles et votre avatar.
          </CardDescription>
        </CardHeader>
        <CardContent className='p-6 space-y-6'>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
              <AboutYouSetting 
                name={name}
                about={about}
                avatarUrl={avatarUrl}
                onNameChange={setName}
                onAboutChange={setAbout}
                onAvatarUrlChange={setAvatarUrl}
                disableAvatarChange={!!user.avatarUrl}
              />
            </div>
            
            <div className="space-y-4 pt-8">
              <div className="bg-muted/50 p-4 rounded-xl border-2 border-dashed border-border space-y-4">
                {!!user.email && (
                  <div className='flex flex-col gap-1'>
                    <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Email</span>
                    <span className='text-sm font-medium'>{user.email}</span>
                  </div>
                )}
                {!!user.username && (
                  <div className='flex flex-col gap-1'>
                    <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Nom d'utilisateur</span>
                    <span className='text-sm font-medium'>{user.username}</span>
                  </div>
                )}
                <div className='flex flex-col gap-1'>
                  <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground'>Status</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold px-3 py-1 text-[10px] rounded-full border ${user.subscriptionStatus === SubscriptionStatus.Active ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary border-border text-muted-foreground'}`}>
                      {user.subscriptionStatus === SubscriptionStatus.Active ? 'PRO' : 'FREE'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className='text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1'>Votre Plan</span>
                <div className="flex items-center justify-between bg-card p-4 rounded-xl border-2 sketch-shadow">
                  <UserCurrentPaymentPlan
                    subscriptionStatus={user.subscriptionStatus as SubscriptionStatus}
                    subscriptionPlan={user.subscriptionPlan}
                    datePaid={user.datePaid}
                    credits={user.credits}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t border-dashed p-6 flex justify-end">
          <Button 
            onClick={handleSaveProfile} 
            disabled={isSaving}
            className="font-bold sketch-shadow border-2 border-primary active:translate-y-0.5"
          >
            {isSaving ? "Enregistrement..." : "Sauvegarder le profil"}
            <Save className="ml-2 size-4" />
          </Button>
        </CardFooter>
      </Card>

      <WatchaPreferences user={user} />
    </div>
  );
}

function WatchaPreferences({ user }: { user: User }) {
  const updateSettings = useAction(updateUserSettings);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedTopics, setSelectedTopics] = useState<string[]>(user.topics || []);
  const [timer, setTimer] = useState<number>(user.defaultTimer || 25);
  const [routine, setRoutine] = useState<Record<string, string>>(
    (user.routine as Record<string, string>) || {}
  );

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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings({
        topics: selectedTopics,
        defaultTimer: timer,
        routine: routine,
      });
      toast.success('Préférences mises à jour avec succès !');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de la mise à jour des préférences.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className='mb-4 lg:mx-8 sketch-shadow border-none bg-card overflow-hidden'>
      <CardHeader className="border-b border-dashed">
        <CardTitle className='text-xl font-bold flex items-center gap-2'>
          <Save className="size-5 text-primary" />
          Watcha Preferences
        </CardTitle>
        <CardDescription>
          Personnalisez votre expérience de veille et vos rappels.
        </CardDescription>
      </CardHeader>
      
      <CardContent className='pt-6 space-y-10'>
        {/* Topics */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <Hash className="size-4" />
            Sujets d'intérêt
          </div>
          <TopicSelector selectedTopics={selectedTopics} onToggle={toggleTopic} />
        </div>

        <Separator className="border-dashed" />

        {/* Timer */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <Clock className="size-4" />
            Minuteur par défaut
          </div>
          <TimerSetting timer={timer} onChange={setTimer} />
        </div>

        <Separator className="border-dashed" />

        {/* Routine */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm uppercase tracking-wider text-muted-foreground">
            <Calendar className="size-4" />
            Routine hebdomadaire
          </div>
          <RoutineEstablisher 
            routine={routine} 
            onToggleDay={toggleDay} 
            onUpdateTime={updateDayTime} 
          />
        </div>
      </CardContent>

      <CardFooter className="bg-muted/30 border-t border-dashed p-6 flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="font-bold sketch-shadow border-2 border-primary active:translate-y-0.5"
        >
          {isSaving ? "Enregistrement..." : "Sauvegarder les préférences"}
          <Save className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

type UserCurrentPaymentPlanProps = {
  subscriptionPlan: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  datePaid: Date | null;
  credits: number;
};

function UserCurrentPaymentPlan({
  subscriptionPlan,
  subscriptionStatus,
  datePaid,
  credits,
}: UserCurrentPaymentPlanProps) {
  if (subscriptionStatus && subscriptionPlan && datePaid) {
    return (
      <>
        <dd className='mt-1 text-sm text-foreground sm:col-span-1 sm:mt-0'>
          {getUserSubscriptionStatusDescription({ subscriptionPlan, subscriptionStatus, datePaid })}
        </dd>
        {subscriptionStatus !== SubscriptionStatus.Deleted ? <CustomerPortalButton /> : <BuyMoreButton />}
      </>
    );
  }

  return (
    <>
      <dd className='mt-1 text-sm text-foreground sm:col-span-1 sm:mt-0'>Credits remaining: {credits}</dd>
      <BuyMoreButton />
    </>
  );
}

function getUserSubscriptionStatusDescription({
  subscriptionPlan,
  subscriptionStatus,
  datePaid,
}: {
  subscriptionPlan: string;
  subscriptionStatus: SubscriptionStatus;
  datePaid: Date;
}) {
  const planName = prettyPaymentPlanName(parsePaymentPlanId(subscriptionPlan));
  const endOfBillingPeriod = prettyPrintEndOfBillingPeriod(datePaid);
  return prettyPrintStatus(planName, subscriptionStatus, endOfBillingPeriod);
}

function prettyPrintStatus(
  planName: string,
  subscriptionStatus: SubscriptionStatus,
  endOfBillingPeriod: string
 ): string {
  const statusToMessage: Record<SubscriptionStatus, string> = {
    active: `${planName}`,
    past_due: `Payment for your ${planName} plan is past due! Please update your subscription payment information.`,
    cancel_at_period_end: `Your ${planName} plan subscription has been canceled, but remains active until the end of the current billing period${endOfBillingPeriod}`,
    deleted: `Your previous subscription has been canceled and is no longer active.`,
  };
  if (Object.keys(statusToMessage).includes(subscriptionStatus)) {
    return statusToMessage[subscriptionStatus];
  } else {
    throw new Error(`Invalid subscriptionStatus: ${subscriptionStatus}`);
  }
}

function prettyPrintEndOfBillingPeriod(date: Date) {
  const oneMonthFromNow = new Date(date);
  oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
  return ': ' + oneMonthFromNow.toLocaleDateString();
}

function BuyMoreButton() {
  return (
    <div className='ml-4 flex-shrink-0 sm:col-span-1 sm:mt-0'>
      <WaspRouterLink
        to={routes.PricingPageRoute.to}
        className='font-medium text-sm text-primary hover:text-primary/80 transition-colors duration-200'
      >
        Buy More/Upgrade
      </WaspRouterLink>
    </div>
  );
}

function CustomerPortalButton() {
  const {
    data: customerPortalUrl,
    isLoading: isCustomerPortalUrlLoading,
    error: customerPortalUrlError,
  } = useQuery(getCustomerPortalUrl);

  const handleClick = () => {
    if (customerPortalUrlError) {
      console.error('Error fetching customer portal url');
    }

    if (customerPortalUrl) {
      window.open(customerPortalUrl, '_blank');
    } else {
      console.error('Customer portal URL is not available');
    }
  };

  return (
    <div className='ml-4 flex-shrink-0 sm:col-span-1 sm:mt-0'>
      <Button
        onClick={handleClick}
        disabled={isCustomerPortalUrlLoading}
        variant='outline'
        size='sm'
        className='font-medium text-sm'
      >
        Manage Subscription
      </Button>
    </div>
  );
}
