from __future__ import annotations
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any
from sqlalchemy import Boolean, Date, DateTime, Enum, Float, ForeignKey, Index, Integer, JSON, Numeric, String, Text, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base
from app.models.enums import (
    ConfidenceLevel, EmploymentStatus, InterviewStatus, InterventionType,
    PathwayStatus, PathwayType, Provenance, ReviewStatus, SourceType,
    UserRole, ValidityStatus, VerificationStatus,
)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class User(TimestampMixin, Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), unique=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Beneficiary(TimestampMixin, Base):
    __tablename__ = "beneficiaries"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    age: Mapped[int | None]
    gender: Mapped[str | None] = mapped_column(String(40))
    district: Mapped[str] = mapped_column(String(120), index=True)
    state: Mapped[str] = mapped_column(String(120))
    preferred_language: Mapped[str] = mapped_column(String(40), default="English")
    digital_literacy: Mapped[str | None] = mapped_column(String(40))
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    version: Mapped[int] = mapped_column(Integer, default=1)
    profile: Mapped[LivelihoodProfile | None] = relationship(back_populates="beneficiary", cascade="all, delete-orphan", uselist=False)
    skills: Mapped[list[BeneficiarySkill]] = relationship(back_populates="beneficiary", cascade="all, delete-orphan")
    pathways: Mapped[list[LivelihoodPathway]] = relationship(back_populates="beneficiary", cascade="all, delete-orphan")


class LivelihoodProfile(TimestampMixin, Base):
    __tablename__ = "livelihood_profiles"
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), unique=True)
    education_level: Mapped[str | None] = mapped_column(String(100))
    current_occupation: Mapped[str | None] = mapped_column(String(160))
    family_occupation: Mapped[str | None] = mapped_column(String(160))
    employment_preference: Mapped[str | None] = mapped_column(String(80))
    aspiration_text: Mapped[str | None] = mapped_column(Text)
    mobility_km: Mapped[float | None] = mapped_column(Float)
    relocation_willingness: Mapped[bool | None]
    available_hours_start: Mapped[time | None] = mapped_column(Time)
    available_hours_end: Mapped[time | None] = mapped_column(Time)
    capital_available: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    current_income_band: Mapped[str | None] = mapped_column(String(80))
    physical_constraints: Mapped[str | None] = mapped_column(Text)
    family_responsibilities: Mapped[str | None] = mapped_column(Text)
    profile_completion_percentage: Mapped[float] = mapped_column(Float, default=0)
    beneficiary: Mapped[Beneficiary] = relationship(back_populates="profile")


class Skill(Base):
    __tablename__ = "skills"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    normalized_name: Mapped[str] = mapped_column(String(160), unique=True, index=True)
    sector: Mapped[str] = mapped_column(String(120), index=True)
    description: Mapped[str | None] = mapped_column(Text)


class BeneficiarySkill(Base):
    __tablename__ = "beneficiary_skills"
    __table_args__ = (UniqueConstraint("beneficiary_id", "skill_id"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    skill_id: Mapped[int] = mapped_column(ForeignKey("skills.id"))
    experience_years: Mapped[float] = mapped_column(Float, default=0)
    proficiency_level: Mapped[str | None] = mapped_column(String(50))
    source: Mapped[SourceType] = mapped_column(Enum(SourceType))
    formal_certificate: Mapped[bool] = mapped_column(Boolean, default=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    beneficiary: Mapped[Beneficiary] = relationship(back_populates="skills")
    skill: Mapped[Skill] = relationship()


class InterviewSession(Base):
    __tablename__ = "interview_sessions"
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    language: Mapped[str] = mapped_column(String(40))
    status: Mapped[InterviewStatus] = mapped_column(Enum(InterviewStatus), default=InterviewStatus.IN_PROGRESS)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    answers: Mapped[list[InterviewAnswer]] = relationship(back_populates="session", cascade="all, delete-orphan")


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"
    id: Mapped[int] = mapped_column(primary_key=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("interview_sessions.id", ondelete="CASCADE"), index=True)
    question_key: Mapped[str] = mapped_column(String(80))
    question_text: Mapped[str] = mapped_column(Text)
    transcript: Mapped[str] = mapped_column(Text)
    corrected_text: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(40))
    speech_confidence: Mapped[float | None] = mapped_column(Float)
    extraction_confidence: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    session: Mapped[InterviewSession] = relationship(back_populates="answers")


class ExtractedProfileFact(Base):
    __tablename__ = "extracted_profile_facts"
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    source_answer_id: Mapped[int] = mapped_column(ForeignKey("interview_answers.id", ondelete="CASCADE"))
    field_name: Mapped[str] = mapped_column(String(100), index=True)
    field_value: Mapped[str] = mapped_column(Text)
    confidence: Mapped[float] = mapped_column(Float)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Qualification(TimestampMixin, Base):
    __tablename__ = "qualifications"
    __table_args__ = (Index("ix_qualification_sector_validity", "sector", "validity_status"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    qualification_code: Mapped[str] = mapped_column(String(80), unique=True)
    qualification_name: Mapped[str] = mapped_column(String(200))
    sector: Mapped[str] = mapped_column(String(120), index=True)
    occupational_role: Mapped[str] = mapped_column(String(180))
    nsqf_level: Mapped[str | None] = mapped_column(String(20))
    minimum_education: Mapped[str | None] = mapped_column(String(100))
    minimum_experience_years: Mapped[float] = mapped_column(Float, default=0)
    duration_hours: Mapped[int | None]
    qualification_type: Mapped[str | None] = mapped_column(String(80))
    valid_from: Mapped[date | None] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    validity_status: Mapped[ValidityStatus] = mapped_column(Enum(ValidityStatus), index=True)
    source_url: Mapped[str | None] = mapped_column(String(500))
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), default=SourceType.SYNTHETIC)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    source_metadata: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    competencies: Mapped[list[QualificationCompetency]] = relationship(back_populates="qualification", cascade="all, delete-orphan")


class QualificationCompetency(Base):
    __tablename__ = "qualification_competencies"
    id: Mapped[int] = mapped_column(primary_key=True)
    qualification_id: Mapped[int] = mapped_column(ForeignKey("qualifications.id", ondelete="CASCADE"), index=True)
    competency_name: Mapped[str] = mapped_column(String(180))
    description: Mapped[str | None] = mapped_column(Text)
    weight: Mapped[float] = mapped_column(Float, default=1)
    qualification: Mapped[Qualification] = relationship(back_populates="competencies")


class TrainingOpportunity(Base):
    __tablename__ = "training_opportunities"
    __table_args__ = (Index("ix_training_district_status", "district", "verification_status"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    qualification_id: Mapped[int] = mapped_column(ForeignKey("qualifications.id"), index=True)
    provider_name: Mapped[str] = mapped_column(String(200))
    provider_type: Mapped[str | None] = mapped_column(String(80))
    district: Mapped[str] = mapped_column(String(120), index=True)
    state: Mapped[str] = mapped_column(String(120))
    location_name: Mapped[str] = mapped_column(String(200))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    distance_km: Mapped[float | None] = mapped_column(Float)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    seats_available: Mapped[int | None]
    verification_status: Mapped[VerificationStatus] = mapped_column(Enum(VerificationStatus), index=True)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), default=SourceType.SYNTHETIC)
    source_url: Mapped[str | None] = mapped_column(String(500))
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class LivelihoodPathway(TimestampMixin, Base):
    __tablename__ = "livelihood_pathways"
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    qualification_id: Mapped[int | None] = mapped_column(ForeignKey("qualifications.id"), index=True)
    pathway_type: Mapped[PathwayType] = mapped_column(Enum(PathwayType), index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    skill_fit_score: Mapped[float] = mapped_column(Float)
    aspiration_fit_score: Mapped[float] = mapped_column(Float)
    opportunity_score: Mapped[float] = mapped_column(Float)
    eligibility_score: Mapped[float] = mapped_column(Float)
    mobility_score: Mapped[float] = mapped_column(Float)
    training_access_score: Mapped[float] = mapped_column(Float)
    training_burden_score: Mapped[float] = mapped_column(Float)
    outcome_evidence_score: Mapped[float | None] = mapped_column(Float)
    overall_score: Mapped[float] = mapped_column(Float)
    confidence_level: Mapped[ConfidenceLevel] = mapped_column(Enum(ConfidenceLevel), index=True)
    recommended_route: Mapped[str] = mapped_column(String(80))
    status: Mapped[PathwayStatus] = mapped_column(Enum(PathwayStatus), default=PathwayStatus.PROPOSED)
    beneficiary: Mapped[Beneficiary] = relationship(back_populates="pathways")
    qualification: Mapped[Qualification | None] = relationship()
    evidence: Mapped[list[RecommendationEvidence]] = relationship(back_populates="pathway", cascade="all, delete-orphan")

    @property
    def score_breakdown(self) -> dict[str, float]:
        return {
            "skill_fit": self.skill_fit_score,
            "aspiration_fit": self.aspiration_fit_score,
            "eligibility": self.eligibility_score,
            "opportunity": self.opportunity_score,
            "mobility": self.mobility_score,
            "training_burden": self.training_burden_score,
            "outcome_evidence": self.outcome_evidence_score if self.outcome_evidence_score is not None else 0.5,
        }


class RecommendationEvidence(Base):
    __tablename__ = "recommendation_evidence"
    id: Mapped[int] = mapped_column(primary_key=True)
    pathway_id: Mapped[int] = mapped_column(ForeignKey("livelihood_pathways.id", ondelete="CASCADE"), index=True)
    evidence_type: Mapped[str] = mapped_column(String(80))
    label: Mapped[str] = mapped_column(String(250))
    value: Mapped[str] = mapped_column(Text)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType))
    source_reference: Mapped[str | None] = mapped_column(String(500))
    verification_status: Mapped[VerificationStatus] = mapped_column(Enum(VerificationStatus))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    pathway: Mapped[LivelihoodPathway] = relationship(back_populates="evidence")


class HumanReview(Base):
    __tablename__ = "human_reviews"
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    pathway_id: Mapped[int | None] = mapped_column(ForeignKey("livelihood_pathways.id", ondelete="SET NULL"))
    reason_code: Mapped[str] = mapped_column(String(100), index=True)
    reason_description: Mapped[str] = mapped_column(Text)
    status: Mapped[ReviewStatus] = mapped_column(Enum(ReviewStatus), default=ReviewStatus.OPEN, index=True)
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    resolution: Mapped[str | None] = mapped_column(Text)
    review_notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class InterventionSimulation(Base):
    __tablename__ = "intervention_simulations"
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    pathway_id: Mapped[int] = mapped_column(ForeignKey("livelihood_pathways.id", ondelete="CASCADE"), index=True)
    intervention_type: Mapped[InterventionType] = mapped_column(Enum(InterventionType))
    original_value: Mapped[dict[str, Any]] = mapped_column(JSON)
    simulated_value: Mapped[dict[str, Any]] = mapped_column(JSON)
    score_before: Mapped[float] = mapped_column(Float)
    score_after: Mapped[float] = mapped_column(Float)
    explanation: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class OutcomeFollowup(Base):
    __tablename__ = "outcome_followups"
    __table_args__ = (UniqueConstraint("beneficiary_id", "pathway_id", "followup_day"), Index("ix_outcome_day_status", "followup_day", "employment_status"))
    id: Mapped[int] = mapped_column(primary_key=True)
    beneficiary_id: Mapped[int] = mapped_column(ForeignKey("beneficiaries.id", ondelete="CASCADE"), index=True)
    pathway_id: Mapped[int] = mapped_column(ForeignKey("livelihood_pathways.id", ondelete="CASCADE"), index=True)
    followup_day: Mapped[int] = mapped_column(Integer, index=True)
    training_started: Mapped[bool] = mapped_column(Boolean, default=False)
    training_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    certified: Mapped[bool] = mapped_column(Boolean, default=False)
    employment_status: Mapped[EmploymentStatus] = mapped_column(Enum(EmploymentStatus), default=EmploymentStatus.UNKNOWN)
    livelihood_related_to_pathway: Mapped[bool | None]
    income_band: Mapped[str | None] = mapped_column(String(80))
    still_active: Mapped[bool | None]
    dropout_reason: Mapped[str | None] = mapped_column(Text)
    support_required: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[Provenance] = mapped_column(Enum(Provenance), default=Provenance.UNVERIFIED)
    reported_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    action: Mapped[str] = mapped_column(String(120), index=True)
    entity_type: Mapped[str] = mapped_column(String(100), index=True)
    entity_id: Mapped[str] = mapped_column(String(80))
    before_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    after_data: Mapped[dict[str, Any] | None] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    ip_address: Mapped[str | None] = mapped_column(String(64))


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class SyncRecord(TimestampMixin, Base):
    __tablename__ = "sync_records"
    __table_args__ = (UniqueConstraint("record_id", "record_type"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[str] = mapped_column(String(100))
    record_type: Mapped[str] = mapped_column(String(100))
    server_version: Mapped[int] = mapped_column(Integer, default=1)
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)


Index("ix_pathway_beneficiary_status", LivelihoodPathway.beneficiary_id, LivelihoodPathway.status)
Index("ix_review_status_created", HumanReview.status, HumanReview.created_at)
