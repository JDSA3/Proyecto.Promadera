from pydantic import BaseModel, Field


class PagoRequest(BaseModel):
    pedido_id: int = Field(ge=1)
    usuario_id: int = Field(ge=1, description="El cliente dueño del pedido (sin login todavía)")


class PreferenciaResponse(BaseModel):
    pedido_id: int
    preference_id: str
    init_point: str
    sandbox_init_point: str | None = None
