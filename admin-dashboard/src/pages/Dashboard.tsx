import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Users, KeyRound, Activity, TrendingUp } from 'lucide-react';

const stats = [
  {
    name: 'Total Users',
    value: '2,543',
    change: '+12.5%',
    icon: Users,
  },
  {
    name: 'API Keys',
    value: '145',
    change: '+5.2%',
    icon: KeyRound,
  },
  {
    name: 'Requests Today',
    value: '45.2K',
    change: '+18.1%',
    icon: TrendingUp,
  },
  {
    name: 'System Health',
    value: '99.9%',
    change: 'Healthy',
    icon: Activity,
  },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your GatewayQL instance
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change} from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest events in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { action: 'New user registered', time: '2 minutes ago' },
                { action: 'API key created', time: '15 minutes ago' },
                { action: 'Health check passed', time: '1 hour ago' },
                { action: 'User updated', time: '2 hours ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {activity.time}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Current system health metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Database', status: 'Healthy', color: 'bg-green-500' },
                { name: 'Memory', status: '45% Used', color: 'bg-blue-500' },
                { name: 'CPU', status: '32% Used', color: 'bg-blue-500' },
                { name: 'Disk', status: '68% Used', color: 'bg-yellow-500' },
              ].map((metric, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${metric.color}`} />
                    <p className="text-sm">{metric.name}</p>
                  </div>
                  <p className="text-sm font-medium">{metric.status}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
