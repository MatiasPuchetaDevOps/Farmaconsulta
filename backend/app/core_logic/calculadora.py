"""
Módulo calculadora - FarmaConsulta

Es el corazón del MVP: calcula el precio final que paga el cliente
combinando el descuento de la obra social con el descuento por promoción
bancaria, busca el mejor medio de pago posible y controla el stock
disponible para sugerir alternativas cuando hace falta.
"""

import pandas as pd


def calcular_precio_final(precio_lista, desc_os, desc_banco):
    """
    Calcula el precio final aplicando los descuentos EN CASCADA (uno sobre
    el resultado del otro), no sumados. Esta es la fórmula de negocio ya
    validada contra el dataset real.

    Parámetros:
        precio_lista (int o float): precio de lista del producto.
        desc_os (float): descuento de la obra social (ej. 0.4 = 40%).
        desc_banco (float): descuento por promoción bancaria (ej. 0.1 = 10%).

    Devuelve:
        int: precio final redondeado.
    """
    return round(precio_lista * (1 - desc_os) * (1 - desc_banco))



# Regla original del proyecto: solo 3 valores posibles de descuento.
# Se usa como tabla por defecto cuando obtener_descuento_os() no recibe una
# tabla de planes propia, para no romper el comportamiento ya validado.
DESCUENTOS_OS_POR_DEFECTO = {
    "Pami": 0.9,
    "Particular": 0.0,
}
DESCUENTO_OS_RESTO = 0.4


def obtener_descuento_os(obra_social, tabla_planes=None):
    """
    Devuelve el descuento que corresponde según la obra social del cliente.

    Parámetros:
        obra_social (str): nombre de la obra social del cliente.
        tabla_planes (dict, opcional): mapea obra_social -> descuento
            (ej. {"Osecac": 0.4, "Mi Plan Nuevo": 0.5}). Sirve para poder
            sumar planes nuevos con su propio % sin modificar esta función.
            Si no se pasa, se usa la regla original del proyecto: PAMI 90%,
            Particular 0%, el resto 40%.

    Devuelve:
        float: descuento de la obra social. Si la obra social no está en la
        tabla (ni en la regla original), se asume el descuento "resto" (40%).
    """
    # Normalizamos el texto para no depender de cómo venga escrito (mayúsculas, espacios)
    obra_social_normalizada = obra_social.strip().title()

    if tabla_planes is not None:
        return tabla_planes.get(obra_social_normalizada, DESCUENTO_OS_RESTO)

    return DESCUENTOS_OS_POR_DEFECTO.get(obra_social_normalizada, DESCUENTO_OS_RESTO)


def obtener_descuento_banco(metodo_pago):
    """
    Devuelve el descuento por promoción bancaria según el medio de pago
    utilizado. Solo los medios de pago que son un banco con promoción
    (Macro, Galicia, Santander, Nación) tienen descuento; el resto
    (efectivo, débito, banco provincia, billetera virtual) no tiene
    promoción asociada.

    Parámetros:
        metodo_pago (str): medio de pago utilizado en la consulta.

    Devuelve:
        float: descuento bancario (0.0, 0.10, 0.15, 0.20 o 0.25).
    """
    metodo_pago_normalizado = metodo_pago.strip().title()

    descuentos_por_banco = {
        "Macro": 0.10,
        "Galicia": 0.15,
        "Santander": 0.20,
        "Nación": 0.25,
    }

    # Si el método de pago no está en la tabla (efectivo, transferencia, no especificado, etc.)
    # asumimos que no tiene promoción bancaria asociada
    return descuentos_por_banco.get(metodo_pago_normalizado, 0.0)


def buscar_mejor_medio_pago(precio_lista, obra_social, tabla_planes=None):
    """
    Prueba los 8 métodos de pago disponibles para una consulta y arma una
    tabla comparando el precio final que resulta de cada uno, para que el
    cliente vea con qué medio de pago le conviene abonar.

    Parámetros:
        precio_lista (int o float): precio de lista del producto.
        obra_social (str): obra social del cliente.
        tabla_planes (dict, opcional): ver obtener_descuento_os(). Se lo
            pasamos de largo para poder cotizar también obras sociales/planes
            nuevos, no solo las 3 reglas originales.

    Devuelve:
        DataFrame con columnas metodo_pago, descuento_banco, precio_final y
        ahorro, ordenado de menor a mayor precio final.
    """
    descuento_os = obtener_descuento_os(obra_social, tabla_planes)

    # Precio de referencia sin ninguna promoción bancaria, para poder calcular el ahorro
    precio_sin_promocion = calcular_precio_final(precio_lista, descuento_os, 0.0)

    metodos_pago = [
        "Efectivo",
        "Débito",
        "Banco Provincia",
        "Billetera Virtual (Modo/Mercado Pago)",
        "Macro",
        "Galicia",
        "Santander",
        "Nación",
    ]

    filas = []
    for metodo in metodos_pago:
        descuento_banco = obtener_descuento_banco(metodo)
        precio_final = calcular_precio_final(precio_lista, descuento_os, descuento_banco)
        ahorro = precio_sin_promocion - precio_final

        filas.append({
            "metodo_pago": metodo,
            "descuento_banco": descuento_banco,
            "precio_final": precio_final,
            "ahorro": ahorro,
        })

    tabla_comparacion = pd.DataFrame(filas)
    tabla_comparacion = tabla_comparacion.sort_values("precio_final", ascending=True).reset_index(drop=True)

    return tabla_comparacion


def verificar_stock(df, producto, umbral=10):
    """
    Revisa el stock disponible de un producto. Si el stock es menor o igual
    al umbral, muestra una alerta y sugiere productos alternativos de la
    misma categoría que tengan stock suficiente.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.
        producto (str): nombre del producto a consultar.
        umbral (int): stock mínimo aceptable antes de disparar la alerta (por defecto 10).

    Devuelve:
        DataFrame con las alternativas sugeridas, o None si no hace falta alerta
        o si el producto no existe en el dataset.
    """
    fila_producto = df[df["producto_nombre"] == producto]

    if fila_producto.empty:
        print(f"Producto '{producto}' no encontrado en el dataset.")
        return None

    # El dataset es transaccional: el mismo producto aparece en muchas consultas
    # con distinto stock según el momento. Usamos el registro con la fecha más
    # reciente como referencia del stock "actual" de ese producto.
    fila_producto = fila_producto.sort_values("fecha", ascending=False)
    stock_actual = fila_producto["stock_disponible"].iloc[0]
    categoria_producto = fila_producto["categoria"].iloc[0]

    if stock_actual > umbral:
        print(f"Stock de '{producto}': {stock_actual} unidades. Stock suficiente.")
        return None

    print(f"ALERTA DE STOCK BAJO: '{producto}' tiene {stock_actual} unidades (umbral: {umbral}).")

    # Para las alternativas aplicamos el mismo criterio: un registro por producto,
    # tomando su consulta más reciente dentro de la misma categoría
    candidatos = df[(df["categoria"] == categoria_producto) & (df["producto_nombre"] != producto)]
    candidatos_recientes = candidatos.sort_values("fecha").groupby("producto_nombre", as_index=False).last()

    alternativas = candidatos_recientes[candidatos_recientes["stock_disponible"] > umbral]
    alternativas = alternativas[["producto_nombre", "stock_disponible"]].sort_values("stock_disponible", ascending=False)

    if alternativas.empty:
        print(f"No hay alternativas con stock suficiente en la categoría '{categoria_producto}'.")
    else:
        print(f"Alternativas sugeridas en la categoría '{categoria_producto}':")
        print(alternativas.to_string(index=False))

    return alternativas


def consultar(df, producto, obra_social, tabla_planes=None):
    """
    Función integradora del MVP: dado un producto y una obra social, imprime
    un ticket de consulta legible con el precio de lista, los descuentos
    aplicados, el precio final, el mejor medio de pago posible y la alerta
    de stock si corresponde.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.
        producto (str): nombre del producto consultado.
        obra_social (str): obra social del cliente.
        tabla_planes (dict, opcional): ver obtener_descuento_os().

    Devuelve:
        No devuelve nada, solo imprime el ticket en pantalla.
    """
    fila_producto = df[df["producto_nombre"] == producto]

    if fila_producto.empty:
        print(f"Producto '{producto}' no encontrado en el dataset.")
        return

    precio_lista = fila_producto["precio_lista"].iloc[0]
    descuento_os = obtener_descuento_os(obra_social, tabla_planes)

    tabla_comparacion = buscar_mejor_medio_pago(precio_lista, obra_social, tabla_planes)
    mejor_opcion = tabla_comparacion.iloc[0]

    print("\n===== TICKET DE CONSULTA - FARMACONSULTA =====")
    print(f"Producto: {producto}")
    print(f"Obra social: {obra_social} (descuento: {descuento_os * 100:.0f}%)")
    print(f"Precio de lista: ${precio_lista:,.0f}")
    print(f"Mejor medio de pago: {mejor_opcion['metodo_pago']} (descuento banco: {mejor_opcion['descuento_banco'] * 100:.0f}%)")
    print(f"Precio final: ${mejor_opcion['precio_final']:,.0f}")
    print(f"Ahorro respecto de pagar sin promoción: ${mejor_opcion['ahorro']:,.0f}")

    verificar_stock(df, producto, umbral=10)
    print("===============================================\n")
