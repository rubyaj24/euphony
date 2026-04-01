from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class Track(str, Enum):
    EASTERN = "Eastern"
    WESTERN = "Western"


class Round(str, Enum):
    DUET = "Duet"
    SOLO = "Solo"


CATEGORIES = [
    "duet_eastern",
    "duet_western",
    "solo_eastern",
    "solo_western",
]

CATEGORY_ORDER = [
    "duet_eastern",
    "duet_western",
    "solo_eastern",
    "solo_western",
]


class Category(str, Enum):
    DUET_EASTERN = "duet_eastern"
    DUET_WESTERN = "duet_western"
    SOLO_EASTERN = "solo_eastern"
    SOLO_WESTERN = "solo_western"


class FinalistBase(BaseModel):
    name: str
    semester: str
    department: str
    track: Track
    round: Round
    avatar_url: Optional[str] = None


class FinalistCreate(FinalistBase):
    pass


class Finalist(FinalistBase):
    id: int
    uuid_id: str

    class Config:
        from_attributes = True


class FinalistResponse(BaseModel):
    uuid_id: str
    name: str
    semester: str
    department: str
    track: Track
    round: Round
    avatar_url: Optional[str]


class DuetBase(BaseModel):
    duet_name: str
    member1_id: str
    member2_id: str


class DuetCreate(DuetBase):
    pass


class DuetResponse(DuetBase):
    pass


class VoteCreate(BaseModel):
    finalist_id: str
    category: Category


class VoteResponse(BaseModel):
    success: bool
    message: str


class VoteCheck(BaseModel):
    has_voted: bool
    voted_finalist_id: Optional[str] = None


class VoteCount(BaseModel):
    finalist_id: str
    count: int


class VoteCountsResponse(BaseModel):
    counts: dict[str, int]


class VotingStatus(BaseModel):
    voting_duet_eastern: bool
    voting_duet_western: bool
    voting_solo_eastern: bool
    voting_solo_western: bool
    active_category: Optional[Category] = None


class SettingsUpdate(BaseModel):
    key: str = Field(pattern="^(?:voting_)?(?:duet_eastern|duet_western|solo_eastern|solo_western)$")
    enabled: bool


class SettingsResponse(BaseModel):
    success: bool
    key: str
    enabled: bool


class NextCategoryResponse(BaseModel):
    success: bool
    new_category: Optional[Category]
    message: str


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    picture: Optional[str]
    role: str = "user"


class AdminStatusResponse(BaseModel):
    isAdmin: bool
