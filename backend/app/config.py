from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LEAP AI API"
    environment: str = "development"
    demo_mode: bool = False
    database_url: str = "sqlite:///./leap_ai.db"
    secret_key: str = "development-only-change-me"
    jwt_secret: str = "development-jwt-change-me"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    frontend_url: str = "http://localhost:3000,http://localhost:5173,http://localhost:8787,http://127.0.0.1:3000,http://127.0.0.1:5173,http://127.0.0.1:8787"
    minimum_outcome_samples: int = 20
    scoring_weights: dict[str, float] = Field(default_factory=lambda: {
        "skill_fit": 0.20, "aspiration_fit": 0.20, "opportunity": 0.15,
        "eligibility": 0.15, "mobility": 0.10, "training_burden": 0.10,
        "outcome_evidence": 0.10,
    })
    mismatch_thresholds: dict[str, float] = Field(default_factory=lambda: {
        "high_demand_ratio": 1.5, "oversupply_ratio": 1.5,
        "low_outcome_rate": 0.40, "balanced_ratio_delta": 0.20,
    })
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", hide_input_in_errors=True)

    def model_post_init(self, __context: object) -> None:
        if self.environment.lower() == "production":
            for field, default in (("jwt_secret", "development-jwt-change-me"), ("secret_key", "development-only-change-me")):
                value = getattr(self, field)
                if value == default or len(value.strip()) < 32:
                    raise ValueError(f"Production requires a non-default {field} of at least 32 characters")
        if abs(sum(self.scoring_weights.values()) - 1.0) > 0.0001:
            raise ValueError("SCORING_WEIGHTS must add up to 1.0")


@lru_cache
def get_settings() -> Settings:
    return Settings()
