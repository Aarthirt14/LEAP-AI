from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import assert_beneficiary_access, get_current_user, require_roles
from app.models import Beneficiary, BeneficiarySkill, Skill, SourceType, User, UserRole
from app.repositories.audit import record_audit
from app.schemas import BeneficiaryCreate, BeneficiaryOut, BeneficiaryPatch, ProfileData, ProfileOut, SkillCreate, SkillOut
from app.services.profile_service import upsert_profile
from app.utils.errors import AppError

router = APIRouter(prefix="/beneficiaries", tags=["Beneficiaries"])


@router.get("/me", response_model=BeneficiaryOut, description="Return the beneficiary profile linked to the signed-in account.")
def get_my_beneficiary(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Beneficiary:
    if user.role != UserRole.BENEFICIARY:
        raise AppError("BENEFICIARY_ACCOUNT_REQUIRED", "This endpoint is available to beneficiary accounts only.", 403)
    row = db.scalar(select(Beneficiary).where(Beneficiary.user_id == user.id))
    if not row:
        raise AppError("BENEFICIARY_NOT_FOUND", "No beneficiary profile is linked to this account yet.", 404)
    return row


@router.post("", response_model=BeneficiaryOut, status_code=status.HTTP_201_CREATED, description="Create a consent-aware beneficiary record.")
def create_beneficiary(payload: BeneficiaryCreate, db: Session = Depends(get_db), user: User = Depends(require_roles(UserRole.BENEFICIARY, UserRole.FIELD_WORKER, UserRole.ADMIN))) -> Beneficiary:
    if user.role == UserRole.BENEFICIARY and payload.user_id not in {None, user.id}:
        raise AppError("FORBIDDEN", "A beneficiary can create only their own profile.", 403)
    row = Beneficiary(**payload.model_dump(exclude={"user_id"}), user_id=user.id if user.role == UserRole.BENEFICIARY else payload.user_id, created_by=user.id)
    db.add(row); db.flush(); record_audit(db, user.id, "CREATE", "Beneficiary", row.id, after={"district": row.district, "consent_given": row.consent_given}); db.commit(); db.refresh(row)
    return row


@router.get("/{beneficiary_id}", response_model=BeneficiaryOut, description="Get an authorized beneficiary record. Officers are restricted to aggregate APIs.")
def get_beneficiary(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Beneficiary:
    return assert_beneficiary_access(db, user, beneficiary_id)


@router.patch("/{beneficiary_id}", response_model=BeneficiaryOut, description="Update authorized beneficiary fields with an audit trail.")
def patch_beneficiary(beneficiary_id: int, payload: BeneficiaryPatch, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> Beneficiary:
    row = assert_beneficiary_access(db, user, beneficiary_id, True); before = {k: getattr(row, k) for k in payload.model_fields_set}
    for key, value in payload.model_dump(exclude_unset=True).items(): setattr(row, key, value)
    row.version += 1; record_audit(db, user.id, "UPDATE", "Beneficiary", row.id, before=before, after=payload.model_dump(exclude_unset=True)); db.commit(); db.refresh(row); return row


@router.delete("/{beneficiary_id}", status_code=status.HTTP_204_NO_CONTENT, description="Delete a beneficiary and dependent sensitive records when authorized.")
def delete_beneficiary(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> None:
    row = assert_beneficiary_access(db, user, beneficiary_id, True)
    if user.role not in {UserRole.BENEFICIARY, UserRole.ADMIN}:
        raise AppError("DELETION_REQUIRES_OWNER_OR_ADMIN", "Only the beneficiary or an administrator can delete this record.", 403)
    record_audit(db, user.id, "DELETE", "Beneficiary", row.id, before={"district": row.district}); db.delete(row); db.commit()


@router.post("/{beneficiary_id}/profile", response_model=ProfileOut, description="Create the beneficiary's one active livelihood profile.")
def create_profile(beneficiary_id: int, payload: ProfileData, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    beneficiary = assert_beneficiary_access(db, user, beneficiary_id, True)
    if payload.eligibility_facts and not beneficiary.consent_given:
        raise AppError("CONSENT_REQUIRED", "Consent is required to record eligibility details.", 422)
    if db.execute(select(Beneficiary).where(Beneficiary.id == beneficiary_id)).scalar_one().profile:
        raise AppError("PROFILE_EXISTS", "This beneficiary already has an active profile.", 409)
    row = upsert_profile(db, beneficiary_id, payload.model_dump()); record_audit(db, user.id, "CREATE", "LivelihoodProfile", row.id, after=payload.model_dump(mode="json")); db.commit(); db.refresh(row); return row


@router.get("/{beneficiary_id}/profile", response_model=ProfileOut, description="Get the authorized livelihood profile.")
def get_profile(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    row = assert_beneficiary_access(db, user, beneficiary_id).profile
    if not row: raise AppError("PROFILE_NOT_FOUND", "Livelihood profile not found.", 404)
    return row


@router.patch("/{beneficiary_id}/profile", response_model=ProfileOut, description="Patch profile evidence without changing original interview transcripts.")
def patch_profile(beneficiary_id: int, payload: ProfileData, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    beneficiary = assert_beneficiary_access(db, user, beneficiary_id, True)
    if payload.eligibility_facts and not beneficiary.consent_given:
        raise AppError("CONSENT_REQUIRED", "Consent is required to record eligibility details.", 422)
    row = upsert_profile(db, beneficiary_id, payload.model_dump(exclude_unset=True)); record_audit(db, user.id, "UPDATE", "LivelihoodProfile", row.id, after=payload.model_dump(exclude_unset=True, mode="json")); db.commit(); db.refresh(row); return row


@router.post("/{beneficiary_id}/skills", response_model=SkillOut, status_code=201, description="Add a skill and its provenance to a beneficiary.")
def add_skill(beneficiary_id: int, payload: SkillCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    # Verification is a staff assertion, never a beneficiary-controlled flag.
    if user.role == UserRole.BENEFICIARY:
        payload = payload.model_copy(update={"verified": False, "source": SourceType.SELF_REPORTED})
    elif payload.source not in {SourceType.FIELD_WORKER, SourceType.DOCUMENT, SourceType.SELF_REPORTED}:
        payload = payload.model_copy(update={"source": SourceType.FIELD_WORKER})
    assert_beneficiary_access(db, user, beneficiary_id, True); normalized = payload.name.strip().lower()
    skill = db.scalar(select(Skill).where(Skill.normalized_name == normalized))
    if not skill:
        skill = Skill(name=payload.name.strip(), normalized_name=normalized, sector=payload.sector)
        db.add(skill); db.flush()
    row = db.scalar(select(BeneficiarySkill).where(BeneficiarySkill.beneficiary_id == beneficiary_id, BeneficiarySkill.skill_id == skill.id))
    if row:
        row.experience_years = payload.experience_years
        row.proficiency_level = payload.proficiency_level
        row.source = payload.source
        row.formal_certificate = payload.formal_certificate
        row.verified = payload.verified
    else:
        row = BeneficiarySkill(beneficiary_id=beneficiary_id, skill_id=skill.id, experience_years=payload.experience_years, proficiency_level=payload.proficiency_level, source=payload.source, formal_certificate=payload.formal_certificate, verified=payload.verified)
        db.add(row)
    db.commit(); db.refresh(row); row.skill_name = skill.name; return row


@router.get("/{beneficiary_id}/skills", response_model=list[SkillOut], description="List skills with experience and provenance.")
def list_skills(beneficiary_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    assert_beneficiary_access(db, user, beneficiary_id); rows = db.scalars(select(BeneficiarySkill).where(BeneficiarySkill.beneficiary_id == beneficiary_id)).all()
    for row in rows: row.skill_name = db.get(Skill, row.skill_id).name
    return rows