import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  progress?: {
    current: number;
    max: number;
  };
  change?: {
    value: number;
    label: string;
  };
  color: "blue" | "green" | "yellow" | "red" | "gray";
}

const StatsCard = ({ title, value, icon, progress, change, color }: StatsCardProps) => {
  // Map color to Tailwind classes
  const colorClasses = {
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-600",
      progress: "bg-blue-600"
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-600",
      progress: "bg-green-600"
    },
    yellow: {
      bg: "bg-yellow-100",
      text: "text-yellow-600",
      progress: "bg-yellow-600"
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-600",
      progress: "bg-red-600"
    },
    gray: {
      bg: "bg-gray-100",
      text: "text-gray-600",
      progress: "bg-gray-600"
    }
  };
  
  // Calculate progress percentage
  const progressPercentage = progress 
    ? Math.round((progress.current / progress.max) * 100) 
    : 0;
  
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className={`flex-shrink-0 rounded-md ${colorClasses[color].bg} p-3`}>
            <div className={colorClasses[color].text}>
              {icon}
            </div>
          </div>
          <div className="ml-4">
            <h2 className="text-sm font-medium text-gray-600">{title}</h2>
            <p className="text-2xl font-semibold text-gray-800">{value}</p>
          </div>
        </div>
        
        {progress && (
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">0</span>
              <span className="text-gray-500">Meta: {progress.max}</span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`${colorClasses[color].progress} h-2 rounded-full`} 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
        
        {change && (
          <div className="mt-4">
            <div className="flex justify-between text-sm">
              <span className={colorClasses[color].text}>{change.label}</span>
              <span className="text-gray-500">{progressPercentage}%</span>
            </div>
            <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`${colorClasses[color].progress} h-2 rounded-full`} 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;
