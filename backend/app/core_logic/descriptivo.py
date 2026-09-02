"""
Módulo descriptivo - FarmaConsulta

Calcula las estadísticas descriptivas del dataset ya limpio: volumen de
consultas por obra social, dispersión de precios, ahorro por medio de pago,
stock por categoría y proporción de consultas con promoción bancaria.
Cada función imprime su resultado y además lo devuelve, para poder
reutilizarlo en otros módulos o en el informe.
"""

import pandas as pd


def volumen_por_obra_social(df, top_n=15):
    """
    Calcula la cantidad de consultas por obra social, de mayor a menor.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.
        top_n (int): cantidad de obras sociales a mostrar en el reporte (por defecto 15).

    Devuelve:
        Series de pandas con la cantidad de consultas por obra social (todas, no solo el top_n).
    """
    conteo = df["obra_social"].value_counts()

    print(f"\n--- VOLUMEN DE CONSULTAS POR OBRA SOCIAL (Top {top_n} de {conteo.shape[0]}) ---")
    print(conteo.head(top_n))

    return conteo


def dispersion_precio_lista(df):
    """
    Calcula las medidas de dispersión del precio de lista: media, mediana,
    desvío estándar y cuartiles.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.

    Devuelve:
        dict con las medidas calculadas (media, mediana, desvio, cuartiles).
    """
    media = df["precio_lista"].mean()
    mediana = df["precio_lista"].median()
    desvio = df["precio_lista"].std()
    cuartiles = df["precio_lista"].quantile([0.25, 0.50, 0.75])

    print("\n--- DISPERSIÓN DE PRECIO_LISTA ---")
    print(f"Media: ${media:,.0f}")
    print(f"Mediana: ${mediana:,.0f}")
    print(f"Desvío estándar: ${desvio:,.0f}")
    print("Cuartiles:")
    print(cuartiles)

    return {"media": media, "mediana": mediana, "desvio": desvio, "cuartiles": cuartiles}


def ahorro_promedio_por_metodo_pago(df):
    """
    Calcula cuánto ahorra en promedio, en pesos, cada medio de pago gracias
    a la promoción bancaria. El ahorro se mide como la diferencia entre el
    precio que pagaría el cliente con el descuento de la obra social pero
    SIN promoción bancaria, y el precio final que efectivamente pagó.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.

    Devuelve:
        Series de pandas con el ahorro promedio por medio de pago, de mayor a menor.
    """
    # Precio que pagaría el cliente si el banco no le diera ningún descuento
    precio_sin_promo_banco = round(df["precio_lista"] * (1 - df["descuento_OS"]))
    ahorro_banco = precio_sin_promo_banco - df["precio_final"]

    tabla = df.assign(ahorro_banco=ahorro_banco).groupby("metodo_pago")["ahorro_banco"].mean()
    tabla = tabla.sort_values(ascending=False)

    print("\n--- AHORRO PROMEDIO EN PESOS POR MEDIO DE PAGO ---")
    print(tabla.round(0))

    return tabla


def stock_promedio_por_categoria(df):
    """
    Calcula el stock promedio disponible por categoría de producto.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.

    Devuelve:
        Series de pandas con el stock promedio por categoría, de mayor a menor.
    """
    tabla = df.groupby("categoria")["stock_disponible"].mean().sort_values(ascending=False)

    print("\n--- STOCK PROMEDIO POR CATEGORÍA ---")
    print(tabla.round(1))

    return tabla


def productos_stock_critico(df, umbral=10):
    """
    Lista las consultas donde el stock disponible del producto estaba en o
    por debajo del umbral crítico, ordenadas de menor a mayor stock.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.
        umbral (int): stock máximo para considerarse crítico (por defecto 10).

    Devuelve:
        DataFrame con las columnas producto_nombre, categoria, stock_disponible y fecha
        de las consultas con stock crítico.
    """
    criticos = df[df["stock_disponible"] <= umbral][["producto_nombre", "categoria", "stock_disponible", "fecha"]]
    criticos = criticos.sort_values("stock_disponible").reset_index(drop=True)

    print(f"\n--- CONSULTAS CON STOCK CRÍTICO (<= {umbral} unidades) ---")
    print(f"Cantidad de filas con stock crítico: {criticos.shape[0]}")
    print(criticos.to_string(index=False))

    return criticos


def proporcion_consultas_con_promocion(df):
    """
    Calcula qué proporción de las consultas se hicieron con promoción
    bancaria activa (banco_promocion distinto de "Sin Promo") y cuáles no.

    Parámetros:
        df (DataFrame): dataset limpio de consultas.

    Devuelve:
        dict con la cantidad y el porcentaje de consultas con y sin promoción.
    """
    banco_promocion_limpio = df["banco_promocion"].str.strip()

    con_promo = (banco_promocion_limpio != "Sin Promo").sum()
    sin_promo = (banco_promocion_limpio == "Sin Promo").sum()
    total = df.shape[0]

    print("\n--- PROPORCIÓN DE CONSULTAS CON/SIN PROMOCIÓN BANCARIA ---")
    print(f"Con promoción bancaria: {con_promo} ({con_promo / total * 100:.1f}%)")
    print(f"Sin promoción bancaria: {sin_promo} ({sin_promo / total * 100:.1f}%)")

    return {"con_promo": con_promo, "sin_promo": sin_promo, "total": total}
