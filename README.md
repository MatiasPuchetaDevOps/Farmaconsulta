# FarmaConsulta

Proyecto ABP - Tecnicatura en Ciencia de Datos - Materia: Ciencia de Datos I

## Descripción

FarmaConsulta es un MVP que analiza la base transaccional de una farmacia
(1000 consultas) para dos objetivos concretos:

1. **Automatizar el cálculo del precio final** que paga el cliente,
   combinando el descuento de su obra social con el descuento por
   promoción bancaria.
2. **Detectar stock crítico** y sugerir productos alternativos de la misma
   categoría cuando un producto consultado tiene poco stock.

## Estructura del proyecto

```
FarmaConsulta/
├── data/
│   ├── raw/farmacia.csv            # dataset original, sin modificar
│   └── processed/                  # dataset limpio, generado por main.py
├── graficos/                       # 10 gráficos (.png), generados por main.py
├── src/
│   ├── limpieza.py                 # carga, inspección y limpieza de datos
│   ├── descriptivo.py              # estadísticas descriptivas
│   ├── visualizacion.py            # generación de los gráficos
│   └── calculadora.py              # cálculo de precios y stock (el MVP)
├── main.py                         # orquesta todo el flujo
├── requirements.txt
└── README.md
```

## Cómo correrlo

```
pip install -r requirements.txt
python main.py
```

El script imprime cada paso del proceso ("PASO 1", "PASO 2", ...) para poder
seguir el flujo completo: carga de datos, limpieza, análisis descriptivo,
generación de gráficos y una demostración de la calculadora.

## Regla de negocio: cálculo del precio final

```
precio_final = round(precio_lista * (1 - descuento_OS) * (1 - descuento_banco))
```

Los descuentos se aplican **en cascada** (uno sobre el resultado del otro),
no se suman. Esta fórmula fue validada contra el dataset real: la función
`validar_formula_precio()` de `limpieza.py` recalcula el precio para las
1000 filas y compara contra la columna `precio_final` ya cargada, como
control de calidad del dato. Resultado: **995/1000 filas coinciden
(99.5%)**, el 0.5% restante se atribuye a errores de carga en el sistema de
origen y no se corrige.

### Descuentos por obra social (`descuento_OS`)

| Obra social | Descuento |
|---|---|
| PAMI | 90% |
| Particular | 0% |
| Resto (57 obras sociales) | 40% |

### Descuentos por promoción bancaria (`descuento_banco`)

| Medio de pago | Descuento |
|---|---|
| Nación | 25% |
| Santander | 20% |
| Galicia | 15% |
| Macro | 10% |
| Efectivo, Débito, Banco Provincia, Billetera Virtual (MODO/Mercado Pago) | 0% |

## Criterios de limpieza aplicados

- **`convertida`**: se elimina la columna completa (100% de valores nulos,
  no aporta información).
- **`metodo_pago` nulo (104 filas)**: no se borra la fila. Los 104 nulos
  corresponden a consultas sin banco asociado (`banco_promocion = "Sin
  Promo"` y `descuento_banco = 0`), así que se imputan como
  `"No especificado"`.
- **`producto_nombre` nulo (29 filas)** y **`cliente_nombre` nulo (18
  filas)**: se imputan como `"Desconocido"`, no se borran.
- **`fecha`**: se convierte con máscara estricta `"%m/%d/%Y"` y
  `errors="coerce"`. Resultado: 0 fechas inválidas (NaT).
- **Texto**: se aplica `strip()` y capitalización tipo Título en
  `obra_social`, `categoria` y `metodo_pago`, para evitar categorías
  duplicadas por errores de tipeo.

## Principales hallazgos del análisis descriptivo

- **557 de 1000 consultas (55.7%)** se hicieron sin promoción bancaria.
- El medio de pago que más ahorro genera en promedio es **Nación**
  (~$2.656 de ahorro promedio), seguido de Santander, Galicia y Macro, en
  el mismo orden que sus porcentajes de descuento.
- **82 consultas (8.2%)** tienen stock disponible por debajo o igual al
  umbral crítico de 10 unidades.
- El stock promedio es similar entre categorías (entre 49 y 56 unidades en
  promedio), sin una categoría claramente desabastecida en general.

## Limitación conocida del dataset

`descuento_OS` solo toma 3 valores posibles (0%, 40%, 90%) y
`descuento_banco` queda determinado por el medio de pago elegido (4 bancos
con descuento fijo + el resto en 0%). Esto genera dos efectos que se ven
reflejados en los gráficos:

- En `buscar_mejor_medio_pago()`, la "mejor combinación" de pago tiende
  siempre al mismo resultado (el banco con mayor descuento, Nación),
  porque no hay variabilidad adicional en los descuentos: no dependen del
  cliente ni del producto, solo del medio de pago elegido.
- La matriz de correlación (gráfico 9) muestra pocas relaciones fuertes
  entre variables: la única correlación alta es la esperable entre
  `precio_lista` y `precio_final` (0.80, porque una se calcula a partir de
  la otra). El resto de las variables numéricas (stock, día de la semana,
  descuentos) tienen correlaciones cercanas a 0, porque son
  independientes entre sí por diseño del dataset.

Esta es una limitación de los datos disponibles, no del modelo de
análisis, y se documenta como parte de las conclusiones del informe.
