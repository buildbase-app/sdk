import { Skeleton } from '../../../components/ui/skeleton';

export default function SettingSkeleton() {
  return (
    <div className="space-y-3.5">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}
