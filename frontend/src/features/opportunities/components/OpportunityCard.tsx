import { Opportunity, formatOpportunityType } from "../types";
import { Calendar, MapPin, Link2, Bookmark, Building2, GraduationCap, Wallet } from "lucide-react";
import { motion } from "framer-motion";

const badgeColors = ["bg-blue-100 text-blue-800", "bg-emerald-100 text-emerald-800", "bg-amber-100 text-amber-800", "bg-indigo-100 text-indigo-800"];

const pickBadge = (seed: string | undefined | null) => {
  if (!seed) return badgeColors[0];
  const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return badgeColors[hash % badgeColors.length];
};

const formatDeadline = (deadline?: string | null) => {
  if (!deadline) return "Year-round";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "Year-round";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const deadlineStatus = (deadline?: string | null) => {
  if (!deadline) return "Year-round";
  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return "Year-round";
  const now = new Date();
  if (date < new Date(now.toDateString())) {
    return "Expired";
  }
  return "Open";
};

type Props = {
  opportunity: Opportunity;
  canManage?: boolean;
  onEdit?: (opp: Opportunity) => void;
};

export const OpportunityCard = ({ opportunity, canManage = false, onEdit }: Props) => {
  const status = deadlineStatus(opportunity.deadline);
  const deadlineLabel =
    status === "Year-round"
      ? "Year-round"
      : formatDeadline(opportunity.deadline);
  return (
    <motion.article
      layout
      className="rounded-2xl border border-gray-200 bg-white/90 backdrop-blur shadow-sm hover:shadow-lg transition-all duration-200 dark:border-gray-800 dark:bg-gray-900/80"
    >
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {opportunity.type && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${pickBadge(opportunity.type)} shadow-sm`}>
                  {formatOpportunityType(opportunity.type)}
                </span>
              )}
              {opportunity.host && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                  <Building2 className="h-3 w-3" />
                  {opportunity.host}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {opportunity.name}
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Calendar className="h-4 w-4" />
            <span>{deadlineLabel}</span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
                status === "Expired"
                  ? "bg-red-100 text-red-800"
                  : status === "Year-round"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {status}
            </span>
          </div>
        </div>

        {opportunity.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            {opportunity.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
          {opportunity.majors && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              <GraduationCap className="h-3 w-3" />
              {opportunity.majors}
            </span>
          )}
          {opportunity.location && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-purple-50 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">
              <MapPin className="h-3 w-3" />
              {opportunity.location}
            </span>
          )}
          {opportunity.funding && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
              <Wallet className="h-3 w-3" />
              Funding: {opportunity.funding}
            </span>
          )}
        </div>

        {(opportunity.steps || opportunity.eligibility) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opportunity.steps && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Steps</div>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{opportunity.steps}</p>
              </div>
            )}
            {opportunity.eligibility && (
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/70 p-3">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Eligibility</div>
                <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">{opportunity.eligibility}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {opportunity.link ? (
            <a
              href={opportunity.link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            >
              <Link2 className="h-4 w-4" />
              Application link
            </a>
          ) : (
            <span className="text-sm text-gray-500">No application link</span>
          )}
          {canManage && onEdit && (
            <button
              onClick={() => onEdit(opportunity)}
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
};
