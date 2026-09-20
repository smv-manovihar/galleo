import React from "react"
import { DateOrganizer } from "../components/organize/DateOrganizer"
import { PageContainer } from "@/components/ui/page-layout"

export const OrganizeFilesPage: React.FC = () => {
  return (
    <PageContainer
      className="flex h-full min-h-0 flex-1 flex-col py-3 md:py-4 font-sans text-xs select-none"
      maxWidth="xl"
    >
      <DateOrganizer />
    </PageContainer>
  )
}
