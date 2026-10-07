from datetime import datetime, time
from decimal import Decimal
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from app.models.enums import (
    ConfidenceLevel, EmploymentStatus, InterventionType, PathwayStatus,
    PathwayType, Provenance, ReviewStatus, SourceType, UserRole,
)


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class ErrorBody(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorBody


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    phone: str | None = None
    role: UserRole = UserRole.BENEFICIARY


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(ORMModel):
    id: int
    email: EmailStr
    phone: str | None
    role: UserRole
    is_active: bool


class BeneficiaryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    age: int | None = Field(default=None, ge=14, le=100)
    gender: str | None = None
    district: str
    state: str = ""  # Missing location stays unknown; language never implies geography.
    preferred_language: str = "English"
    digital_literacy: str | None = None
    consent_given: bool
    user_id: int | None = None


class BeneficiaryPatch(BaseModel):
    name: str | None = None
    age: int | None = Field(default=None, ge=14, le=100)
    gender: str | None = None
    district: str | None = None
    preferred_language: str | None = None
    digital_literacy: str | None = None
    consent_given: bool | None = None


class BeneficiaryOut(ORMModel):
    id: int
    user_id: int | None
    name: str
    age: int | None
    gender: str | None
    district: str
    state: str
    preferred_language: str
    digital_literacy: str | None
    consent_given: bool
    version: int


class QualificationEligibilityFacts(BaseModel):
    model_config = ConfigDict(extra="forbid")
    can_read_write: bool | None = Field(default=None, strict=True)
    previous_nsqf_level: float | None = Field(default=None, ge=0, le=8, multiple_of=0.5, allow_inf_nan=False)
    relevant_experience_years: float | None = Field(default=None, ge=0, le=80, allow_inf_nan=False)
    certificates: list[Literal["NTC", "NAC", "CITS", "NTC_2_YEAR"]] | None = Field(default=None, max_length=4)


class ProfileData(BaseModel):
    # Each record describes experience/certificates relevant to that qualification only.
    eligibility_facts: dict[str, QualificationEligibilityFacts] | None = Field(default=None, max_length=100)

    @field_validator("eligibility_facts")
    @classmethod
    def validate_qualification_keys(cls, value):
        import re
        if value and any(not re.fullmatch(r"NQR:[0-9]{1,12}", key) for key in value):
            raise ValueError("Eligibility facts must use NQR registry keys, for example NQR:11689")
        return value

    education_level: str | None = None
    current_occupation: str | None = None
    family_occupation: str | None = None
    employment_preference: str | None = None
    aspiration_text: str | None = None
    mobility_km: float | None = Field(default=None, ge=0)
    relocation_willingness: bool | None = None
    available_hours_start: time | None = None
    available_hours_end: time | None = None
    capital_available: Decimal | None = Field(default=None, ge=0)
    current_income_band: str | None = None
    physical_constraints: str | None = None
    family_responsibilities: str | None = None


class ProfileOut(ProfileData, ORMModel):
    id: int
    beneficiary_id: int
    profile_completion_percentage: float


class SkillCreate(BaseModel):
    name: str
    sector: str
    experience_years: float = Field(ge=0)
    proficiency_level: str | None = None
    source: SourceType = SourceType.SELF_REPORTED
    formal_certificate: bool = False
    verified: bool = False


class SkillOut(ORMModel):
    id: int
    skill_id: int
    experience_years: float
    proficiency_level: str | None
    source: SourceType
    formal_certificate: bool
    verified: bool
    skill_name: str | None = None


class InterviewCreate(BaseModel):
    beneficiary_id: int
    language: str = "Tamil"
    resume_existing: bool = False


class InterviewAnswerCreate(BaseModel):
    question_key: str
    question_text: str
    transcript: str
    corrected_text: str | None = None
    language: str = "Tamil"
    speech_confidence: float | None = Field(default=None, ge=0, le=1)
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)


class InterviewAnswerPatch(BaseModel):
    corrected_text: str
    extraction_confidence: float | None = Field(default=None, ge=0, le=1)


class InterviewAnswerOut(InterviewAnswerCreate, ORMModel):
    id: int
    session_id: int


class InterviewOut(ORMModel):
    id: int
    beneficiary_id: int
    language: str
    status: str
    started_at: datetime
    completed_at: datetime | None
    answers: list[InterviewAnswerOut] = []


class EvidenceOut(ORMModel):
    evidence_type: str
    label: str
    value: str
    source_type: SourceType
    source_reference: str | None
    verification_status: str


class ConstraintOut(BaseModel):
    constraint_type: str
    severity: str
    effect: str
    penalty: float = 0
    detail: dict[str, Any] = {}


class ScoreBreakdownOut(BaseModel):
    skill_fit: float
    aspiration_fit: float
    eligibility: float
    opportunity: float
    mobility: float
    training_burden: float
    outcome_evidence: float


class PathwayOut(ORMModel):
    id: int
    type: PathwayType = Field(validation_alias="pathway_type")
    title: str
    description: str
    score: float = Field(validation_alias="overall_score")
    confidence: ConfidenceLevel = Field(validation_alias="confidence_level")
    recommended_route: str
    status: PathwayStatus
    review_status: str | None = None
    pending_human_review: bool = False
    rpl_status: str = "NOT_APPLICABLE"
    constraints: list[ConstraintOut] = []
    evidence: list[EvidenceOut] = []
    required_interventions: list[str] = []
    score_breakdown: ScoreBreakdownOut


class InterventionInput(BaseModel):
    type: InterventionType
    distance_km: float | None = Field(default=None, ge=0)
    enabled: bool | None = None
    amount: float | None = Field(default=None, ge=0)


class SimulationRequest(BaseModel):
    interventions: list[InterventionInput] = Field(min_length=1)


class SimulationOut(BaseModel):
    id: int | None = None
    before: float
    after: float
    changed_factors: list[str]
    explanation: str


class ReviewAction(BaseModel):
    notes: str | None = None
    resolution: str | None = None


class ReviewOut(ORMModel):
    id: int
    beneficiary_id: int
    pathway_id: int | None
    reason_code: str
    reason_description: str
    status: ReviewStatus
    assigned_to: int | None
    resolution: str | None
    review_notes: str | None
    created_at: datetime
    reviewed_at: datetime | None


class OutcomeCreate(BaseModel):
    beneficiary_id: int
    pathway_id: int
    followup_day: int
    training_started: bool = False
    training_completed: bool = False
    certified: bool = False
    employment_status: EmploymentStatus = EmploymentStatus.UNKNOWN
    livelihood_related_to_pathway: bool | None = None
    income_band: str | None = None
    still_active: bool | None = None
    dropout_reason: str | None = None
    support_required: str | None = None
    verification_status: Provenance = Provenance.USER_REPORTED

    @field_validator("followup_day")
    @classmethod
    def valid_day(cls, value: int) -> int:
        if value not in {30, 90, 180}:
            raise ValueError("followup_day must be 30, 90, or 180")
        return value


class OutcomeOut(OutcomeCreate, ORMModel):
    id: int
    reported_by: int
    created_at: datetime


class SyncRequest(BaseModel):
    record_id: str
    record_type: str
    local_updated_at: datetime
    server_version: int = Field(ge=0)
    payload: dict[str, Any]


class SyncResponse(BaseModel):
    status: str
    server_version: int
    local_version: int


class PaginatedReviews(BaseModel):
    items: list[ReviewOut]
    page: int
    page_size: int
    total: int
