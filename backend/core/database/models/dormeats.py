from .base import Base
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import List
from sqlalchemy import String, Integer, ForeignKey, BigInteger, DateTime, Column
from sqlalchemy import Integer, Enum as SQLEnum

from enum import Enum
from datetime import datetime, UTC

class Canteen(Base):
    pass
class Menu():
    pass