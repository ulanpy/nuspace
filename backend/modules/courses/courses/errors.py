class SemesterResolutionError(Exception):
    """Raised when we cannot resolve the current registrar semester."""


class CourseLookupError(Exception):
    """Raised when a course cannot be found in registrar search."""

