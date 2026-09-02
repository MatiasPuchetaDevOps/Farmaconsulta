"""
Módulo de limpieza de datos - FarmaConsulta

Contiene las funciones que toman el dataset crudo (farmacia.csv) y lo dejan
listo para el análisis: eliminan columnas inútiles, corrigen tipos de dato,
imputan nulos según las reglas de negocio del proyecto y validan la fórmula
de precio final como control de calidad.
"""

import pandas as pd


def cargar_datos(ruta_csv):
    """
    Carga el dataset de consultas de farmacia desde un archivo CSV.

    Parámetros:
        ruta_csv (str): ruta al archivo .csv con los datos crudos.

    Devuelve:
        DataFrame de pandas con los datos tal como vienen en el archivo.
    """
    df = pd.read_csv(ruta_csv)
    print(f"Datos cargados: {df.shape[0]} filas y {df.shape[1]} columnas.")
    return df


def inspeccionar_datos(df):
    """
    Muestra un panorama general del dataset: dimensiones, tipos de dato,
    cantidad de nulos por columna y cantidad de filas duplicadas.

    Parámetros:
        df (DataFrame): dataset a inspeccionar.

    Devuelve:
        No devuelve nada, solo imprime el reporte en pantalla.
    """
    print("\n--- INSPECCIÓN DEL DATASET ---")
    print(f"Dimensiones: {df.shape[0]} filas x {df.shape[1]} columnas\n")

    print("Tipos de dato por columna:")
    print(df.dtypes)

    print("\nNulos por columna:")
    print(df.isnull().sum())

    duplicados = df.duplicated().sum()
    print(f"\nFilas duplicadas: {duplicados}")


def eliminar_columnas_vacias(df):
    """
    Elimina las columnas que están 100% vacías (todos sus valores son nulos).
    En este dataset corresponde a la columna 'convertida', que quedó sin
    cargar en el sistema de origen y no aporta información.

    Parámetros:
        df (DataFrame): dataset del cual eliminar columnas vacías.

    Devuelve:
        DataFrame sin las columnas completamente vacías.
    """
    # Buscamos columnas donde TODOS los valores son nulos (no alcanza con tener algunos nulos)
    columnas_vacias = df.columns[df.isnull().all()].tolist()

    if columnas_vacias:
        df = df.drop(columns=columnas_vacias)
        print(f"Columnas eliminadas por estar 100% vacías: {columnas_vacias}")
    else:
        print("No se encontraron columnas 100% vacías.")

    return df


def limpiar_texto(df):
    """
    Limpia las columnas de texto más relevantes para el análisis: saca
    espacios en blanco al principio y al final, y unifica la capitalización
    (formato Título). Esto evita que una misma categoría quede separada en
    varias por errores de tipeo, por ejemplo "pami", "PAMI" y " Pami ".

    Parámetros:
        df (DataFrame): dataset a limpiar.

    Devuelve:
        DataFrame con las columnas de texto normalizadas.
    """
    columnas_texto = ["obra_social", "categoria", "metodo_pago"]

    for columna in columnas_texto:
        # Comparamos la cantidad de categorías antes y después para ver el efecto de la limpieza
        categorias_antes = df[columna].nunique(dropna=True)

        df[columna] = df[columna].str.strip().str.title()

        categorias_despues = df[columna].nunique(dropna=True)
        print(f"'{columna}': {categorias_antes} categorías antes -> {categorias_despues} después de unificar.")

    return df


def convertir_fechas(df):
    """
    Convierte la columna 'fecha' de texto a formato fecha real de pandas.
    Se aplica una máscara estricta "%m/%d/%Y" porque así viene documentado
    el dataset. Los valores que no respeten ese formato se convierten en
    NaT (Not a Time) gracias a errors="coerce", en vez de frenar la carga.

    Parámetros:
        df (DataFrame): dataset con la columna 'fecha' en formato texto.

    Devuelve:
        DataFrame con la columna 'fecha' convertida a tipo datetime.
    """
    df["fecha"] = pd.to_datetime(df["fecha"], format="%m/%d/%Y", errors="coerce")

    fechas_invalidas = df["fecha"].isnull().sum()
    print(f"Fechas convertidas a datetime. Fechas inválidas (NaT): {fechas_invalidas}")

    return df


def crear_variables_temporales(df):
    """
    Crea dos columnas nuevas a partir de 'fecha': el día de la semana como
    número (0=lunes ... 6=domingo) y el día de la semana como texto en
    español, para que los gráficos y reportes queden más legibles.

    Parámetros:
        df (DataFrame): dataset con la columna 'fecha' ya convertida a datetime.

    Devuelve:
        DataFrame con las columnas 'dia_semana' y 'dia_semana_nombre' agregadas.
    """
    dias_en_espanol = {
        0: "Lunes",
        1: "Martes",
        2: "Miércoles",
        3: "Jueves",
        4: "Viernes",
        5: "Sábado",
        6: "Domingo",
    }

    df["dia_semana"] = df["fecha"].dt.dayofweek
    df["dia_semana_nombre"] = df["dia_semana"].map(dias_en_espanol)

    print("Variables temporales creadas: 'dia_semana' (0-6) y 'dia_semana_nombre'.")
    return df


def tratar_nulos(df):
    """
    Imputa los valores nulos siguiendo las reglas de negocio definidas para
    este proyecto (ninguna fila se borra):
    - 'metodo_pago' nulo: significa que la consulta no tuvo un banco
      asociado (coincide con banco_promocion="Sin Promo" y descuento_banco=0),
      se imputa como "No especificado".
    - 'producto_nombre' y 'cliente_nombre' nulos: se imputan como
      "Desconocido" para no perder el resto de la información de la fila.

    Parámetros:
        df (DataFrame): dataset con nulos pendientes de tratar.

    Devuelve:
        DataFrame con los nulos imputados según las reglas anteriores.
    """
    nulos_metodo_pago = df["metodo_pago"].isnull().sum()
    df["metodo_pago"] = df["metodo_pago"].fillna("No especificado")
    print(f"'metodo_pago': {nulos_metodo_pago} nulos imputados como 'No especificado'.")

    nulos_producto = df["producto_nombre"].isnull().sum()
    df["producto_nombre"] = df["producto_nombre"].fillna("Desconocido")
    print(f"'producto_nombre': {nulos_producto} nulos imputados como 'Desconocido'.")

    nulos_cliente = df["cliente_nombre"].isnull().sum()
    df["cliente_nombre"] = df["cliente_nombre"].fillna("Desconocido")
    print(f"'cliente_nombre': {nulos_cliente} nulos imputados como 'Desconocido'.")

    return df


def validar_formula_precio(df):
    """
    Control de calidad del dato: recalcula el precio final aplicando la
    fórmula de negocio verificada (los descuentos se aplican EN CASCADA,
    no se suman) y lo compara contra la columna 'precio_final' que ya viene
    en el dataset. Sirve para detectar errores de carga en el sistema de
    origen, no para corregir nada.

    Fórmula: precio_final = round(precio_lista * (1 - descuento_OS) * (1 - descuento_banco))

    Parámetros:
        df (DataFrame): dataset con las columnas precio_lista, descuento_OS,
                         descuento_banco y precio_final.

    Devuelve:
        DataFrame original, sin modificar (esta función solo valida y reporta).
    """
    precio_calculado = round(df["precio_lista"] * (1 - df["descuento_OS"]) * (1 - df["descuento_banco"]))

    coinciden = (precio_calculado == df["precio_final"]).sum()
    total = df.shape[0]
    porcentaje = (coinciden / total) * 100

    print(f"Validación de fórmula de precio: {coinciden}/{total} filas coinciden ({porcentaje:.1f}%).")

    return df


def guardar_datos_limpios(df, ruta_salida):
    """
    Guarda el dataset ya limpio en la carpeta de datos procesados, para que
    el resto de los módulos (descriptivo, visualización, calculadora)
    trabajen siempre sobre la misma versión curada de los datos.

    Parámetros:
        df (DataFrame): dataset limpio a guardar.
        ruta_salida (str): ruta del archivo .csv de salida.

    Devuelve:
        No devuelve nada, solo guarda el archivo y confirma por pantalla.
    """
    df.to_csv(ruta_salida, index=False)
    print(f"Datos limpios guardados en: {ruta_salida}")
