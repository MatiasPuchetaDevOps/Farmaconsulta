"""
Módulo facturacion_simulada - FarmaConsulta

Simula el paso de facturación electrónica (AFIP/ARCA) sin conectar contra
ningún servicio real: genera un CAE falso con probabilidad de rechazo, para
poder demostrar el flujo completo (aprobación, rechazo, reintento) sin
depender de una integración externa.
"""

import random
from datetime import date, timedelta

PROBABILIDAD_RECHAZO = 0.15

MOTIVOS_RECHAZO = [
    "Servicio de AFIP no disponible (simulado).",
    "CUIT del emisor con inconsistencias (simulado).",
    "Comprobante duplicado (simulado).",
    "Datos del comprobante inválidos (simulado).",
]

DIAS_VALIDEZ_CAE = 10


def generar_cae(monto: int) -> dict:
    """
    Simula la solicitud de un CAE (Código de Autorización Electrónico) a AFIP.

    Parámetros:
        monto (int): total del comprobante, solo se usa para el log/semántica,
        no afecta la probabilidad de rechazo.

    Devuelve:
        dict con estado ("aprobado"|"rechazado"), cae, cae_vencimiento y
        motivo_rechazo (None cuando aprueba).
    """
    if random.random() < PROBABILIDAD_RECHAZO:
        return {
            "estado": "rechazado",
            "cae": None,
            "cae_vencimiento": None,
            "motivo_rechazo": random.choice(MOTIVOS_RECHAZO),
        }

    cae = "".join(str(random.randint(0, 9)) for _ in range(14))
    return {
        "estado": "aprobado",
        "cae": cae,
        "cae_vencimiento": date.today() + timedelta(days=DIAS_VALIDEZ_CAE),
        "motivo_rechazo": None,
    }
