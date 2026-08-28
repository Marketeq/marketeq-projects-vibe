import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { InvitationsAPI } from "@/service/http/invitations"
import type {
  CreateInvitationDto,
  CreateInvitationLinkDto,
  ListInvitationsParams,
} from "@/types/invitation"

const KEYS = {
  list: (params?: ListInvitationsParams) => ["invitations", "list", params] as const,
  preview: (token: string) => ["invitations", "preview", token] as const,
}

export function useInvitations(params?: ListInvitationsParams) {
  return useQuery({
    queryKey: KEYS.list(params),
    queryFn: () => InvitationsAPI.listInvitations(params),
    enabled: !!(params?.teamId || params?.companyId || params?.invitedEmail),
  })
}

export function useInvitationPreview(token: string | undefined) {
  return useQuery({
    queryKey: KEYS.preview(token ?? ""),
    queryFn: () => InvitationsAPI.previewInvitation(token as string),
    enabled: !!token,
    retry: false,
  })
}

export function useCreateInvitations() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateInvitationDto) => InvitationsAPI.createInvitations(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", "list"] })
    },
  })
}

export function useCreateInvitationLink() {
  return useMutation({
    mutationFn: (dto: CreateInvitationLinkDto) => InvitationsAPI.createInvitationLink(dto),
  })
}

export function useResendInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => InvitationsAPI.resendInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", "list"] })
    },
  })
}

export function useCancelInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => InvitationsAPI.cancelInvitation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invitations", "list"] })
    },
  })
}
