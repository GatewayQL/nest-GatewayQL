import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  KeyRound,
  Activity,
  TrendingUp,
  ArrowUpIcon,
  Clock,
  Shield,
  Database,
  Cpu,
  HardDrive,
  MemoryStick
} from 'lucide-react';

const stats = [
  {
    name: 'Total Users',
    value: '2,543',
    change: '+12.5%',
    changeType: 'positive' as const,
    icon: Users,
    description: 'Active users in the system',
  },
  {
    name: 'API Keys',
    value: '145',
    change: '+5.2%',
    changeType: 'positive' as const,
    icon: KeyRound,
    description: 'Generated API credentials',
  },
  {
    name: 'Requests Today',
    value: '45.2K',
    change: '+18.1%',
    changeType: 'positive' as const,
    icon: TrendingUp,
    description: 'Total requests processed',
  },
  {
    name: 'System Health',
    value: '99.9%',
    change: 'Excellent',
    changeType: 'neutral' as const,
    icon: Activity,
    description: 'Overall system status',
  },
];

const recentActivities = [
  {
    action: 'New user registered',
    user: 'john.doe@example.com',
    time: '2 minutes ago',
    icon: Users,
  },
  {
    action: 'API key created',
    user: 'api.service@company.com',
    time: '15 minutes ago',
    icon: KeyRound,
  },
  {
    action: 'Health check passed',
    user: 'System Monitor',
    time: '1 hour ago',
    icon: Shield,
  },
  {
    action: 'User updated profile',
    user: 'jane.smith@example.com',
    time: '2 hours ago',
    icon: Users,
  },
];

const systemMetrics = [
  {
    name: 'Database',
    status: 'Healthy',
    value: '100%',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    dotColor: 'bg-emerald-500',
    icon: Database,
  },
  {
    name: 'Memory',
    status: '45% Used',
    value: '45%',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    dotColor: 'bg-blue-500',
    icon: MemoryStick,
  },
  {
    name: 'CPU',
    status: '32% Used',
    value: '32%',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    dotColor: 'bg-blue-500',
    icon: Cpu,
  },
  {
    name: 'Disk',
    status: '68% Used',
    value: '68%',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    dotColor: 'bg-amber-500',
    icon: HardDrive,
  },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Overview of your GatewayQL instance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name} className="relative overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className="rounded-md bg-primary/10 p-2">
                <stat.icon className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="flex items-center space-x-1 mt-1">
                {stat.changeType === 'positive' && (
                  <ArrowUpIcon className="h-3 w-3 text-emerald-500" />
                )}
                <p className={`text-xs font-medium ${
                  stat.changeType === 'positive'
                    ? 'text-emerald-600'
                    : 'text-muted-foreground'
                }`}>
                  {stat.change}
                </p>
                <span className="text-xs text-muted-foreground">from last month</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity - Takes 2/3 width */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Recent Activity</CardTitle>
            </div>
            <CardDescription>Latest events in your system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex items-center space-x-4 rounded-lg border p-3 transition-colors hover:bg-muted/50">
                  <div className="rounded-full bg-primary/10 p-2">
                    <activity.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.user}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Status - Takes 1/3 width */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <CardTitle>System Status</CardTitle>
            </div>
            <CardDescription>Current system health metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {systemMetrics.map((metric, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg transition-colors hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className={`rounded-md ${metric.bgColor} p-1.5`}>
                      <metric.icon className={`h-3 w-3 ${metric.color}`} />
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${metric.dotColor}`} />
                      <p className="text-sm font-medium">{metric.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${metric.color}`}>
                      {metric.value}
                    </p>
                    <p className="text-xs text-muted-foreground">{metric.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
