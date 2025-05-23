from datetime import date, datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

# Define type for filter function: receives conditions list, column attribute, and optional params
FilterFunc = Callable[[List[Any], Any, Dict[str, Any]], None]

# Global registry mapping enum members to their filter functions
date_filter_funcs: Dict["DateFilterEnum", FilterFunc] = {}


class DateFilterEnum(Enum):
    """
    Generic dispatching Enum for date-based filters. Each member maps to a filter function.
    """

    today = "today"
    tomorrow = "tomorrow"
    weekend = "weekend"
    within_week = "within_week"
    custom = "custom"

    def apply(
        self,
        conditions: List[Any],
        column: Any,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> None:
        """
        Apply the selected date filter to the provided conditions list using the given ORM column.

        :param conditions: List of ORM filter conditions to append to.
        :param column: ORM model column (e.g., Model.date_field) to filter on.
        :param start_date: Only for custom filter
        :param end_date: Only for custom filter
        """
        func = date_filter_funcs.get(self)
        if not func:
            raise ValueError(f"No filter function registered for {self}")
        func(conditions, column, {"start_date": start_date, "end_date": end_date})

    @classmethod
    def register(cls, member: "DateFilterEnum") -> Callable[[FilterFunc], FilterFunc]:
        """
        Decorator to register a filter function for an enum member.
        Usage:
            @DateFilterEnum.register(DateFilterEnum.today)
            def _filter_today(conditions, column, params):
                ...
        """

        def decorator(func: FilterFunc) -> FilterFunc:
            date_filter_funcs[member] = func
            return func

        return decorator


@DateFilterEnum.register(DateFilterEnum.custom)
def _filter_custom(conditions: List[Any], column: Any, params: Dict[str, Any]) -> None:
    start_date = params.get("start_date")
    end_date = params.get("end_date")
    if not start_date or not end_date:
        raise ValueError("start_date and end_date must be provided for custom filter")
    start = datetime.combine(start_date, datetime.min.time())
    end = datetime.combine(end_date, datetime.max.time())
    conditions.append(column.between(start, end))
