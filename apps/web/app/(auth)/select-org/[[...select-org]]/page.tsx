import { OrganizationList } from '@clerk/nextjs'

export default function SelectOrgPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Selecciona tu espacio de trabajo</h1>
        <p className="text-gray-500 text-sm">Crea o selecciona una organización para continuar</p>
        <OrganizationList
          hidePersonal
          afterSelectOrganizationUrl="/dashboard"
          afterCreateOrganizationUrl="/dashboard"
        />
      </div>
    </div>
  )
}
