import { Card, CardContent, CardHeader } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

const ActivityByCategorySkeleton = () => {
  return (
    <Card>
      <CardHeader></CardHeader>
      <CardContent className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={`skel-cat-${i}`} className="space-y-2">
            <div className="flex justify-between items-center mb-1 pb-1 border-b border-border">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
            </div>
            {[...Array(2)].map((_, j) => (
              <div
                key={`skel-act-${i}-${j}`}
                className="flex items-center justify-between py-0.5"
              >
                <div className="flex items-center flex-1 min-w-0">
                  <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <Skeleton className="h-4 w-1/5 ml-2" />
              </div>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ActivityByCategorySkeleton;
