import { Tabs } from '@mantine/core'
import {
  IconBuildingBank,
  IconCalendarTime,
  IconCash,
  IconClipboardPlus,
  IconFileText,
  IconRefresh,
  IconStethoscope,
  IconUsers,
  IconUserShield,
  IconVaccine,
} from '@tabler/icons-react'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { BancosPromocionesAdmin } from './admin/BancosPromocionesAdmin'
import { CajaAdmin } from './admin/CajaAdmin'
import { ClientesAdmin } from './admin/ClientesAdmin'
import { LotesAdmin } from './admin/LotesAdmin'
import { ObrasSocialesAdmin } from './admin/ObrasSocialesAdmin'
import { ProductosAdmin } from './admin/ProductosAdmin'
import { RecetasAdmin } from './admin/RecetasAdmin'
import { ReglasObraSocialAdmin } from './admin/ReglasObraSocialAdmin'
import { RegistrarConsulta } from './admin/RegistrarConsulta'
import { SincronizarPreciosAdmin } from './admin/SincronizarPreciosAdmin'
import { UsuariosAdmin } from './admin/UsuariosAdmin'

type Seccion =
  | 'consulta'
  | 'productos'
  | 'obras-sociales'
  | 'reglas-obra-social'
  | 'bancos-promociones'
  | 'clientes'
  | 'usuarios'
  | 'lotes'
  | 'caja'
  | 'recetas'
  | 'sincronizar-precios'

export function Administracion() {
  const [seccion, setSeccion] = useState<Seccion>('consulta')
  const { usuario } = useAuth()
  const esAdmin = usuario?.es_admin ?? false

  return (
    <Tabs value={seccion} onChange={(v) => setSeccion((v as Seccion) ?? 'consulta')} keepMounted={false}>
      <Tabs.List mb="lg">
        <Tabs.Tab value="consulta" leftSection={<IconClipboardPlus size={16} />}>
          Registrar consulta
        </Tabs.Tab>
        <Tabs.Tab value="productos" leftSection={<IconVaccine size={16} />}>
          Productos
        </Tabs.Tab>
        <Tabs.Tab value="lotes" leftSection={<IconCalendarTime size={16} />}>
          Lotes / vencimientos
        </Tabs.Tab>
        <Tabs.Tab value="caja" leftSection={<IconCash size={16} />}>
          Caja
        </Tabs.Tab>
        <Tabs.Tab value="recetas" leftSection={<IconFileText size={16} />}>
          Recetas
        </Tabs.Tab>
        <Tabs.Tab value="obras-sociales" leftSection={<IconStethoscope size={16} />}>
          Obras sociales
        </Tabs.Tab>
        <Tabs.Tab value="bancos-promociones" leftSection={<IconBuildingBank size={16} />}>
          Bancos / promociones
        </Tabs.Tab>
        {esAdmin && (
          <Tabs.Tab value="reglas-obra-social" leftSection={<IconStethoscope size={16} />}>
            Reglas de obra social
          </Tabs.Tab>
        )}
        <Tabs.Tab value="clientes" leftSection={<IconUsers size={16} />}>
          Clientes
        </Tabs.Tab>
        <Tabs.Tab value="usuarios" leftSection={<IconUserShield size={16} />}>
          Usuarios
        </Tabs.Tab>
        {esAdmin && (
          <Tabs.Tab value="sincronizar-precios" leftSection={<IconRefresh size={16} />}>
            Sincronizar precios
          </Tabs.Tab>
        )}
      </Tabs.List>

      <Tabs.Panel value="consulta">
        <RegistrarConsulta />
      </Tabs.Panel>
      <Tabs.Panel value="productos">
        <ProductosAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="lotes">
        <LotesAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="caja">
        <CajaAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="recetas">
        <RecetasAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="obras-sociales">
        <ObrasSocialesAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="bancos-promociones">
        <BancosPromocionesAdmin />
      </Tabs.Panel>
      {esAdmin && (
        <Tabs.Panel value="reglas-obra-social">
          <ReglasObraSocialAdmin />
        </Tabs.Panel>
      )}
      <Tabs.Panel value="clientes">
        <ClientesAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="usuarios">
        <UsuariosAdmin />
      </Tabs.Panel>
      {esAdmin && (
        <Tabs.Panel value="sincronizar-precios">
          <SincronizarPreciosAdmin />
        </Tabs.Panel>
      )}
    </Tabs>
  )
}
