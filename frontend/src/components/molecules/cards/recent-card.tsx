import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
interface Item {
  name: string;
  srcImg: string;
  createdTime: string;
  price?: string;
}
interface RecentCardProps {
  title: string;
  typeContent: "product" | "user";
  items: Item[];
}
export const RecentCard = ({ title, items, typeContent }: RecentCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, index) => (
            <div className="flex items-center p-3 border border-gray-100 rounded-md hover:bg-gray-50 transition-colors" key={index}>
              <img
                src={item.srcImg}
                alt=""
                className={`w-10 h-10 bg-gray-200 flex-shrink-0 ${
                  typeContent === "product" ? "rounded" : "rounded-full"
                }`}
              />

              <div className="ml-4 flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-gray-500">{item.createdTime}</p>
              </div>
              <div className="text-sm font-medium text-gray-900">
                {item.price}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
