import { Tabs } from '@mantine/core'
import { IconClipboardPlus, IconStethoscope, IconUsers, IconUserShield, IconVaccine } from '@tabler/icons-react'
import { useState } from 'react'
import { ClientesAdmin } from './admin/ClientesAdmin'
import { ObrasSocialesAdmin } from './admin/ObrasSocialesAdmin'
import { ProductosAdmin } from './admin/ProductosAdmin'
import { RegistrarConsulta } from './admin/RegistrarConsulta'
import { UsuariosAdmin } from './admin/UsuariosAdmin'

type Seccion = 'consulta' | 'productos' | 'obras-sociales' | 'clientes' | 'usuarios'

export function Administracion() {
  const [seccion, setSeccion] = useState<Seccion>('consulta')

  return (
    <Tabs value={seccion} onChange={(v) => setSeccion((v as Seccion) ?? 'consulta')} keepMounted={false}>
      <Tabs.List mb="lg">
        <Tabs.Tab value="consulta" leftSection={<IconClipboardPlus size={16} />}>
          Registrar consulta
        </Tabs.Tab>
        <Tabs.Tab value="productos" leftSection={<IconVaccine size={16} />}>
          Productos
        </Tabs.Tab>
        <Tabs.Tab value="obras-sociales" leftSection={<IconStethoscope size={16} />}>
          Obras sociales
        </Tabs.Tab>
        <Tabs.Tab value="clientes" leftSection={<IconUsers size={16} />}>
          Clientes
        </Tabs.Tab>
        <Tabs.Tab value="usuarios" leftSection={<IconUserShield size={16} />}>
          Usuarios
        </Tabs.Tab>
      </Tabs.List>

      <Tabs.Panel value="consulta">
        <RegistrarConsulta />
      </Tabs.Panel>
      <Tabs.Panel value="productos">
        <ProductosAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="obras-sociales">
        <ObrasSocialesAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="clientes">
        <ClientesAdmin />
      </Tabs.Panel>
      <Tabs.Panel value="usuarios">
        <UsuariosAdmin />
      </Tabs.Panel>
    </Tabs>
  )
}
