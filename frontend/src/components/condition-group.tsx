export function ConditionGroup({
  conditions,
  selectedCondition,
  setSelectedCondition,
}: {
  conditions: string[];
  selectedCondition: string;
  setSelectedCondition: (condition: string) => void;
}) {
  return (
    <div className="flex space-x-3 overflow-x-auto no-scrollbar">
      {conditions.map((item) => (
        <button
          key={item}
          onClick={() => setSelectedCondition(item)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition hover:bg-slate-900 focus:bg-[#0d1425] ${
            selectedCondition === item
              ? "bg-[#0d1425] text-slate-300"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
