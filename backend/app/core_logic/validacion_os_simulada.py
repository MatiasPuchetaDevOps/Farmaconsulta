"""
Módulo validacion_os_simulada - FarmaConsulta

Simula la validación online de cobertura contra una obra social/prepaga
(PAMI, IOMA, etc.) sin conectar contra ningún servicio real: el resultado
sale de una tabla de reglas configurada por un administrador, con el mismo
estilo que calculadora.obtener_descuento_os() (recibe un dict ya armado, sin
tocar la base de datos).
"""

ResultadoOS = tuple[str, str | None]


def simular_validacion_os(
    obra_social: str,
    plan_afiliado: str | None,
    tabla_reglas: dict[tuple[str, str | None], ResultadoOS],
) -> ResultadoOS:
    """
    Devuelve el resultado configurado para una obra social/plan, o "aprobado"
    por defecto si no hay ninguna regla cargada para esa combinación.

    Parámetros:
        obra_social (str): obra social del cliente.
        plan_afiliado (str | None): plan del afiliado, si corresponde.
        tabla_reglas (dict): mapea (obra_social, plan_afiliado) -> (resultado, motivo).
            Una entrada con plan_afiliado=None actúa como regla default de esa
            obra social (aplica a cualquier plan que no tenga una regla más específica).

    Devuelve:
        tuple[str, str | None]: (resultado, motivo). resultado es uno de
        "aprobado", "rechazado", "vencido".
    """
    obra_social_normalizada = obra_social.strip().title()
    plan_normalizado = plan_afiliado.strip().title() if plan_afiliado and plan_afiliado.strip() else None

    if (obra_social_normalizada, plan_normalizado) in tabla_reglas:
        return tabla_reglas[(obra_social_normalizada, plan_normalizado)]

    if (obra_social_normalizada, None) in tabla_reglas:
        return tabla_reglas[(obra_social_normalizada, None)]

    return ("aprobado", None)
