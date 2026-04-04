import { useState } from 'react';
import { useQuery } from 'wasp/client/operations';
import { useAuth } from 'wasp/client/auth';
import { getUserStatistics } from 'wasp/client/operations';
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../../components/ui/chart';
import { Clock, BookOpen, Timer, Award, CreditCard } from 'lucide-react';

const PIE_COLORS = ['#8dafce', '#f87171', '#fb923c', '#facc15', '#4ade80', '#a78bfa', '#f472b6', '#94a3b8', '#006f72', '#e29e21'];

function formatSeconds(totalSeconds: number): { hours: number; minutes: number } {
  const totalMinutes = Math.floor(totalSeconds / 60);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export default function StatisticsPage() {
  const { data: user } = useAuth();
  const { data: stats, isLoading } = useQuery(getUserStatistics);

  if (isLoading || !stats) {
    return (
      <div className="min-h-screen bg-background text-foreground p-6 md:p-12">
        <h1 className="text-4xl font-extrabold tracking-tight mb-10">My Statistics</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-sm" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-sm" />
          <Skeleton className="h-80 rounded-sm" />
        </div>
      </div>
    );
  }

  const totalTime = formatSeconds(stats.totalTimeSeconds);
  const avgTime = formatSeconds(stats.averageTimeSeconds);

  const pieChartConfig: Record<string, { label: string; color: string }> = {};
  stats.timeByCategory.forEach((cat, i) => {
    pieChartConfig[cat.name] = {
      label: cat.name,
      color: PIE_COLORS[i % PIE_COLORS.length],
    };
  });

  const barChartConfig = {
    count: { label: 'Notes', color: 'oklch(var(--primary))' },
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 font-sans transition-colors duration-300">
      {/* HEADER */}
      <header className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
          📊 My Statistics
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Your learning journey at a glance.
        </p>
      </header>

      {/* KPIs */}
      {stats.totalNotes === 0 ? (
        <Card className="sketch-shadow border-dashed border-border p-12 text-center">
          <CardContent>
            <p className="text-2xl font-semibold text-muted-foreground">No watches started yet.</p>
            <p className="text-muted-foreground mt-2">Create your first note to see your statistics here!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <KpiCard
              icon={<BookOpen className="size-6" />}
              label="Total Watches"
              value={stats.totalNotes.toString()}
              accent="bg-primary/10 text-primary"
            />
            <KpiCard
              icon={<Clock className="size-6" />}
              label="Total Time Spent"
              value={`${totalTime.hours}h ${totalTime.minutes}min`}
              accent="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
            />
            <KpiCard
              icon={<Timer className="size-6" />}
              label="Average Time"
              value={`${avgTime.hours > 0 ? avgTime.hours + 'h ' : ''}${avgTime.minutes}min`}
              accent="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            />
          </div>

          {/* CHARTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
            {/* PIE: Time by Category */}
            <Card className="sketch-shadow">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">🏷️ Time by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.timeByCategory.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No categories tracked yet.</p>
                ) : (
                  <ChartContainer config={pieChartConfig} className="mx-auto aspect-square max-h-[300px]">
                    <PieChart>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value: any) => {
                              const t = formatSeconds(Number(value));
                              return `${t.hours > 0 ? t.hours + 'h ' : ''}${t.minutes}min`;
                            }}
                          />
                        }
                      />
                      <Pie
                        data={stats.timeByCategory}
                        dataKey="totalSeconds"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={110}
                        strokeWidth={3}
                        stroke="oklch(var(--background))"
                      >
                        {stats.timeByCategory.map((entry, index) => (
                          <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                )}
                {/* Legend */}
                {stats.timeByCategory.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 justify-center">
                    {stats.timeByCategory.map((cat, i) => (
                      <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                        <div className="w-3 h-3 rounded-sm border border-border" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{cat.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BAR: Activity Timeline */}
            <Card className="sketch-shadow">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">📅 Activity (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-[300px] w-full">
                  <BarChart data={stats.activityTimeline} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid vertical={false} strokeDasharray="4 4" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val: string) => {
                        const d = new Date(val);
                        return `${d.getDate()}/${d.getMonth() + 1}`;
                      }}
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 10 }}
                      className="fill-muted-foreground"
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value: any) => `${value} note${Number(value) > 1 ? 's' : ''}`}
                        />
                      }
                    />
                    <Bar
                      dataKey="count"
                      fill="oklch(var(--primary))"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* WATCHA CARD */}
          <div className="flex justify-center">
            <WatchaCardDialog
              totalNotes={stats.totalNotes}
              averageMinutes={Math.floor(stats.averageTimeSeconds / 60)}
              topTags={stats.topTags}
              username={user?.username || user?.email || 'Watcher'}
            />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <Card className="sketch-shadow hover:-translate-y-1 transition-transform duration-200">
      <CardContent className="p-6 flex items-center gap-5">
        <div className={`p-3 rounded-sm ${accent}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <p className="text-3xl font-extrabold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WatchaCardDialog({ totalNotes, averageMinutes, topTags, username }: {
  totalNotes: number;
  averageMinutes: number;
  topTags: string[];
  username: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="sketch-shadow px-8 py-6 text-lg font-bold hover:-translate-y-1 transition-transform">
          <CreditCard className="mr-3 size-5" />
          Generate Watcha Card
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">Your Watcha Card</DialogTitle>
        </DialogHeader>

        {/* Card Visual */}
        <div className="mx-auto w-full max-w-sm border border-foreground rounded-sm sketch-shadow bg-card p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b-2 border-dashed border-border pb-4">
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">WATCHA</h3>
              <p className="text-xs text-muted-foreground font-mono uppercase">Member Card</p>
            </div>
            <Award className="size-8 text-primary" />
          </div>

          {/* Member Info */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Member</p>
            <p className="text-lg font-bold truncate">{username}</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-border rounded-sm p-3 text-center">
              <p className="text-2xl font-extrabold">{totalNotes}</p>
              <p className="text-xs text-muted-foreground">Total Watches</p>
            </div>
            <div className="border border-border rounded-sm p-3 text-center">
              <p className="text-2xl font-extrabold">{averageMinutes}<span className="text-sm font-normal">min</span></p>
              <p className="text-xs text-muted-foreground">Avg. Time</p>
            </div>
          </div>

          {/* Favorite Tags */}
          {topTags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Favorite Tags</p>
              <div className="flex flex-wrap gap-2">
                {topTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center text-[10px] text-muted-foreground pt-4 border-t-2 border-dashed border-border font-mono">
            watcha.app • {new Date().getFullYear()}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
