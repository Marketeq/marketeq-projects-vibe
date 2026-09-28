"use client";

import {
  CSSProperties,
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import React from "react";
// import ReactPlayer from "react-player"
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth";
import options from "@/public/mock/options.json";
import {
  AutocompleteAPI,
  type AutocompleteCategorySuggestion,
  type AutocompleteTypeSuggestion,
} from "@/service/http/autocomplete";
import { CategoryAPI, type CategoryTreeNode } from "@/service/http/category";
import {
  CheckoutAPI,
  type CheckoutPaymentMethod,
} from "@/service/http/checkout";
import {
  type ContractDTO,
  getContractsForClient,
} from "@/service/http/contracts";
import {
  JobListingAPI,
  type JobListingPhaseType,
  type JobListingWorkSchedule,
} from "@/service/http/job-listing";
import { LegalAPI } from "@/service/http/legal";
import { ProjectAPI } from "@/service/http/project";
import { editProjectListingUrl } from "@/src/lib/listing-urls";
import { buildProjectUrl } from "@/src/lib/urlHelpers";
import { HTTPS, ONE_SECOND } from "@/utils/constants";
import {
  cn,
  convertToKbOrMb,
  debounce,
  getId,
  getIsNotEmpty,
  hookFormHasError,
  keys,
} from "@/utils/functions";
import {
  useCallbackRef,
  useControllableState,
  useStepper,
  useUncontrolledState,
  useUnmountEffect,
} from "@/utils/hooks";
import { createContext, createStrictContext } from "@/utils/react-utils";
import { TagsInputHiddenInput } from "@ark-ui/react";
import {
  MdAutorenew,
  MdOutlineAssignment,
  MdOutlineGroups,
  MdOutlinePerson,
} from "react-icons/md";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowDownLeft,
  ArrowUp,
  ArrowUpLeft,
  Check,
  CheckCircle,
  CheckCircleBroken,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Clock,
  Copy,
  Edit03,
  Eye,
  File as FileIcon,
  HelpCircle,
  Home03,
  Info,
  Lightbulb03,
  Lightbulb05,
  Lock01,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Plus2,
  RefreshCcw05,
  SearchMd,
  Send,
  Trash01,
  Trash2,
  Type,
  UploadCloud,
  Users,
  X,
  X2,
} from "@blend-metrics/icons";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  type UniqueIdentifier,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ErrorMessage as HookFormErrorMessage } from "@hookform/error-message";
import { zodResolver } from "@hookform/resolvers/zod";
import { createColumnHelper, noop } from "@tanstack/react-table";
import {
  Row,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Steps } from "headless-stepper";
import {
  Controller,
  type FieldPath,
  SubmitHandler,
  UseFormReturn,
  get,
  useForm,
  useWatch,
} from "react-hook-form";
import {
  useIsomorphicLayoutEffect,
  useToggle,
  useUpdateEffect,
} from "react-use";
import { util, z } from "zod";
import { Prettify } from "@/types/core";
import { CreateProjectType } from "@/types/project";
import { Spinner } from "@/components/ui/spinner/spinner";
import { GripVertical2 } from "@/components/icons/grip-vertical-2";
import { Network1 } from "@/components/icons/network-1";
import { Network2 } from "@/components/icons/network-2";
import { Network3 } from "@/components/icons/network-3";
import {
  CountriesCombobox,
  OwnCombobox,
  getFlagUrlByName,
} from "@/components/own-combobox";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorMessage,
  SquareShapeDropzone,
  Step,
  StepControl,
  StepRootProvider,
  StepperProvider,
  TagsInputContext,
  TagsInputControl,
  TagsInputInput,
  TagsInputItem,
  TagsInputItemDeleteTrigger,
  TagsInputItemInput,
  TagsInputItemPreview,
  TagsInputItemText,
  TagsInputLabel,
  TagsInputRoot,
  useStepContext,
  useStepRootContext,
  useStepperContext,
} from "@/components/ui";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarGroup,
  AvatarGroupButton,
  AvatarFallback,
  AvatarImage,
  AvatarRoot,
  Badge,
  Button,
  Card,
  Combobox,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
  ComboboxTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
  DisclosureContent,
  Dropzone,
  HeadlessRadioGroupItem,
  HelperText,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputLeftElement,
  Label,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Progress,
  RadioGroup,
  ScrollArea,
  ScrollBar,
  SearchField,
  SearchFieldButton,
  SearchFieldInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  ToastAction,
  Toaster,
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useToast,
} from "@/components/ui";
import { InviteTalentFlow } from "@/app/invite-talent/page";

type ProgressProps = {
  setProgress?: (val: number) => void;
};

type WorkTypeChoice = "project" | "service" | null;
type HiringModeChoice = "team" | "individual" | null;
type ScopeKnowledgeChoice = "known" | "unknown" | "none" | null;
type SmartAssistantEditableField =
  | "title"
  | "overview"
  | "benefits"
  | "responsibilities";

const SMART_ASSISTANT_FIELD_MAX_LENGTH: Record<
  SmartAssistantEditableField,
  number
> = {
  title: 100,
  overview: 100,
  benefits: 100,
  responsibilities: 100,
};

const clampSmartAssistantFieldValue = (
  field: SmartAssistantEditableField,
  value: string,
) => {
  const maxLength = SMART_ASSISTANT_FIELD_MAX_LENGTH[field];
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const truncated = normalized.slice(0, maxLength).trim();
  const lastSpaceIndex = truncated.lastIndexOf(" ");
  return lastSpaceIndex > 0
    ? truncated.slice(0, lastSpaceIndex).trim()
    : truncated;
};

type ExistingListingOption = {
  id: string;
  title: string;
  badges: string[];
  icon?: React.ReactNode;
  image?: string;
  avatars: string[];
  workType: Exclude<WorkTypeChoice, null>;
  disabledReason?: string;
};

const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });
const PROJECT_SCOPE_TIP_VIDEO_URL =
  process.env.NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL ?? "";

declare module "@tanstack/react-table" {
  // @ts-expect-error
  interface TableMeta<TData extends PhaseRow> {
    updateData: (rowIndex: number, columnId: string, value: unknown) => void;
    openDurationDialog: (index: number) => void;
    roles: string[];
  }
}

type SubmissionStatus = "in_review" | "published" | "needs_update";

type SubmissionOutcome = {
  status: SubmissionStatus;
  projectId?: string;
  projectSlug?: string;
  inviteBalance?: number;
  ndaDocumentId?: string | null;
};

const JOB_INVITE_MATCHES = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    role: "Product Designer",
    match: "87% match",
    rate: "$85/hr",
    experience: "10 years of experience",
    skills: ["Axure RP", "Visual Design", "Visual Design", "React.js"],
    availability: "Available 40 Hrs/Week",
    projects: "12 projects",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    role: "Product Designer",
    match: "87% match",
    rate: "$85/hr",
    experience: "10 years of experience",
    skills: ["Axure RP", "Visual Design", "Visual Design", "React.js"],
    availability: "Available 40 Hrs/Week",
    projects: "12 projects",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    role: "Product Designer",
    match: "87% match",
    rate: "$85/hr",
    experience: "10 years of experience",
    skills: ["Axure RP", "Visual Design", "Visual Design", "React.js"],
    availability: "Available 40 Hrs/Week",
    projects: "12 projects",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Dheeraj",
    handle: "@dheerajnagdali",
    role: "Product Designer",
    match: "87% match",
    rate: "$85/hr",
    experience: "10 years of experience",
    skills: ["Axure RP", "Visual Design", "Visual Design", "React.js"],
    availability: "Available 40 Hrs/Week",
    projects: "12 projects",
  },
];

type PublishErrorClassification =
  | "image_rejection"
  | "video_rejection"
  | "content_rejection"
  | "temporary_unavailable"
  | "other";

function classifyPublishError(input: {
  message?: string;
  statusCode?: number;
  status?: string;
}): PublishErrorClassification {
  const message = String(input.message ?? "").trim();
  const normalizedMessage = message.toLowerCase();
  const normalizedStatus = String(input.status ?? "")
    .trim()
    .toLowerCase();

  const isTemporaryUnavailable =
    input.statusCode === 502 ||
    input.statusCode === 503 ||
    normalizedStatus === "publish_blocked" ||
    /temporarily unavailable|currently unavailable|upstream listings-service|retry media upload|invalid response|failed with status 5\d{2}|bad gateway|service unavailable/.test(
      normalizedMessage,
    );

  if (isTemporaryUnavailable) {
    return "temporary_unavailable";
  }

  const isVideoRejection =
    /project rejected:\s*video|video violates moderation policy|unsafe frame|frame_moderation|video rejected|video moderation review/.test(
      normalizedMessage,
    );

  if (isVideoRejection) {
    return "video_rejection";
  }

  const isImageRejection =
    /project rejected:\s*image|image violates moderation policy|featured image failed moderation|image rejected by moderation|nudity|graphic|gore|weapon|hate symbol|blur/.test(
      normalizedMessage,
    );

  if (isImageRejection) {
    return "image_rejection";
  }

  const isContentRejection =
    /project rejected:\s*content|content violates moderation policy|banned keyword|bad words|profanity|content failed validation|content moderation|community guidelines|rejected by moderation/.test(
      normalizedMessage,
    );

  if (isContentRejection) {
    return "content_rejection";
  }

  return "other";
}

function makeUniqueFile(
  file: File | Blob | undefined,
): File | Blob | undefined {
  if (!file) return file;
  // If already a File, clone with a unique name
  if (file instanceof File) {
    const ext = file.name.split(".").pop();
    const base = file.name.replace(/\.[^/.]+$/, "");
    const uniqueName = `${base}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;
    return new File([file], uniqueName, { type: file.type });
  }
  // If Blob or other, just return as is
  return file;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PersistedMediaFile = File & {
  __persistedUrl?: string;
};

const isPersistedMediaFile = (file: unknown): file is PersistedMediaFile =>
  file instanceof File &&
  typeof (file as PersistedMediaFile).__persistedUrl === "string";

const buildPersistedMediaFile = (url: string, fallbackName: string) => {
  const pathname = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return "";
    }
  })();
  const derivedName = pathname.split("/").pop() || fallbackName;
  const file = new File([""], derivedName, {
    type: "image/jpeg",
  }) as PersistedMediaFile;
  file.__persistedUrl = url;
  return file;
};

const resolveMediaFileForUpload = async (
  file: File | Blob | undefined,
  fallbackName: string,
): Promise<File | Blob | undefined> => {
  if (!file) return undefined;
  if (isPersistedMediaFile(file)) {
    const response = await fetch(file.__persistedUrl!);
    const blob = await response.blob();
    return new File([blob], file.name || fallbackName, {
      type: blob.type || file.type || "image/jpeg",
    });
  }
  return makeUniqueFile(file);
};

const hydrateRemoteMediaFile = async (url: string, fallbackName: string) => {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const blob = await response.blob();
    const file = new File([blob], fallbackName, {
      type: blob.type || "image/jpeg",
    }) as PersistedMediaFile;
    file.__persistedUrl = url;
    return file;
  } catch {
    return buildPersistedMediaFile(url, fallbackName);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const buildProjectDraftPayload = (projectInfo: ProjectInfoFormValues) => {
  const categorySelections = (projectInfo.category ?? [])
    .map((value) => ({
      category: value?.category?.trim() ?? "",
      subCategories: (value?.subCategories ?? [])
        .map((subCategory) => subCategory.trim())
        .filter(Boolean),
    }))
    .filter(
      (value) => value.category.length > 0 && value.subCategories.length > 0,
    );

  const categories = Array.from(
    new Set(
      categorySelections
        .map((value) => value.category)
        .filter((value): value is string => Boolean(value)),
    ),
  );
  const subCategories = Array.from(
    new Set(
      categorySelections
        .flatMap((value) => value.subCategories)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return {
    title: projectInfo.title,
    categories,
    subCategories,
    categorySelections,
    industries: projectInfo.industry,
    languages: projectInfo.languages,
    tags: projectInfo.tags,
    skills: projectInfo.skills,
    shortDescription: projectInfo.shortDescription,
    fullDescription: projectInfo.fullDescription,
  };
};

const buildScopeDraftPayload = (projectId: string, phases: Phase[] = []) =>
  (phases ?? [])
    .map((phase, phaseIndex) => {
      const phaseName = phase?.phaseName?.trim();
      const rows = (phase?.rows ?? [])
        .map((row) => {
          const taskName = row?.task?.trim();
          const role = row?.role?.trim();
          const locationValue = row?.location?.trim();
          const experienceLevel = row?.experience?.trim();
          const durationValue = row?.duration?.value;
          const durationType = row?.duration?.type;

          if (
            !taskName ||
            !role ||
            !locationValue ||
            !experienceLevel ||
            durationValue === undefined ||
            !durationType
          ) {
            return null;
          }

          return {
            taskName,
            role,
            location: [locationValue],
            experience: [experienceLevel],
            experienceLevel,
            duration: `${durationValue} ${durationType}`,
            phaseId: "temporary-required-string",
          };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));

      if (!phaseName || rows.length === 0) {
        return null;
      }

      return {
        name: phaseName,
        stageName: `Stage ${phaseIndex + 1}`,
        startDay: 1,
        endDay: 8,
        order: phaseIndex + 1,
        projectId,
        tasks: rows,
      };
    })
    .filter((phase): phase is NonNullable<typeof phase> => Boolean(phase));

const getJobListingScopeKnowledge = (
  selectedWorkType?: WorkTypeChoice,
  isNoScopeFlow = false,
  scopeKnowledgeChoice?: ScopeKnowledgeChoice,
) => {
  if (scopeKnowledgeChoice === "known") return "has_scope" as const;
  if (scopeKnowledgeChoice === "unknown") return "no_scope" as const;
  if (scopeKnowledgeChoice === "none") return "no_scope_selected" as const;
  if (isNoScopeFlow) return "no_scope_selected" as const;
  return selectedWorkType ? ("has_scope" as const) : undefined;
};

const getJobListingWorkType = (selectedWorkType?: WorkTypeChoice) =>
  selectedWorkType === "service"
    ? ("service" as const)
    : selectedWorkType === "project"
      ? ("project" as const)
      : undefined;

const getJobListingHiringType = (selectedHiringMode?: HiringModeChoice) =>
  selectedHiringMode === "individual"
    ? ("individual" as const)
    : selectedHiringMode === "team"
      ? ("team" as const)
      : undefined;

const toWorkTypeChoice = (value: unknown): WorkTypeChoice =>
  value === "service" || value === "project" ? value : null;

const toHiringModeChoice = (value: unknown): HiringModeChoice =>
  value === "individual" || value === "team" ? value : null;

const isNoScopeKnowledge = (value: unknown) =>
  value === "no_scope_selected";

const toJobListingPhaseType = (phaseName: string, phaseIndex = 0) => {
  const normalized = phaseName.trim().toLowerCase();
  if (normalized.includes("recurring")) return "recurring" as const;
  if (normalized.includes("ongoing")) return "ongoing" as const;
  return phaseIndex === 0 ? ("setup" as const) : ("recurring" as const);
};

const getJobListingPhaseFields = (
  phase: Phase,
  phaseName: string,
  phases: Phase[],
  phaseIndex: number,
) => {
  const inferredPhaseType = toJobListingPhaseType(phaseName, phaseIndex);
  const phaseType =
    phaseIndex > 0 && phase.phaseType === "setup"
      ? inferredPhaseType
      : (phase.phaseType ?? inferredPhaseType);
  const { startDay, endDay } = getPhaseDayRange(phases, phaseIndex);

  return {
    phaseType,
    durationDays:
      phaseType === "setup" && typeof endDay === "number"
        ? Math.max(1, endDay - startDay + 1)
        : undefined,
    recurrenceSchedule:
      phaseType === "recurring"
        ? (phase.recurrenceSchedule ?? "monthly")
        : undefined,
    recurrenceCount:
      phaseType === "recurring" ? (phase.recurrenceCount ?? 3) : undefined,
  };
};

const toEstimatedHours = (row: PhaseRow) => {
  if (
    row?.workSchedule === "custom" &&
    Number.isFinite(Number(row.customHours)) &&
    Number(row.customHours) > 0
  ) {
    return Number(row.customHours);
  }

  const value = Number(row?.duration?.value);
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (row?.duration?.type === "days") return value * 8;
  if (row?.duration?.type === "weeks") return value * 40;
  return value;
};

const replaceJobListingScope = async (listingId: string, phases: Phase[]) => {
  const existingListingResponse = await JobListingAPI.Get(listingId);
  const existingPhases = Array.isArray(existingListingResponse?.data?.phases)
    ? existingListingResponse.data.phases
    : [];

  for (const phase of existingPhases) {
    const phaseId = String(phase?.id ?? "");
    if (phaseId) {
      await JobListingAPI.DeletePhase(listingId, phaseId);
    }
  }

  for (const [phaseIndex, phase] of phases.entries()) {
    const phaseName = phase?.phaseName?.trim();
    const validRows = (phase?.rows ?? []).filter(
      (row) => row?.task?.trim() && row?.role?.trim(),
    );
    if (!phaseName || validRows.length === 0) continue;

    const { phaseType, durationDays, recurrenceSchedule, recurrenceCount } =
      getJobListingPhaseFields(phase, phaseName, phases, phaseIndex);
    const phaseResponse = await JobListingAPI.CreatePhase(listingId, {
      phaseName,
      phaseType,
      durationDays,
      recurrenceSchedule,
      recurrenceCount,
    });
    const phaseId = String(phaseResponse?.data?.id ?? "");
    if (!phaseId) continue;

    for (const row of validRows) {
      await JobListingAPI.CreateTask(listingId, phaseId, {
        taskName: row.task.trim(),
        roleTitle: row.role.trim(),
        location: row.location?.trim() || undefined,
        experienceLevel: row.experience?.trim() || undefined,
        workSchedule: row.workSchedule ?? "full_time",
        customHours:
          row.workSchedule === "custom" ? row.customHours : undefined,
        customFrequency:
          row.workSchedule === "custom" ? row.customFrequency : undefined,
        estimatedHours: toEstimatedHours(row),
      });
    }
  }
};
const Empty = ({
  outcome,
  draftId,
}: {
  outcome?: SubmissionOutcome;
  draftId?: string;
}) => {
  const status = outcome?.status ?? "in_review";
  const isJobListingFlow =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/job-listing");
  // Category slug is not known at this point in the flow; fall back to an
  // empty string so buildProjectUrl returns "/c//projects/<slug>-<shortId>",
  // which downstream category pages resolve. If no slug/id, go to marketplace.
  const marketplaceHref =
    outcome?.projectSlug && outcome?.projectId
      ? buildProjectUrl("", outcome.projectSlug, outcome.projectId)
      : "/marketplace";
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const hasKnownInviteBalance = outcome?.inviteBalance !== undefined;
  const freeInvites = hasKnownInviteBalance
    ? Math.max(0, Number(outcome?.inviteBalance ?? 0))
    : 30;
  const totalFreeInvites = hasKnownInviteBalance
    ? Math.max(50, freeInvites)
    : 30;
  const [inviteStep, setInviteStep] = useState<
    | "success"
    | "select"
    | "buy"
    | "buyPayment"
    | "upgrade"
    | "upgradeDetails"
    | "upgradePayment"
    | "sent"
  >("success");
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>(
    JOB_INVITE_MATCHES.map((talent) => talent.id),
  );
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [selectedInvitePackage, setSelectedInvitePackage] = useState("100");
  const [selectedPlan, setSelectedPlan] = useState("premium");
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<CheckoutPaymentMethod>("card");
  const [selectedPaymentLabel, setSelectedPaymentLabel] = useState(
    "Credit / Debit Card",
  );
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [topUpInvites, setTopUpInvites] = useState(100);
  const selectedInviteCount = selectedTalentIds.length;
  const hasInviteCapacity =
    freeInvites > 0 &&
    selectedInviteCount > 0 &&
    selectedInviteCount <= freeInvites;
  const toggleTalentInvite = (talentId: string) => {
    setSelectedTalentIds((current) =>
      current.includes(talentId)
        ? current.filter((id) => id !== talentId)
        : [...current, talentId],
    );
  };
  const sendTalentInvites = async () => {
    if (!outcome?.projectId || !hasInviteCapacity) {
      return;
    }

    try {
      setIsSendingInvites(true);
      await JobListingAPI.SendInvites(outcome.projectId, {
        talentUserIds: selectedTalentIds,
      });
      setInviteStep("sent");
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to send invites right now",
        variant: "destructive",
      });
    } finally {
      setIsSendingInvites(false);
    }
  };

  const parseCurrencyAmount = (value?: string) =>
    Number(value?.replace(/[^0-9.]/g, "") || 0);

  const submitCheckoutPayment = async (params: {
    amount: number;
    installmentPlanOption?: "full" | "monthly" | "yearly";
  }) => {
    if (!outcome?.projectId) {
      toast({
        title: "Project is missing. Publish the job before payment.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Please sign in before submitting payment.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingPayment(true);
      const response = await CheckoutAPI.CreateSession({
        projectId: outcome.projectId,
        clientId: user.id,
        paymentMethod: selectedPaymentMethod,
        installmentPlanOption: params.installmentPlanOption ?? "full",
        amount: params.amount,
      });
      const checkoutUrl = response?.data?.checkoutUrl;

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      toast({
        title: "Payment session created, but no checkout URL was returned.",
        variant: "destructive",
      });
    } catch (error: any) {
      toast({
        title:
          error?.response?.data?.message ||
          error?.message ||
          "Unable to start payment right now",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (status !== "needs_update" && isJobListingFlow) {
    const jobsPage = (
      <div className="relative flex-auto bg-gray-50 px-8 py-10">
        <div className="mx-auto grid max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,1fr)_322px]">
          <div className="min-w-0 space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-xl font-bold text-dark-blue-400">My Jobs</h1>
              <Button onClick={() => router.push("/job-listing")}>
                Create Job
              </Button>
            </div>

            <Card className="overflow-hidden hover:border-gray-200 hover:ring-0">
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold leading-6 text-gray-black">
                      Bay City College Campus Expansion Project
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs leading-5 text-gray-500">
                      <span>Ongoing service</span>
                      <span>6 of 15 roles open</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-x-3">
                    <Badge visual="success">Open</Badge>
                    <IconButton variant="ghost" visual="gray" size="sm">
                      <MoreHorizontal className="size-4" />
                    </IconButton>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-gray-200 pt-4 text-sm leading-5">
                  <span className="font-semibold text-gray-black">
                    8 applicants
                  </span>
                  <Badge
                    visual="gray"
                    className="bg-primary-50 text-primary-500"
                  >
                    3 new
                  </Badge>
                  <Button
                    className="h-auto px-0 text-primary-500"
                    variant="link"
                    visual="primary"
                    onClick={() =>
                      router.push(
                        outcome?.projectId
                          ? `/invite-talent?jobListingId=${outcome.projectId}`
                          : "/invite-talent",
                      )
                    }
                  >
                    30 matching profiles
                  </Button>
                  <span className="ml-auto text-xs text-gray-500">
                    Published just now
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <Card className="w-full self-start hover:border-gray-200 hover:ring-0">
            <div className="w-full p-6">
              <h2 className="text-base font-semibold text-gray-black">
                Level Up Your Hiring Skills
              </h2>
              <div className="mt-5 space-y-4">
                {[
                  "Crafting Job Descriptions That Attract Top Talent",
                  "Mastering Behavioral Interview Questions",
                  "How to Spot Red Flags in Candidate Interviews",
                ].map((title) => (
                  <div
                    key={title}
                    className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0"
                  >
                    <h3 className="text-sm font-semibold leading-5 text-dark-blue-400">
                      {title}
                    </h3>
                    <div className="mt-2 text-xs leading-5 text-gray-500">
                      4.8 · Beginner
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-6 w-full" variant="outlined" visual="gray">
                View More Tutorials
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );

    if (inviteStep === "select") {
      return <InviteTalentFlow embedded jobListingId={outcome?.projectId} />;
    }

    if (false && inviteStep === "select") {
      return (
        <div className="flex flex-auto flex-col bg-white">
          <div className="border-b border-gray-200 px-8 py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[32px] font-bold leading-tight text-gray-black">
                  Invite Talent
                </h1>
                <p className="mt-4 text-sm leading-6 text-gray-black">
                  Send up to 30 invites to fill your open roles. The more
                  invites you send out now, the faster you can start your
                  project.
                </p>
              </div>
              <IconButton
                variant="ghost"
                visual="gray"
                size="md"
                onClick={() => router.push("/my-jobs")}
              >
                <X className="size-6" />
              </IconButton>
            </div>
          </div>
          <div className="grid flex-auto grid-cols-[minmax(0,1fr)_320px] gap-8 px-8 py-8">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm leading-5 text-gray-500">
                  We found 30 available profiles that match your project
                  requirements
                  <Button
                    className="ml-2 h-auto px-0"
                    variant="link"
                    visual="primary"
                  >
                    How it works?
                  </Button>
                </p>
                <Button variant="outlined" visual="gray">
                  Hide Filters
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[8px] bg-gray-50 p-3 text-sm">
                <span className="font-semibold text-gray-black">
                  Selected Role:
                </span>
                {[
                  "Product Designer",
                  "Location",
                  "Experience Level",
                  "Work Schedule",
                  "Hourly Rate",
                ].map((filter) => (
                  <Button
                    key={filter}
                    className="h-9 rounded-full"
                    variant="outlined"
                    visual="gray"
                  >
                    {filter}
                    <ChevronDown className="ml-2 size-4" />
                  </Button>
                ))}
              </div>
              <div className="mt-6 divide-y divide-gray-200">
                {JOB_INVITE_MATCHES.map((talent) => {
                  const isSelected = selectedTalentIds.includes(talent.id);
                  return (
                    <Button
                      key={talent.id}
                      variant="link"
                      visual="gray"
                      type="button"
                      className="h-auto w-full items-start justify-start gap-5 whitespace-normal py-6 text-left font-normal text-inherit hover:no-underline"
                      onClick={() => toggleTalentInvite(talent.id)}
                    >
                      <span className="mt-2 size-16 shrink-0 rounded-full border-4 border-gray-200 bg-gray-50" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-semibold text-gray-black">
                          {talent.name}
                          <span className="ml-1 font-normal text-gray-500">
                            {talent.handle}
                          </span>
                        </span>
                        <span className="mt-1 block text-sm text-gray-500">
                          {talent.role}
                        </span>
                        <span className="mt-1 block text-xs text-gray-500">
                          {talent.experience}
                        </span>
                        <span className="mt-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-black">
                          <span>{talent.match}</span>
                          <span>★★★★★ 4.8</span>
                          <span>{talent.projects}</span>
                        </span>
                        <span className="mt-3 flex flex-wrap gap-2">
                          <Badge visual="gray">Top Match</Badge>
                          <Badge visual="gray">{talent.availability}</Badge>
                        </span>
                        <span className="mt-5 flex flex-wrap items-center gap-3">
                          <span className="mr-3 text-[24px] font-bold leading-8 text-gray-black">
                            {talent.rate}
                          </span>
                          <span className="text-xs text-gray-black">
                            12 Matching Skills
                          </span>
                          {talent.skills.map((skill, index) => (
                            <Badge
                              key={`${talent.id}-${skill}-${index}`}
                              visual="gray"
                            >
                              {skill}
                            </Badge>
                          ))}
                          <Badge visual="gray">+ 5 More...</Badge>
                        </span>
                      </span>
                      <span
                        className={cn(
                          "mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-gray-300",
                          isSelected &&
                            "border-primary-500 bg-primary-500 text-white",
                        )}
                      >
                        {isSelected ? <Check className="size-4" /> : null}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>
            <Card className="block w-full self-start p-6 hover:border-gray-200 hover:ring-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-gray-black">
                    Apply Filters To Your Team
                  </h2>
                  <p className="mt-3 text-sm leading-5 text-gray-500">
                    Customize filters for better match for each role or invite
                    without them.
                  </p>
                </div>
                <HelpCircle className="size-5 text-gray-400" />
              </div>
              <div className="mt-8 space-y-5">
                <div>
                  <div className="flex items-center justify-between text-sm font-semibold text-dark-blue-400">
                    <span>0 / 3 Roles have been filtered</span>
                  </div>
                  <Progress className="mt-3" value={0} />
                </div>
                {[
                  "Product Designer",
                  "Full-stack Developer",
                  "Q/A Engineer",
                ].map((role) => (
                  <div
                    key={role}
                    className="flex items-center justify-between border-b border-gray-200 pb-4 last:border-b-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-black">
                        {role}
                      </p>
                      <p className="mt-2 text-xs text-gray-500">Unfiltered</p>
                    </div>
                    <span className="size-5 rounded-full border border-gray-300" />
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-[8px] border border-gray-200 p-5">
                <p className="text-[24px] font-bold leading-8 text-dark-blue-400">
                  {freeInvites} / {totalFreeInvites} invites left
                </p>
                <p className="mt-4 text-sm leading-5 text-gray-black">
                  {hasInviteCapacity
                    ? "You have enough invites to cover all roles for this job"
                    : "Buy more invites or upgrade your plan to invite talent"}
                </p>
              </div>
              <div className="mt-5 grid gap-3">
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={() => setInviteStep("buy")}
                >
                  Buy More Invites
                </Button>
                <Button
                  variant="outlined"
                  visual="gray"
                  onClick={() => setInviteStep("upgrade")}
                >
                  Upgrade Plan
                </Button>
              </div>
            </Card>
          </div>
          <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-200 bg-white px-8 py-5">
            <p className="text-sm leading-5 text-gray-black">
              You'll get 10 free invites for each role, giving you 30 in total.
            </p>
            <Button
              className="h-12 rounded-full bg-gray-900 px-8 text-white hover:bg-gray-900"
              disabled={!hasInviteCapacity || isSendingInvites}
              onClick={sendTalentInvites}
            >
              {isSendingInvites
                ? "Sending..."
                : `Send ${selectedInviteCount} Invites`}
              <Send className="ml-2 size-5" />
            </Button>
          </div>
        </div>
      );
    }

    if (inviteStep === "buy" || inviteStep === "upgrade") {
      const invitePackages = [
        { id: "100", title: "100", price: "$25" },
        { id: "500", title: "500", price: "$45" },
        { id: "1000", title: "1,000", price: "$90" },
      ];
      const planOptions = [
        {
          id: "essentials",
          title: "Essentials",
          price: "$20/month",
          badge: "Current Plan",
          invites: "50 invites / month",
        },
        {
          id: "premium",
          title: "Premium",
          price: "$49/month",
          badge: "Recommended",
          invites: "100 invites / month",
        },
        {
          id: "enterprise",
          title: "Enterprise",
          price: "$99/month",
          badge: "For growing teams",
          invites: "500 invites / month",
        },
      ];

      return (
        <div className="relative flex-auto overflow-hidden bg-gray-50">
          <div className="pointer-events-none opacity-50">{jobsPage}</div>
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/40 px-6">
            <Card className="block w-full max-w-[760px] rounded-[16px] bg-white p-0 shadow-lg hover:border-gray-200 hover:ring-0">
              <div className="relative px-8 py-7">
                <IconButton
                  className="absolute right-5 top-5"
                  variant="ghost"
                  visual="gray"
                  size="md"
                  onClick={() => setInviteStep("select")}
                >
                  <X className="size-5" />
                </IconButton>
                {inviteStep === "buy" ? (
                  <>
                    <h2 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                      You are out of invites
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      All of your free invites are used right now. Buy more
                      invites to keep reaching matched talent.
                    </p>
                    <RadioGroup
                      className="mt-6 grid gap-4 sm:grid-cols-3"
                      value={selectedInvitePackage}
                      onValueChange={setSelectedInvitePackage}
                    >
                      {invitePackages.map((option) => {
                        const isSelected = selectedInvitePackage === option.id;
                        return (
                          <HeadlessRadioGroupItem
                            key={option.id}
                            value={option.id}
                            className={cn(
                              "rounded-[8px] border border-gray-200 p-5 text-left",
                              isSelected && "border-primary-500 bg-primary-50",
                            )}
                          >
                            <span className="block text-[28px] font-bold leading-tight text-dark-blue-400">
                              {option.title}
                            </span>
                            <span className="mt-2 block text-sm text-gray-500">
                              {option.price}
                            </span>
                          </HeadlessRadioGroupItem>
                        );
                      })}
                    </RadioGroup>
                    <p className="mt-5 text-sm leading-5 text-gray-500">
                      These invites are a one-time purchase you can use right
                      away. No recurring charges.
                    </p>
                    <Button
                      className="mt-6 w-full"
                      onClick={() => setInviteStep("buyPayment")}
                    >
                      Go to Payment
                    </Button>
                    <p className="mt-5 text-center text-sm text-gray-500">
                      Do you want to upgrade your plan?{" "}
                      <Button
                        className="h-auto px-0"
                        variant="link"
                        visual="primary"
                        onClick={() => setInviteStep("upgrade")}
                      >
                        Upgrade My Plan
                      </Button>
                    </p>
                  </>
                ) : (
                  <>
                    <h2 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                      Upgrade Your Current Plan
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      Upgrade your plan to invite more talent every month.
                    </p>
                    <div className="mt-6 inline-flex rounded-[8px] border border-gray-200 bg-white p-1">
                      {(["monthly", "annual"] as const).map((cycle) => (
                        <Button
                          key={cycle}
                          variant="ghost"
                          visual="gray"
                          type="button"
                          className={cn(
                            "rounded-[8px] px-5 capitalize text-gray-500",
                            billingCycle === cycle &&
                              "bg-primary-50 text-primary-500 hover:bg-primary-50",
                          )}
                          onClick={() => setBillingCycle(cycle)}
                        >
                          {cycle}
                        </Button>
                      ))}
                    </div>
                    <RadioGroup
                      className="mt-6 grid gap-4 md:grid-cols-3"
                      value={selectedPlan}
                      onValueChange={setSelectedPlan}
                    >
                      {planOptions.map((option) => {
                        const isSelected = selectedPlan === option.id;
                        return (
                          <HeadlessRadioGroupItem
                            key={option.id}
                            value={option.id}
                            className={cn(
                              "rounded-[8px] border border-gray-200 p-5 text-left",
                              isSelected && "border-primary-500 bg-primary-50",
                            )}
                          >
                            <span className="text-xs font-semibold text-primary-500">
                              {option.badge}
                            </span>
                            <span className="mt-3 block text-lg font-bold text-dark-blue-400">
                              {option.title}
                            </span>
                            <span className="mt-2 block text-sm text-gray-500">
                              {option.price}
                            </span>
                            <span className="mt-4 block text-xs font-semibold text-gray-black">
                              {option.invites}
                            </span>
                            <span className="mt-3 block text-xs leading-5 text-gray-500">
                              Priority support, matching help, project tools,
                              and hiring resources.
                            </span>
                          </HeadlessRadioGroupItem>
                        );
                      })}
                    </RadioGroup>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                      <Button
                        variant="link"
                        visual="primary"
                        onClick={() => setInviteStep("buy")}
                      >
                        Do you want to buy more invites? Buy more
                      </Button>
                      <div className="flex gap-3">
                        <Button
                          variant="outlined"
                          visual="gray"
                          onClick={() => setInviteStep("upgradeDetails")}
                        >
                          Plan Details
                        </Button>
                        <Button onClick={() => setInviteStep("upgradePayment")}>
                          Go to Payment
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (inviteStep === "upgradeDetails") {
      const planOptions = [
        {
          id: "essentials",
          title: "Essentials",
          price: "$20/month",
          invites: "50 invites / month",
        },
        {
          id: "premium",
          title: "Premium",
          price: "$49/month",
          invites: "100 invites / month",
        },
        {
          id: "enterprise",
          title: "Enterprise",
          price: "$99/month",
          invites: "500 invites / month",
        },
      ];

      return (
        <div className="relative flex-auto overflow-hidden bg-gray-50">
          <div className="pointer-events-none opacity-50">{jobsPage}</div>
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/40 px-6">
            <Card className="block w-full max-w-[760px] rounded-[16px] bg-white p-0 shadow-lg hover:border-gray-200 hover:ring-0">
              <div className="relative px-8 py-7">
                <IconButton
                  className="absolute right-5 top-5"
                  variant="ghost"
                  visual="gray"
                  size="md"
                  onClick={() => setInviteStep("upgrade")}
                >
                  <X className="size-5" />
                </IconButton>
                <h2 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                  Plan Details
                </h2>
                <div className="mt-6 inline-flex rounded-[8px] border border-gray-200 bg-white p-1">
                  {(["monthly", "annual"] as const).map((cycle) => (
                    <Button
                      key={cycle}
                      variant="ghost"
                      visual="gray"
                      type="button"
                      className={cn(
                        "rounded-[8px] px-5 capitalize text-gray-500",
                        billingCycle === cycle &&
                          "bg-primary-50 text-primary-500 hover:bg-primary-50",
                      )}
                      onClick={() => setBillingCycle(cycle)}
                    >
                      {cycle}
                    </Button>
                  ))}
                </div>
                <RadioGroup
                  className="mt-6 grid gap-4 md:grid-cols-3"
                  value={selectedPlan}
                  onValueChange={setSelectedPlan}
                >
                  {planOptions.map((option) => {
                    const isSelected = selectedPlan === option.id;
                    return (
                      <HeadlessRadioGroupItem
                        key={option.id}
                        value={option.id}
                        className={cn(
                          "rounded-[8px] border border-gray-200 p-5 text-left",
                          isSelected && "border-primary-500 bg-primary-50",
                        )}
                      >
                        <span className="block text-lg font-bold text-dark-blue-400">
                          {option.title}
                        </span>
                        <span className="mt-2 block text-sm text-gray-500">
                          {option.price}
                        </span>
                        <span className="mt-4 block text-sm font-semibold text-gray-black">
                          {option.invites}
                        </span>
                        <ul className="mt-4 space-y-2 text-xs leading-5 text-gray-500">
                          <li>Dedicated account manager</li>
                          <li>Advanced project management tools</li>
                          <li>Priority customer support</li>
                          <li>Priority job postings</li>
                        </ul>
                      </HeadlessRadioGroupItem>
                    );
                  })}
                </RadioGroup>
                <Button
                  className="mt-6 w-full"
                  onClick={() => setInviteStep("upgradePayment")}
                >
                  Update Selection
                </Button>
              </div>
            </Card>
          </div>
        </div>
      );
    }

    if (inviteStep === "buyPayment" || inviteStep === "upgradePayment") {
      const isUpgrade = inviteStep === "upgradePayment";
      const options = isUpgrade
        ? [
            { id: "essentials", title: "Essentials", price: "$20/mo" },
            { id: "premium", title: "Premium", price: "$49/mo" },
            { id: "enterprise", title: "Enterprise", price: "$99/mo" },
          ]
        : [
            { id: "100", title: "100", price: "$25" },
            { id: "500", title: "500", price: "$45" },
            { id: "1000", title: "1,000", price: "$90" },
          ];
      const selectedOption =
        options.find((option) =>
          isUpgrade
            ? option.id === selectedPlan
            : option.id === selectedInvitePackage,
        ) ?? options[0];
      const basePaymentAmount = parseCurrencyAmount(selectedOption?.price);
      const topUpAmount = isUpgrade ? (topUpInvites / 100) * 45 : 0;
      const checkoutAmount = basePaymentAmount + topUpAmount;
      const paymentMethods: Array<{
        label: string;
        value: CheckoutPaymentMethod;
      }> = [
        { label: "Credit / Debit Card", value: "card" },
        { label: "Bank Account", value: "ach" },
        { label: "Wire Transfer", value: "wire" },
        { label: "Google Pay", value: "card" },
        { label: "Apple Pay", value: "card" },
        { label: "Pay with Klarna", value: "card" },
      ];

      return (
        <div className="flex flex-auto flex-col bg-gray-50">
          <div className="border-b border-gray-200 bg-white px-8 py-5">
            <div className="mx-auto flex w-full max-w-[1120px] items-center gap-3">
              <Lock01 className="size-5 text-primary-500" />
              <span className="text-base font-semibold text-dark-blue-400">
                Secure Checkout
              </span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-[1120px] px-8 py-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h1 className="text-[32px] font-bold leading-tight text-dark-blue-400">
                Checkout
              </h1>
              <Button
                variant="outlined"
                visual="gray"
                onClick={() => setInviteStep(isUpgrade ? "upgrade" : "buy")}
              >
                Back to invites
              </Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Card className="block p-6 hover:border-gray-200 hover:ring-0">
                <h2 className="text-base font-semibold text-gray-black">
                  {isUpgrade ? "Premium Plan" : "Invite Details"}
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {isUpgrade
                    ? "Monthly Subscription"
                    : "Choose how many invites you want to add."}
                </p>
                {isUpgrade ? (
                  <>
                    <div className="mt-6 rounded-[8px] border border-gray-200 p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-black">
                            Top up your plan's invite numbers
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Your plan includes 100 invites. You can add more
                            invites for this billing cycle.
                          </p>
                        </div>
                        <div className="flex items-center rounded-[8px] border border-gray-200">
                          <Button
                            variant="ghost"
                            visual="gray"
                            type="button"
                            className="h-auto px-4 py-3 text-lg text-dark-blue-400"
                            onClick={() =>
                              setTopUpInvites((value) =>
                                Math.max(100, value - 100),
                              )
                            }
                          >
                            -
                          </Button>
                          <span className="border-x border-gray-200 px-6 py-3 text-sm font-semibold text-gray-black">
                            {topUpInvites}
                          </span>
                          <Button
                            variant="ghost"
                            visual="gray"
                            type="button"
                            className="h-auto px-4 py-3 text-lg text-dark-blue-400"
                            onClick={() =>
                              setTopUpInvites((value) => value + 100)
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <span className="text-sm font-semibold text-gray-black">
                          Plan's price
                        </span>
                        <span className="rounded-[8px] border border-gray-200 px-4 py-3 text-sm font-semibold text-dark-blue-400">
                          {selectedOption.price.replace("/mo", " / month")}
                        </span>
                        <Button
                          className="h-auto px-0"
                          variant="link"
                          visual="primary"
                          onClick={() => setInviteStep("upgradeDetails")}
                        >
                          Change Plan
                        </Button>
                      </div>
                    </div>
                    <div className="mt-8 rounded-[8px] border border-gray-200 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold text-gray-black">
                          Payment Method
                        </h3>
                        <Button
                          className="h-auto px-0"
                          variant="link"
                          visual="primary"
                        >
                          Edit
                        </Button>
                      </div>
                      <div className="mt-4 rounded-[8px] border border-gray-200 p-4">
                        <p className="text-sm font-semibold text-gray-black">
                          AMEX ending in *1234
                        </p>
                        <p className="mt-2 text-xs text-gray-500">
                          Expires 09/2027
                        </p>
                      </div>
                      <div className="mt-4 text-sm leading-6 text-gray-500">
                        <p className="font-semibold text-gray-black">
                          Billing Address
                        </p>
                        <p>2125 Chestnut Street</p>
                        <p>San Francisco, CA 94123</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <RadioGroup
                      className="mt-6 grid gap-4 sm:grid-cols-3"
                      value={selectedInvitePackage}
                      onValueChange={setSelectedInvitePackage}
                    >
                      {options.map((option) => {
                        const isSelected = selectedInvitePackage === option.id;
                        return (
                          <HeadlessRadioGroupItem
                            key={option.id}
                            value={option.id}
                            className={cn(
                              "rounded-[8px] border border-gray-200 p-5 text-left",
                              isSelected && "border-primary-500 bg-primary-50",
                            )}
                          >
                            <span className="block text-[28px] font-bold leading-tight text-dark-blue-400">
                              {option.title}
                            </span>
                            <span className="mt-2 block text-sm text-gray-500">
                              {option.price}
                            </span>
                          </HeadlessRadioGroupItem>
                        );
                      })}
                    </RadioGroup>
                    <p className="mt-5 text-sm leading-5 text-gray-500">
                      These invites are a one-time purchase you can use right
                      away. No recurring charges.
                    </p>
                    <h3 className="mt-8 text-sm font-semibold text-gray-black">
                      Select payment method
                    </h3>
                    <RadioGroup
                      className="mt-4 grid gap-3 sm:grid-cols-3"
                      value={selectedPaymentLabel}
                      onValueChange={(nextPaymentLabel) => {
                        const nextMethod = paymentMethods.find(
                          (method) => method.label === nextPaymentLabel,
                        );

                        if (!nextMethod) return;

                        setSelectedPaymentLabel(nextMethod.label);
                        setSelectedPaymentMethod(nextMethod.value);
                      }}
                    >
                      {paymentMethods.map((method) => (
                        <HeadlessRadioGroupItem
                          key={method.label}
                          value={method.label}
                          className={cn(
                            "rounded-[8px] border border-gray-200 p-4 text-sm font-semibold text-dark-blue-400",
                            selectedPaymentLabel === method.label &&
                              "border-primary-500 bg-primary-50",
                          )}
                        >
                          {method.label}
                        </HeadlessRadioGroupItem>
                      ))}
                    </RadioGroup>
                  </>
                )}
              </Card>
              <Card className="block self-start p-6 hover:border-gray-200 hover:ring-0">
                <h2 className="text-base font-semibold text-gray-black">
                  Price Details
                </h2>
                <div className="mt-5 space-y-3 text-sm text-gray-500">
                  <div className="flex justify-between">
                    <span>
                      {isUpgrade
                        ? `${selectedOption.title} plan`
                        : `${selectedOption.title} invites`}
                    </span>
                    <span className="font-semibold text-gray-black">
                      {selectedOption.price}
                    </span>
                  </div>
                  {isUpgrade ? (
                    <div className="flex justify-between">
                      <span>Top-up invites</span>
                      <span className="font-semibold text-gray-black">
                        ${topUpAmount}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between">
                    <span>Estimated tax</span>
                    <span className="font-semibold text-gray-black">$0.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gift card applied</span>
                    <span className="font-semibold text-gray-black">$0</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-base font-semibold text-gray-black">
                      <span>Total</span>
                      <span>${checkoutAmount}</span>
                    </div>
                  </div>
                </div>
                <Button
                  className="mt-6 w-full"
                  disabled={isSubmittingPayment || checkoutAmount <= 0}
                  onClick={() =>
                    submitCheckoutPayment({
                      amount: checkoutAmount,
                      installmentPlanOption: isUpgrade
                        ? billingCycle === "annual"
                          ? "yearly"
                          : "monthly"
                        : "full",
                    })
                  }
                >
                  {isSubmittingPayment ? "Redirecting..." : "Submit Payment"}
                </Button>
                <p className="mt-4 text-xs leading-5 text-gray-500">
                  By continuing, you agree to Marketeq's Terms of Use and
                  Privacy Policy.
                </p>
                <Button
                  className="mt-4 h-auto px-0"
                  variant="link"
                  visual="primary"
                >
                  Add Gift Card / Promo Code
                </Button>
              </Card>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex-auto">
        {jobsPage}
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-900/40 px-6">
          <Card className="w-full max-w-[600px] rounded-[16px] border-gray-200 bg-white p-0 shadow-lg hover:border-gray-200 hover:ring-0">
            <div className="relative px-10 py-10 text-center">
              <IconButton
                className="absolute right-6 top-6"
                variant="ghost"
                visual="gray"
                size="md"
                onClick={() => router.push("/my-jobs")}
              >
                <X className="size-6" />
              </IconButton>
              <div className="mx-auto inline-flex size-14 items-center justify-center rounded-full bg-success-50 text-success-500">
                <CheckCircle className="size-7" />
              </div>
              <h2 className="mt-8 text-[32px] font-bold leading-tight text-dark-blue-400">
                {inviteStep === "sent"
                  ? "Invites sent successfully!"
                  : "All set! Your job post is live"}
              </h2>
              <p className="mt-5 text-[18px] font-light leading-normal text-dark-blue-400">
                {inviteStep === "sent"
                  ? "You can track applicants for each job from your My Jobs page"
                  : "Start inviting talents to move your hiring forward"}
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Button
                  className="h-12"
                  variant="outlined"
                  visual="gray"
                  onClick={() => router.push("/my-jobs")}
                >
                  {inviteStep === "sent" ? "Close" : "Do It Later"}
                </Button>
                <Button
                  className="h-12"
                  onClick={() =>
                    inviteStep === "sent"
                      ? router.push("/my-jobs")
                      : setInviteStep(freeInvites > 0 ? "select" : "buy")
                  }
                >
                  {inviteStep === "sent" ? "Track Applicants" : "Invite Now"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="grid flex-auto place-items-center">
      <div className="flex w-full max-w-[460px] flex-col items-center px-6">
        {status === "published" ? (
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-success-50 text-success-500">
            <CheckCircle className="size-7" />
          </div>
        ) : status === "needs_update" ? (
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-warning-50 text-warning-500">
            <AlertTriangle className="size-7" />
          </div>
        ) : (
          <div className="size-[56px] shrink-0 rounded-full inline-flex items-center justify-center bg-primary-50 text-primary-500">
            <Send className="size-7" />
          </div>
        )}

        <h1
          className={
            status === "in_review" || status === "published"
              ? "mt-8 text-xl text-center text-gray-800 leading-[30px] font-semibold"
              : "mt-8 max-w-[420px] text-center text-[32px] leading-[38px] font-semibold text-gray-800"
          }
        >
          {status === "published"
            ? "Your project has been successfully published"
            : status === "needs_update"
              ? "Please update your project to meet community guidelines."
              : "Your Project has been submitted for a review!"}
        </h1>

        <p className="mt-5 max-w-[420px] text-center text-sm leading-[21px] text-gray-500">
          {status === "published"
            ? "Your project is now live in the marketplace and available for others to discover and collaborate. Thank you for contributing!"
            : status === "needs_update"
              ? "Review and adjust your project to ensure it complies with policies before publishing."
              : "Our team will review your project over the next few days and will get back to you if there are any changes to be made."}
        </p>

        {status !== "needs_update" ? (
          <div className="mt-6 flex items-center justify-center gap-x-1">
            <p className="text-sm leading-[16.94px] text-gray-500">
              You can check your project status anytime in
            </p>
            <Button
              variant="link"
              className="px-0"
              onClick={() => {
                router.push("/my-projects");
              }}
            >
              My Projects
            </Button>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm leading-[21px] text-gray-500">
            Read community guidelines{" "}
            <Button
              variant="link"
              className="px-0"
              onClick={() => router.push("/community-guidelines")}
            >
              Here.
            </Button>
          </p>
        )}

        {status === "in_review" ? (
          <p className="mt-6 text-center text-sm font-semibold leading-[30px] text-gray-800">
            Thanks for submitting, we&apos;ll be in touch soon!
          </p>
        ) : null}

        {status === "published" ? (
          <div className="mt-8 flex items-center justify-center gap-x-3">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              <Home03 className="size-[15px]" />
              Take me home
            </Button>
            <Button
              onClick={() => {
                window.location.href = marketplaceHref;
              }}
            >
              View in Marketplace
            </Button>
          </div>
        ) : status === "needs_update" ? (
          <div className="mt-8">
            <Button
              onClick={() => {
                if (draftId) {
                  router.push(editProjectListingUrl(draftId));
                  return;
                }
                router.push("/publish-project");
              }}
            >
              Update Project
            </Button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center">
            <Button
              visual="gray"
              variant="outlined"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              <Home03 className="size-[15px]" />
              Take me home
            </Button>
            <Button
              variant="link"
              className="mt-3 px-0"
              onClick={() => {
                router.push("/my-projects");
              }}
            >
              My Projects
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

const meta = {
  "Project Info": [
    { label: "Title", name: "title" },
    { label: "Category", name: "category" },
    { label: "Industry(s)", name: "industry" },
    { label: "Language(s)", name: "languages" },
    { label: "Short Description", name: "shortDescription" },
    { label: "Full Description", name: "fullDescription" },
    { label: "Tags", name: "tags" },
    { label: "Skills", name: "skills" },
  ],
  Media: [
    { label: "Featured Image", name: "featuredImages" },
    { label: "Additional Images", name: "additionalImages" },
    { label: "Featured Video", name: "featuredVideo" },
  ],
  "Project Scope": [
    { label: "Task Name", name: "task" },
    { label: "Role", name: "role" },
    { label: "Location", name: "location" },
    { label: "Experience", name: "experience" },
    { label: "Duration", name: "duration" },
  ],
} as const;

const plainTextFromRichTextHtml = (value: string) => {
  if (!value) return "";

  if (typeof window !== "undefined") {
    const container = window.document.createElement("div");
    container.innerHTML = value;
    return (container.textContent ?? container.innerText ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const getRichTextCharacterCount = (value: string) =>
  plainTextFromRichTextHtml(value).length;

const STEP_TWO_WORD_LIMIT = 100;
const NEGATIVE_BUDGET_ERROR = "Budget cannot be negative";

const getWordCount = (value: string) => (value.match(/\S+/g) ?? []).length;

const normalizeBudgetInput = (value: string) => {
  const sanitizedValue = value.replace(/[^0-9.-]/g, "");
  const sign = sanitizedValue.startsWith("-") ? "-" : "";
  const unsignedValue = sanitizedValue.replace(/-/g, "");
  const [whole = "", fraction = ""] = unsignedValue.split(".");

  return sign +
    (unsignedValue.includes(".")
      ? `${whole}.${fraction.slice(0, 2)}`
      : whole);
};

const DURATION_TYPE = ["hours", "days", "weeks", "months"] as const;

const formatDurationUnit = (
  value: number,
  type: (typeof DURATION_TYPE)[number],
) => {
  if (value === 1) {
    if (type === "days") return "day";
    if (type === "weeks") return "week";
    if (type === "months") return "month";
    return "hour";
  }

  return type;
};

const durationToDays = (
  value: number,
  type: (typeof DURATION_TYPE)[number],
) => {
  if (type === "weeks") return value * 7;
  if (type === "months") return value * 30;
  if (type === "hours") return Math.max(1, Math.ceil(value / 24));
  return value;
};
// Full 5-level scale — matches ps_platform_rate_averages.experience_level
// and the shared scope-builder component's HOURLY_RATE_BY_LEVEL.
const EXPERIENCE_LEVELS = ["Student", "Junior", "Medior", "Senior", "Guru"] as const;
type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
const formatExperienceDisplay = (experience?: string | null) => {
  const normalizedExperience = experience?.trim();
  if (!normalizedExperience) return "";
  return `${normalizedExperience.charAt(0).toUpperCase()}${normalizedExperience
    .slice(1)
    .toLowerCase()}`;
};

const taskFormSchema = z.object({
  task: z.string().min(1, "Please enter at least 1 character(s)"),
  role: z.string().min(1, "Please enter/select at least 1 role(s)"),
  location: z.string().min(1, "Please enter/select at least 1 location(s)"),
  experience: z.enum(EXPERIENCE_LEVELS, {
    required_error: "Please enter/select at least 1 experience level",
    invalid_type_error: "Please enter/select at least 1 experience level",
  }),
  duration: z.object({
    value: z.coerce.number({
      invalid_type_error: "Please enter a valid number",
    }),
    type: z.enum(DURATION_TYPE, {
      invalid_type_error: "Please select an option",
      required_error: "Please select an option",
    }),
  }),
});

const rowSchema = taskFormSchema.merge(
  z.object({
    id: z.string().min(1, "Please enter at least 1 character(s)"),
  }),
);

const pickFromProjectScopeSchema = (
  options: {
    [Property in keyof z.infer<typeof rowSchema>]?: true;
  } = {},
) => {
  return {
    safeParse: (data: unknown, params?: Partial<z.ParseParams>) => {
      const { success } = z
        .array(
          z.object({
            phaseName: z
              .string()
              .min(1, "Please enter at least 1 character(s)"),
            rows: z
              .array(rowSchema.pick(options))
              .min(1, "Please add at least 1 task(s)"),
          }),
        )
        .min(1, "Please add at least 1 phase(s)")
        .safeParse(data, params);
      return success;
    },
  };
};

const projectScopeSchema = pickFromProjectScopeSchema();

const jobCreationStepLabels = [
  "Project Foundation",
  "Describe Project",
  "Project Scope",
  "Customize Team",
  "Final Check",
] as const;

const Sidebar = () => {
  const { currentStep, stepsState } = useStepRootContext();
  const { setStep } = useStepperContext();
  const projectInfoMethods: UseFormReturn<ProjectInfoFormValues> =
    useProjectInfoContext();
  const mediaMethods = useMediaContext();
  const { projectScopeMethods, setTaskSearchDialogOpen } =
    useProjectScopeContext();
  const [phases] = projectScopeMethods;
  // Show status icons only after the user has started filling Project Scope
  const hasStartedScope =
    Array.isArray(phases) &&
    phases.some(
      (p) =>
        (p.phaseName?.trim?.() ?? "").length > 0 ||
        (Array.isArray(p.rows) && p.rows.length > 0),
    );
  const hasProjectInfoFieldError = useCallback(
    (name: (typeof meta)["Project Info"][number]["name"]) => {
      if (name === "category") {
        return Boolean(projectInfoMethods.formState.errors.category);
      }

      return hookFormHasError({
        errors: projectInfoMethods.formState.errors,
        name: name as FieldPath<ProjectInfoFormValues>,
      });
    },
    [projectInfoMethods.formState.errors],
  );
  const hasMediaFieldError = useCallback(
    (name: (typeof meta)["Media"][number]["name"]) =>
      hookFormHasError({
        errors: mediaMethods.formState.errors,
        name: name as FieldPath<MediaFormValues>,
      }),
    [mediaMethods.formState.errors],
  );

  return (
    <div className="sticky top-0 py-6 px-[15px] flex h-screen flex-col shrink-0 gap-y-5 overflow-y-auto xs:max-[1024px]:hidden w-[260px] border-r border-gray-200 bg-gray-50">
      {stepsState.map(({ label, isValid }, index) => {
        const isActive = currentStep === index;
        const displayLabel = jobCreationStepLabels[index] ?? label;
        // can open this step if it's the first, or the previous step is valid
        const canOpen = index === 0 || stepsState[index - 1]?.isValid;
        return (
          <TooltipProvider key={index}>
            <Tooltip>
              <div className="flex flex-col">
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    visual="gray"
                    className="group h-auto justify-between gap-x-0 whitespace-normal rounded-md px-3 hover:bg-gray-100 disabled:pointer-events-auto disabled:opacity-100 disabled:hover:bg-transparent"
                    data-ui-state={
                      isActive
                        ? "active"
                        : isValid
                          ? "complete"
                          : !canOpen
                            ? "disabled"
                            : undefined // unlocked but incomplete -> no special state
                    }
                    disabled={!canOpen} // physically disable click when locked
                    onClick={() => (canOpen ? setStep(index) : noop)} // allow opening if unlocked, even if not yet valid
                  >
                    <span className="flex items-center gap-x-3">
                      <span className="text-sm leading-[16.94px] font-semibold size-[25px] rounded-full shrink-0 inline-flex justify-center items-center text-white group-data-[ui-state=active]:border-2 group-data-[ui-state=active]:text-primary-500 group-data-[ui-state=active]:border-primary-500 group-data-[ui-state=complete]:bg-primary-500 group-data-[ui-state=disabled]:bg-gray-300">
                        {index + 1}
                      </span>
                      <span className="text-dark-blue-400 group-data-[ui-state=disabled]:text-gray-300 text-sm leading-[16.94px] font-semibold">
                        {displayLabel}
                      </span>
                    </span>

                    <Lock01 className="size-[18px] text-gray-300 shrink-0 group-data-[ui-state=disabled]:inline-block hidden" />
                  </Button>
                </TooltipTrigger>

                <TooltipContent className="max-w-[138px]">
                  {isActive
                    ? "Opened"
                    : isValid
                      ? "Click to open"
                      : "Please complete the current step first"}
                </TooltipContent>

                {isActive && (
                  <div className="pl-[25px]">
                    {label === "Project Info" &&
                      meta[label].map((field, i) => {
                        const isDirty = Boolean(
                          projectInfoMethods.formState.dirtyFields[field.name],
                        );
                        const hasError = hasProjectInfoFieldError(field.name);
                        const shouldShowStatus = hasError || isDirty;

                        return (
                          <div
                            className="py-1.5 flex items-center justify-between pl-[25px] pr-3"
                            key={i}
                          >
                            <span className="text-sm leading-6 text-gray-500">
                              {field.label}
                            </span>

                            {shouldShowStatus &&
                              (hasError ? (
                                <AlertCircle className="size-[22px] text-warning-500 shrink-0" />
                              ) : (
                                <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                                  <Check className="size-3 text-white" />
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    {label === "Media" &&
                      meta[label].map((field, i) => {
                        const isDirty = Boolean(
                          mediaMethods.formState.dirtyFields[field.name],
                        );
                        const hasError = hasMediaFieldError(field.name);
                        const shouldShowStatus = hasError || isDirty;

                        return (
                          <div
                            className="py-1.5 flex items-center justify-between pl-[25px] pr-3"
                            key={i}
                          >
                            <span className="text-sm leading-6 text-gray-500">
                              {field.label}
                            </span>

                            {shouldShowStatus &&
                              (hasError ? (
                                <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
                              ) : (
                                <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                                  <Check className="size-3 text-white" />
                                </div>
                              ))}
                          </div>
                        );
                      })}
                    {label === "Project Scope" &&
                      meta[label].map((field, i) => (
                        <div
                          className="py-1.5 flex items-center justify-between pl-[25px] pr-3"
                          key={i}
                        >
                          {field.label === "Task Name" ? (
                            <Button
                              variant="link"
                              visual="gray"
                              type="button"
                              className="text-sm font-normal leading-6 text-gray-500 hover:text-dark-blue-400 hover:no-underline"
                              onClick={() => setTaskSearchDialogOpen(true)}
                            >
                              {field.label}
                            </Button>
                          ) : (
                            <span className="text-sm leading-6 text-gray-500">
                              {field.label}
                            </span>
                          )}

                          {hasStartedScope ? (
                            (field.label === "Task Name" &&
                              pickFromProjectScopeSchema({
                                task: true,
                              }).safeParse(phases)) ||
                            (field.label === "Role" &&
                              pickFromProjectScopeSchema({
                                role: true,
                              }).safeParse(phases)) ||
                            (field.label === "Location" &&
                              pickFromProjectScopeSchema({
                                location: true,
                              }).safeParse(phases)) ||
                            (field.label === "Experience" &&
                              pickFromProjectScopeSchema({
                                experience: true,
                              }).safeParse(phases)) ||
                            (field.label === "Duration" &&
                              pickFromProjectScopeSchema({
                                duration: true,
                              }).safeParse(phases)) ? (
                              <div className="size-[18px] rounded-full inline-flex items-center justify-center shrink-0 bg-success-500">
                                <Check className="size-3 text-white" />
                              </div>
                            ) : (
                              <AlertCircle className="size-[18px] text-warning-500 shrink-0" />
                            )
                          ) : null}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </Tooltip>
          </TooltipProvider>
        );
      })}
      {jobCreationStepLabels.slice(stepsState.length).map((label, index) => (
        <TooltipProvider key={label}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                visual="gray"
                className="group h-auto justify-between gap-x-0 whitespace-normal rounded-md px-3 hover:bg-gray-100 disabled:pointer-events-auto disabled:opacity-100 disabled:hover:bg-transparent"
                data-ui-state="disabled"
                disabled
              >
                <span className="flex items-center gap-x-3">
                  <span className="text-sm leading-[16.94px] font-semibold size-[25px] rounded-full shrink-0 inline-flex justify-center items-center text-white group-data-[ui-state=disabled]:bg-gray-300">
                    {stepsState.length + index + 1}
                  </span>
                  <span className="text-dark-blue-400 group-data-[ui-state=disabled]:text-gray-300 text-sm leading-[16.94px] font-semibold">
                    {label}
                  </span>
                </span>

                <Lock01 className="size-[18px] text-gray-300 shrink-0 inline-block" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-[138px]">
              Please complete the current step first
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

const Header = ({ onSaveExit }: { onSaveExit?: () => void }) => {
  return (
    <div className="sticky top-0 flex h-[92px] items-center gap-x-12 border-b border-gray-200 bg-white px-[50px] py-4">
      <div className="flex h-[60px] flex-1 flex-col items-start justify-center gap-y-2">
        <h3 className="text-[24px] font-bold leading-8 text-dark-blue-400">
          Job Creation
        </h3>
        <p className="text-sm leading-5 text-dark-blue-400">
          We&apos;ll guide you through the steps to set up roles, add details,
          and get ready to hire.
        </p>
      </div>

      <IconButton
        aria-label="Close"
        className="size-8 shrink-0 p-0 text-gray-400"
        variant="ghost"
        visual="gray"
        onClick={onSaveExit}
      >
        <X className="size-8" />
      </IconButton>
    </div>
  );
};

const BottomBar = ({
  progressValue,
  onNextClick,
  workType,
  jobListingId,
  selectedHiringMode,
  scopeKnowledgeChoice,
  isNoScopeFlow,
  isExistingContractFlow,
  selectedExistingContractId,
}: {
  progressValue?: number;
  onNextClick?: () => boolean | Promise<boolean>;
  workType?: WorkTypeChoice;
  jobListingId?: string | null;
  selectedHiringMode?: HiringModeChoice;
  scopeKnowledgeChoice?: ScopeKnowledgeChoice;
  isNoScopeFlow?: boolean;
  isExistingContractFlow?: boolean;
  selectedExistingContractId?: string | null;
}) => {
  const router = useRouter();
  const { nextStep, prevStep, setStep } = useStepperContext();
  const { hasNextStep, hasPreviousStep, totalSteps, currentStep, stepsState } =
    useStepRootContext();

  const { isValid } = stepsState[currentStep];
  const { user } = useAuth();
  const { toast } = useToast();
  const projectInfoMethods = useProjectInfoContext();
  const mediaMethods = useMediaContext();
  const { details: jobListingDraftDetails } = useJobListingDraftContext();
  const { projectScopeMethods, setIsProjectSubmitted, setSubmissionOutcome } =
    useProjectScopeContext();
  const [phases] = projectScopeMethods;

  const handleSubmit = async () => {
    const projectInfo: ProjectInfoFormValues = projectInfoMethods.getValues();
    const media = mediaMethods.getValues();
    let createdProjectId: string | undefined;
    let createdProjectSlug: string | undefined;
    const reviewStartTimeMs = Date.now();
    const reviewDelayMs = 10 * 1000;
    const waitForReviewWindow = async () => {
      const elapsedMs = Date.now() - reviewStartTimeMs;
      const remainingMs = reviewDelayMs - elapsedMs;
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingMs));
      }
    };
    const isJobListingFlow =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/job-listing");

    if (isJobListingFlow) {
      try {
        let listingId = isExistingContractFlow ? null : jobListingId;
        if (!listingId) {
          const createResponse = await JobListingAPI.Create({
            contractType: isExistingContractFlow ? "existing" : "new",
            contractId: isExistingContractFlow
              ? resolveExistingContractApiId(selectedExistingContractId)
              : undefined,
            scopeKnowledge: getJobListingScopeKnowledge(
              workType,
              Boolean(isNoScopeFlow),
              scopeKnowledgeChoice,
            ),
            workType: getJobListingWorkType(workType),
            hiringType: getJobListingHiringType(selectedHiringMode),
          });
          listingId = String(createResponse?.data?.id ?? "");
        }

        if (!listingId) {
          throw new Error("Unable to create job listing draft");
        }

        if (
          typeof jobListingDraftDetails.budgetAmount === "number" &&
          jobListingDraftDetails.budgetAmount < 0
        ) {
          toast({
            title: NEGATIVE_BUDGET_ERROR,
            variant: "destructive",
          });
          return;
        }

        if (typeof window !== "undefined") {
          window.sessionStorage.setItem("marketeq-job-listing-id", listingId);
        }

        const title =
          projectInfo.title?.trim() ||
          projectInfo.shortDescription?.trim().slice(0, 100) ||
          "New Job Listing";

        await JobListingAPI.Update(listingId, {
          scopeKnowledge: getJobListingScopeKnowledge(
            workType,
            Boolean(isNoScopeFlow),
            scopeKnowledgeChoice,
          ),
          workType: getJobListingWorkType(workType),
          hiringType: getJobListingHiringType(selectedHiringMode),
          description:
            jobListingDraftDetails.description ||
            projectInfo.shortDescription?.trim() ||
            projectInfo.fullDescription?.trim() ||
            title,
          deliverables:
            jobListingDraftDetails.deliverables ||
            projectInfo.fullDescription?.trim() ||
            undefined,
          successCriteria: jobListingDraftDetails.successCriteria,
          headcount: jobListingDraftDetails.headcount,
          categorySelections: projectInfo.category ?? [],
          tags: projectInfo.tags ?? [],
          skills: projectInfo.skills ?? [],
          tools: jobListingDraftDetails.tools ?? [],
          media: buildJobListingMediaPayload(media),
          budgetAmount: jobListingDraftDetails.budgetAmount,
          budgetDisplayCurrency: user?.currency || "USD",
          budgetFrequency: jobListingDraftDetails.budgetFrequency ?? "per_week",
          durationMonths: jobListingDraftDetails.durationMonths,
          isOngoing: jobListingDraftDetails.isOngoing,
          briefR2Key: jobListingDraftDetails.briefR2Key,
          briefFilename: jobListingDraftDetails.briefFilename,
          briefSizeBytes: jobListingDraftDetails.briefSizeBytes,
          ndaEnabled: jobListingDraftDetails.ndaEnabled,
        });

        await JobListingAPI.UpdateBasicInformation(listingId, {
          title,
          jobType: workType ?? undefined,
          industries: projectInfo.industry ?? [],
          languages: projectInfo.languages ?? [],
        });

        if (phases?.length) {
          await replaceJobListingScope(listingId, phases);
        }

        const roleRows = getPublishRoleRowDetails(phases);
        if (roleRows.length > 0) {
          await JobListingAPI.ReplaceRoleRows(
            listingId,
            roleRows.map((row, positionOrder) => ({
              ...row,
              positionOrder,
            })),
          );
        }

        const publishResponse = await JobListingAPI.Publish(listingId);
        let publishedListing: any = null;
        try {
          const publishedListingResponse = await JobListingAPI.Get(listingId);
          publishedListing = publishedListingResponse?.data ?? null;
        } catch {
          publishedListing = null;
        }
        const publishedNdaDocumentId =
          typeof publishedListing?.ndaDocumentId === "string"
            ? publishedListing.ndaDocumentId
            : jobListingDraftDetails.ndaDocumentId;
        setSubmissionOutcome({
          status: "published",
          projectId: String(publishResponse?.data?.listingId ?? listingId),
          inviteBalance: Number(publishResponse?.data?.inviteBalance ?? 0),
          ndaDocumentId: publishedNdaDocumentId ?? null,
        });
        setIsProjectSubmitted(true);
      } catch (error: any) {
        const errorMessage =
          error?.response?.data?.message ||
          error?.response?.data?.details?.scope ||
          error?.message ||
          "Unable to publish job listing";
        setSubmissionOutcome(null);
        setIsProjectSubmitted(false);
        toast({
          title: Array.isArray(errorMessage)
            ? errorMessage.join(", ")
            : String(errorMessage),
          variant: "destructive",
        });
      }
      return;
    }

    const ensureCustomSubcategories = async () => {
      try {
        const response = await CategoryAPI.getTree();
        const nodes: CategoryTreeNode[] = Array.isArray(response?.data)
          ? response.data
          : [];
        const categoryNodesByName = indexCategoryTreeByName(nodes);
        const creations = new Map<
          string,
          { name: string; parentUuid?: string }
        >();

        (projectInfo.category ?? []).forEach((entry) => {
          const categoryName = entry?.category?.trim();
          if (!categoryName) return;

          const categoryNode = categoryNodesByName.get(categoryName);
          if (!categoryNode) return;

          const knownSubcategories = new Set(
            collectCategoryDescendants(categoryNode).map((node) =>
              node.name.trim().toLowerCase(),
            ),
          );

          (entry.subCategories ?? []).forEach((subCategory) => {
            const trimmedSubCategory = subCategory.trim();
            if (!trimmedSubCategory) return;

            if (knownSubcategories.has(trimmedSubCategory.toLowerCase())) {
              return;
            }

            creations.set(
              `${categoryNode.uuid}:${trimmedSubCategory.toLowerCase()}`,
              {
                name: trimmedSubCategory,
                parentUuid: categoryNode.uuid,
              },
            );
          });
        });

        for (const creation of creations.values()) {
          await ProjectAPI.CreateModeratedSubcategory(creation);
        }
      } catch (error) {
        // Keep project publishing functional even when category sync is unavailable.
      }
    };

    // Show "submitted for review" state immediately while validation/publish APIs run.
    setSubmissionOutcome({ status: "in_review" });
    setIsProjectSubmitted(true);

    await ensureCustomSubcategories();

    const payload: CreateProjectType = {
      ...buildProjectDraftPayload(projectInfo),
      userId: user?.id ?? "",
    };

    try {
      const projectIdFromUrl =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("draftId")
          : null;
      let projectId =
        projectIdFromUrl && UUID_PATTERN.test(projectIdFromUrl)
          ? projectIdFromUrl
          : null;
      let createProjectResponse;

      if (projectId) {
        createProjectResponse = await ProjectAPI.UpdateProjectDraft(
          projectId,
          payload,
        );
      } else {
        createProjectResponse = await ProjectAPI.CreateProjectDraft(payload);
        projectId =
          createProjectResponse?.data?.projectId ??
          createProjectResponse?.data?.id;
        if (projectId && typeof window !== "undefined") {
          const urlParams = new URLSearchParams(window.location.search);
          const type = urlParams.get("type") ?? "project";
          const nextPath = isJobListingFlow
            ? "/job-listing"
            : "/publish-project";
          window.history.replaceState(
            window.history.state,
            "",
            `${nextPath}?type=${encodeURIComponent(type)}&draftId=${encodeURIComponent(
              String(projectId),
            )}`,
          );
        }
      }

      createdProjectId = projectId ? String(projectId) : undefined;
      createdProjectSlug = createProjectResponse?.data?.slug;

      // 2. Upload media after project draft is saved
      let mediaUploadSuccess = true;
      let mediaUploadErrorMsg = "";
      if (projectId) {
        const featuredFile = media.featuredImages?.[0]?.meta;
        const additionalFiles =
          media.additionalImages
            ?.flat()
            ?.map((item) => item?.meta)
            ?.filter(Boolean) ?? [];
        const videoUrl = media.featuredVideo
          ?.trim()
          .replace(/^(https?:\/\/)+/i, "https://");

        if (featuredFile || additionalFiles.length || videoUrl) {
          const formData = new FormData();
          formData.append("projectId", String(projectId));
          const uniqueFeatured = await resolveMediaFileForUpload(
            featuredFile,
            "featured-image.jpg",
          );
          if (uniqueFeatured) {
            formData.append("featuredImage", uniqueFeatured);
          }
          for (const file of additionalFiles) {
            const uniqueAdditional = await resolveMediaFileForUpload(
              file,
              "additional-image.jpg",
            );
            if (uniqueAdditional) {
              formData.append("additionalImages", uniqueAdditional);
            }
          }
          if (videoUrl) {
            formData.append("videoUrl", videoUrl);
          }
          try {
            await ProjectAPI.UploadMedia(formData);
          } catch (error: any) {
            mediaUploadSuccess = false;
            mediaUploadErrorMsg =
              error?.response?.data?.reason ||
              error?.response?.data?.message ||
              error?.message ||
              "Media upload failed. Please check your files.";
            const errorType = classifyPublishError({
              message: mediaUploadErrorMsg,
              statusCode: error?.response?.status,
              status: error?.response?.data?.status,
            });

            if (errorType === "temporary_unavailable") {
              toast({
                title:
                  mediaUploadErrorMsg ||
                  "Media upload is temporarily unavailable. Please try again.",
                variant: "destructive",
              });
              return;
            }
          }
        }
      }

      // 3. If media upload failed, set project to needs_update and show re-upload option
      if (!mediaUploadSuccess) {
        const errorType = classifyPublishError({
          message: mediaUploadErrorMsg,
        });
        const isVideoViolation = errorType === "video_rejection";
        const isImageViolation = errorType === "image_rejection";
        const isContentModerationRejection = errorType === "content_rejection";

        if (
          !isVideoViolation &&
          !isImageViolation &&
          !isContentModerationRejection
        ) {
          toast({
            title:
              mediaUploadErrorMsg || "Media upload failed. Please try again.",
            variant: "destructive",
          });
          return;
        }

        setSubmissionOutcome({
          status: "needs_update",
          projectId: projectId ? String(projectId) : undefined,
          projectSlug: createProjectResponse?.data?.slug,
        });
        setIsProjectSubmitted(true);
        toast({
          title: isVideoViolation
            ? `Project rejected: video violated moderation policy. ${mediaUploadErrorMsg}`
            : isImageViolation
              ? `Project rejected: image violated moderation policy. ${mediaUploadErrorMsg}`
              : `Project rejected: content did not meet community guidelines. ${mediaUploadErrorMsg}`,
          variant: "destructive",
        });
        return;
      }

      // 4. Replace the saved project scope before publish
      if (projectId) {
        const publishPhases = (phases ?? [])
          .map((phase, phaseIndex) => {
            const phaseName = phase?.phaseName?.trim();
            const rows = (phase?.rows ?? [])
              .map((row) => {
                const taskName = row?.task?.trim();
                const role = row?.role?.trim();
                const locationValue = row?.location?.trim();
                const experienceLevel = row?.experience?.trim();
                const durationValue = row?.duration?.value;
                const durationType = row?.duration?.type;

                if (
                  !taskName ||
                  !role ||
                  !locationValue ||
                  !experienceLevel ||
                  durationValue === undefined ||
                  !durationType
                ) {
                  return null;
                }

                return {
                  taskName,
                  role,
                  location: [locationValue],
                  experience: [experienceLevel],
                  experienceLevel,
                  duration: `${durationValue} ${formatDurationUnit(
                    durationValue,
                    durationType,
                  )}`,
                  phaseId: "temporary-required-string",
                };
              })
              .filter((row): row is NonNullable<typeof row> => Boolean(row));

            if (!phaseName || rows.length === 0) {
              return null;
            }

            const { startDay, endDay } = getPhaseDayRange(
              phases ?? [],
              phaseIndex,
            );
            if (typeof endDay !== "number") {
              return null;
            }

            return {
              name: phaseName,
              stageName: `Stage ${phaseIndex + 1}`,
              startDay,
              endDay,
              order: phaseIndex + 1,
              projectId: String(projectId),
              tasks: rows,
            };
          })
          .filter((phase): phase is NonNullable<typeof phase> =>
            Boolean(phase),
          );

        await ProjectAPI.ReplaceProjectScope(String(projectId), publishPhases);
      }

      if (projectId) {
        if (isJobListingFlow && !media.featuredImages?.[0]?.meta) {
          await waitForReviewWindow();
          setSubmissionOutcome({
            status: "published",
            projectId: String(projectId),
            projectSlug: createdProjectSlug,
          });
          setIsProjectSubmitted(true);
          return;
        }

        let publishResponse = await ProjectAPI.PublishProject(
          String(projectId),
        );
        let rawStatus = String(publishResponse?.data?.status ?? "")
          .trim()
          .toLowerCase();
        await waitForReviewWindow();

        // Prevent getting stuck on review UI: retry once after the review window.
        if (
          rawStatus === "pending_review" ||
          rawStatus === "in_review" ||
          rawStatus === ""
        ) {
          try {
            publishResponse = await ProjectAPI.PublishProject(
              String(projectId),
            );
            rawStatus = String(publishResponse?.data?.status ?? "")
              .trim()
              .toLowerCase();
          } catch {
            rawStatus = "in_review";
          }
        }

        const normalizedStatus: SubmissionStatus =
          rawStatus === "approved" || rawStatus === "published"
            ? "published"
            : rawStatus === "rejected" || rawStatus === "needs_update"
              ? "needs_update"
              : "in_review";

        setSubmissionOutcome({
          status: normalizedStatus,
          projectId: String(projectId),
          projectSlug: publishResponse?.data?.slug ?? createdProjectSlug,
        });
        setIsProjectSubmitted(true);
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.reason ||
        error?.response?.data?.message ||
        error?.message ||
        "Unable to submit project";
      const errorType = classifyPublishError({
        message: errorMessage,
        statusCode: error?.response?.status,
        status: error?.response?.data?.status,
      });
      const isVideoViolation = errorType === "video_rejection";
      const isImageViolation = errorType === "image_rejection";
      const isContentModerationRejection = errorType === "content_rejection";

      if (
        isVideoViolation ||
        isImageViolation ||
        isContentModerationRejection
      ) {
        await waitForReviewWindow();
        setSubmissionOutcome({
          status: "needs_update",
          projectId: createdProjectId,
          projectSlug: createdProjectSlug,
        });
        setIsProjectSubmitted(true);
      } else {
        setSubmissionOutcome(null);
        setIsProjectSubmitted(false);
      }

      toast({
        title: isVideoViolation
          ? `Project rejected: video violated moderation policy. ${errorMessage}`
          : isImageViolation
            ? `Project rejected: image violated moderation policy. ${errorMessage}`
            : isContentModerationRejection
              ? `Project rejected: content did not meet community guidelines. ${errorMessage}`
              : errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed right-0 bottom-0 left-0 z-40 h-[84px] bg-white">
      <div className="h-2 w-full bg-gray-200">
        <div
          className="h-2 rounded-[4px] bg-primary-500"
          style={{
            width:
              typeof progressValue === "number"
                ? `${Math.max(0, Math.min(100, progressValue))}%`
                : "0%",
          }}
        />
      </div>
      <div className="flex h-[76px] items-center justify-between border-b border-gray-200 px-[50px] py-4">
        <div className="flex w-[120px] justify-center">
          {currentStep > 0 ? (
            <Button
              className="h-11 rounded-[44px] px-6 text-lg leading-7 font-semibold text-black"
              disabled={!hasPreviousStep}
              variant="outlined"
              visual="gray"
              onClick={() => {
                if (hasPreviousStep) {
                  prevStep();
                }
              }}
            >
              Go Back
            </Button>
          ) : null}
        </div>

        <span className="w-[84px] whitespace-nowrap text-center text-base leading-6 font-semibold text-gray-800">
          Step {currentStep + 1} of 5
        </span>

        <div className="flex w-[128px] justify-center">
          {hasNextStep ? (
            <Button
              className={cn(
                "h-11 w-32 rounded-[44px] px-6 py-2.5 text-lg leading-7 font-semibold",
                !isValid && "opacity-50",
              )}
              disabled={currentStep !== 0 && !isValid}
              onClick={async () => {
                if (isValid) {
                  const canAdvance = await onNextClick?.();
                  if (canAdvance === false) return;
                  nextStep();
                } else {
                  await onNextClick?.(); // show errors on the current step
                }
              }}
            >
              Continue
            </Button>
          ) : (
            <Button
              className="h-11 rounded-[44px] px-6 opacity-50"
              disabled={!isValid}
              onClick={() => {
                handleSubmit();
              }}
            >
              Publish
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

const ProjectInfoTip = ({
  closeTrigger,
  className,
  variant = "scope",
  source = "project",
}: {
  closeTrigger?: React.ReactNode;
  showArrow?: boolean;
  className?: string;
  source?: "project" | "service" | "roles";
  variant?:
    | "scope"
    | "contract"
    | "describeProjectStep"
    | "describeServiceStep"
    | "reviewToolsTechnologiesStep";
}) => {
  const isContractTip = variant === "contract";
  const isDescribeProjectStepTip = variant === "describeProjectStep";
  const isDescribeServiceStepTip = variant === "describeServiceStep";
  const isReviewToolsTechnologiesStepTip =
    variant === "reviewToolsTechnologiesStep";
  return (
    <div
      className={cn(
        isDescribeProjectStepTip ||
          isDescribeServiceStepTip ||
          isReviewToolsTechnologiesStepTip
          ? "flex w-[322px] flex-col items-start gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
          : "flex w-[322px] flex-col items-start gap-y-4 p-5 rounded-lg bg-white border border-gray-200 relative shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]",
        (isDescribeServiceStepTip || isReviewToolsTechnologiesStepTip) &&
          "shadow-[0px_2px_5px_0px_rgba(0,0,0,.04)]",
        isContractTip
          ? "h-[288px]"
          : isDescribeServiceStepTip
            ? "h-80"
            : isDescribeProjectStepTip
            ? "h-[260px]"
            : isReviewToolsTechnologiesStepTip
            ? "h-[228px]"
            : "h-[252px]",
        className,
      )}
    >
      {closeTrigger}

      {isReviewToolsTechnologiesStepTip ? (
        <>
          <div className="flex h-6 w-[282px] items-start justify-between gap-2">
            <span className="h-6 flex-1 rounded text-base leading-6 font-semibold text-gray-400">
              Quick tip
            </span>
            <Lightbulb03 className="size-5 shrink-0 text-gray-400" />
          </div>
          <div className="flex h-[148px] w-[282px] flex-col items-start gap-2">
            <span className="h-14 w-full text-lg leading-7 font-semibold text-dark-blue-400">
              Edit tools and technologies to tailor it to your{" "}
              {source === "roles"
                ? "job"
                : source === "service"
                  ? "service"
                  : "project"}
            </span>
            <ul className="h-[84px] w-full space-y-1">
              {[
                "Remove any tools and technologies you don’t need.",
                "Add missing frameworks, languages, or services that are essential.",
              ].map((item, index) => (
                <li className="flex items-start gap-x-3" key={item}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-dark-blue-400" />
                  <span className="text-sm leading-5 font-normal text-dark-blue-400">
                    {index === 0 ? (
                      <>
                        Remove any tools and technologies
                        <br />
                        you don’t need.
                      </>
                    ) : (
                      item
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : isDescribeProjectStepTip || isDescribeServiceStepTip ? (
        <>
          <div className="flex h-6 w-full items-center justify-between gap-x-2">
            <span className="flex h-6 flex-1 items-center text-base font-semibold leading-6 text-gray-400">
              Quick tip
            </span>
            <Lightbulb03 className="size-5 shrink-0 text-gray-400" />
          </div>
          <div className="flex w-[282px] flex-col items-start gap-2">
            <span className="w-full text-[18px] font-semibold leading-7 text-dark-blue-400">
              {isDescribeServiceStepTip
                ? "Help us understand your service needs"
                : "Give us a few details now to save time later:"}
            </span>
            <ul className="w-full space-y-1">
              {(isDescribeServiceStepTip
                ? [
                    "What kind of work should be done regularly",
                    "How often help is needed (e.g. weekly, monthly)",
                    "Any tools, platforms, or skills required",
                    "What success looks like in this service",
                    "Any existing systems or workflows to support",
                  ]
                : [
                    "What the project is about",
                    "What needs to be done",
                    "How it should be done",
                    "What the end result should look like",
                    "Any tools or skills that are important",
                  ]
              ).map((item) => (
                <li key={item} className="flex items-start gap-x-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-dark-blue-400" />
                  <span className="text-sm leading-5 text-dark-blue-400">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          <div className="flex h-6 w-full items-start justify-between gap-x-2">
            <span className="h-6 flex-1 rounded text-base leading-6 font-semibold text-gray-400">
              Quick tip
            </span>
            <Lightbulb03 className="size-5 shrink-0 text-gray-400" />
          </div>
          <div
            className={cn(
              "flex flex-col items-start",
              isContractTip ? "h-52 w-full gap-y-2" : "h-[172px] w-full gap-y-2",
            )}
          >
            <span
              className={cn(
                "font-semibold text-dark-blue-400",
                "h-14 w-full text-lg leading-7",
              )}
            >
              {isContractTip
                ? "Not sure which option to choose?"
                : "What does having a scope mean?"}
            </span>

            <div
              className={cn(
                "w-full space-y-1",
                isContractTip ? "h-36" : "h-[108px]",
              )}
            >
              {(isContractTip
                ? [
                    <>
                      If you want to start a{" "}
                      <strong>new service or project</strong> and create jobs
                      under it, choose <strong>Create new contract</strong>
                    </>,
                    <>
                      If you want to{" "}
                      <strong>add more jobs to a project or service</strong>{" "}
                      you&apos;ve already started, choose{" "}
                      <strong>Add to existing contract</strong>
                    </>,
                  ]
                : [
                    "You know which roles you need",
                    "You can outline key tasks or responsibilities",
                    "You have clear deliverables or goals in mind",
                  ]
              ).map((item, index) => (
                <div className="flex items-start gap-x-3" key={index}>
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-dark-blue-400" />
                  <span className="text-sm leading-5 text-dark-blue-400">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const projectInfoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Please enter a project title")
    .regex(
      /^[A-Za-z0-9 -]+$/,
      "Title can only contain letters, numbers, spaces, and hyphens.",
    )
    .min(10, "Please enter at least 10 character(s)")
    .max(100, "Please do not enter more than 100 character(s)"),
  category: z
    .array(
      z
        .object({
          category: z.string().default(""),
          subCategories: z
            .array(z.string())
            .max(5, "You can add a maximum of five (5) sub categories"),
        })
        .superRefine((value, ctx) => {
          const selectedCategory = value.category.trim();
          const selectedSubCategories = value.subCategories.filter(
            (subCategory) => subCategory.trim(),
          );

          if (!selectedCategory) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["category"],
              message: "Please select a category",
            });
            return;
          }

          if (!selectedSubCategories.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["subCategories"],
              message:
                "Please select at least 1 sub-category for this category",
            });
          }
        }),
    )
    .length(3, "Please select all required categories"),
  industry: z
    .array(z.string(), {
      required_error: "Please enter/select at least 1 industry(s)",
    })
    .min(1, "Please enter at least 1 industry(s)")
    .max(5, "Please do not enter more than 5 industry(s)"),
  languages: z.array(z.string()).max(10).default([]),
  shortDescription: z
    .string()
    .min(50, "Please enter at least 50 character(s)")
    .max(300, "Please do not enter more than 300 character(s)"),
  fullDescription: z.string().superRefine((value, ctx) => {
    const contentLength = getRichTextCharacterCount(value);

    if (contentLength < 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_small,
        minimum: 100,
        type: "string",
        inclusive: true,
        message: "Please enter at least 100 character(s)",
      });
    }

    if (contentLength > FULL_DESCRIPTION_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: FULL_DESCRIPTION_MAX_LENGTH,
        type: "string",
        inclusive: true,
        message: "Please do not enter more than 5,000 character(s)",
      });
    }
  }),
  tags: z
    .array(z.string(), {
      required_error: "Please add at least three tags",
    })
    .min(3, "Please add at least three tags")
    .max(10, "Please do not enter/select more than 10 tag(s)"),
  skills: z
    .array(z.string(), {
      required_error: "Please enter/select at least 1 skill(s)",
    })
    .min(1, "Please enter/select at least 1 skill(s)")
    .max(10, "Please do not enter/select more than 10 tag(s)"),
});

type ProjectInfoFormValues = z.infer<typeof projectInfoSchema>;

type JobListingDraftDetails = {
  jobListingId?: string;
  description?: string;
  deliverables?: string;
  successCriteria?: string;
  headcount?: number;
  budgetAmount?: number;
  budgetFrequency?: "per_week" | "per_month";
  durationMonths?: number;
  isOngoing?: boolean;
  briefR2Key?: string;
  briefFilename?: string;
  briefSizeBytes?: number;
  tools?: string[];
  ndaEnabled?: boolean;
  ndaDocumentId?: string | null;
  teamRoleRows?: TeamRoleRow[];
};

const PROJECT_INFO_PROGRESS_FIELDS: Array<keyof ProjectInfoFormValues> = [
  "title",
  "category",
  "industry",
  "shortDescription",
  "fullDescription",
  "tags",
  "skills",
];

const PROJECT_INFO_VALIDATION_TARGETS: Array<{
  name: FieldPath<ProjectInfoFormValues>;
  targetId: string;
}> = [
  { name: "title", targetId: "publish-project-title-field" },
  { name: "category.0.category", targetId: "publish-project-category-field" },
  {
    name: "category.0.subCategories",
    targetId: "publish-project-category-field",
  },
  { name: "category.1.category", targetId: "publish-project-category-field" },
  {
    name: "category.1.subCategories",
    targetId: "publish-project-category-field",
  },
  { name: "category.2.category", targetId: "publish-project-category-field" },
  {
    name: "category.2.subCategories",
    targetId: "publish-project-category-field",
  },
  { name: "industry", targetId: "publish-project-industry-field" },
  {
    name: "shortDescription",
    targetId: "publish-project-short-description-field",
  },
  {
    name: "fullDescription",
    targetId: "publish-project-full-description-field",
  },
  { name: "tags", targetId: "publish-project-tags-field" },
  { name: "skills", targetId: "publish-project-skills-field" },
];

const scrollToPublishField = (targetId: string) => {
  if (typeof window === "undefined") return;

  window.requestAnimationFrame(() => {
    document.getElementById(targetId)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  });
};

const TITLE_MAX_LENGTH = 100;
const SHORT_DESCRIPTION_MAX_LENGTH = 300;
const FULL_DESCRIPTION_MAX_LENGTH = 5000;

const resolveExistingContractApiId = (contractId?: string | null) => {
  if (!contractId) return undefined;
  return UUID_PATTERN.test(contractId) ? contractId : undefined;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const toUsdAmountFromCents = (value: unknown): number | undefined => {
  const cents = toFiniteNumber(value);
  return typeof cents === "number" ? cents / 100 : undefined;
};

const toNullableString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const getResponsePayload = (response: any) => {
  const data = response?.data ?? {};
  if (
    data &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    data.data &&
    typeof data.data === "object" &&
    !Array.isArray(data.data) &&
    !("id" in data)
  ) {
    return data.data;
  }

  return data;
};

const getPublishRoleRows = (phases: Phase[] | undefined) => {
  const roles = new Map<string, string>();

  (phases ?? []).forEach((phase) => {
    (phase.rows ?? []).forEach((row) => {
      const role = row.role?.trim();
      if (role && !roles.has(role.toLowerCase())) {
        roles.set(role.toLowerCase(), role);
      }
    });
  });

  return Array.from(roles.values());
};

const parseMonthCount = (value?: string) => {
  const match = value?.match(/(\d+)/);
  return match ? Number(match[1]) : undefined;
};

const parseHourlyEstimateCents = (value?: string) => {
  const amounts = (value?.match(/\d+(?:\.\d+)?/g) ?? [])
    .map((item) => Math.round(Number(item) * 100))
    .filter((amount) => Number.isFinite(amount));

  return {
    low: amounts[0],
    high: amounts[1] ?? amounts[0],
  };
};

const getTeamRoleWeeklyHours = (schedule: TeamRoleRow["schedule"]) =>
  schedule === "Part-time" ? 20 : 40;

const getTeamRoleAverageHourlyRateCents = (estimate?: string) => {
  const { low, high } = parseHourlyEstimateCents(estimate);
  if (typeof low !== "number") return 0;

  return Math.round((low + (high ?? low)) / 2);
};

const getTeamRolesEstimatedBudget = (rows: TeamRoleRow[]) =>
  rows.reduce((totalCents, row) => {
    const monthlyWeeks = 4.33;
    const contractLengthMonths = parseMonthCount(row.length) ?? 0;
    const hourlyRateCents = getTeamRoleAverageHourlyRateCents(row.estimate);

    return (
      totalCents +
      getTeamRoleWeeklyHours(row.schedule) *
        contractLengthMonths *
        monthlyWeeks *
        hourlyRateCents
    );
  }, 0);

const formatUsdFromCents = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value / 100));

const getPublishRoleRowDetails = (phases: Phase[] | undefined) => {
  const rows = new Map<
    string,
    {
      role: string;
      location?: string;
      experienceLevel?: string;
      workSchedule?: JobListingWorkSchedule;
      customHours?: number;
      customFrequency?: string;
      contractLengthMonths?: number;
      hourlyRateLowUsdCents?: number;
      hourlyRateHighUsdCents?: number;
    }
  >();

  (phases ?? []).forEach((phase) => {
    (phase.rows ?? []).forEach((row) => {
      const role = row.role?.trim();
      if (!role || rows.has(role.toLowerCase())) return;

      rows.set(role.toLowerCase(), {
        role,
        location: row.location?.trim() || undefined,
        experienceLevel: row.experience?.trim() || undefined,
        workSchedule: row.workSchedule ?? "full_time",
        customHours:
          row.workSchedule === "custom" ? row.customHours : undefined,
        customFrequency:
          row.workSchedule === "custom" ? row.customFrequency : undefined,
        contractLengthMonths: row.contractLengthMonths,
        hourlyRateLowUsdCents: row.hourlyRateLowUsdCents,
        hourlyRateHighUsdCents: row.hourlyRateHighUsdCents,
      });
    });
  });

  return Array.from(rows.values());
};

const getScopeRoleOptions = (phases: Phase[] | undefined) => {
  const roles = getPublishRoleRows(phases);
  return roles.length > 0 ? roles : finalReviewRoles;
};

const buildJobListingMediaPayload = (mediaValues: Partial<MediaFormValues>) => {
  const featuredMeta = mediaValues.featuredImages?.[0]?.meta;
  const additionalMeta =
    mediaValues.additionalImages
      ?.flat()
      .map((item) => item?.meta)
      .filter(Boolean) ?? [];
  const featuredImageUrl = isPersistedMediaFile(featuredMeta)
    ? featuredMeta.__persistedUrl
    : undefined;
  const additionalImageUrls = additionalMeta
    .map((item: any) =>
      isPersistedMediaFile(item) ? item.__persistedUrl : undefined,
    )
    .filter((url): url is string => Boolean(url));
  const featuredImageName = featuredMeta?.name ?? undefined;
  const additionalImageNames = additionalMeta
    .map((item: any) => item?.name)
    .filter((name): name is string => Boolean(name));

  return {
    featuredImage: featuredImageUrl,
    featuredImageName,
    additionalImages: additionalImageUrls,
    additionalImageNames,
    featuredVideo: mediaValues.featuredVideo?.trim() ?? "",
  };
};
const TITLE_MAX_LENGTH_ERROR = "Please do not enter more than 100 character(s)";
const SHORT_DESCRIPTION_MAX_LENGTH_ERROR =
  "Please do not enter more than 300 character(s)";
const FULL_DESCRIPTION_MAX_LENGTH_ERROR =
  "Please do not enter more than 5,000 character(s)";

const FALLBACK_CATEGORY_OPTIONS = [
  "Web Development",
  "Mobile Development",
  "UI/UX Design",
  "Graphic Design",
  "Software Engineering",
  "Product Design",
  "Frontend Development",
  "Backend Development",
  "Data Science",
  "Artificial Intelligence",
  "Cloud Computing",
  "Cybersecurity",
];

const MAX_SUBCATEGORIES_PER_CATEGORY = 5;
const SUBCATEGORY_LIMIT_ERROR =
  "You can add a maximum of five (5) sub categories";

const FALLBACK_SUBCATEGORY_OPTIONS = options.value;
const FALLBACK_INDUSTRY_OPTIONS = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Retail",
  "Manufacturing",
  "Media",
  "Real Estate",
  "Energy",
  "Transportation",
];
const FALLBACK_LANGUAGE_OPTIONS = [
  "English",
  "Spanish",
  "Japanese",
  "French",
  "German",
  "Portuguese",
  "Hindi",
  "Mandarin",
  "Arabic",
  "Korean",
];
const FALLBACK_TAG_OPTIONS = [
  "Web App",
  "Mobile App",
  "AI",
  "Blockchain",
  "UI/UX",
  "SaaS",
  "Analytics",
  "Security",
  "E-commerce",
  "Automation",
];
const FALLBACK_SKILL_OPTIONS = [
  "Node.js",
  "JavaScript",
  "Wireframing",
  "React",
  "TypeScript",
  "Figma",
  "SQL",
  "Python",
  "UX Research",
  "API Integration",
];

const normalizeAutocompleteLabel = (item: AutocompleteTypeSuggestion) => {
  if ("value" in item && typeof item.value === "string") return item.value;
  if ("label" in item && typeof item.label === "string") return item.label;
  return "";
};

const getUniqueOptions = (values: string[]) =>
  Array.from(
    new Set(
      values.map((value) => value.trim()).filter((value) => value.length),
    ),
  );

type SuggestedCategoryOption = {
  category: string;
  subCategory: string;
};

const DEFAULT_SUGGESTED_CATEGORIES: SuggestedCategoryOption[] = [
  { category: "Design", subCategory: "UI/UX Design" },
  { category: "Development", subCategory: "Mobile App" },
  { category: "Data Science", subCategory: "Machine Learning" },
];

const isActiveCategoryNode = (node: CategoryTreeNode) => node.approved;

const collectCategoryDescendants = (
  node?: CategoryTreeNode,
): CategoryTreeNode[] => {
  if (!node?.children?.length) return [];

  return node.children.flatMap((child) => {
    const descendants = collectCategoryDescendants(child);
    return isActiveCategoryNode(child) ? [child, ...descendants] : descendants;
  });
};

const collectSelectableCategories = (nodes: CategoryTreeNode[]) => {
  const secondLevelNodes = nodes.flatMap((node) =>
    (node.children ?? []).filter(isActiveCategoryNode),
  );

  return getIsNotEmpty(secondLevelNodes)
    ? secondLevelNodes
    : nodes.filter(isActiveCategoryNode);
};

const findSuggestedSubCategory = (node?: CategoryTreeNode): string | null => {
  const [firstDescendant] = collectCategoryDescendants(node);
  return firstDescendant?.name ?? null;
};

const indexCategoryTreeByName = (nodes: CategoryTreeNode[]) => {
  const index = new Map<string, CategoryTreeNode>();

  const visit = (entries: CategoryTreeNode[]) => {
    entries.forEach((entry) => {
      if (isActiveCategoryNode(entry)) {
        index.set(entry.name, entry);
      }
      if (entry.children?.length) {
        visit(entry.children);
      }
    });
  };

  visit(nodes);
  return index;
};
type ProjectInfoProps = {
  setProgress?: (val: number) => void;
  selectedWorkType?: WorkTypeChoice;
  onSelectedWorkTypeChange?: (value: WorkTypeChoice) => void;
  selectedHiringMode?: HiringModeChoice;
  onSelectedHiringModeChange?: (value: HiringModeChoice) => void;
  scopeKnowledgeChoice?: ScopeKnowledgeChoice;
  isNoScopeFlow?: boolean;
  isExistingContractFlow?: boolean;
  selectedExistingContractId?: string | null;
  isWorkflowLocked?: boolean;
  onScopeKnowledgeChange?: (value: ScopeKnowledgeChoice) => void;
  onNoScopeFlowChange?: (value: boolean) => void;
  onExistingContractFlowChange?: (value: boolean) => void;
  onExistingContractSelectionChange?: (value: string | null) => void;
};

const ProjectInfo = ({
  setProgress,
  selectedWorkType,
  onSelectedWorkTypeChange,
  selectedHiringMode,
  onSelectedHiringModeChange,
  scopeKnowledgeChoice,
  isNoScopeFlow,
  isExistingContractFlow,
  selectedExistingContractId,
  isWorkflowLocked = false,
  onScopeKnowledgeChange,
  onNoScopeFlowChange,
  onExistingContractFlowChange,
  onExistingContractSelectionChange,
}: ProjectInfoProps) => {
  const { user } = useAuth();
  const { toggleValidation } = useStepContext();
  const methods = useProjectInfoContext();
  const {
    formState: { errors },
    setValue,
    trigger,
  } = methods;

  const [suggested, setSuggested] = useState<SuggestedCategoryOption[]>(
    DEFAULT_SUGGESTED_CATEGORIES,
  );

  const [showSuggestions] = useState(true);
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(
    FALLBACK_CATEGORY_OPTIONS,
  );
  const [subCategoryOptions, setSubCategoryOptions] = useState<string[]>([]);
  const [industryOptions, setIndustryOptions] = useState<string[]>(
    FALLBACK_INDUSTRY_OPTIONS,
  );
  const [languageOptions, setLanguageOptions] = useState<string[]>(
    FALLBACK_LANGUAGE_OPTIONS,
  );
  const [tagOptions, setTagOptions] = useState<string[]>(FALLBACK_TAG_OPTIONS);
  const [skills, setSkills] = useState<string[]>(FALLBACK_SKILL_OPTIONS);
  const [suggestedSkillOptions] = useState<string[]>(FALLBACK_SKILL_OPTIONS);
  const categoryRequestRef = useRef(0);
  const categoryDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const typeRequestRef = useRef(0);
  const typeDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const onSubmit: SubmitHandler<ProjectInfoFormValues> = (values) => {};
  const projectInfoValues = useWatch({ control: methods.control });
  const [contractChoice, setContractChoice] = useState<
    "new" | "existing" | null
  >(null);
  const [scopeChoice, setScopeChoice] = useState<
    "known" | "unknown" | "none" | null
  >(null);
  const [localWorkTypeChoice, setLocalWorkTypeChoice] =
    useState<WorkTypeChoice>(null);
  const workTypeChoice = selectedWorkType ?? localWorkTypeChoice;
  const [localHiringModeChoice, setLocalHiringModeChoice] =
    useState<HiringModeChoice>(null);
  const hiringModeChoice = selectedHiringMode ?? localHiringModeChoice;
  const setWorkTypeChoice = useCallback(
    (value: WorkTypeChoice) => {
      setLocalWorkTypeChoice(value);
      onSelectedWorkTypeChange?.(value);
    },
    [onSelectedWorkTypeChange],
  );
  const setHiringModeChoice = useCallback(
    (value: HiringModeChoice) => {
      setLocalHiringModeChoice(value);
      onSelectedHiringModeChange?.(value);
    },
    [onSelectedHiringModeChange],
  );
  const [selectedExistingListing, setSelectedExistingListing] = useState<
    string | null
  >(null);
  const [contractSearchValue, setContractSearchValue] = useState("");
  const [apiExistingListingOptions, setApiExistingListingOptions] = useState<
    ExistingListingOption[]
  >([]);
  const foundationIsValid =
    contractChoice === "existing"
      ? Boolean(selectedExistingListing)
      : scopeChoice === "none"
        ? Boolean(contractChoice && hiringModeChoice)
        : Boolean(contractChoice && scopeChoice && workTypeChoice);
  const isProjectInfoValid =
    projectInfoSchema.safeParse(projectInfoValues).success;

  useEffect(() => {
    if (!isWorkflowLocked || isExistingContractFlow === undefined) return;

    setContractChoice(isExistingContractFlow ? "existing" : "new");
    setSelectedExistingListing(selectedExistingContractId ?? null);

    if (isExistingContractFlow) {
      setScopeChoice(null);
    } else if (isNoScopeFlow) {
      setScopeChoice("none");
    } else if (
      scopeKnowledgeChoice === "known" ||
      scopeKnowledgeChoice === "unknown"
    ) {
      setScopeChoice(scopeKnowledgeChoice);
    }
  }, [
    isExistingContractFlow,
    isNoScopeFlow,
    scopeKnowledgeChoice,
    selectedExistingContractId,
  ]);

  useIsomorphicLayoutEffect(() => {
    toggleValidation(foundationIsValid);
  }, [foundationIsValid]);
  const categoryValues = useWatch({
    control: methods.control,
    name: "category",
  });
  const categoryNodesByName = useMemo(() => {
    return indexCategoryTreeByName(categoryTree);
  }, [categoryTree]);
  const getSubCategoryOptionsForCategory = useCallback(
    (categoryName?: string, query = "") => {
      if (!categoryName) return [];

      const normalizedQuery = query.trim().toLowerCase();
      const activeNode = categoryNodesByName.get(categoryName);
      const sourceNodes = activeNode
        ? collectCategoryDescendants(activeNode)
        : [];

      return getUniqueOptions(
        sourceNodes
          .map((node) => node.name)
          .filter((name) =>
            normalizedQuery
              ? name.toLowerCase().includes(normalizedQuery)
              : true,
          ),
      );
    },
    [categoryNodesByName, categoryTree],
  );
  const handleSubCategoryChange = useCallback(
    (
      fieldName: `category.${0 | 1 | 2}.subCategories`,
      onChange: (value: string[]) => void,
    ) =>
      (details: { value: string[] }) => {
        if (details.value.length > MAX_SUBCATEGORIES_PER_CATEGORY) {
          methods.setError(fieldName, {
            type: "manual",
            message: SUBCATEGORY_LIMIT_ERROR,
          });
          return;
        }

        methods.clearErrors(fieldName);
        onChange(details.value);
        void methods.trigger(fieldName);
      },
    [methods],
  );
  const handleCategorySelection = useCallback(
    (
      index: 0 | 1 | 2,
      categoryName: string,
      onChange: (value: string) => void,
    ) => {
      onChange(categoryName);
      setActiveCategoryIndex(index);

      const availableSubCategories =
        getSubCategoryOptionsForCategory(categoryName);
      setSubCategoryOptions(availableSubCategories);

      const fieldName = `category.${index}.subCategories` as const;
      const currentSubCategories = methods.getValues(fieldName) ?? [];
      const nextSubCategories = currentSubCategories.filter((value) =>
        availableSubCategories.includes(value),
      );

      if (nextSubCategories.length !== currentSubCategories.length) {
        methods.setValue(fieldName, nextSubCategories, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: false,
        });
      }

      methods.clearErrors(`category.${index}.category`);
      methods.clearErrors(`category.${index}.subCategories`);
    },
    [getSubCategoryOptionsForCategory, methods],
  );

  const completedProjectInfoFields = PROJECT_INFO_PROGRESS_FIELDS.filter(
    (fieldName) =>
      projectInfoSchema.shape[fieldName].safeParse(
        projectInfoValues?.[fieldName],
      ).success,
  ).length;
  const progressValue = Math.max(
    0,
    Math.min(
      33,
      Math.round(
        (completedProjectInfoFields / PROJECT_INFO_PROGRESS_FIELDS.length) * 33,
      ),
    ),
  );
  const titleCharacterCount = projectInfoValues.title?.length || 0;
  const titleHasError = hookFormHasError({
    errors,
    name: "title",
  });
  const shortDescriptionHasError = hookFormHasError({
    errors,
    name: "shortDescription",
  });
  const fullDescriptionHasError = hookFormHasError({
    errors,
    name: "fullDescription",
  });
  const fullDescriptionCharacterCount = getRichTextCharacterCount(
    projectInfoValues.fullDescription ?? "",
  );
  const shortDescriptionField = methods.register("shortDescription", {
    onBlur: () => trigger("shortDescription"),
  });

  const triggerMaxLengthError = useCallback(
    (
      fieldName: "title" | "shortDescription" | "fullDescription",
      message: string,
    ) => {
      methods.setError(fieldName, {
        type: "manual",
        message,
      });
    },
    [methods],
  );

  const shouldBlockMaxLengthInput = useCallback(
    (
      event:
        | React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
        | React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
      currentLength: number,
      maxLength: number,
    ) => {
      const selectionLength =
        event.currentTarget.selectionEnd !== null &&
        event.currentTarget.selectionStart !== null
          ? event.currentTarget.selectionEnd -
            event.currentTarget.selectionStart
          : 0;

      if ("key" in event) {
        if (
          event.ctrlKey ||
          event.metaKey ||
          event.altKey ||
          event.key.length !== 1
        ) {
          return false;
        }

        return currentLength - selectionLength >= maxLength;
      }

      const pastedText = event.clipboardData.getData("text");
      return currentLength - selectionLength + pastedText.length > maxLength;
    },
    [],
  );

  const fetchCategoriesAutocomplete = useCallback(
    (index: 0 | 1 | 2, query: string) => {
      const trimmedQuery = query.trim();
      setActiveCategoryIndex(index);
      const activeCategoryName = Array.isArray(categoryValues)
        ? categoryValues[index]?.category
        : undefined;
      const fallbackOptions =
        getSubCategoryOptionsForCategory(activeCategoryName);

      if (!activeCategoryName) {
        setSubCategoryOptions([]);
        return;
      }

      if (!trimmedQuery) {
        setSubCategoryOptions(fallbackOptions);
        return;
      }
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current);
      }

      categoryDebounceTimerRef.current = setTimeout(async () => {
        const currentRequestId = ++categoryRequestRef.current;

        try {
          const response = await AutocompleteAPI.getCategories(trimmedQuery);
          if (currentRequestId !== categoryRequestRef.current) return;

          const values: AutocompleteCategorySuggestion[] = Array.isArray(
            response?.data,
          )
            ? response.data
            : [];

          const scopedSubCategoryOptions =
            getSubCategoryOptionsForCategory(activeCategoryName);
          const allowedSubCategories = new Set(
            scopedSubCategoryOptions.map((value) => value.toLowerCase()),
          );
          const hasScopedSubCategories = allowedSubCategories.size > 0;
          const matchingSubCategories = getUniqueOptions(
            values
              .filter((item) => item.type === "subcategory")
              .map((item) => item.value.trim())
              .filter((value) =>
                activeCategoryName && hasScopedSubCategories
                  ? allowedSubCategories.has(value.toLowerCase())
                  : true,
              ),
          );

          setSubCategoryOptions(
            getIsNotEmpty(matchingSubCategories)
              ? matchingSubCategories
              : getSubCategoryOptionsForCategory(
                  activeCategoryName,
                  trimmedQuery,
                ),
          );
        } catch (error) {
          setSubCategoryOptions(
            getSubCategoryOptionsForCategory(activeCategoryName, trimmedQuery),
          );
        }
      }, 250);
    },
    [categoryValues, getSubCategoryOptionsForCategory],
  );

  const fetchTypeAutocomplete = useCallback(
    (type: string, query: string, onSuccess: (options: string[]) => void) => {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;
      if (typeDebounceTimerRef.current) {
        clearTimeout(typeDebounceTimerRef.current);
      }

      typeDebounceTimerRef.current = setTimeout(async () => {
        const currentRequestId = ++typeRequestRef.current;
        try {
          const response = await AutocompleteAPI.getByType(type, trimmedQuery);
          if (currentRequestId !== typeRequestRef.current) return;

          const values: AutocompleteTypeSuggestion[] = Array.isArray(
            response?.data,
          )
            ? response.data
            : [];
          const normalizedOptions = getUniqueOptions(
            values.map((item) => normalizeAutocompleteLabel(item)),
          );
          if (getIsNotEmpty(normalizedOptions)) {
            onSuccess(normalizedOptions);
          }
        } catch (error) {
          // Keep fallback options when endpoint is not ready.
        }
      }, 250);
    },
    [],
  );
  useEffect(() => {
    return () => {
      if (categoryDebounceTimerRef.current) {
        clearTimeout(categoryDebounceTimerRef.current);
      }
      if (typeDebounceTimerRef.current) {
        clearTimeout(typeDebounceTimerRef.current);
      }
    };
  }, []);
  useEffect(() => {
    const activeCategoryName = Array.isArray(categoryValues)
      ? categoryValues[activeCategoryIndex]?.category
      : undefined;

    setSubCategoryOptions(getSubCategoryOptionsForCategory(activeCategoryName));
  }, [activeCategoryIndex, categoryValues, getSubCategoryOptionsForCategory]);
  // NEW: Report progress to parent whenever it changes
  useEffect(() => {
    setProgress?.(foundationIsValid ? 20 : 4); //calls the prop passed from PublishProject
  }, [foundationIsValid, setProgress]);

  const suggestedSkills = suggestedSkillOptions.filter(
    (value) => !projectInfoValues.skills?.includes(value),
  );
  const suggestedSkillsForDisplay = suggestedSkills.slice(0, 3);
  const activeCategory = Array.isArray(categoryValues)
    ? categoryValues[activeCategoryIndex]
    : null;
  const getAvailableCategoriesForIndex = useCallback(
    (index: number, currentValue?: string) => {
      const selectedCategories = Array.isArray(categoryValues)
        ? categoryValues
            .map((item, itemIndex) =>
              itemIndex === index ? null : item?.category?.trim(),
            )
            .filter(
              (item): item is string =>
                typeof item === "string" && item.length > 0,
            )
        : [];

      return categoryOptions.filter(
        (category) =>
          category === currentValue || !selectedCategories.includes(category),
      );
    },
    [categoryOptions, categoryValues],
  );
  const selectedSuggestedPairs = useMemo(
    () =>
      new Set(
        (Array.isArray(categoryValues) ? categoryValues : []).flatMap((item) =>
          item?.category && Array.isArray(item.subCategories)
            ? item.subCategories.map(
                (subCategory) => `${item.category}::${subCategory}`,
              )
            : [],
        ),
      ),
    [categoryValues],
  );
  const selectedCategoryNames = useMemo(
    () =>
      new Set(
        (Array.isArray(categoryValues) ? categoryValues : [])
          .map((item) => item?.category?.trim())
          .filter(
            (category): category is string =>
              typeof category === "string" && category.length > 0,
          ),
      ),
    [categoryValues],
  );
  const suggestedForDisplay = useMemo(
    () =>
      suggested
        .filter(
          ({ category, subCategory }) =>
            !selectedCategoryNames.has(category) &&
            !selectedSuggestedPairs.has(`${category}::${subCategory}`),
        )
        .slice(0, 3),
    [selectedCategoryNames, selectedSuggestedPairs, suggested],
  );
  const fallbackExistingListingOptions: ExistingListingOption[] = [
    {
      id: "marketeq-projects-network",
      title: "Marketeq Projects Network",
      badges: ["Design Phase"],
      icon: <MdOutlineAssignment className="size-6" />,
      avatars: ["AK", "NS", "RP", "+3"],
      workType: "project" as const,
    },
    {
      id: "cross-platform-application",
      title: "Cross-platform application",
      badges: ["Design Phase"],
      image:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=160&q=80",
      avatars: ["MJ", "CT", "AL", "+5"],
      workType: "project" as const,
    },
    {
      id: "ecommerce-react-build",
      title: "E-commerce Website Build with React JS",
      badges: ["Development Phase", "Service"],
      icon: <MdAutorenew className="size-6" />,
      avatars: ["RK", "SB"],
      workType: "service" as const,
    },
  ];
  const getContractDisabledReason = (status?: string | null) => {
    const normalizedStatus = status?.toLowerCase();

    if (!normalizedStatus) return undefined;
    if (["closed", "expired", "disputed"].includes(normalizedStatus)) {
      return "This contract cannot accept new jobs.";
    }

    return undefined;
  };
  const mapContractToExistingOption = (
    contract: ContractDTO,
  ): ExistingListingOption => {
    const isServiceContract = Boolean(contract.serviceId);
    const statusBadge = contract.status
      ? contract.status
          .split(/[_\s-]+/)
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "Active";

    return {
      id: contract.id,
      title: contract.title || "Untitled contract",
      badges: [
        contract.note || contract.duration || statusBadge,
        isServiceContract ? "Service" : "Project",
      ].filter(Boolean),
      icon: isServiceContract ? (
        <RefreshCcw05 className="size-5" />
      ) : (
        <Copy className="size-5" />
      ),
      avatars: [],
      workType: isServiceContract ? "service" : "project",
      disabledReason: getContractDisabledReason(contract.status),
    };
  };
  const visibleExistingListingOptions = useMemo(() => {
    const sourceOptions = getIsNotEmpty(apiExistingListingOptions)
      ? apiExistingListingOptions
      : fallbackExistingListingOptions;
    const query = contractSearchValue.trim().toLowerCase();

    if (!query) return sourceOptions;

    return sourceOptions.filter((option) =>
      [option.title, ...option.badges].join(" ").toLowerCase().includes(query),
    );
  }, [apiExistingListingOptions, contractSearchValue]);

  useEffect(() => {
    if (contractChoice !== "existing" || !user?.id) return;

    let cancelled = false;

    const loadExistingContracts = async () => {
      try {
        const contracts = await getContractsForClient(user.id);
        if (cancelled) return;

        setApiExistingListingOptions(
          contracts.map(mapContractToExistingOption),
        );
      } catch (error) {
        if (!cancelled) {
          setApiExistingListingOptions([]);
        }
      }
    };

    void loadExistingContracts();

    return () => {
      cancelled = true;
    };
  }, [contractChoice, user?.id]);
  useEffect(() => {
    if (
      contractChoice !== "existing" ||
      !getIsNotEmpty(apiExistingListingOptions)
    ) {
      return;
    }

    if (selectedExistingListing) return;
  }, [apiExistingListingOptions, contractChoice, selectedExistingListing]);

  return (
    <form className="contents" onSubmit={methods.handleSubmit(onSubmit)}>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[100px] flex flex-col min-[1024px]:flex-row gap-y-10 min-[1024px]:gap-x-8">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    Show the outcome, audience, and value.
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" type="button">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <ProjectInfoTip
                      className="w-full"
                      closeTrigger={
                        <DialogClose asChild>
                          <IconButton
                            className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                            variant="light"
                            visual="gray"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      }
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="flex-auto min-w-0">
            <div className="space-y-16">
              <div>
                <h1 className="text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400">
                  Let&apos;s set the foundation
                </h1>

                <div className="mt-8 space-y-3">
                  <p className="text-[18px] font-medium leading-7 text-dark-blue-400">
                    Are you adding team members to a new contract or an existing
                    one?
                  </p>

                  <RadioGroup
                    className="flex flex-wrap gap-2"
                    value={contractChoice ?? undefined}
                    onValueChange={(value) => {
                      const nextChoice = value as "new" | "existing";

                      setContractChoice(nextChoice);
                      onExistingContractFlowChange?.(nextChoice === "existing");
                      if (nextChoice === "existing") {
                        setScopeChoice(null);
                        onScopeKnowledgeChange?.(null);
                        onNoScopeFlowChange?.(false);
                        setHiringModeChoice(null);
                        setWorkTypeChoice("service");
                      } else {
                        setSelectedExistingListing(null);
                        onExistingContractSelectionChange?.(null);
                        setWorkTypeChoice(null);
                        setHiringModeChoice(null);
                        onNoScopeFlowChange?.(false);
                      }
                    }}
                  >
                    {[
                      { value: "new", label: "Create new contract" },
                      {
                        value: "existing",
                        label: "Add to an existing contract",
                      },
                    ].map((option) => (
                      <HeadlessRadioGroupItem
                        key={option.value}
                        value={option.value}
                        disabled={isWorkflowLocked}
                        className={cn(
                          "inline-flex h-10 items-center justify-center rounded-[52px] border border-gray-300 bg-white px-4 text-sm leading-5 font-medium text-dark-blue-400 focus-visible:outline-none",
                          "disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:opacity-50 data-[state=checked]:disabled:border-primary-500 data-[state=checked]:disabled:bg-primary-25",
                          contractChoice === option.value &&
                            "border-2 border-primary-500 bg-primary-25 text-dark-blue-400",
                        )}
                      >
                        {option.label}
                      </HeadlessRadioGroupItem>
                    ))}
                  </RadioGroup>
                </div>

                {contractChoice === "existing" ? (
                  <div className="mt-12 space-y-5">
                    <div className="flex h-9 w-full items-start justify-between gap-3">
                      <p className="w-[520px] text-[18px] font-medium leading-7 text-dark-blue-400">
                        Choose project, service, or team which you want to add
                        jobs
                      </p>

                      <div className="w-[223px]">
                        <InputGroup>
                          <InputLeftElement>
                            <SearchMd className="size-4 text-gray-400/50" />
                          </InputLeftElement>
                          <Input
                            placeholder="Search"
                            value={contractSearchValue}
                            disabled={isWorkflowLocked}
                            onChange={(event) =>
                              setContractSearchValue(event.target.value)
                            }
                            className="h-9 border-gray-300 px-3 py-2.5 pl-9 text-sm leading-6 shadow-xs placeholder:text-gray-500/50"
                          />
                        </InputGroup>
                      </div>
                    </div>

                    <RadioGroup
                      className="space-y-2"
                      value={selectedExistingListing ?? ""}
                      onValueChange={(value) => {
                        const selectedOption =
                          visibleExistingListingOptions.find(
                            (option) => option.id === value,
                          );

                        if (!selectedOption || selectedOption.disabledReason) {
                          return;
                        }

                        setSelectedExistingListing(selectedOption.id);
                        onExistingContractSelectionChange?.(selectedOption.id);
                        setWorkTypeChoice(selectedOption.workType);
                      }}
                    >
                      {visibleExistingListingOptions.map((option) => {
                        const selected = selectedExistingListing === option.id;
                        const disabled = Boolean(option.disabledReason);

                        return (
                          <HeadlessRadioGroupItem
                            key={option.id}
                            value={option.id}
                            disabled={disabled || isWorkflowLocked}
                            title={option.disabledReason}
                            className={cn(
                              "flex h-[92px] w-full items-center gap-[48px] rounded-lg border border-gray-300 bg-white py-4 pl-4 pr-6 text-left focus-visible:outline-none",
                              "disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:opacity-50 data-[state=checked]:disabled:border-primary-500 data-[state=checked]:disabled:bg-primary-25",
                              selected && "border-2 border-primary-500 bg-primary-25",
                              disabled && "cursor-not-allowed opacity-60",
                            )}
                          >
                            <span className="flex h-[60px] min-w-0 flex-1 items-center gap-4">
                              <span className="inline-flex h-[60px] w-[88px] shrink-0 items-center justify-center rounded-[4px] bg-primary-50 text-primary-500">
                                {"image" in option ? (
                                  <img
                                    alt=""
                                    className="block h-full w-full rounded-[4px] object-cover"
                                    src={option.image}
                                  />
                                ) : (
                                  React.isValidElement(option.icon)
                                    ? React.cloneElement(option.icon as React.ReactElement, {
                                        className: cn(
                                          "size-6 shrink-0 text-primary-500",
                                          (option.icon as React.ReactElement).props
                                            ?.className,
                                        ),
                                      })
                                    : option.icon
                                )}
                              </span>

                              <span className="flex h-[60px] min-w-0 flex-1 flex-col justify-center gap-1">
                                <span className="block text-[18px] leading-7 font-semibold text-dark-blue-400">
                                  {option.title}
                                </span>
                                <span className="flex h-[27px] items-center gap-2">
                                  {option.badges.map((badge) => (
                                    <Badge
                                      key={badge}
                                      size="sm"
                                      visual="gray"
                                      variant="rounded"
                                      className="h-[27px] rounded-[5px] border border-gray-300 bg-white px-2 py-[6px] text-[12px] leading-[15px] font-semibold text-dark-blue-400 mix-blend-normal"
                                    >
                                      {badge === "Service" ? (
                                        <span className="inline-flex items-center gap-x-1">
                                          <MdAutorenew className="size-3.5 shrink-0 text-primary-500" />
                                          <span>Service</span>
                                        </span>
                                      ) : (
                                        badge
                                      )}
                                    </Badge>
                                  ))}
                                </span>
                              </span>
                            </span>

                            <span className="hidden items-center md:flex">
                              <AvatarGroup className="!cursor-default" size="xs" reverse={false}>
                                {[
                                  "/woman.jpg",
                                  "/man.jpg",
                                  "/girl.jpeg",
                                  "/guy.jpeg",
                                ]
                                  .slice(0, option.avatars.length > 2 ? 4 : 2)
                                  .map((avatar) => (
                                    <Avatar
                                      key={`${option.id}-${avatar}`}
                                      size="xs"
                                      className="border-2 border-white hover:ring-0 active:ring-0"
                                    >
                                      <AvatarImage src={avatar} alt="" />
                                    </Avatar>
                                  ))}
                                {option.avatars.find((avatar) => avatar.startsWith("+")) ? (
                                  <span className="inline-flex size-6 items-center justify-center rounded-full border-2 border-primary-500 bg-white text-[10px] leading-none font-semibold text-primary-500">
                                    {option.avatars.find((avatar) =>
                                      avatar.startsWith("+"),
                                    )}
                                  </span>
                                ) : null}
                              </AvatarGroup>
                            </span>

                            <span
                              className={cn(
                                "relative inline-flex size-[18px] shrink-0 rounded-full border-[1.5px] border-gray-300 bg-white",
                                selected && "border-primary-500",
                              )}
                            >
                              {selected ? (
                                <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500" />
                              ) : null}
                            </span>
                          </HeadlessRadioGroupItem>
                        );
                      })}
                    </RadioGroup>
                  </div>
                ) : contractChoice === "new" ? (
                  <>
                    <div className="mt-12 flex h-20 w-full flex-col items-start gap-y-3">
                      <p className="h-7 w-full rounded text-lg leading-7 font-medium text-dark-blue-400">
                        Do you already know the scope of work?
                      </p>

                      <div
                        className={cn(
                          "flex h-10 w-full items-start gap-x-2",
                          isWorkflowLocked && "cursor-not-allowed",
                        )}
                      >
                        {[
                          {
                            value: "known",
                            label: "Yes, I know what needs to be done",
                            className: "w-[265px]",
                          },
                          {
                            value: "unknown",
                            label: "Not yet, I need help figuring it out",
                            className: "w-64",
                          },
                          {
                            value: "none",
                            label: "Continue without a scope",
                            className: "w-[204px]",
                          },
                        ].map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant="outlined"
                            visual="gray"
                            disabled={isWorkflowLocked}
                            className={cn(
                              "h-10 items-start gap-x-4 rounded-[52px] px-4 py-2.5 text-sm leading-5 font-medium text-dark-blue-400 shadow-none",
                              option.className,
                              scopeChoice === option.value &&
                                "border-2 border-primary-500 bg-primary-25 text-dark-blue-400",
                            )}
                            onClick={() => {
                              const nextScopeChoice = option.value as
                                | "known"
                                | "unknown"
                                | "none";
                              setScopeChoice(nextScopeChoice);
                              onScopeKnowledgeChange?.(nextScopeChoice);
                              onNoScopeFlowChange?.(nextScopeChoice === "none");
                              if (nextScopeChoice === "none") {
                                setWorkTypeChoice(null);
                                setHiringModeChoice(null);
                              } else {
                                setHiringModeChoice(null);
                              }
                            }}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {scopeChoice === "none" ? (
                      <div className="mt-12 flex flex-col gap-y-3">
                        <p className="h-7 w-full rounded text-lg leading-7 font-medium text-dark-blue-400">
                          Are you hiring for one role or multiple?
                        </p>

                        <RadioGroup
                          className="flex h-20 w-full items-start gap-x-4"
                          value={hiringModeChoice ?? ""}
                          onValueChange={(value) =>
                            setHiringModeChoice(value as HiringModeChoice)
                          }
                        >
                          {[
                            {
                              value: "team",
                              label: "Team",
                              description:
                                "I\u2019ll need multiple people for different roles",
                              icon: <MdOutlineGroups className="size-6" />,
                            },
                            {
                              value: "individual",
                              label: "Individual",
                              description:
                                "I\u2019ll start with one person/role",
                              icon: <MdOutlinePerson className="size-6" />,
                            },
                          ].map((option) => {
                            const selected = hiringModeChoice === option.value;
                            return (
                              <HeadlessRadioGroupItem
                                key={option.value}
                                value={option.value}
                                disabled={isWorkflowLocked}
                                className={cn(
                                  "flex h-20 w-[435px] flex-1 items-center gap-x-4 rounded-lg border border-gray-200 bg-white py-4 pl-4 pr-6 text-left focus-visible:outline-none",
                                  "disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:opacity-50 data-[state=checked]:disabled:border-primary-500 data-[state=checked]:disabled:bg-primary-25",
                                  selected &&
                                    "border-2 border-primary-500 bg-primary-25",
                                )}
                              >
                                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                  {option.icon}
                                </span>
                                <span className="flex h-12 min-w-0 flex-auto flex-col items-start">
                                  <span className="block h-7 w-full text-lg leading-7 font-semibold text-dark-blue-400">
                                    {option.label}
                                  </span>
                                  <span className="block h-5 w-full text-sm leading-5 text-dark-blue-400">
                                    {option.description}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-gray-300",
                                    selected && "border-primary-500",
                                  )}
                                >
                                  {selected ? (
                                    <span className="size-2 rounded-full bg-primary-500" />
                                  ) : null}
                                </span>
                              </HeadlessRadioGroupItem>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    ) : scopeChoice ? (
                      <div className="mt-12 flex h-[120px] w-full flex-col items-start gap-y-3">
                        <p className="h-7 w-full rounded text-lg leading-7 font-medium text-dark-blue-400">
                          What type of work is this?
                        </p>

                        <RadioGroup
                          className="flex h-20 w-full items-start gap-x-4"
                          value={workTypeChoice ?? ""}
                          onValueChange={(value) =>
                            setWorkTypeChoice(value as WorkTypeChoice)
                          }
                        >
                          {[
                            {
                              value: "project",
                              label: "Project",
                              description: "One-time job with a defined scope",
                              icon: <MdOutlineAssignment className="size-6" />,
                            },
                            {
                              value: "service",
                              label: "Service",
                              description:
                                "Recurring work with consistent needs",
                              icon: <MdAutorenew className="size-6" />,
                            },
                          ].map((option) => {
                            const selected = workTypeChoice === option.value;
                            return (
                              <HeadlessRadioGroupItem
                                key={option.value}
                                value={option.value}
                                disabled={isWorkflowLocked}
                                className={cn(
                                  "flex h-20 w-[435px] flex-1 items-center gap-x-4 rounded-lg border border-gray-300 bg-white py-4 pl-4 pr-6 text-left focus-visible:outline-none",
                                  "disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-50 disabled:opacity-50 data-[state=checked]:disabled:border-primary-500 data-[state=checked]:disabled:bg-primary-25",
                                  selected &&
                                    "border-2 border-primary-500 bg-primary-25",
                                )}
                              >
                                <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-500">
                                  {option.icon}
                                </span>
                                <span className="flex h-12 min-w-0 flex-auto flex-col items-start">
                                  <span className="block h-7 w-full text-lg leading-7 font-semibold text-dark-blue-400">
                                    {option.label}
                                  </span>
                                  <span className="block h-5 w-full text-sm leading-5 text-dark-blue-400">
                                    {option.description}
                                  </span>
                                </span>
                                <span
                                  className={cn(
                                    "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-gray-300",
                                    selected && "border-primary-500",
                                  )}
                                >
                                  {selected ? (
                                    <span className="size-2 rounded-full bg-primary-500" />
                                  ) : null}
                                </span>
                              </HeadlessRadioGroupItem>
                            );
                          })}
                        </RadioGroup>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>

            {false ? (
              <div className="hidden">
                <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
                  Describe your project
                </h1>

                <div
                  id="publish-project-title-field"
                  className="space-y-1.5 mt-6 mb-6"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="title"
                    >
                      What do you want to accomplish with this project?
                    </Label>
                    <div className="flex items-center justify-between">
                      <HelperText size="sm">
                        Give us a short project summary so we can match the
                        right roles to your needs.
                      </HelperText>

                      <span className="text-xs leading-[14.52px] text-gray-500">
                        {Math.min(titleCharacterCount, 100)}/100
                      </span>
                    </div>
                  </div>

                  <Textarea
                    id="title"
                    placeholder="I need help building a new website for my e-commerce store..."
                    value={projectInfoValues.title ?? ""}
                    maxLength={100}
                    onChange={(event) => {
                      methods.setValue(
                        "title",
                        event.target.value.slice(0, 100),
                        {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: false,
                        },
                      );
                      if (
                        titleHasError &&
                        get(errors, "title.type") === "manual"
                      ) {
                        methods.clearErrors("title");
                      }
                    }}
                    onBlur={() => void methods.trigger("title")}
                    onKeyDown={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          projectInfoValues.title?.length || 0,
                          100,
                        )
                      ) {
                        event.preventDefault();
                        triggerMaxLengthError(
                          "title",
                          "Please do not enter more than 100 character(s)",
                        );
                      }
                    }}
                    onPaste={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          projectInfoValues.title?.length || 0,
                          100,
                        )
                      ) {
                        event.preventDefault();
                        triggerMaxLengthError(
                          "title",
                          "Please do not enter more than 100 character(s)",
                        );
                      }
                    }}
                    isInvalid={titleHasError}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="title"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div className="space-y-1.5 mt-6 mb-6">
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="job-project-budget"
                    >
                      What&apos;s your estimated budget for this project?
                    </Label>
                  </div>

                  <div className="max-w-[260px]">
                    <Label
                      className="text-sm leading-5 text-dark-blue-400 font-semibold"
                      htmlFor="job-project-budget"
                    >
                      Amount
                    </Label>
                    <InputGroup className="mt-1">
                      <InputLeftElement className="text-gray-500">
                        $
                      </InputLeftElement>
                      <Input
                        id="job-project-budget"
                        className="pl-8"
                        defaultValue="500.00"
                        inputMode="decimal"
                      />
                    </InputGroup>
                    <span className="mt-1 block text-xs leading-[18px] text-gray-500">
                      per week
                    </span>
                  </div>
                </div>

                <div id="publish-project-category-field" className="hidden">
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="email"
                      asChild
                    >
                      <span>Category</span>
                    </Label>

                    <HelperText size="sm">
                      Select categories that best fit your project scope for
                      easier discovery.
                    </HelperText>
                  </div>

                  <div className="flex items-start gap-x-1.5">
                    <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                      1
                    </div>

                    <div className="flex flex-col flex-auto gap-y-2.5">
                      <div className="max-w-[202px]">
                        <Controller
                          control={methods.control}
                          name="category.0.category"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <Listbox
                              value={value}
                              onChange={(nextValue) =>
                                handleCategorySelection(0, nextValue, onChange)
                              }
                            >
                              <ListboxButton
                                placeholder="Add Category"
                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start  border border-gray-300 rounded-[5px]"
                                onFocus={() => setActiveCategoryIndex(0)}
                                {...field}
                              >
                                {({ value }) => (
                                  <span className="truncate block">
                                    {value || "Add Category"}
                                  </span>
                                )}
                              </ListboxButton>
                              <ListboxOptions>
                                {getAvailableCategoriesForIndex(0, value).map(
                                  (category) => (
                                    <ListboxOption
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </ListboxOption>
                                  ),
                                )}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                      </div>

                      <Controller
                        name="category.0.subCategories"
                        control={methods.control}
                        render={({ field: { onChange, ...field } }) => (
                          <TagsInputRoot
                            onValueChange={handleSubCategoryChange(
                              "category.0.subCategories",
                              onChange,
                            )}
                            {...field}
                            className="space-y-1.5"
                          >
                            <TagsInputContext>
                              {(tagsInput) => (
                                <>
                                  <TagsInputControl className="relative pr-[28px] flex flex-wrap !justify-start !items-start !text-left  w-full max-w-[679px] h-auto rounded-[5px] border border-gray-300 px-[14px] py-[10px] m-0">
                                    {tagsInput.value.map((value, index) => (
                                      <TagsInputItem
                                        key={index}
                                        index={index}
                                        value={value}
                                      >
                                        <TagsInputItemPreview
                                          visual="primary"
                                          size="md"
                                          className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                        >
                                          <TagsInputItemText>
                                            {value}
                                          </TagsInputItemText>
                                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                            <X2 className="size-3" />
                                          </TagsInputItemDeleteTrigger>
                                        </TagsInputItemPreview>
                                        <TagsInputItemInput />
                                      </TagsInputItem>
                                    ))}
                                    <TagsInputInput
                                      placeholder={
                                        tagsInput.value.length
                                          ? ""
                                          : "Add Sub-Category(s)"
                                      }
                                      options={subCategoryOptions}
                                      allowCreateOption
                                      className="flex-1 min-w-[100px] "
                                      onInputValueChange={(value) => {
                                        fetchCategoriesAutocomplete(0, value);
                                      }}
                                      onFocus={() => {
                                        setActiveCategoryIndex(0);
                                        setSubCategoryOptions(
                                          getSubCategoryOptionsForCategory(
                                            categoryValues?.[0]?.category,
                                          ),
                                        );
                                      }}
                                    />
                                    <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                  </TagsInputControl>
                                </>
                              )}
                            </TagsInputContext>
                            <TagsInputHiddenInput />
                          </TagsInputRoot>
                        )}
                      />

                      {(hookFormHasError({
                        errors,
                        name: "category.0.category",
                      }) ||
                        hookFormHasError({
                          errors,
                          name: "category.0.subCategories",
                        })) && (
                        <ErrorMessage size="sm">
                          {get(errors, "category.0.category.message") ||
                            get(errors, "category.0.subCategories.message")}
                        </ErrorMessage>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-x-1.5">
                    <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                      2
                    </div>

                    <div className="flex flex-col flex-auto gap-y-2.5">
                      <div className="max-w-[202px]">
                        <Controller
                          control={methods.control}
                          name="category.1.category"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <Listbox
                              value={value}
                              onChange={(nextValue) =>
                                handleCategorySelection(1, nextValue, onChange)
                              }
                            >
                              <ListboxButton
                                placeholder="Add Category"
                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start  border border-gray-300 rounded-[5px]"
                                onFocus={() => setActiveCategoryIndex(1)}
                                {...field}
                              >
                                {({ value }) => (
                                  <span className="truncate block">
                                    {value || "Add Category"}
                                  </span>
                                )}
                              </ListboxButton>
                              <ListboxOptions>
                                {getAvailableCategoriesForIndex(1, value).map(
                                  (category) => (
                                    <ListboxOption
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </ListboxOption>
                                  ),
                                )}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                      </div>

                      <Controller
                        name="category.1.subCategories"
                        control={methods.control}
                        render={({ field: { onChange, ...field } }) => (
                          <TagsInputRoot
                            onValueChange={handleSubCategoryChange(
                              "category.1.subCategories",
                              onChange,
                            )}
                            {...field}
                            className="space-y-1.5"
                          >
                            <TagsInputContext>
                              {(tagsInput) => (
                                <>
                                  <TagsInputControl
                                    className="relative pr-[28px] flex flex-wrap !justify-start
                               !items-start !text-left  w-full max-w-[679px] h-auto rounded-[5px]
                               border border-gray-300 px-[14px] py-[10px] m-0"
                                  >
                                    {tagsInput.value.map((value, index) => (
                                      <TagsInputItem
                                        key={index}
                                        index={index}
                                        value={value}
                                      >
                                        <TagsInputItemPreview
                                          visual="primary"
                                          size="md"
                                          className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                        >
                                          <TagsInputItemText>
                                            {value}
                                          </TagsInputItemText>
                                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                            <X2 className="size-3" />
                                          </TagsInputItemDeleteTrigger>
                                        </TagsInputItemPreview>
                                        <TagsInputItemInput />
                                      </TagsInputItem>
                                    ))}
                                    <TagsInputInput
                                      options={subCategoryOptions}
                                      placeholder={
                                        tagsInput.value.length
                                          ? ""
                                          : "Add Sub-Category(s)"
                                      }
                                      allowCreateOption
                                      className="flex-1 min-w-[100px]"
                                      onInputValueChange={(value) => {
                                        fetchCategoriesAutocomplete(1, value);
                                      }}
                                      onFocus={() => {
                                        setActiveCategoryIndex(1);
                                        setSubCategoryOptions(
                                          getSubCategoryOptionsForCategory(
                                            categoryValues?.[1]?.category,
                                          ),
                                        );
                                      }}
                                    />

                                    <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                  </TagsInputControl>
                                </>
                              )}
                            </TagsInputContext>
                            <TagsInputHiddenInput />
                          </TagsInputRoot>
                        )}
                      />

                      {(hookFormHasError({
                        errors,
                        name: "category.1.category",
                      }) ||
                        hookFormHasError({
                          errors,
                          name: "category.1.subCategories",
                        })) && (
                        <ErrorMessage size="sm">
                          {get(errors, "category.1.category.message") ||
                            get(errors, "category.1.subCategories.message")}
                        </ErrorMessage>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-x-1.5">
                    <div className="size-11 shrink-0 inline-flex items-center justify-between text-xl leading-[30px] text-gray-900 font-semibold">
                      3
                    </div>

                    <div className="flex flex-col flex-auto gap-y-2.5">
                      <div className="max-w-[202px]">
                        <Controller
                          control={methods.control}
                          name="category.2.category"
                          render={({
                            field: { value, onChange, ...field },
                          }) => (
                            <Listbox
                              value={value}
                              onChange={(nextValue) =>
                                handleCategorySelection(2, nextValue, onChange)
                              }
                            >
                              <ListboxButton
                                placeholder="Add Category"
                                className="w-full max-w-[202px] h-[44px] px-[14px] py-[10px] flex items-center justify-start  border border-gray-300 rounded-[5px]"
                                onFocus={() => setActiveCategoryIndex(2)}
                                {...field}
                              >
                                {({ value }) => (
                                  <span className="truncate block">
                                    {value || "Add Category"}
                                  </span>
                                )}
                              </ListboxButton>
                              <ListboxOptions>
                                {getAvailableCategoriesForIndex(2, value).map(
                                  (category) => (
                                    <ListboxOption
                                      key={category}
                                      value={category}
                                    >
                                      {category}
                                    </ListboxOption>
                                  ),
                                )}
                              </ListboxOptions>
                            </Listbox>
                          )}
                        />
                      </div>

                      <Controller
                        name="category.2.subCategories"
                        control={methods.control}
                        render={({ field: { onChange, ...field } }) => (
                          <TagsInputRoot
                            onValueChange={handleSubCategoryChange(
                              "category.2.subCategories",
                              onChange,
                            )}
                            {...field}
                            className="space-y-1.5"
                          >
                            <TagsInputContext>
                              {(tagsInput) => (
                                <>
                                  <TagsInputControl
                                    className="relative pr-[28px] flex flex-wrap !justify-start
                               !items-start !text-left  w-full max-w-[679px] h-auto rounded-[5px]
                               border border-gray-300 px-[14px] py-[10px] m-0"
                                  >
                                    {tagsInput.value.map((value, index) => (
                                      <TagsInputItem
                                        key={index}
                                        index={index}
                                        value={value}
                                      >
                                        <TagsInputItemPreview
                                          visual="primary"
                                          size="md"
                                          className="pr-2 text-primary-500 bg-primary-50 animate-in fade-in-0 zoom-in-95 duration-200"
                                        >
                                          <TagsInputItemText>
                                            {value}
                                          </TagsInputItemText>
                                          <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                            <X2 className="size-3" />
                                          </TagsInputItemDeleteTrigger>
                                        </TagsInputItemPreview>
                                        <TagsInputItemInput />
                                      </TagsInputItem>
                                    ))}
                                    <TagsInputInput
                                      options={subCategoryOptions}
                                      placeholder={
                                        tagsInput.value.length
                                          ? ""
                                          : "Add Sub-Category(s)"
                                      }
                                      allowCreateOption
                                      className="flex-1 min-w-[100px]"
                                      onInputValueChange={(value) => {
                                        fetchCategoriesAutocomplete(2, value);
                                      }}
                                      onFocus={() => {
                                        setActiveCategoryIndex(2);
                                        setSubCategoryOptions(
                                          getSubCategoryOptionsForCategory(
                                            categoryValues?.[2]?.category,
                                          ),
                                        );
                                      }}
                                    />

                                    <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                                  </TagsInputControl>
                                </>
                              )}
                            </TagsInputContext>
                            <TagsInputHiddenInput />
                          </TagsInputRoot>
                        )}
                      />

                      {(hookFormHasError({
                        errors,
                        name: "category.2.category",
                      }) ||
                        hookFormHasError({
                          errors,
                          name: "category.2.subCategories",
                        })) && (
                        <ErrorMessage size="sm">
                          {get(errors, "category.2.category.message") ||
                            get(errors, "category.2.subCategories.message")}
                        </ErrorMessage>
                      )}
                    </div>
                  </div>
                </div>

                {showSuggestions && (
                  <div className="mt-6 space-y-1.5">
                    <span className="block text-xs leading-5 text-dark-blue-400">
                      Suggested Categories
                    </span>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
                      {suggestedForDisplay.map(({ category, subCategory }) => (
                        <Badge
                          size="md"
                          className="pr-2 focus-visible:outline-none text-primary-500 bg-primary-50"
                          visual="primary"
                          asChild
                          key={category}
                        >
                          <Button
                            variant="link"
                            type="button"
                            className="hover:no-underline"
                            onClick={() => {
                              const indexToUpdate = activeCategoryIndex;

                              // write values and mark as user-driven so Sidebar shows the checkmark
                              setValue(
                                `category.${indexToUpdate}.category`,
                                category,
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                },
                              );
                              setValue(
                                `category.${indexToUpdate}.subCategories`,
                                [subCategory],
                                {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                },
                              );

                              // validate that slot
                              trigger(`category.${indexToUpdate}`);

                              // keep suggestions visible for subsequent category slots
                            }}
                          >
                            {category} / {subCategory}
                            <Plus2 className="size-3 opacity-50 hover:opacity-100" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-3 mt-6">
                  <Label
                    className="leading-9 text-dark-blue-400 font-semibold"
                    size="lg"
                  >
                    How long do you expect this job to last?
                  </Label>

                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      {
                        label: "3 months",
                        description:
                          "Launch a page, test a prototype, or run a campaign",
                      },
                      {
                        label: "6 months",
                        description: "Build an MVP or redesign a website",
                      },
                      {
                        label: "12 months",
                        description: "Platform builds or long product cycles",
                      },
                      {
                        label: "24 months",
                        description:
                          "Ongoing design, dev support, or multi-phase work",
                      },
                    ].map((option) => (
                      <Button
                        key={option.label}
                        variant="outlined"
                        visual="gray"
                        className="block h-auto w-full whitespace-normal rounded-lg border-gray-200 bg-white p-4 text-left font-normal shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] hover:bg-white"
                        type="button"
                      >
                        <span className="block text-sm leading-5 font-semibold text-dark-blue-400">
                          {option.label}
                        </span>
                        <span className="mt-1 block text-xs leading-[18px] text-gray-500">
                          {option.description}
                        </span>
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="link"
                    className="text-sm leading-5 hover:no-underline"
                    type="button"
                  >
                    Other
                  </Button>
                </div>

                <div id="publish-project-industry-field" className="hidden">
                  <Controller
                    name="industry"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          if (details.value.length > 5) {
                            methods.setError("industry", {
                              type: "manual",
                              message: "You can only add up to 5 industries",
                            });
                            return;
                          }
                          methods.clearErrors("industry");
                          onChange(details.value);
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <>
                              <div className="space-y-0.5">
                                <TagsInputLabel
                                  className="leading-9 text-dark-blue-400 font-semibold"
                                  size="lg"
                                >
                                  Industry
                                </TagsInputLabel>
                                <div className="flex items-center justify-between">
                                  <HelperText size="sm">
                                    Add up to 5 industries that aligns with your
                                    project scope for targeted visibility.
                                  </HelperText>

                                  <span className="text-xs leading-[14.52px] text-gray-500">
                                    {projectInfoValues.industry?.length || 0}/5
                                  </span>
                                </div>
                              </div>
                              <TagsInputControl className="relative pr-[28px]">
                                {tagsInput.value.map((value, index) => (
                                  <TagsInputItem
                                    key={index}
                                    index={index}
                                    value={value}
                                  >
                                    <TagsInputItemPreview
                                      visual="primary"
                                      size="md"
                                      className="pr-2 text-primary-500 bg-primary-50"
                                    >
                                      <TagsInputItemText>
                                        {value}
                                      </TagsInputItemText>
                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                        <X2 className="size-3" />
                                      </TagsInputItemDeleteTrigger>
                                    </TagsInputItemPreview>
                                    <TagsInputItemInput />
                                  </TagsInputItem>
                                ))}
                                <TagsInputInput
                                  options={industryOptions}
                                  placeholder="Add Industries"
                                  allowCreateOption
                                  onInputValueChange={(value) => {
                                    fetchTypeAutocomplete(
                                      "industries",
                                      value,
                                      setIndustryOptions,
                                    );
                                  }}
                                />

                                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                              </TagsInputControl>
                            </>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="industry"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div id="publish-project-language-field" className="hidden">
                  <Controller
                    name="languages"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          onChange(
                            getUniqueOptions(details.value).slice(0, 10),
                          );
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <TagsInputControl className="relative pr-[28px]">
                              {tagsInput.value.map((value, index) => (
                                <TagsInputItem
                                  key={index}
                                  index={index}
                                  value={value}
                                >
                                  <TagsInputItemPreview
                                    visual="primary"
                                    size="md"
                                    className="pr-2 text-primary-500 bg-primary-50"
                                  >
                                    <TagsInputItemText>
                                      {value}
                                    </TagsInputItemText>
                                    <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                      <X2 className="size-3" />
                                    </TagsInputItemDeleteTrigger>
                                  </TagsInputItemPreview>
                                  <TagsInputItemInput />
                                </TagsInputItem>
                              ))}
                              <TagsInputInput
                                options={languageOptions}
                                placeholder="Add Languages"
                                allowCreateOption
                                onInputValueChange={(value) => {
                                  fetchTypeAutocomplete(
                                    "languages",
                                    value,
                                    setLanguageOptions,
                                  );
                                }}
                              />

                              <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                            </TagsInputControl>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />
                </div>

                <div
                  id="publish-project-short-description-field"
                  className="hidden"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="short-description"
                    >
                      Short Description
                    </Label>
                    <div className="flex items-center justify-between">
                      <HelperText size="sm">
                        Provide a brief overview of your project scope.
                      </HelperText>

                      <span className="text-xs leading-[14.52px] text-gray-500">
                        {projectInfoValues.shortDescription?.length || 0}/
                        {SHORT_DESCRIPTION_MAX_LENGTH}
                      </span>
                    </div>
                  </div>

                  <Textarea
                    id="short-description"
                    placeholder="Enter a short Description"
                    maxLength={SHORT_DESCRIPTION_MAX_LENGTH}
                    {...shortDescriptionField}
                    onChange={(event) => {
                      shortDescriptionField.onChange(event);
                      if (
                        shortDescriptionHasError &&
                        get(errors, "shortDescription.type") === "manual"
                      ) {
                        methods.clearErrors("shortDescription");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          event.currentTarget.value.length,
                          SHORT_DESCRIPTION_MAX_LENGTH,
                        )
                      ) {
                        event.preventDefault();
                        triggerMaxLengthError(
                          "shortDescription",
                          SHORT_DESCRIPTION_MAX_LENGTH_ERROR,
                        );
                      }
                    }}
                    onPaste={(event) => {
                      if (
                        shouldBlockMaxLengthInput(
                          event,
                          event.currentTarget.value.length,
                          SHORT_DESCRIPTION_MAX_LENGTH,
                        )
                      ) {
                        event.preventDefault();
                        triggerMaxLengthError(
                          "shortDescription",
                          SHORT_DESCRIPTION_MAX_LENGTH_ERROR,
                        );
                      }
                    }}
                    isInvalid={shortDescriptionHasError}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="shortDescription"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div
                  id="publish-project-full-description-field"
                  className="hidden"
                >
                  <div className="space-y-0.5">
                    <Label
                      className="leading-9 text-dark-blue-400 font-semibold"
                      size="lg"
                      htmlFor="full-description"
                    >
                      Full Description
                    </Label>
                    <div className="flex items-center justify-between">
                      <HelperText size="sm">
                        Provide a comprehensive description of this project,
                        including its purpose and features.
                      </HelperText>

                      <span className="text-xs leading-[14.52px] text-gray-500">
                        {fullDescriptionCharacterCount}/
                        {FULL_DESCRIPTION_MAX_LENGTH.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <Controller
                    name="fullDescription"
                    control={methods.control}
                    render={({ field }) => (
                      <RichTextEditor
                        defaultValue={field.value ?? ""}
                        placeholder="<p class='text-gray-400'>Enter a full Description</p>"
                        allowFullscreen
                        className={cn(
                          "rounded-lg border bg-white transition-colors",
                          fullDescriptionHasError
                            ? "border-error-500"
                            : "border-gray-300 focus-within:border-primary-500",
                        )}
                        toolbarClassName="left-4"
                        editorClassName="min-h-[176px] w-full max-w-full min-w-0 overflow-x-hidden px-4 py-4 text-base leading-7 text-gray-700 break-words [overflow-wrap:anywhere] [word-break:break-word] [&_.ProseMirror]:min-h-[150px] [&_.ProseMirror]:w-full [&_.ProseMirror]:max-w-full [&_.ProseMirror]:min-w-0 [&_.ProseMirror]:overflow-x-hidden [&_.ProseMirror]:focus:outline-none [&_[data-font-size='large-heading']]:text-2xl [&_[data-font-size='large-heading']]:font-semibold [&_[data-font-size='large-heading']_strong]:font-bold [&_[data-font-size='normal-heading']]:text-xl [&_[data-font-size='normal-heading']]:font-semibold [&_[data-font-size='normal-heading']_strong]:font-bold [&_[data-font-size='small-heading']]:text-base [&_[data-font-size='small-heading']]:font-semibold [&_[data-font-size='small-heading']_strong]:font-bold [&_h1]:break-words [&_h1]:[word-break:break-word] [&_h1]:text-2xl [&_h1]:font-semibold [&_h1_strong]:font-bold [&_h2]:break-words [&_h2]:[word-break:break-word] [&_h2]:text-xl [&_h2]:font-semibold [&_h2_strong]:font-bold [&_h3]:break-words [&_h3]:[word-break:break-word] [&_h3]:text-base [&_h3]:font-semibold [&_h3_strong]:font-bold [&_img]:my-4 [&_img]:block [&_img]:h-auto [&_img]:w-full [&_img]:max-w-full [&_img]:rounded-lg [&_img]:object-contain [&_li]:break-words [&_li]:[word-break:break-word] [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-7 [&_p]:min-h-[1.75rem] [&_p]:break-words [&_p]:[word-break:break-word] [&_p]:whitespace-pre-wrap [&_strong]:font-bold [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-7"
                        onUpdate={(html) => {
                          field.onChange(html);

                          const contentLength = getRichTextCharacterCount(html);
                          if (contentLength > FULL_DESCRIPTION_MAX_LENGTH) {
                            triggerMaxLengthError(
                              "fullDescription",
                              FULL_DESCRIPTION_MAX_LENGTH_ERROR,
                            );
                            return;
                          }

                          if (
                            fullDescriptionHasError &&
                            get(errors, "fullDescription.message") ===
                              FULL_DESCRIPTION_MAX_LENGTH_ERROR
                          ) {
                            methods.clearErrors("fullDescription");
                          }
                        }}
                        onBlur={(html) => {
                          field.onBlur();

                          const contentLength = getRichTextCharacterCount(html);
                          if (contentLength > FULL_DESCRIPTION_MAX_LENGTH) {
                            triggerMaxLengthError(
                              "fullDescription",
                              FULL_DESCRIPTION_MAX_LENGTH_ERROR,
                            );
                            return;
                          }

                          if (
                            fullDescriptionHasError &&
                            get(errors, "fullDescription.message") ===
                              FULL_DESCRIPTION_MAX_LENGTH_ERROR
                          ) {
                            methods.clearErrors("fullDescription");
                          }

                          void trigger("fullDescription");
                        }}
                      />
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="fullDescription"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div id="publish-project-tags-field" className="hidden">
                  <Controller
                    name="tags"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          if (details.value.length > 10) {
                            methods.setError("tags", {
                              type: "manual",
                              message: "You can only add up to 10 tags",
                            });
                            return;
                          }
                          methods.clearErrors("tags");
                          onChange(details.value);
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <>
                              <div className="space-y-0.5">
                                <TagsInputLabel
                                  className="leading-9 text-dark-blue-400 font-semibold"
                                  size="lg"
                                >
                                  Tags
                                </TagsInputLabel>
                                <div className="flex items-center justify-between">
                                  <HelperText size="sm">
                                    Add up to 10 tags that best describe your
                                    project. Use relevant keywords to highlight
                                    its features and make it easier to find.
                                  </HelperText>

                                  <span className="text-xs leading-[14.52px] text-gray-500">
                                    {projectInfoValues.tags?.length || 0}/10
                                  </span>
                                </div>
                              </div>
                              <TagsInputControl className="relative pr-[28px]">
                                {tagsInput.value.map((value, index) => (
                                  <TagsInputItem
                                    key={index}
                                    index={index}
                                    value={value}
                                  >
                                    <TagsInputItemPreview
                                      visual="primary"
                                      size="md"
                                      className="pr-2 text-primary-500 bg-primary-50"
                                    >
                                      <TagsInputItemText>
                                        {value}
                                      </TagsInputItemText>
                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                        <X2 className="size-3" />
                                      </TagsInputItemDeleteTrigger>
                                    </TagsInputItemPreview>
                                    <TagsInputItemInput />
                                  </TagsInputItem>
                                ))}
                                <TagsInputInput
                                  options={tagOptions}
                                  placeholder="Add Tags"
                                  allowCreateOption
                                  onInputValueChange={(value) => {
                                    fetchTypeAutocomplete(
                                      "search_keywords",
                                      value,
                                      setTagOptions,
                                    );
                                  }}
                                />

                                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                              </TagsInputControl>
                            </>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="tags"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                <div id="publish-project-skills-field" className="hidden">
                  <Controller
                    name="skills"
                    control={methods.control}
                    render={({ field: { onChange, ...field } }) => (
                      <TagsInputRoot
                        onValueChange={(details) => {
                          if (details.value.length > 10) {
                            methods.setError("skills", {
                              type: "manual",
                              message: "You can only add up to 10 skills",
                            });
                            return;
                          }
                          methods.clearErrors("skills");
                          onChange(details.value);
                        }}
                        {...field}
                        className="space-y-1.5"
                      >
                        <TagsInputContext>
                          {(tagsInput) => (
                            <>
                              <div className="space-y-0.5">
                                <TagsInputLabel
                                  className="leading-9 text-dark-blue-400 font-semibold"
                                  size="lg"
                                >
                                  Skills
                                </TagsInputLabel>
                                <div className="flex items-center justify-between">
                                  <HelperText size="sm">
                                    List up to 10 key skills or proficiencies
                                    required to implement this project
                                    effectively.
                                  </HelperText>

                                  <span className="text-xs leading-[14.52px] text-gray-500">
                                    {projectInfoValues.skills?.length || 0}/10
                                  </span>
                                </div>
                              </div>
                              <TagsInputControl className="relative pr-[28px]">
                                {tagsInput.value.map((value, index) => (
                                  <TagsInputItem
                                    key={index}
                                    index={index}
                                    value={value}
                                  >
                                    <TagsInputItemPreview
                                      visual="primary"
                                      size="md"
                                      className="pr-2 text-primary-500 bg-primary-50"
                                    >
                                      <TagsInputItemText>
                                        {value}
                                      </TagsInputItemText>
                                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                                        <X2 className="size-3" />
                                      </TagsInputItemDeleteTrigger>
                                    </TagsInputItemPreview>
                                    <TagsInputItemInput />
                                  </TagsInputItem>
                                ))}
                                <TagsInputInput
                                  options={skills}
                                  placeholder="Add Skills"
                                  allowCreateOption
                                  onInputValueChange={(value) => {
                                    fetchTypeAutocomplete(
                                      "skills",
                                      value,
                                      setSkills,
                                    );
                                  }}
                                />

                                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
                              </TagsInputControl>
                            </>
                          )}
                        </TagsInputContext>
                        <TagsInputHiddenInput />
                      </TagsInputRoot>
                    )}
                  />

                  <HookFormErrorMessage
                    errors={errors}
                    name="skills"
                    render={({ message }) => (
                      <ErrorMessage size="sm">{message}</ErrorMessage>
                    )}
                  />
                </div>

                {getIsNotEmpty(suggestedSkillsForDisplay) ? (
                  <div className="hidden">
                    <span className="block text-xs leading-5 text-dark-blue-400">
                      Suggested Skills
                    </span>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
                      {suggestedSkillsForDisplay.map(
                        (suggestedSkill, index) => (
                          <Badge
                            size="md"
                            className="pr-2 bg-primary-50 focus-visible:outline-none text-primary-500"
                            visual="primary"
                            key={index}
                            asChild
                          >
                            <Button
                              variant="link"
                              type="button"
                              className="hover:no-underline"
                              onClick={() => {
                                const next = projectInfoValues.skills
                                  ? [
                                      ...projectInfoValues.skills,
                                      suggestedSkill,
                                    ]
                                  : [suggestedSkill];

                                // tell RHF this field changed and should be validated
                                setValue("skills", next, {
                                  shouldDirty: true,
                                  shouldValidate: true,
                                });
                              }}
                            >
                              {suggestedSkill}
                              <Plus2 className="size-3 opacity-50 hover:opacity-100" />
                            </Button>
                          </Badge>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <ProjectInfoTip
              showArrow
              variant={contractChoice === "new" ? "scope" : "contract"}
            />
          </div>
        </div>
      </ScrollArea>
    </form>
  );
};

interface MediaTipProps {
  showArrow?: boolean;
  closeTrigger?: React.ReactNode;
  className?: string;
}
const MediaTip = ({ showArrow, closeTrigger, className }: MediaTipProps) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className,
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}
      {closeTrigger}
      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-normal font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-normal text-black/60">
          Strong visuals build trust at a glance.
        </span>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4">
          <li className="text-sm leading-normal text-gray-500">
            Upload a professional, high-quality image to represent your scope.
          </li>
          <li className="text-sm leading-normal text-gray-500 mt-5">
            Ensure it reflects the essence of your work and attracts attention
            in the marketplace.
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <X className="size-5 shrink-0 text-error-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Avoid
          </span>
        </div>

        <div className="mt-3">
          <span className="text-sm leading-normal text-gray-500">
            Use impactful keywords that communicate value and make it easy to
            identify in a list of projects.
          </span>
        </div>
      </div>
    </div>
  );
};

const mediaFormSchema = z
  .object({
    featuredImages: z
      .array(
        z.object({
          meta: z.any(),
          progress: z.number(),
          hasError: z.boolean(),
        }),
        {
          required_error: "Please upload a file",
        },
      )
      .min(1, "Please at least upload 1 image(s)"),
    additionalImages: z.array(
      z
        .array(
          z.object({
            meta: z.any(),
            progress: z.number(),
            hasError: z.boolean(),
          }),
          {
            required_error: "Please upload a file",
          },
        )
        .optional(),
    ),
    featuredVideo: z
      .string()
      .refine(
        (value) => {
          const rawValue = value?.trim();
          if (!rawValue) return true; // allow empty value

          const normalized = /^https?:\/\//i.test(rawValue)
            ? rawValue
            : `https://${rawValue.replace(/^\/+/, "")}`;

          try {
            const parsed = new URL(normalized);
            return (
              (parsed.protocol === "http:" || parsed.protocol === "https:") &&
              parsed.hostname.includes(".")
            );
          } catch {
            return false;
          }
        },
        {
          message: "Please enter a valid URL",
        },
      )
      .optional(),
  })
  .refine(
    (data) => data.featuredImages.every((value) => value.progress === 100),
    {
      message: "Please let the images get uploaded to the server",
      path: ["featuredImage"],
    },
  )
  .refine(
    (data) =>
      z
        .array(
          z
            .array(
              z.object({
                meta: z.any(),
                progress: z.literal(100),
                hasError: z.literal(false).optional(),
              }),
            )
            .optional(),
        )
        .safeParse(data.additionalImages),
    {
      message: "Please let the images get uploaded to the server",
      path: ["additionalImages"],
    },
  );

type MediaFormValues = {
  featuredImages: {
    progress: number;
    hasError: boolean;
    meta: any;
  }[];
  additionalImages: {
    progress: number;
    hasError: boolean;
    meta: any;
  }[][];
  featuredVideo: string;
};

const MEDIA_VALIDATION_TARGETS: Array<{
  name: FieldPath<MediaFormValues>;
  targetId: string;
}> = [
  { name: "featuredImages", targetId: "publish-project-featured-images-field" },
  {
    name: "additionalImages",
    targetId: "publish-project-additional-images-field",
  },
  { name: "featuredVideo", targetId: "publish-project-featured-video-field" },
];
type MediaProps = {
  setProgress?: (val: number) => void;
};

const Media = ({ setProgress }: { setProgress?: (val: number) => void }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { toggleValidation } = useStepContext();
  const {
    control,
    formState: { errors, isValid, isSubmitted },
    setError,
    handleSubmit,
    trigger,
    setValue,
  } = useMediaContext();

  const { currentStep } = useStepRootContext();
  const [progressValue, setProgressValue] = useState(0);

  const onSubmit: SubmitHandler<MediaFormValues> = (values) => {};

  const mediaValues = useWatch({ control: control });
  const isMediaValid = mediaFormSchema.safeParse(mediaValues).success;
  const { error } = mediaFormSchema.safeParse(mediaValues);
  const featuredImage = useWatch({ control, name: "featuredImages" });
  const additionalImages = useWatch({ control, name: "additionalImages" });
  const featuredVideo = useWatch({ control, name: "featuredVideo" });

  useIsomorphicLayoutEffect(() => {
    toggleValidation(isMediaValid);
  }, [isMediaValid]);

  const featuredImageRef = React.useRef(featuredImage);
  const progressValueRef = React.useRef(progressValue);

  useEffect(() => {
    featuredImageRef.current = featuredImage;
  }, [featuredImage]);

  useEffect(() => {
    progressValueRef.current = progressValue;
  }, [progressValue]);

  useEffect(() => {
    if (currentStep === 1) {
      let count = 0;

      const allFeaturedUploaded =
        Array.isArray(featuredImage) &&
        featuredImage.length > 0 &&
        featuredImage.every((img) => img.progress === 100);

      const hasAdditionalImages =
        Array.isArray(additionalImages) &&
        additionalImages.some(
          (group) =>
            Array.isArray(group) && group.some((img) => img.progress === 100),
        );

      if (allFeaturedUploaded) count += 1;
      if (hasAdditionalImages) count += 1;
      if (featuredVideo) count += 1;

      const percent = count * 11;
      setProgressValue(percent);
      setProgress?.(percent);
    }
  }, [
    currentStep,
    featuredImage,
    additionalImages,
    featuredVideo,
    setProgress,
  ]);

  useEffect(() => {
    return () => {
      // only when leaving the Media step
      if (currentStep !== 1) return;

      const fi = featuredImageRef.current;
      const allFeaturedUploaded =
        Array.isArray(fi) &&
        fi.length > 0 &&
        fi.every((img) => img.progress === 100);

      if (allFeaturedUploaded) {
        // bump Media to at least its full 33% share,
        // but don't reduce if user already reached 55/66
        const bumped = Math.max(progressValueRef.current ?? 0, 33);
        setProgressValue(bumped);
        setProgress?.(bumped);
      } else {
        setProgressValue(0);
        setProgress?.(0);
      }
    };
  }, [currentStep, setProgress]);

  const ref = React.useRef(new Set<() => void>());

  useUnmountEffect(() => {
    ref.current.forEach((cb) => cb());
    ref.current.clear();
  });
  //Report progress to parent whenever it changes
  useEffect(() => {
    setProgress?.(progressValue);
  }, [progressValue, setProgress]);

  return (
    <form className="contents" onSubmit={handleSubmit(onSubmit)}>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] flex flex-col gap-y-10 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    Make your project stand out with a better images.
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <MediaTip
                      className="w-full"
                      closeTrigger={
                        <DialogClose asChild>
                          <IconButton
                            className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                            variant="light"
                            visual="gray"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      }
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="flex-auto min-w-0">
            <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
              Media
            </h1>

            <div
              id="publish-project-featured-images-field"
              className="space-y-3 mt-6"
            >
              <div className="space-y-0.5">
                <Label
                  className="leading-9 text-dark-blue-400 font-semibold"
                  size="lg"
                  htmlFor="title"
                  asChild
                >
                  <span>Featured Image</span>
                </Label>

                <HelperText size="sm">
                  Make a strong first impression with a standout featured image.
                </HelperText>
              </div>
              <Controller
                control={control}
                name="featuredImages"
                render={({ field: { value, onChange } }) => (
                  <Dropzone
                    className="transition-colors duration-300"
                    size="lg"
                    icon
                    value={value}
                    onValueChange={(value) => {
                      ref.current.forEach((cb) => cb());
                      ref.current.clear();

                      onChange(value);

                      ref.current.add(
                        debounce(
                          () =>
                            onChange(
                              value?.map((item) => ({
                                ...item,
                                progress: 50,
                              })),
                            ),
                          ONE_SECOND * 3,
                        ).cancel,
                      );
                      ref.current.add(
                        debounce(
                          () =>
                            onChange(
                              value?.map((item) => ({
                                ...item,
                                progress: 100,
                              })),
                            ),
                          ONE_SECOND * 6,
                        ).cancel,
                      );
                    }}
                    onError={(message) =>
                      setError("featuredImages", { message })
                    }
                  />
                )}
              />

              <HookFormErrorMessage
                errors={errors}
                name="featuredImages"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            <div
              id="publish-project-additional-images-field"
              className="space-y-3 mt-6"
            >
              <div className="space-y-0.5">
                <Label
                  className="leading-9 text-dark-blue-400 font-semibold"
                  size="lg"
                  htmlFor="title"
                  asChild
                >
                  <span>Additional Images</span>
                </Label>

                <HelperText size="sm">
                  Include additional images to showcase more details.
                </HelperText>
              </div>

              <div className="grid grid-cols-4 gap-2.5">
                {Array.from({ length: 8 }, (_, index) => index).map((index) => (
                  <Controller
                    key={index}
                    name={`additionalImages.${index}`}
                    control={control}
                    render={({ field: { value, onChange } }) => (
                      <SquareShapeDropzone
                        className="transition-colors duration-300"
                        value={value}
                        onValueChange={(value) => {
                          onChange(
                            value?.map((item) => ({ ...item, progress: 50 })),
                          );
                          window.setTimeout(() => {
                            onChange(
                              value?.map((item) => ({
                                ...item,
                                progress: 100,
                              })),
                            );
                          }, ONE_SECOND * 2);
                          isSubmitted ? trigger("additionalImages") : noop;
                        }}
                        onError={(message) =>
                          setError(`additionalImages.${index}`, { message })
                        }
                      />
                    )}
                  />
                ))}
              </div>

              <HookFormErrorMessage
                errors={errors}
                name="additionalImages.root"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />
            </div>

            <div
              id="publish-project-featured-video-field"
              className="space-y-3 mt-6"
            >
              <div className="space-y-0.5">
                <Label
                  className="leading-9 text-dark-blue-400 font-semibold"
                  size="lg"
                  htmlFor="featured-video"
                >
                  Featured Video
                </Label>

                <HelperText size="sm">
                  Grab attention with a compelling video that showcases your
                  vision.
                </HelperText>
              </div>

              <InputGroup>
                <InputLeftAddon>https://</InputLeftAddon>
                <Controller
                  control={control}
                  name="featuredVideo"
                  render={({ field: { onChange, value, ...field } }) => (
                    <Input
                      type="text"
                      id="featured-video"
                      className="rounded-l-none"
                      placeholder="www.video.com"
                      value={(value || "").replace(/^https?:\/\//i, "")}
                      onChange={(event) => {
                        const {
                          target: { value },
                        } = event;
                        const cleanedValue = value.trim();
                        if (!cleanedValue) {
                          onChange("");
                          return;
                        }
                        const normalized = /^https?:\/\//i.test(cleanedValue)
                          ? cleanedValue
                          : `${HTTPS}${cleanedValue.replace(/^\/+/, "")}`;
                        onChange(
                          normalized.replace(/^(https?:\/\/)+/i, "https://"),
                        );
                      }}
                      {...field}
                      isInvalid={hookFormHasError({
                        errors,
                        name: "featuredVideo",
                      })}
                    />
                  )}
                />
              </InputGroup>

              <HookFormErrorMessage
                errors={errors}
                name="featuredVideo"
                render={({ message }) => (
                  <ErrorMessage size="sm">{message}</ErrorMessage>
                )}
              />

              {(() => {
                const previewUrl = mediaValues.featuredVideo;
                if (!previewUrl) return null;
                if (error?.formErrors.fieldErrors.featuredVideo) {
                  return null;
                }
                return (
                  <div className="mt-6 inline-flex flex-col items-start gap-3">
                    {mounted && (
                      <ReactPlayer
                        url={previewUrl}
                        width={229}
                        height={140}
                        style={{
                          borderRadius: "0.5rem",
                          overflow: "hidden",
                        }}
                      />
                    )}

                    <Button
                      variant="outlined"
                      visual="error"
                      size="sm"
                      className="gap-2 rounded-md px-3 font-medium text-error-600 hover:bg-error-50"
                      type="button"
                      leftIcon={<Trash01 className="size-4" />}
                      onClick={() => {
                        setValue("featuredVideo", "");
                        isValid ? trigger("featuredVideo") : noop();
                      }}
                    >
                      Remove video
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <MediaTip />
          </div>
        </div>
      </ScrollArea>
    </form>
  );
};

const ProjectScopeTip = ({
  showArrow,
  closeTrigger,
  className,
}: {
  showArrow?: boolean;
  closeTrigger?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "p-5 rounded-lg w-[269px] bg-primary-50 relative",
        className,
      )}
    >
      {showArrow && (
        <div className="absolute size-[25.45px] rotate-45 top-[35px] -left-[12.725px] bg-primary-50" />
      )}

      {closeTrigger}

      <div className="flex items-center gap-x-2">
        <Lightbulb05 className="size-[30px] shrink-0 text-primary-500" />
        <span className="text-base leading-normal font-semibold text-gray-900">
          Tip
        </span>
      </div>
      <div className="mt-1">
        <span className="text-xs leading-normal block text-dark-blue-400">
          Clarify phases, owners, and deliverables.
        </span>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-xs leading-normal tracking-[0.01em] text-dark-blue-400">
            Ensure all phases and tasks align with your project goals and
            deliverables.
          </li>
          <li className="text-xs leading-normal tracking-[0.01em] text-dark-blue-400">
            Review dependencies, timelines, and assignments for clarity.
          </li>
        </ul>
      </div>

      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-3 px-0" variant="link" type="button">
            <PlayCircle className="size-5" /> Show me how
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Project Scope Tip Video</DialogTitle>
          </DialogHeader>
          {PROJECT_SCOPE_TIP_VIDEO_URL ? (
            <ReactPlayer
              controls
              width="100%"
              height={300}
              url={PROJECT_SCOPE_TIP_VIDEO_URL}
            />
          ) : (
            <p className="text-sm text-gray-500">
              Tip video URL is not configured yet. Add
              `NEXT_PUBLIC_PROJECT_SCOPE_TIP_VIDEO_URL` in `.env`.
            </p>
          )}
        </DialogContent>
      </Dialog>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <Check className="size-5 shrink-0 text-success-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Best practice
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-normal text-gray-500">
            Use the project planner to edit existing phases or tasks
            effortlessly.
          </li>
          <li className="text-sm leading-normal text-gray-500">
            Double-check for any overlapping or missing tasks to maintain
            efficiency.
          </li>
          <li className="text-sm leading-normal text-gray-500">
            Add new phases, tasks, or processes quickly with the + Add option. •
          </li>
        </ul>
      </div>

      <div className="mt-3 p-4 rounded-lg border-gray-300 bg-gray-25">
        <div className="flex items-center gap-x-3">
          <X className="size-5 shrink-0 text-error-500" />{" "}
          <span className="text-sm leading-5 font-semibold text-gray-700">
            Avoid
          </span>
        </div>

        <ul className="mt-3 list-disc pl-4 space-y-5">
          <li className="text-sm leading-[16.94px] text-gray-500">
            Leaving phases or tasks incomplete or ambiguous.
          </li>
          <li className="text-sm leading-[16.94px] text-gray-500">
            Try not to overload a single phase with too many tasks; break them
            down if needed.
          </li>
        </ul>
      </div>
    </div>
  );
};

const phaseNameFormSchema = z.object({
  name: z.string().min(1, "Please enter at least 1 character(s)"),
});

type PhaseNameFormValues = z.infer<typeof phaseNameFormSchema>;

const PhaseNameDialog = ({
  onOpenChange,
  onAddPhaseName,
  open,
  defaultName,
  placeholder = "Enter Phase Name",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAddPhaseName: (phaseName: string) => void;
  defaultName?: string;
  placeholder?: string;
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PhaseNameFormValues>({
    resolver: zodResolver(phaseNameFormSchema),
    defaultValues: { name: defaultName ?? "" },
  });

  // whenever dialog opens for a different phase, sync the input
  useEffect(() => {
    if (isOpen) {
      reset({ name: defaultName ?? "" });
    }
  }, [isOpen, defaultName, reset]);

  const onSubmit: SubmitHandler<PhaseNameFormValues> = (values) => {
    const { name } = values;
    onAddPhaseName(name);

    toggleIsOpen(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
        <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
          <form
            className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="space-y-1.5">
              <Label
                htmlFor="phase-name"
                className="text-dark-blue-400"
                size="sm"
              >
                Phase Name
              </Label>
              <Input
                id="phase-name"
                className="text-gray-900"
                placeholder={placeholder}
                {...register("name")}
                isInvalid={hookFormHasError({ errors, name: "name" })}
              />
              <HookFormErrorMessage
                errors={errors}
                name="name"
                render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
              />
            </div>

            <DialogFooter className="mt-8 grid gap-x-3">
              <DialogClose asChild>
                <Button type="button" variant="outlined" visual="gray">
                  Cancel
                </Button>
              </DialogClose>

              <Button>Done</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

type TaskFormValues = z.infer<typeof taskFormSchema>;

const TaskDialog = ({
  open,
  onOpenChange,
  onAddTask,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAddTask: (values: TaskFormValues) => void;
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      task: "",
      role: "",
      location: "",
      experience: undefined,
      duration: {
        type: "days",
        value: 1,
      },
    },
  });
  const taskDurationValue = useWatch({
    control,
    name: "duration.value",
    defaultValue: 1,
  });
  const onSubmit: SubmitHandler<TaskFormValues> = (values) => {
    onAddTask(values);
    toggleIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <form
          className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="space-y-1.5">
            <Label htmlFor="task-name" className="text-gray-700" size="sm">
              Task Name
            </Label>
            <Input
              id="task-name"
              className="text-gray-900"
              {...register("task")}
              isInvalid={hookFormHasError({ errors, name: "task" })}
            />
            <HookFormErrorMessage
              errors={errors}
              name="task"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="duration" className="text-gray-700" size="sm">
              Duration
            </Label>
            <div className="grid grid-cols-2 gap-x-3">
              <Input
                id="duration"
                className="text-gray-900"
                type="number"
                min={1}
                {...register("duration.value")}
                isInvalid={hookFormHasError({ errors, name: "duration.value" })}
              />
              <Controller
                control={control}
                name="duration.type"
                render={({ field: { value, onChange } }) => (
                  <Listbox value={value} onChange={onChange} id="duration">
                    <ListboxButton placeholder="Select">
                      {({ value: selectedValue }) =>
                        formatDurationUnit(
                          Number(taskDurationValue) || 0,
                          selectedValue as (typeof DURATION_TYPE)[number],
                        ).replace(/^./, (character) => character.toUpperCase())
                      }
                    </ListboxButton>
                    <ListboxOptions>
                      {DURATION_TYPE.map((format) => (
                        <ListboxOption key={format} value={format}>
                          {formatDurationUnit(
                            Number(taskDurationValue) || 0,
                            format,
                          ).replace(/^./, (character) =>
                            character.toUpperCase(),
                          )}
                        </ListboxOption>
                      ))}
                    </ListboxOptions>
                  </Listbox>
                )}
              />
            </div>

            {(hookFormHasError({ errors, name: "duration.value" }) ||
              hookFormHasError({
                errors,
                name: "duration.type",
              })) && (
              <ErrorMessage size="sm">
                {get(errors, "duration.value.message") ||
                  get(errors, "duration.type.message")}
              </ErrorMessage>
            )}
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="role-name" className="text-gray-700" size="sm">
              Role
            </Label>
            <Controller
              control={control}
              name="role"
              render={({ field: { value, onChange } }) => (
                <OwnCombobox
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select role"
                  options={ROLES}
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="role"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="location" className="text-gray-700" size="sm">
              Location
            </Label>
            <Controller
              control={control}
              name="location"
              render={({ field: { value, onChange } }) => (
                <CountriesCombobox
                  placeholder="Select country"
                  value={value}
                  onValueChange={onChange}
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="location"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <div className="space-y-1.5 mt-3">
            <Label htmlFor="experience" className="text-gray-700" size="sm">
              Experience
            </Label>
            <Controller
              control={control}
              name="experience"
              render={({ field: { value, onChange } }) => (
                <Dropdown
                  value={value}
                  onValueChange={onChange}
                  placeholder="Select experience"
                />
              )}
            />
            <HookFormErrorMessage
              errors={errors}
              name="experience"
              render={({ message }) => <ErrorMessage>{message}</ErrorMessage>}
            />
          </div>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" type="button" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button>Done</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SaveExitDialog = ({
  onOpenChange,
  open,
  onConfirm,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void;
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  });
  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Save & Exit</DialogTitle>
          <DialogDescription>
            Would you like to save your project scope progress before exiting?
            You can resume editing any time.
          </DialogDescription>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={onConfirm}>Save & Exit</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const TaskSearchDialog = ({
  open,
  onOpenChange,
  phases,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  phases: Phase[];
}) => {
  const [isOpen, setIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  });
  const [query, setQuery] = useState("");

  const searchableItems = useMemo(
    () =>
      phases.flatMap((phase, phaseIndex) => {
        const phaseLabel = `Phase ${phaseIndex + 1}: ${phase.phaseName || "Untitled"}`;
        const rows = Array.isArray(phase.rows) ? phase.rows : [];
        const tasks = rows.map((row, rowIndex) => ({
          label: `Task ${rowIndex + 1}: ${row.task}`,
        }));
        return [{ label: phaseLabel }, ...tasks];
      }),
    [phases],
  );

  const filteredItems = useMemo(() => {
    if (!query.trim()) return searchableItems;
    const normalized = query.trim().toLowerCase();
    return searchableItems.filter((item) =>
      item.label.toLowerCase().includes(normalized),
    );
  }, [query, searchableItems]);

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[420px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Task Name</DialogTitle>
          <DialogDescription>
            Find a phase or task from your project scope.
          </DialogDescription>

          <div className="mt-3">
            <Input
              type="text"
              placeholder="Find a phase or task"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-4 max-h-[240px] overflow-auto rounded-md border border-gray-200">
            {filteredItems.length ? (
              filteredItems.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="px-3 py-2 text-sm text-gray-700 border-b border-gray-100 last:border-b-0"
                >
                  {item.label}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-gray-500">
                No phase or task found.
              </div>
            )}
          </div>

          <DialogFooter className="mt-6">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Dropdown = ({
  onValueChange,
  value,
  placeholder,
}: {
  onValueChange?: (value: ExperienceLevel | undefined) => void;
  value?: ExperienceLevel;
  placeholder?: string;
}) => {
  const [state, setState] = useControllableState<ExperienceLevel | undefined>({
    onChange: onValueChange,
    value,
  });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="bg-gray-100 focus-visible:outline-none px-2 py-[5px] border border-gray-300 border-dashed rounded-[5px] inline-flex items-center gap-x-1.5">
        <span className="text-xs leading-[18px] font-medium text-gray-700">
          {state ? state : placeholder}
        </span>
        <ChevronDown className="size-[18px] shrink-0 text-gray-500" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="min-w-max">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(nextValue) => setState(nextValue as ExperienceLevel)}
        >
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Junior"
          >
            <Network1 />
            Junior (0 - 3 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Mid"
          >
            <Network2 />
            Mid (3 - 7 years)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem
            className="gap-x-2"
            hideIndicator={false}
            value="Senior"
          >
            <Network3 />
            Senior (7+ years)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const DeletePhaseDialog = ({
  onOpenChange,
  open,
  onDeletePhase,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDeletePhase: () => void;
}) => {
  const [isOpen, toggleIsOpen] = useControllableState({
    defaultValue: false,
    value: open,
    onChange: onOpenChange,
  });
  return (
    <Dialog open={isOpen} onOpenChange={toggleIsOpen}>
      <DialogContent className="px-5 w-full py-10 md:px-10 bg-transparent shadow-none rounded-none">
        <div className="max-w-[371px] bg-white p-6 rounded-xl shadow-[0px_8px_8px_-4px_rgba(16,24,40,.03)_0px_20px_24px_-4px_rgba(16,24,40,.08)]">
          <DialogTitle>Delete this phase</DialogTitle>
          <DialogDescription>
            This phase will be deleted permanently. You will not be able to
            recover it.
          </DialogDescription>

          <DialogFooter className="mt-8 grid gap-x-3">
            <DialogClose asChild>
              <Button variant="outlined" visual="gray">
                Cancel
              </Button>
            </DialogClose>

            <Button
              onClick={() => {
                onDeletePhase();
                toggleIsOpen(false);
              }}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const MoreDropdown = (props: {
  openDeletePhaseDialog: () => void;
  openPhaseDialog: () => void;
  onChangeDuration: () => void;
  onInsertBelow: () => void;
  onInsertAbove: () => void;
  onDuplicatePhase: () => void;
  onSwapPhases: (to: number) => void;
}) => {
  const {
    openDeletePhaseDialog,
    openPhaseDialog,
    onChangeDuration,
    onInsertAbove,
    onInsertBelow,
    onDuplicatePhase,
    onSwapPhases: onSwapPhasesProp,
  } = props;
  const arrayNavigator = useArrayNavigationContext();
  const selectedIndex = arrayNavigator?.selectedIndex;

  const onSwapPhases = useCallbackRef(onSwapPhasesProp);

  useUpdateEffect(() => {
    if (selectedIndex !== undefined) {
      onSwapPhases(selectedIndex);
    }
  }, [onSwapPhases, selectedIndex]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className="h-[23px] px-1.5 py-1 text-gray-500"
          variant="ghost"
          visual="gray"
        >
          <MoreHorizontal className="h-[15px] w-[15px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!arrayNavigator?.canMoveLeft}
          onSelect={arrayNavigator?.moveToLeft}
        >
          <ArrowUp className="h-4 w-4" /> Move Up
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!arrayNavigator?.canMoveRight}
          onSelect={arrayNavigator?.moveToRight}
        >
          <ArrowDown className="h-4 w-4" /> Move Down
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDuplicatePhase}>
          <Copy className="h-4 w-4" /> Duplicate Phase
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onInsertAbove}>
          <ArrowUpLeft className="h-4 w-4" /> Insert Phase Above
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onInsertBelow}>
          <ArrowDownLeft className="h-4 w-4" /> Insert Phase Below
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={openPhaseDialog}>
          <Type className="h-4 w-4" /> Rename Phase
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onChangeDuration}>
          <Clock className="h-4 w-4" /> Change Duration
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem visual="destructive" onSelect={openDeletePhaseDialog}>
          <Trash2 className="h-4 w-4" /> Delete Phase
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const PlusDropdown = ({
  addPhase,
  addTask,
}: {
  addTask: () => void;
  addPhase: () => void;
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <IconButton className="text-gray-500" variant="outlined" visual="gray">
          <Plus className="size-3" />
        </IconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-auto" align="end">
        <DropdownMenuItem onSelect={addTask}>
          <Plus className="size-4" /> Add Task
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={addPhase}>
          <Plus className="h-4 w-4" /> Add Phase
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

type PhaseRow = Prettify<
  {
    id: string;
    role?: string;
    location?: string;
    experience?: string;
    workSchedule?: JobListingWorkSchedule;
    customHours?: number;
    customFrequency?: string;
    contractLengthMonths?: number;
    hourlyRateLowUsdCents?: number;
    hourlyRateHighUsdCents?: number;
  } & TaskFormValues
>;

interface Phase {
  phaseName?: string;
  phaseType?: JobListingPhaseType;
  recurrenceSchedule?: string;
  recurrenceCount?: number;
  rows?: PhaseRow[];
}

const getPhaseDurationInDays = (phase?: Phase) => {
  const rows = phase?.rows ?? [];

  return rows.reduce((sum, row) => {
    const value = Number(row?.duration?.value);
    const type = row?.duration?.type;

    if (!Number.isFinite(value) || value <= 0 || !type) return sum;

    if (type !== "hours") {
      return sum + durationToDays(value, type);
    }

    if (row.workSchedule === "custom") {
      const customHours = Number(row.customHours);
      if (!Number.isFinite(customHours) || customHours <= 0) return sum;

      const frequencyDays =
        row.customFrequency === "per_day"
          ? 1
          : row.customFrequency === "per_month"
            ? 21.67
            : row.customFrequency === "per_quarter"
              ? 65
              : row.customFrequency === "per_year"
                ? 260
                : 5;
      const hoursPerDay = customHours / frequencyDays;

      return hoursPerDay > 0 ? sum + Math.ceil(value / hoursPerDay) : sum;
    }

    const hoursPerDay = row.workSchedule === "part_time" ? 4 : 8;

    return sum + Math.ceil(value / hoursPerDay);
  }, 0);
};

const getPhaseDayRange = (phases: Phase[], phaseIndex: number) => {
  const priorDays = phases
    .slice(0, phaseIndex)
    .reduce((sum, phase) => sum + getPhaseDurationInDays(phase), 0);
  const startDay = priorDays + 1;
  const duration = getPhaseDurationInDays(phases[phaseIndex]);
  const endDay = duration > 0 ? startDay + duration - 1 : undefined;

  return { startDay, endDay };
};

const getPhaseDayRangeLabel = (phases: Phase[], phaseIndex: number) => {
  const { startDay, endDay } = getPhaseDayRange(phases, phaseIndex);

  if (typeof endDay !== "number" || endDay === startDay) {
    return `Day ${startDay}`;
  }

  return `Day ${startDay} - Day ${endDay}`;
};

const getProjectTimelineDaysFromScope = (phases: Phase[]) =>
  phases.reduce((sum, phase) => sum + getPhaseDurationInDays(phase), 0);

const getProjectTimelineMonthsFromScope = (phases: Phase[]) => {
  const totalDays = getProjectTimelineDaysFromScope(phases);
  const totalWeeks = Math.ceil(totalDays / 5);

  return totalWeeks > 0 ? Math.ceil(totalWeeks / 4.33) : 0;
};

const getPhaseSearchTargetId = (phaseIndex: number) =>
  `project-scope-phase-${phaseIndex}`;

const getTaskSearchTargetId = (phaseIndex: number, rowIndex: number) =>
  `project-scope-phase-${phaseIndex}-task-${rowIndex}`;

const normalizeSearchText = (value?: string) =>
  (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();

const createDefaultPhaseRow = (seed = getId()): PhaseRow => ({
  id: `phase-task-${seed}`,
  task: "New Task",
  role: "Specialist",
  location: "USA",
  experience: "Junior",
  duration: { value: 10, type: "hours" },
  workSchedule: "full_time",
});

interface PhaseTableRowProps {
  row: Row<PhaseRow>;
}

const PhaseTableRow = ({ row }: PhaseTableRowProps) => {
  const { transform, transition, setNodeRef, isDragging, isOver } = useSortable(
    {
      id: row.original.id,
    },
  );

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform), //let dnd-kit do its thing
    transition: transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <TableRow
      className={cn(
        "group/row hover:bg-transparent relative",
        isOver &&
          "after:content-[''] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary-500",
      )}
      ref={setNodeRef}
      style={style}
    >
      {row.getVisibleCells().map((cell) => (
        <Fragment key={cell.id}>
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </Fragment>
      ))}
    </TableRow>
  );
};

const RowDragHandleCell = ({ rowId }: { rowId: string }) => {
  const { attributes, listeners } = useSortable({
    id: rowId,
  });
  return (
    <Button
      variant="link"
      visual="gray"
      className="opacity-0 text-gray-900/50 group-hover/row:opacity-100 hover:text-gray-900"
      {...attributes}
      {...listeners}
    >
      <GripVertical2 />
    </Button>
  );
};

const columnHelper = createColumnHelper<PhaseRow>();

const columns = [
  columnHelper.accessor("task", {
    cell: ({ getValue, row: { id } }) => (
      <TableCell className="py-4 px-6">
        <span className="inline-flex items-center gap-x-1.5">
          <RowDragHandleCell rowId={id} />
          <span className="text-sm font-semibold text-gray-900">
            {getValue()}
          </span>
        </span>
      </TableCell>
    ),
    header: "Task Name",
  }),
  columnHelper.accessor("role", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState({
        defaultValue: getValue(),
        onChange: (value) => table.options.meta?.updateData(index, id, value),
      });

      return (
        <TableCell className="py-4 px-6">
          <OwnCombobox
            value={value}
            onValueChange={setValue}
            placeholder="Add Role"
            options={table.options.meta?.roles}
            triggerClassName="max-w-full"
          />
        </TableCell>
      );
    },
    header: "Role",
  }),
  columnHelper.accessor("location", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState({
        defaultValue: getValue(),
        onChange: () => {
          table.options.meta?.updateData(index, id, value);
        },
      });
      return (
        <TableCell className="px-3 py-4">
          <CountriesCombobox
            placeholder="Location"
            value={value}
            onValueChange={setValue}
          />
        </TableCell>
      );
    },
    header: "Location",
  }),
  columnHelper.accessor("experience", {
    cell: ({ getValue, row: { index }, column: { id }, table }) => {
      // eslint-disable-next-line
      const [value, setValue] = useUncontrolledState<
        ExperienceLevel | undefined
      >({
        defaultValue: getValue(),
        onChange: (value) => table.options.meta?.updateData(index, id, value),
      });
      return (
        <TableCell className="py-4 px-6">
          <Dropdown
            placeholder="Experience"
            value={value}
            onValueChange={(nextValue) => {
              if (!nextValue) return;
              setValue(nextValue);
            }}
          />
        </TableCell>
      );
    },
    header: "Experience",
  }),
  columnHelper.accessor("duration", {
    cell: ({ getValue, table, row: { index } }) => (
      <TableCell className="py-4 px-6">
        <Button
          variant="link"
          className="font-normal text-inherit hover:no-underline"
          type="button"
          onClick={() => table.options.meta?.openDurationDialog(index)}
        >
          {getValue().value}{" "}
          {formatDurationUnit(getValue().value, getValue().type)}
        </Button>
      </TableCell>
    ),
    header: "Duration",
  }),
];

interface PhaseTableProps {
  rows: PhaseRow[];
  onRowsChange: (rows: PhaseRow[]) => void;
  openDurationDialog: (index: number) => void;
}

const ROLES = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "DevOps Engineer",
  "Data Scientist",
  "Machine Learning Engineer",
  "Cloud Engineer",
  "Database Administrator",
  "Security Engineer",
  "Mobile Developer",
  "QA Engineer",
  "System Architect",
  "Network Engineer",
  "Site Reliability Engineer (SRE)",
  "Software Engineer",
  "UI/UX Designer",
  "Graphic Designer",
  "Product Designer",
  "Interaction Designer",
  "Visual Designer",
  "Motion Designer",
  "Web Designer",
  "Brand Designer",
  "Illustrator",
  "Information Architect",
  "User Researcher",
  "Content Strategist",
  "Design Technologist",
  "Experience Designer",
  "Service Designer",
];

const useArrayNavigator = <T,>(items: T[], itemIndex: number) => {
  const [selectedIndex, setSelectedIndex] = useState(itemIndex);

  const canMoveLeft = itemIndex > 0;
  const canMoveRight = itemIndex < items.length - 1;

  const moveToLeft = useCallback(() => {
    if (canMoveLeft) {
      setSelectedIndex((prev) => prev - 1);
    }
  }, [canMoveLeft]);

  const moveToRight = useCallback(() => {
    if (canMoveRight) {
      setSelectedIndex((prev) => prev + 1);
    }
  }, [canMoveRight]);

  return useMemo(
    () => ({
      moveToRight,
      moveToLeft,
      canMoveLeft,
      canMoveRight,
      selectedIndex,
    }),
    [moveToRight, moveToLeft, canMoveLeft, canMoveRight, selectedIndex],
  );
};

const [ArrayNavigatorProvider, useArrayNavigationContext] = createStrictContext<
  ReturnType<typeof useArrayNavigator>
>({
  displayName: "ArrayNavigatorContext",
  errorMessage: `useArrayNavigatorContext returned is 'undefined'. Seems you forgot to wrap the components in "<ArrayNavigator />"`,
});

const ArrayNavigator = ({
  children,
  value,
  index,
}: {
  children?: React.ReactNode;
  value: { phaseName?: string; rows?: PhaseRow[] }[];
  index: number;
}) => {
  const arrayNavigation = useArrayNavigator(value, index);
  return (
    <ArrayNavigatorProvider value={arrayNavigation}>
      {children}
    </ArrayNavigatorProvider>
  );
};

const PhaseTable = ({
  rows,
  onRowsChange,
  openDurationDialog,
}: PhaseTableProps) => {
  const [data, setData] = useControllableState({
    value: rows,
    onChange: onRowsChange,
  });

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    debugTable: true,
    debugHeaders: true,
    debugColumns: true,
    meta: {
      updateData: (rowIndex, columnId, value) => {
        setData((prev) =>
          prev.map((row, index) => {
            if (index === rowIndex) {
              return {
                ...row,
                [columnId]: value,
              };
            }
            return row;
          }),
        );
      },
      openDurationDialog,
      roles: ROLES,
    },
  });

  const dataIds = React.useMemo<UniqueIdentifier[]>(
    () => data.map(({ id }) => id),
    [data],
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      setData((data) => {
        const oldIndex = dataIds.indexOf(active.id);
        const newIndex = dataIds.indexOf(over.id);
        return arrayMove(data, oldIndex, newIndex);
      });
    }
  }

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <Table>
        <TableHeader className="bg-gray-50">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow className="hover:bg-transparent" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} colSpan={header.colSpan}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          <SortableContext
            items={dataIds}
            strategy={verticalListSortingStrategy}
          >
            {table.getRowModel().rows.map((row) => (
              <PhaseTableRow key={row.id} row={row} />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  );
};

type PhaseNameDialogAction =
  | {
      type: "TOGGLE";
      payload?: {
        open?: boolean;
        addTo?: "start" | "end" | "below";
        targetPhaseIndex?: number;
      };
    }
  | { type: "EDIT"; payload: number };

type PhaseNameDialogState = {
  open: boolean;
  editingPhaseIndex: number | null;
  action: "EDIT" | null;
  addTo: "start" | "end" | "below";
};

const phaseNameDialogReducer = (
  state: PhaseNameDialogState,
  action: PhaseNameDialogAction,
): PhaseNameDialogState => {
  switch (action.type) {
    case "TOGGLE":
      const { payload } = action;
      return {
        ...state,
        action: null,
        editingPhaseIndex:
          typeof payload?.targetPhaseIndex === "number"
            ? payload.targetPhaseIndex
            : null,
        open: typeof payload?.open === "boolean" ? payload.open : !state.open,
        addTo: typeof payload?.addTo === "string" ? payload.addTo : "end",
      };
    case "EDIT":
      return {
        ...state,
        addTo: "end",
        action: "EDIT",
        open: true,
        editingPhaseIndex: action.payload,
      };

    default:
      return state;
  }
};

const defaultPhaseNameDialogState: PhaseNameDialogState = {
  action: null,
  editingPhaseIndex: null,
  open: false,
  addTo: "end",
};

type TaskDialogState = {
  open: boolean;
  editingPhaseIndex: number | null;
};

interface DurationDialogState extends TaskDialogState {
  editingPhaseRowIndex: number | null;
}

type DeletePhaseDialogState = {
  open: boolean;
  phaseIndex: number | null;
};
type ProjectScopeProps = {
  setProgress?: (val: number) => void;
};

const ProjectScope = ({
  setProgress,
}: {
  setProgress?: (val: number) => void;
}) => {
  const { toast } = useToast();
  const lastUndo = useRef<null | (() => void)>(null);
  const [taskDialogState, setTaskDialogState] = useState<TaskDialogState>({
    editingPhaseIndex: null,
    open: false,
  });
  const [durationDialogState, setDurationDialogState] =
    useState<DurationDialogState>({
      editingPhaseIndex: null,
      editingPhaseRowIndex: null,
      open: false,
    });
  const [phaseDialogState, dispatch] = useReducer(
    phaseNameDialogReducer,
    defaultPhaseNameDialogState,
  );
  const [accordionState, setAccordionState] = useState(["item-0"]);
  const {
    projectScopeMethods,
    isTaskSearchDialogOpen,
    setTaskSearchDialogOpen,
  } = useProjectScopeContext();
  const { toggleValidation } = useStepContext();

  const [projectScopeState, setProjectScopeState] = projectScopeMethods;

  const [phases, setPhases] = useControllableState<Phase[]>({
    value: projectScopeState,
    onChange: (value) => {
      setProjectScopeState(value);
      expandAll();
    },
  });
  const success = projectScopeSchema.safeParse(phases);

  useIsomorphicLayoutEffect(() => {
    toggleValidation(success);
  }, [success]);

  const [deletePhaseDialogState, setDeletePhaseDialogState] =
    useState<DeletePhaseDialogState>({
      phaseIndex: null,
      open: false,
    });

  const expandAll = useCallback(() => {
    setAccordionState(phases.map((_, index) => `item-${index}`));
  }, [phases]);

  const collapseAll = useCallback(() => {
    setAccordionState([]);
  }, []);

  const handleOpenTaskDialog = useCallback(
    (phaseIndex: number) => {
      const { phaseName } = phases[phaseIndex];

      if (!phaseName) {
        dispatch({ type: "EDIT", payload: phaseIndex });
      } else {
        setTaskDialogState({
          open: true,
          editingPhaseIndex: phaseIndex,
        });
      }
    },
    [phases],
  );

  const handleRowsChange = useCallback(
    (phaseIndex: number, rows: PhaseRow[]) => {
      setPhases((prev) =>
        prev.map((phase, index) => {
          if (index === phaseIndex) {
            return {
              ...phase,
              rows,
            };
          }
          return phase;
        }),
      );
    },
    [setPhases],
  );

  const handleSwapPhases = useCallback(
    (from: number, to: number) => {
      setPhases((prev) => arrayMove(prev, from, to));
    },
    [setPhases],
  );

  // Helper to show success toast with Undo
  const pushSuccess = useCallback(
    (label: string, onUndo?: () => void) => {
      toast({
        variant: "success",
        title: label,
        action: (
          <ToastAction
            altText="Undo"
            className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => onUndo?.()}
          >
            Undo
          </ToastAction>
        ),
      });
    },
    [toast],
  );

  const onAddPhaseName = useCallback(
    (phaseName: string) => {
      const { action, editingPhaseIndex, addTo } = phaseDialogState;

      if (action === "EDIT" && typeof editingPhaseIndex === "number") {
        setPhases((prev) => {
          const oldName = prev[editingPhaseIndex]?.phaseName ?? "";
          const nextState = prev.map((item, index) =>
            index === editingPhaseIndex ? { ...item, phaseName } : item,
          );

          // prepare undo: restore old name
          lastUndo.current = () =>
            setPhases((s) =>
              s.map((p, i) =>
                i === editingPhaseIndex ? { ...p, phaseName: oldName } : p,
              ),
            );

          // Toast
          toast({
            variant: "success",
            title: "Phase Renamed",
            action: (
              <ToastAction
                altText="Undo"
                className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
                onClick={() => {
                  lastUndo.current?.();
                  lastUndo.current = null;
                }}
              >
                Undo
              </ToastAction>
            ),
          });

          return nextState;
        });

        return;
      }

      // Do the add
      let insertedPhaseIndex = 0;
      setPhases((prev) => {
        const next = [...prev];
        const hasTargetPhase =
          typeof editingPhaseIndex === "number" &&
          editingPhaseIndex >= 0 &&
          editingPhaseIndex < next.length;

        insertedPhaseIndex =
          addTo === "start" && hasTargetPhase
            ? editingPhaseIndex
            : addTo === "below" && hasTargetPhase
              ? editingPhaseIndex + 1
              : next.length;

        next.splice(insertedPhaseIndex, 0, {
          phaseName,
          phaseType: "setup",
          rows: [createDefaultPhaseRow()],
        });
        return next;
      });

      // Prepare Undo for this action
      lastUndo.current = () =>
        setPhases((prev) =>
          prev.filter((_, index) => index !== insertedPhaseIndex),
        );

      // Toast
      const phaseAddedTitle =
        addTo === "start"
          ? "Phase Added Above"
          : addTo === "below"
            ? "Phase Added Below"
            : "Phase Added";

      toast({
        variant: "success",
        title: phaseAddedTitle,
        action: (
          <ToastAction
            altText="Undo"
            className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
            onClick={() => {
              lastUndo.current?.();
              lastUndo.current = null; // clear after use
            }}
          >
            Undo
          </ToastAction>
        ),
      });
    },
    [phaseDialogState, setPhases, toast],
  );

  const onAddTask = useCallback(
    (values: TaskFormValues) => {
      const { editingPhaseIndex } = taskDialogState;

      if (typeof editingPhaseIndex === "number") {
        setPhases((prev) => {
          const newPhases = prev.map((phase, index) => {
            if (index === editingPhaseIndex) {
              const newRow = { ...values, id: `${getId()}` };
              const { rows } = phase;

              return {
                ...phase,
                rows: rows ? [...rows, newRow] : [newRow],
              };
            }
            return phase;
          });

          return newPhases;
        });
      }
    },
    [taskDialogState, setPhases],
  );

  const onDurationFormValuesChange = useCallback(
    (durationFormValues: DurationFormValues) => {
      const { editingPhaseIndex: pIdx, editingPhaseRowIndex: rIdx } =
        durationDialogState;
      if (typeof pIdx !== "number" || typeof rIdx !== "number") return;

      // we'll detect if anything actually changed, capture a snapshot for Undo,
      // then show the toast.
      let didChange = false;
      let oldRowSnapshot: any = null;

      setPhases((prev) => {
        const phase = prev[pIdx];
        const rows = phase?.rows ?? [];
        const oldRow = rows[rIdx] ?? {};

        // shallow-compare only keys present in durationFormValues
        didChange = Object.keys(durationFormValues).some(
          (k) => (oldRow as any)?.[k] !== (durationFormValues as any)[k],
        );
        if (!didChange) return prev;

        oldRowSnapshot = oldRow;

        const newRows = rows.map((row, i) =>
          i === rIdx ? { ...row, ...durationFormValues } : row,
        );
        const newPhases = prev.map((ph, i) =>
          i === pIdx ? { ...ph, rows: newRows } : ph,
        );

        // prepare Undo: restore the old row snapshot
        lastUndo.current = () =>
          setPhases((s) => {
            const sPhase = s[pIdx];
            const sRows = (sPhase?.rows ?? []).slice();
            sRows[rIdx] = oldRowSnapshot;
            const out = s.slice();
            out[pIdx] = { ...sPhase, rows: sRows };
            return out;
          });

        return newPhases;
      });

      if (didChange) {
        toast({
          variant: "success",
          title: "Duration Changed",
          action: (
            <ToastAction
              altText="Undo"
              className="px-0 border-0 bg-transparent text-success-500 underline hover:no-underline focus:outline-none"
              onClick={() => {
                lastUndo.current?.();
                lastUndo.current = null;
              }}
            >
              Undo
            </ToastAction>
          ),
        });
      }
    },
    [durationDialogState, setPhases, toast],
  );

  const durationFormValues = useMemo(() => {
    const { editingPhaseIndex, editingPhaseRowIndex } = durationDialogState;
    if (
      typeof editingPhaseIndex === "number" &&
      typeof editingPhaseRowIndex === "number"
    ) {
      const { rows } = phases[editingPhaseIndex];
      const { duration } = (rows ?? [])[editingPhaseRowIndex];

      return {
        duration: { ...duration },
      };
    }
  }, [durationDialogState, phases]);

  const onDeletePhase = useCallback(
    (id: string) => {
      setPhases((prev) => {
        const idx = prev.findIndex(
          (p, i) => String(i) === id || (p as any).id === id,
        );
        if (idx < 0) return prev;
        const removed = prev[idx];

        // prepare undo: reinsert at same index
        lastUndo.current = () =>
          setPhases((s) => {
            const next = [...s];
            next.splice(idx, 0, removed);
            return next;
          });

        // do delete
        const next = [...prev];
        next.splice(idx, 0); // no-op to satisfy TS if needed
        return prev.filter((_, i) => i !== idx);
      });

      pushSuccess("Phase Deleted", lastUndo.current || undefined);
      lastUndo.current = null;
    },
    [pushSuccess, setPhases],
  );

  const handleOpenDeletePhaseDialog = useCallback((phaseIndex: number) => {
    setDeletePhaseDialogState({
      phaseIndex,
      open: true,
    });
  }, []);

  const handleOpenPhaseDurationDialog = useCallback(
    (phaseIndex: number) => {
      const rows = phases[phaseIndex]?.rows ?? [];
      if (!rows.length) {
        toast({
          title: "Please add at least 1 task before changing duration",
          variant: "destructive",
        });
        return;
      }
      setDurationDialogState({
        editingPhaseIndex: phaseIndex,
        editingPhaseRowIndex: 0,
        open: true,
      });
    },
    [phases, toast],
  );

  const onDuplicatePhase = useCallback(
    (idx: number) => {
      setPhases((prev) => {
        const source = prev[idx];
        if (!source) return prev;
        const dup = { ...source }; // add new id if you have ids
        const next = [...prev];
        next.splice(idx + 1, 0, dup);

        // undo: remove the new duplicate at idx+1
        lastUndo.current = () =>
          setPhases((s) => s.filter((_, i) => i !== idx + 1));

        return next;
      });

      pushSuccess("Phase Duplicated", lastUndo.current || undefined);
      lastUndo.current = null;
    },
    [pushSuccess, setPhases],
  );

  const fieldsValidationArr = [
    pickFromProjectScopeSchema({ task: true }).safeParse(phases),
    pickFromProjectScopeSchema({ experience: true }).safeParse(phases),
    pickFromProjectScopeSchema({ role: true }).safeParse(phases),
    pickFromProjectScopeSchema({ location: true }).safeParse(phases),
    pickFromProjectScopeSchema({ duration: true }).safeParse(phases),
  ];

  // Each valid field contributes 34% to the total progress
  const progressValue = Math.round(
    (fieldsValidationArr.filter((item) => item).length /
      fieldsValidationArr.length) *
      34,
  );
  // Report progress to parent
  useEffect(() => {
    setProgress?.(progressValue);
  }, [progressValue, setProgress]);

  //helper function to convert numbers to words
  const numberToWord = (num: number) => {
    const words = [
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
    ];
    return words[num] || num + 1; // fallback for numbers > 10
  };

  // --- DurationFormValues type and DurationDialog component (hoisted) ---
  type DurationFormValues = {
    duration: {
      value: number;
      type: "hours" | "days" | "weeks" | "months";
    };
  };

  interface DurationDialogProps {
    open: boolean;
    durationFormValues?: DurationFormValues;
    onDurationFormValuesChange: (values: DurationFormValues) => void;
    onOpenChange: (open: boolean) => void;
  }

  const DurationDialog = ({
    open,
    durationFormValues,
    onDurationFormValuesChange,
    onOpenChange,
  }: DurationDialogProps) => {
    const { control, handleSubmit, reset } = useForm<DurationFormValues>({
      defaultValues: durationFormValues || {
        duration: { value: 1, type: "days" },
      },
      values: durationFormValues,
    });
    const selectedDurationValue = useWatch({
      control,
      name: "duration.value",
      defaultValue: 1,
    });

    React.useEffect(() => {
      if (open && durationFormValues) {
        reset(durationFormValues);
      }
    }, [open, durationFormValues, reset]);

    const onSubmit = (data: DurationFormValues) => {
      onDurationFormValuesChange(data);
      onOpenChange(false);
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Duration</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center gap-2">
              <Controller
                name="duration.value"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    type="number"
                    min={1}
                    className="w-24"
                    placeholder="Value"
                  />
                )}
              />
              <Controller
                name="duration.type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      className="h-9 min-w-[104px] px-2 py-1"
                      onBlur={field.onBlur}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">
                        {formatDurationUnit(
                          Number(selectedDurationValue) || 0,
                          "days",
                        ).replace(/^./, (character) => character.toUpperCase())}
                      </SelectItem>
                      <SelectItem value="weeks">
                        {formatDurationUnit(
                          Number(selectedDurationValue) || 0,
                          "weeks",
                        ).replace(/^./, (character) => character.toUpperCase())}
                      </SelectItem>
                      <SelectItem value="hours">
                        {formatDurationUnit(
                          Number(selectedDurationValue) || 0,
                          "hours",
                        ).replace(/^./, (character) => character.toUpperCase())}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  };
  const currentPhaseName =
    phaseDialogState.action === "EDIT" &&
    typeof phaseDialogState.editingPhaseIndex === "number"
      ? (phases[phaseDialogState.editingPhaseIndex]?.phaseName ?? "")
      : "";

  return (
    <>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px] min-[1024px]:flex space-y-10 min-[1024px]:space-y-0 min-[1024px]:flex-row min-[1024px]:gap-x-[41.45px]">
          <div className="p-3 pr-9 border rounded-lg border-blue-300 bg-blue-100 min-[1024px]:hidden">
            <div className="flex items-start gap-x-3">
              <Lightbulb05 className="size-[30px] text-primary-500" />

              <div className="flex flex-col flex-auto items-start md:items-center gap-y-3 md:flex-row gap-x-0.5">
                <div className="space-y-0.5 flex-auto">
                  <h1 className="text-base leading-[30px] font-semibold text-gray-900">
                    Tip
                  </h1>
                  <p className="text-xs leading-[14.52px] text-dark-blue-400 tracking-[0.01em]">
                    A great title gives your audience a reason to open your
                    project
                  </p>
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="link" type="button">
                      <PlayCircle className="size-5" /> Show me how
                    </Button>
                  </DialogTrigger>

                  <DialogContent className="max-w-[317.55px] p-0">
                    <ProjectScopeTip
                      className="w-full"
                      closeTrigger={
                        <DialogClose asChild>
                          <IconButton
                            className="text-primary-500/50 hover:text-primary-500 absolute top-[11px] right-[11.55px]"
                            variant="light"
                            visual="gray"
                          >
                            <X className="size-5" />
                          </IconButton>
                        </DialogClose>
                      }
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="space-y-6 flex-auto min-w-0">
            <div className="flex md:flex-row flex-col gap-y-6 md:gap-y-0 md:items-center justify-between">
              <h1 className="text-xl leading-[30px] font-semibold text-dark-blue-400">
                Project Scope
              </h1>

              <div className="flex items-center md:gap-x-3">
                <div className="flex items-center">
                  <Button
                    className="border-r-0 rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    type="button"
                    onClick={expandAll}
                  >
                    <ChevronsDown className="size-[15px]" /> Expand All
                  </Button>
                  <Button
                    className="rounded-l-none md:rounded-r-[5px] rounded-r-none"
                    variant="outlined"
                    visual="gray"
                    type="button"
                    onClick={collapseAll}
                  >
                    <ChevronsUp className="size-[15px]" /> Collapse All
                  </Button>
                </div>

                <Button
                  className="border-l-0 rounded-l-none md:border-l md:rounded-l-[5px]"
                  variant="outlined"
                  visual="gray"
                  type="button"
                  onClick={() => dispatch({ type: "TOGGLE" })}
                >
                  <Plus className="size-[15px]" /> Add Phase
                </Button>
              </div>
            </div>

            <InputGroup>
              <Input type="text" placeholder="Find a phase or task" />
              <InputLeftElement>
                <SearchMd className="text-gray-500 h-5 w-5" />
              </InputLeftElement>
            </InputGroup>

            <Accordion
              value={accordionState}
              onValueChange={setAccordionState}
              type="multiple"
              className="flex-auto space-y-3"
            >
              {phases.map(({ phaseName, rows }, index) => (
                <ArrayNavigator key={index} value={phases} index={index}>
                  {rows ? (
                    <AccordionItem value={`item-${index}`} asChild>
                      <div className="rounded-lg border border-gray-200 shadow-sm">
                        <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                          <div className="flex flex-auto gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                              </AccordionTrigger>

                              <span className="text-base md:text-[18px] font-semibold leading-7 text-gray-900">
                                Phase {numberToWord(index)}{" "}
                                <Button
                                  variant="link"
                                  type="button"
                                  className="font-light text-inherit"
                                  onClick={() =>
                                    dispatch({
                                      type: "EDIT",
                                      payload: index,
                                    })
                                  }
                                >
                                  {phaseName}
                                </Button>
                              </span>
                            </div>

                            <div className="inline-flex items-center justify-start gap-x-2 pl-10 md:w-[118px] md:pl-0">
                              <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                {getPhaseDayRangeLabel(phases, index)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-x-4 items-center">
                            <MoreDropdown
                              onSwapPhases={(to) => handleSwapPhases(index, to)}
                              openPhaseDialog={() =>
                                dispatch({ type: "EDIT", payload: index })
                              }
                              onChangeDuration={() =>
                                handleOpenPhaseDurationDialog(index)
                              }
                              openDeletePhaseDialog={() =>
                                handleOpenDeletePhaseDialog(index)
                              }
                              onInsertAbove={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "start",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onInsertBelow={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "below",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onDuplicatePhase={() => onDuplicatePhase(index)}
                            />
                            <PlusDropdown
                              addTask={() => handleOpenTaskDialog(index)}
                              addPhase={() => dispatch({ type: "TOGGLE" })}
                            />
                          </div>
                        </div>

                        <DisclosureContent className="overflow-auto">
                          <PhaseTable
                            rows={rows}
                            onRowsChange={(rows) =>
                              handleRowsChange(index, rows)
                            }
                            openDurationDialog={(editingPhaseRowIndex) =>
                              setDurationDialogState({
                                editingPhaseIndex: index,
                                editingPhaseRowIndex,
                                open: true,
                              })
                            }
                          />
                        </DisclosureContent>
                      </div>
                    </AccordionItem>
                  ) : (
                    <AccordionItem value={`item-${index}`} asChild>
                      <div className="rounded-lg border border-gray-200 shadow-sm">
                        <div className="mb-3 flex items-start gap-x-4 px-3 pt-3">
                          <div className="flex flex-auto gap-y-2 md:flex-row md:justify-between md:items-center flex-col">
                            <div className="inline-flex items-center gap-x-3.5">
                              <AccordionTrigger className="focus-visible:outline-none size-8 inline-flex items-center justify-center">
                                <ChevronDown className="size-5 shrink-0 text-gray-500 group-data-[state=open]/item:-rotate-180 transition duration-300" />
                              </AccordionTrigger>

                              <div className="inline-flex md:flex-row gap-x-1.5 flex-col md:items-center gap-y-3 md:gap-x-5">
                                <span className="text-base md:text-[18px] font-semibold md:font-light leading-7 text-gray-900">
                                  Phase {numberToWord(index)}
                                </span>{" "}
                                {phaseName ? (
                                  <Button
                                    variant="link"
                                    type="button"
                                    className="text-lg leading-8 text-gray-900"
                                    onClick={() =>
                                      dispatch({
                                        type: "EDIT",
                                        payload: index,
                                      })
                                    }
                                  >
                                    {phaseName}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="link"
                                    type="button"
                                    className="hover:no-underline"
                                    leftIcon={
                                      <Edit03 className="size-[15px] text-gray-800" />
                                    }
                                    onClick={() =>
                                      dispatch({
                                        type: "EDIT",
                                        payload: index,
                                      })
                                    }
                                  >
                                    <span className="inline-block text-sm leading-5 font-semibold text-gray-800">
                                      Edit Phase Name
                                    </span>
                                  </Button>
                                )}
                                <div className="inline-block md:hidden">
                                  <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                    {getPhaseDayRangeLabel(phases, index)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden items-center justify-start gap-x-2 pl-10 md:inline-flex md:w-[118px] md:pl-0">
                              <span className="text-xs leading-[14.52px] md:text-[13px] md:leading-[15.73px] text-dark-blue-400 font-semibold">
                                {getPhaseDayRangeLabel(phases, index)}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-x-4 items-center">
                            <MoreDropdown
                              onSwapPhases={(to) => handleSwapPhases(index, to)}
                              openPhaseDialog={() =>
                                dispatch({ type: "EDIT", payload: index })
                              }
                              onChangeDuration={() =>
                                handleOpenPhaseDurationDialog(index)
                              }
                              openDeletePhaseDialog={() =>
                                handleOpenDeletePhaseDialog(index)
                              }
                              onInsertAbove={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "start",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onInsertBelow={() =>
                                dispatch({
                                  type: "TOGGLE",
                                  payload: {
                                    addTo: "below",
                                    targetPhaseIndex: index,
                                  },
                                })
                              }
                              onDuplicatePhase={() => onDuplicatePhase(index)}
                            />
                            <PlusDropdown
                              addTask={() => handleOpenTaskDialog(index)}
                              addPhase={() => dispatch({ type: "TOGGLE" })}
                            />
                          </div>
                        </div>
                        <DisclosureContent className="overflow-auto">
                          <div className="w-full overflow-auto flex border-t border-gray-200 flex-col justify-center min-h-[208px] md:min-h-[228px]">
                            <div className="max-w-[352px] mx-auto">
                              <h1 className="text-base font-semibold text-center leading-6 text-gray-800">
                                {index === 0
                                  ? "Create your first task"
                                  : "Create a task"}
                              </h1>
                              <p className="text-sm mt-1 leading-5 text-center text-gray-800">
                                {index === 0
                                  ? "Start defining your project scope with a clear, actionable step."
                                  : "Define your project scope with a clear, actionable step."}
                              </p>
                              <div className="mt-6 flex justify-center">
                                <Button
                                  className="bg-primary-50 text-primary-500 hover:bg-primary-500 hover:text-white"
                                  type="button"
                                  onClick={() => handleOpenTaskDialog(index)}
                                >
                                  <Plus className="size-[15px]" />
                                  Add Task
                                </Button>
                              </div>
                            </div>
                          </div>
                        </DisclosureContent>
                      </div>
                    </AccordionItem>
                  )}
                </ArrayNavigator>
              ))}
            </Accordion>

            <Button
              className="mt-5"
              variant="ghost"
              visual="gray"
              type="button"
              onClick={() => dispatch({ type: "TOGGLE" })}
            >
              <Plus className="size-[15px]" /> Add Phase
            </Button>

            <PhaseNameDialog
              onOpenChange={(open) =>
                dispatch({ type: "TOGGLE", payload: { open } })
              }
              open={phaseDialogState.open}
              onAddPhaseName={onAddPhaseName}
              defaultName={currentPhaseName}
              placeholder={
                phaseDialogState.action === "EDIT"
                  ? "Edit Phase name"
                  : "Enter Phase Name"
              }
            />

            <TaskDialog
              open={taskDialogState.open}
              onOpenChange={(open) =>
                setTaskDialogState((prev) => ({
                  ...prev,
                  open,
                  editingPhaseIndex: null,
                }))
              }
              onAddTask={onAddTask}
            />
            <DurationDialog
              durationFormValues={durationFormValues}
              open={durationDialogState.open}
              onDurationFormValuesChange={onDurationFormValuesChange}
              onOpenChange={(open) =>
                setDurationDialogState({
                  editingPhaseIndex: null,
                  editingPhaseRowIndex: null,
                  open,
                })
              }
            />
            <DeletePhaseDialog
              open={deletePhaseDialogState.open}
              onOpenChange={(open) =>
                setDeletePhaseDialogState({
                  phaseIndex: null,
                  open,
                })
              }
              onDeletePhase={() => {
                if (deletePhaseDialogState.phaseIndex !== null) {
                  onDeletePhase(String(deletePhaseDialogState.phaseIndex));
                }
              }}
            />
            <TaskSearchDialog
              open={isTaskSearchDialogOpen}
              onOpenChange={setTaskSearchDialogOpen}
              phases={phases}
            />
          </div>

          <div className="pl-[17.45px] xs:max-[1024px]:hidden shrink-0 self-start sticky top-6">
            <ProjectScopeTip showArrow />
          </div>
        </div>
      </ScrollArea>
    </>
  );
};

const durationOptions = [
  {
    value: "3",
    unit: "months",
    label: "Launch a page, test a prototype, or run a campaign",
  },
  {
    value: "6",
    unit: "months",
    label: "Build an MVP or redesign a website",
  },
  {
    value: "12",
    unit: "months",
    label: "Platform builds or long product cycles",
  },
  {
    value: "24",
    unit: "months",
    label: "Ongoing design, dev support, or multi-phase work",
  },
  {
    value: "Other",
    unit: "",
    label: "",
  },
];

const projectDurationUnits = ["days", "weeks", "months", "quarters", "years"];

const getDurationSelectionFromMonths = (months?: number) => {
  if (typeof months !== "number" || !Number.isFinite(months)) {
    return "3-months-0";
  }

  const monthOptionIndex = durationOptions.findIndex(
    (option) => option.unit === "months" && Number(option.value) === months,
  );

  if (monthOptionIndex >= 0) {
    const option = durationOptions[monthOptionIndex];
    return `${option.value}-${option.unit}-${monthOptionIndex}`;
  }

  const otherOptionIndex = durationOptions.findIndex(
    (option) => option.value === "Other",
  );

  return otherOptionIndex >= 0 ? `Other--${otherOptionIndex}` : "3-months-0";
};

const serviceToolTags = [
  "Figma",
  "React",
  "HTML5",
  "CSS3",
  "JavaScript",
  "Bootstrap",
  "Django",
  "REST APIs / GraphQL",
  "MongoDB",
  "Amazon S3",
  "WooCommerce",
  "PayPal SDK",
  "Docker",
  "Meta Pixel",
  "Playwright",
];

const DescribeProjectStep = ({
  setProgress,
  workType,
  jobListingId,
  scopeKnowledgeChoice,
}: ProgressProps & {
  workType?: WorkTypeChoice;
  jobListingId?: string | null;
  scopeKnowledgeChoice?: ScopeKnowledgeChoice;
}) => {
  const { toggleValidation } = useStepContext();
  const { toast } = useToast();
  const { user } = useAuth();
  const { details, setDetails: setJobListingDraftDetails } =
    useJobListingDraftContext();
  const isService = workType === "service";
  const isKnownServiceFlow =
    isService && scopeKnowledgeChoice === "known";
  const effectiveJobListingId = useMemo(() => {
    if (jobListingId) return jobListingId;
    if (typeof window === "undefined") return null;

    const urlJobListingId = new URLSearchParams(window.location.search).get(
      "jobListingId",
    );
    return urlJobListingId && UUID_PATTERN.test(urlJobListingId)
      ? urlJobListingId
      : null;
  }, [jobListingId]);
  const [description, setDescription] = useState(details.description ?? "");
  const [deliverables, setDeliverables] = useState(details.deliverables ?? "");
  const [successCriteria, setSuccessCriteria] = useState(
    details.successCriteria ?? "",
  );
  const [budget, setBudget] = useState(
    typeof details.budgetAmount === "number"
      ? String(details.budgetAmount)
      : "0.00",
  );
  const [budgetUnit, setBudgetUnit] = useState(
    details.budgetFrequency === "per_month" ? "per month" : "per week",
  );
  const [duration, setDuration] = useState("");
  const [customDuration, setCustomDuration] = useState(
    typeof details.durationMonths === "number" &&
      getDurationSelectionFromMonths(details.durationMonths).startsWith(
        "Other--",
      )
      ? String(details.durationMonths)
      : "",
  );
  const [customDurationUnit, setCustomDurationUnit] = useState("months");
  const [scopeFile, setScopeFile] = useState<File | null>(null);
  const [scopeUploadProgress, setScopeUploadProgress] = useState(0);
  const [scopeUploadStatus, setScopeUploadStatus] = useState<
    "idle" | "uploading" | "complete" | "error"
  >("idle");
  const [scopeUploadError, setScopeUploadError] = useState("");
  const [isScopeDropActive, setIsScopeDropActive] = useState(false);
  const scopeFilePickerSelectionRef = useRef(false);
  const scopeFileInputRef = useRef<HTMLInputElement | null>(null);
  const scopeFilePickerScrollTopRef = useRef(0);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const lastHydratedDraftDetailsSignatureRef = useRef("");
  const fetchedPersistedDescribeListingIdRef = useRef<string | null>(null);
  const skipNextDraftDetailsWriteRef = useRef(false);
  const previousIsServiceRef = useRef(isService);
  const hasUserEditedDetailsRef = useRef(false);
  const getScopeFileContentType = useCallback((file: File) => {
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".pdf")) {
      return "application/pdf";
    }
    if (fileName.endsWith(".docx")) {
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    }
    return "";
  }, []);
  const resetScopeFile = useCallback(() => {
    setScopeFile(null);
    setScopeUploadProgress(0);
    setScopeUploadStatus("idle");
    setScopeUploadError("");
    setJobListingDraftDetails((currentDetails) => ({
      ...currentDetails,
      briefR2Key: undefined,
      briefFilename: undefined,
      briefSizeBytes: undefined,
    }));
  }, [setJobListingDraftDetails]);
  const completeScopeUpload = useCallback(
    (file: File, briefR2Key?: string) => {
      setScopeUploadProgress(100);
      setScopeUploadStatus("complete");
      setScopeUploadError("");
      setJobListingDraftDetails((currentDetails) => ({
        ...currentDetails,
        briefR2Key,
        briefFilename: file.name,
        briefSizeBytes: file.size,
      }));
    },
    [setJobListingDraftDetails],
  );
  const uploadScopeFile = useCallback(
    async (file: File, contentType: string) => {
      setScopeFile(file);
      setScopeUploadStatus("uploading");
      setScopeUploadError("");
      setScopeUploadProgress(10);

      try {
        if (!effectiveJobListingId) {
          throw new Error(
            "Job listing draft is still being prepared. Please try the upload again.",
          );
        }

        let briefR2Key = "";
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const presignResponse = await JobListingAPI.PresignBriefUpload(
            effectiveJobListingId,
            {
              filename: file.name,
              contentType,
              sizeBytes: file.size,
            },
          );
          const { presignedUrl, key } = presignResponse?.data ?? {};

          if (!presignedUrl || !key) {
            throw new Error("Brief upload URL was not returned.");
          }

          try {
            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open("PUT", presignedUrl);
              xhr.setRequestHeader("Content-Type", contentType);
              xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                  setScopeUploadProgress(
                    Math.min(
                      99,
                      10 + Math.round((event.loaded / event.total) * 90),
                    ),
                  );
                }
              };
              xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                  return;
                }
                const error = new Error("Brief upload failed.") as Error & {
                  status?: number;
                };
                error.status = xhr.status;
                reject(error);
              };
              xhr.onerror = () => reject(new Error("Brief upload failed."));
              xhr.onabort = () =>
                reject(new Error("Brief upload was canceled."));
              xhr.send(file);
            });
            briefR2Key = key;
            setScopeUploadProgress(100);
            break;
          } catch (error) {
            const status =
              error instanceof Error
                ? (error as Error & { status?: number }).status
                : undefined;
            if (status !== 403 || attempt === 1) throw error;
          }
        }

        await JobListingAPI.SaveBriefMetadata(effectiveJobListingId, {
          briefR2Key,
          briefFilename: file.name,
          briefSizeBytes: file.size,
        });

        completeScopeUpload(file, briefR2Key);
      } catch (error) {
        setScopeUploadStatus("error");
        setScopeUploadProgress(0);
        setScopeUploadError(
          error instanceof Error
            ? error.message
            : "Brief upload failed. Please try again.",
        );
        toast({
          title: "Brief upload failed. Please try again.",
          variant: "destructive",
        });
      }
    },
    [completeScopeUpload, effectiveJobListingId, toast],
  );
  const acceptScopeFile = useCallback(
    (file?: File | null) => {
      if (!file) return;
      const contentType = getScopeFileContentType(file);

      if (!contentType) {
        setScopeFile(file);
        setScopeUploadProgress(0);
        setScopeUploadStatus("error");
        setScopeUploadError("Please upload a PDF or DOCX file.");
        return;
      }

      if (file.size > 26_214_400) {
        setScopeFile(file);
        setScopeUploadProgress(0);
        setScopeUploadStatus("error");
        setScopeUploadError("Please upload a file no larger than 25 MB.");
        return;
      }

      void uploadScopeFile(file, contentType);
    },
    [getScopeFileContentType, uploadScopeFile],
  );
  const tipItems = isService
    ? [
        "What kind of work should be done regularly",
        "How often help is needed (e.g. weekly, monthly)",
        "Any tools, platforms, or skills required",
        "What success looks like in this service",
        "Any existing systems or workflows to support",
      ]
    : [
        "What the project is about",
        "What needs to be done",
        "How it should be done",
        "What the end result should look like",
        "Any tools or skills that are important",
      ];
  const selectedDurationOption = durationOptions.find(
    (option, index) => `${option.value}-${option.unit}-${index}` === duration,
  );
  const isCustomDurationSelected = selectedDurationOption?.value === "Other";
  const customDurationAmount = Number(customDuration);
  const hasValidCustomDuration =
    !isCustomDurationSelected ||
    (Number.isFinite(customDurationAmount) && customDurationAmount > 0);
  const hasNegativeBudget = budget.trim().startsWith("-");
  const hasValidBudget =
    budget.trim().length > 0 &&
    !hasNegativeBudget &&
    Number.isFinite(Number(budget.replace(/,/g, ""))) &&
    Number(budget.replace(/,/g, "")) >= 0;
  const descriptionWordCount = getWordCount(description);
  const deliverablesWordCount = getWordCount(deliverables);
  const successCriteriaWordCount = getWordCount(successCriteria);
  const hasWordLimitError =
    descriptionWordCount > STEP_TWO_WORD_LIMIT ||
    ((isService ? isKnownServiceFlow : scopeKnowledgeChoice === "known") &&
      (deliverablesWordCount > STEP_TWO_WORD_LIMIT ||
        successCriteriaWordCount > STEP_TWO_WORD_LIMIT));
  const isKnownProjectFlow =
    !isService && scopeKnowledgeChoice === "known";
  const isValid =
    description.trim().length > 0 &&
    !hasWordLimitError &&
    (isService
      ? (isKnownServiceFlow ? deliverables.trim().length > 0 : true) &&
        hasValidBudget
      : (!isKnownProjectFlow ||
          (deliverables.trim().length > 0 &&
            successCriteria.trim().length > 0)) &&
        hasValidBudget &&
        Boolean(selectedDurationOption) &&
        hasValidCustomDuration);
  const budgetAmount = Number(budget.replace(/,/g, "")) || 0;
  const budgetFrequency =
    budgetUnit === "per month" ? ("per_month" as const) : ("per_week" as const);
  const durationMonths =
    selectedDurationOption?.unit === "months"
      ? Number(selectedDurationOption.value)
      : isCustomDurationSelected && customDurationUnit === "months"
        ? customDurationAmount || undefined
        : undefined;
  const getDraftDurationMonths = useCallback(
    (
      nextDuration = duration,
      nextCustomDuration = customDuration,
      nextCustomDurationUnit = customDurationUnit,
    ) => {
      const nextSelectedDurationOption = durationOptions.find(
        (option, index) =>
          `${option.value}-${option.unit}-${index}` === nextDuration,
      );
      const nextCustomDurationAmount = Number(nextCustomDuration);

      if (nextSelectedDurationOption?.unit === "months") {
        return Number(nextSelectedDurationOption.value);
      }

      if (
        nextSelectedDurationOption?.value === "Other" &&
        nextCustomDurationUnit === "months"
      ) {
        return nextCustomDurationAmount || undefined;
      }

      return undefined;
    },
    [customDuration, customDurationUnit, duration],
  );
  const updateDraftDetails = useCallback(
    (nextDetails: Partial<JobListingDraftDetails>) => {
      hasUserEditedDetailsRef.current = true;
      setJobListingDraftDetails((currentDetails) => ({
        ...currentDetails,
        ...nextDetails,
      }));
    },
    [setJobListingDraftDetails],
  );
  useEffect(() => {
    if (hasUserEditedDetailsRef.current) return;

    const hasHydratableDetails =
      Boolean(details.description) ||
      Boolean(details.deliverables) ||
      Boolean(details.successCriteria) ||
      typeof details.budgetAmount === "number" ||
      typeof details.durationMonths === "number" ||
      Boolean(details.briefFilename);

    if (!hasHydratableDetails) return;
    const signature = JSON.stringify({
      jobListingId: details.jobListingId ?? effectiveJobListingId,
      description: details.description,
      deliverables: details.deliverables,
      successCriteria: details.successCriteria,
      budgetAmount: details.budgetAmount,
      budgetFrequency: details.budgetFrequency,
      durationMonths: details.durationMonths,
      briefFilename: details.briefFilename,
    });
    if (signature === lastHydratedDraftDetailsSignatureRef.current) return;

    lastHydratedDraftDetailsSignatureRef.current = signature;
    skipNextDraftDetailsWriteRef.current = true;
    setDescription(details.description ?? "");
    setDeliverables(details.deliverables ?? "");
    setSuccessCriteria(details.successCriteria ?? "");
    setBudget(
      typeof details.budgetAmount === "number"
        ? String(details.budgetAmount)
        : "0.00",
    );
    setBudgetUnit(
      details.budgetFrequency === "per_month" ? "per month" : "per week",
    );

    if (typeof details.durationMonths === "number") {
      const hydratedDuration = getDurationSelectionFromMonths(
        details.durationMonths,
      );
      setDuration(hydratedDuration);
      if (hydratedDuration.startsWith("Other--")) {
        setCustomDuration(String(details.durationMonths));
        setCustomDurationUnit("months");
      } else {
        setCustomDuration("");
      }
    } else {
      setDuration("");
      setCustomDuration("");
    }

    if (details.briefFilename) {
      setScopeFile(new File([], details.briefFilename));
      setScopeUploadProgress(100);
      setScopeUploadStatus("complete");
      setScopeUploadError("");
    }
  }, [
    details.briefFilename,
    details.budgetAmount,
    details.budgetFrequency,
    details.deliverables,
    details.description,
    details.durationMonths,
    details.jobListingId,
    details.successCriteria,
    effectiveJobListingId,
  ]);

  useEffect(() => {
    if (
      !effectiveJobListingId ||
      fetchedPersistedDescribeListingIdRef.current === effectiveJobListingId
    ) {
      return;
    }
    if (hasUserEditedDetailsRef.current) {
      return;
    }

    fetchedPersistedDescribeListingIdRef.current = effectiveJobListingId;
    let cancelled = false;

    const loadPersistedDescribeDetails = async () => {
      try {
        const response = await JobListingAPI.Get(effectiveJobListingId);
        if (cancelled) return;

        const listing = getResponsePayload(response);
        const nextDescription =
          typeof listing?.description === "string"
            ? listing.description
            : undefined;
        const nextDeliverables =
          typeof listing?.deliverables === "string"
            ? listing.deliverables
            : undefined;
        const nextSuccessCriteria =
          typeof listing?.successCriteria === "string"
            ? listing.successCriteria
            : undefined;
        const nextBudgetAmount =
          toFiniteNumber(listing?.budgetAmount) ??
          toUsdAmountFromCents(listing?.budgetAmountUsdCents);
        const nextDurationMonths = toFiniteNumber(listing?.durationMonths);
        const nextBriefFilename =
          typeof listing?.briefFilename === "string"
            ? listing.briefFilename
            : undefined;

        const hasPersistedDetails =
          Boolean(nextDescription) ||
          Boolean(nextDeliverables) ||
          Boolean(nextSuccessCriteria) ||
          typeof nextBudgetAmount === "number" ||
          typeof nextDurationMonths === "number" ||
          Boolean(nextBriefFilename);

        if (!hasPersistedDetails || hasUserEditedDetailsRef.current) return;

        lastHydratedDraftDetailsSignatureRef.current = JSON.stringify({
          jobListingId: effectiveJobListingId,
          description: nextDescription,
          deliverables: nextDeliverables,
          successCriteria: nextSuccessCriteria,
          budgetAmount: nextBudgetAmount,
          budgetFrequency: listing?.budgetFrequency,
          durationMonths: nextDurationMonths,
          briefFilename: nextBriefFilename,
        });
        skipNextDraftDetailsWriteRef.current = true;
        setDescription(nextDescription ?? "");
        setDeliverables(nextDeliverables ?? "");
        setSuccessCriteria(nextSuccessCriteria ?? "");
        setBudget(
          typeof nextBudgetAmount === "number"
            ? String(nextBudgetAmount)
            : "0.00",
        );
        setBudgetUnit(
          listing?.budgetFrequency === "per_month" ? "per month" : "per week",
        );

        if (typeof nextDurationMonths === "number") {
          const hydratedDuration =
            getDurationSelectionFromMonths(nextDurationMonths);
          setDuration(hydratedDuration);
          if (hydratedDuration.startsWith("Other--")) {
            setCustomDuration(String(nextDurationMonths));
            setCustomDurationUnit("months");
          } else {
            setCustomDuration("");
          }
        } else {
          setDuration("");
          setCustomDuration("");
        }

        if (nextBriefFilename) {
          setScopeFile(new File([], nextBriefFilename));
          setScopeUploadProgress(100);
          setScopeUploadStatus("complete");
          setScopeUploadError("");
        }

        setJobListingDraftDetails((currentDetails) => ({
          ...currentDetails,
          jobListingId: effectiveJobListingId,
          description: nextDescription,
          deliverables: nextDeliverables,
          successCriteria: nextSuccessCriteria,
          budgetAmount: nextBudgetAmount,
          budgetFrequency:
            listing?.budgetFrequency === "per_month"
              ? "per_month"
              : listing?.budgetFrequency === "per_week"
                ? "per_week"
                : currentDetails.budgetFrequency,
          durationMonths: nextDurationMonths,
          isOngoing:
            typeof listing?.isOngoing === "boolean"
              ? listing.isOngoing
              : currentDetails.isOngoing,
          briefFilename: nextBriefFilename,
          briefSizeBytes:
            toFiniteNumber(listing?.briefSizeBytes) ??
            currentDetails.briefSizeBytes,
        }));
      } catch (error) {
        console.error("Failed to load saved job listing details", error);
      }
    };

    void loadPersistedDescribeDetails();

    return () => {
      cancelled = true;
    };
  }, [effectiveJobListingId, setJobListingDraftDetails]);

  useIsomorphicLayoutEffect(() => {
    toggleValidation(isValid);
  }, [isValid]);

  useEffect(() => {
    if (!hasUserEditedDetailsRef.current) {
      skipNextDraftDetailsWriteRef.current = false;
      return;
    }

    if (skipNextDraftDetailsWriteRef.current) {
      skipNextDraftDetailsWriteRef.current = false;
      return;
    }

    setJobListingDraftDetails((currentDetails) => ({
      ...currentDetails,
      description: description.trim(),
      deliverables: deliverables.trim(),
      successCriteria: isService ? undefined : successCriteria.trim(),
      budgetAmount,
      budgetFrequency,
      durationMonths: isService ? undefined : durationMonths,
      isOngoing: isService ? true : undefined,
    }));
  }, [
    budgetAmount,
    budgetFrequency,
    deliverables,
    description,
    durationMonths,
    isService,
    setJobListingDraftDetails,
    successCriteria,
  ]);

  useEffect(() => {
    setProgress?.(20);
  }, [setProgress]);

  useEffect(() => {
    if (previousIsServiceRef.current === isService) return;
    previousIsServiceRef.current = isService;
    if (!hasUserEditedDetailsRef.current) return;
    setDescription("");
    setDeliverables("");
    setSuccessCriteria("");
    resetScopeFile();
    setDuration("3-months-0");
    setCustomDuration("");
    const viewport = contentRef.current?.closest(
      "[data-radix-scroll-area-viewport]",
    ) as HTMLElement | null;
    viewport?.scrollTo({ top: 0 });
  }, [isService, resetScopeFile]);

  const descriptionFieldVariant = isService ? "service" : "project";
  const descriptionLabelClassName =
    descriptionFieldVariant === "project"
      ? "flex-1 text-[18px] leading-7 font-medium text-dark-blue-400"
      : "text-sm leading-5 font-semibold text-dark-blue-400";
  const descriptionCounterClassName =
    descriptionFieldVariant === "project"
      ? "text-sm leading-5 font-normal text-gray-400"
      : "text-xs leading-[18px] text-gray-500";
  const descriptionTextareaClassName =
    descriptionFieldVariant === "project"
      ? "h-[160px] w-[886px] rounded-lg border-gray-300 px-4 py-3 text-[16px] leading-6 font-normal text-dark-blue-400 shadow-xs placeholder:text-gray-400"
      : "h-20 text-sm";
  const firstQuestionLabelClassName = isService
    ? "flex-1 text-lg leading-7 font-medium text-dark-blue-400"
    : descriptionLabelClassName;
  const firstQuestionCounterClassName = isService
    ? "text-sm leading-5 font-normal text-gray-400"
    : descriptionCounterClassName;
  const firstQuestionTextareaClassName = isService
    ? "h-[160px] w-[886px] rounded-lg border-gray-300 px-4 py-3 text-[16px] leading-6 font-normal text-dark-blue-400 shadow-xs placeholder:text-gray-400"
    : descriptionTextareaClassName;
  const describeProjectContentClassName =
    descriptionFieldVariant === "project"
      ? "mt-8 flex flex-col gap-16"
      : "mt-8";
  const describeProjectQuestionClassName =
    descriptionFieldVariant === "project"
      ? "w-[886px] space-y-3"
      : "w-[886px] space-y-3";
  const describeProjectGroupClassName =
    descriptionFieldVariant === "project" ? "mt-16 space-y-4" : "space-y-2";
  const budgetQuestionClassName = isService
    ? "mt-16 w-[886px] flex flex-col gap-4"
    : describeProjectGroupClassName;
  const describeProjectLabelRowClassName =
    descriptionFieldVariant === "project"
      ? "flex h-7 items-baseline justify-between gap-2"
      : "flex h-7 items-baseline justify-between gap-2";

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div
        ref={contentRef}
        className="flex flex-col gap-y-10 px-5 pb-[100px] pt-10 md:px-10 min-[1024px]:flex-row min-[1024px]:gap-x-8 min-[1024px]:px-[100px] min-[1024px]:py-[50px]"
      >
        <div className="flex-auto min-w-0">
          <h1
            className={cn(
              "text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400",
              isService && "h-11 w-[886px]",
            )}
          >
            {isService ? "Describe your service" : "Describe your project"}
          </h1>

          <div className={describeProjectContentClassName}>
            <div className={describeProjectQuestionClassName}>
              <div className={describeProjectLabelRowClassName}>
                <Label className={firstQuestionLabelClassName}>
                  {isService
                    ? "What kind of ongoing help do you need?"
                    : scopeKnowledgeChoice === "known"
                      ? "What are you building?"
                      : "What do you want to accomplish with this project?"}
                </Label>
                <span className={firstQuestionCounterClassName}>
                  {descriptionWordCount}/{STEP_TWO_WORD_LIMIT} words
                </span>
              </div>
              <Textarea
                value={description}
                isInvalid={descriptionWordCount > STEP_TWO_WORD_LIMIT}
                onChange={(event) => {
                  const value = event.target.value;
                  setDescription(value);
                  updateDraftDetails({ description: value.trim() });
                }}
                placeholder={
                  isService
                    ? "I need ongoing design and development support for my e-commerce store..."
                    : "I need help building a new website for my e-commerce store..."
                }
                className={cn(
                  firstQuestionTextareaClassName,
                  descriptionWordCount > STEP_TWO_WORD_LIMIT &&
                    "border-error-300 focus:border-error-300 focus:ring-error-100",
                )}
              />
            </div>

            {!isService && scopeKnowledgeChoice === "known" ? (
              <>
                <div className="w-[886px] space-y-3">
                  <div className="flex h-7 items-baseline justify-between gap-2">
                    <Label className={descriptionLabelClassName}>
                      What are the main tasks or deliverables?
                    </Label>
                    <span className={descriptionCounterClassName}>
                      {deliverablesWordCount}/{STEP_TWO_WORD_LIMIT} words
                    </span>
                  </div>
                  <Textarea
                    value={deliverables}
                    isInvalid={deliverablesWordCount > STEP_TWO_WORD_LIMIT}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDeliverables(value);
                      updateDraftDetails({ deliverables: value.trim() });
                    }}
                    placeholder="UX design, front-end development, database setup"
                    className={cn(
                      descriptionTextareaClassName,
                      deliverablesWordCount > STEP_TWO_WORD_LIMIT &&
                        "border-error-300 focus:border-error-300 focus:ring-error-100",
                    )}
                  />
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex h-[52px] flex-col items-center justify-center gap-1">
                    <Label className="w-full text-[18px] leading-7 font-medium text-dark-blue-400">
                      Do you have documentation or a brief to share?
                      <span className="text-gray-400"> (Optional)</span>
                    </Label>
                    <p className="w-full text-sm leading-5 text-dark-blue-400">
                      If you&apos;ve already written a scope or have a doc with
                      details, upload it here. It&apos;ll help us better match the
                      team to your needs.
                    </p>
                  </div>
                  {scopeFile ? (
                    scopeUploadStatus === "complete" ? (
                      <div className="box-border flex h-[72px] w-[886px] items-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-white p-4">
                        <div className="flex h-10 min-w-0 flex-1 items-center gap-4">
                          <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[28px] border-4 border-primary-25 bg-primary-50">
                            <FileIcon className="size-4 text-primary-500" />
                          </span>
                          <div className="flex h-10 min-w-0 flex-1 flex-col gap-1">
                            <p className="h-5 truncate text-sm leading-5 font-medium text-gray-700">
                              {scopeFile.name}
                            </p>
                            <p className="h-5 text-sm leading-5 text-gray-600">
                              {convertToKbOrMb(
                                details.briefSizeBytes ?? scopeFile.size,
                              ).replace(
                                /(\d)([A-Za-z])/, "$1 $2",
                              )}
                            </p>
                          </div>
                          <IconButton
                            className="size-9 shrink-0 rounded-lg p-2 text-gray-400"
                            type="button"
                            variant="ghost"
                            visual="gray"
                            onClick={resetScopeFile}
                          >
                            <X className="size-5" />
                          </IconButton>
                        </div>
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "relative isolate box-border flex h-24 w-[886px] items-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-white p-4",
                          scopeUploadStatus === "error" &&
                            "border-error-300 bg-error-25",
                        )}
                      >
                        <div className="flex h-16 min-w-0 flex-1 flex-col gap-1">
                          <p className="h-5 truncate text-sm leading-5 font-medium text-gray-700">
                            {scopeFile.name}
                          </p>
                          <p className="h-5 text-sm leading-5 text-gray-600">
                            {convertToKbOrMb(scopeFile.size).replace(
                              /(\d)([A-Za-z])/, "$1 $2",
                            )}
                          </p>
                          <div className="flex h-5 items-center gap-3">
                            <Progress
                              className="h-2 flex-1"
                              value={scopeUploadProgress}
                            />
                            <span className="flex h-5 w-7 items-center text-sm leading-5 font-medium text-gray-700">
                              {scopeUploadProgress}%
                            </span>
                          </div>
                        </div>
                        <IconButton
                          className="absolute top-2 right-2 size-9 rounded-lg p-2 text-gray-500"
                          type="button"
                          variant="ghost"
                          visual="gray"
                          onClick={resetScopeFile}
                        >
                          <Trash2 className="size-5" />
                        </IconButton>
                      </div>
                    )
                  ) : (
                    <label
                    className={cn(
                      "flex h-[341px] w-[886px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-[100px] text-center focus-within:ring-2 focus-within:ring-primary-500",
                      isScopeDropActive && "border-primary-500",
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      const viewport = contentRef.current?.closest(
                        "[data-radix-scroll-area-viewport]",
                      ) as HTMLElement | null;
                      scopeFilePickerScrollTopRef.current =
                        viewport?.scrollTop ?? 0;
                      scopeFileInputRef.current?.click();
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsScopeDropActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsScopeDropActive(false);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsScopeDropActive(false);
                      acceptScopeFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <input
                      ref={scopeFileInputRef}
                      className="sr-only"
                      type="file"
                      accept=".pdf,.docx"
                      onFocus={(event) => {
                        event.currentTarget.blur();
                        const viewport = contentRef.current?.closest(
                          "[data-radix-scroll-area-viewport]",
                        ) as HTMLElement | null;
                        viewport?.scrollTo({
                          top: scopeFilePickerScrollTopRef.current,
                        });
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        scopeFilePickerSelectionRef.current = false;
                        const viewport = contentRef.current?.closest(
                          "[data-radix-scroll-area-viewport]",
                        ) as HTMLElement | null;
                        const handleWindowFocus = () => {
                          if (scopeFilePickerSelectionRef.current) return;

                          viewport?.scrollTo({
                            top: scopeFilePickerScrollTopRef.current,
                          });
                        };
                        window.addEventListener("focus", handleWindowFocus, {
                          once: true,
                        });
                      }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          window.requestAnimationFrame(() => {
                            const viewport = contentRef.current?.closest(
                              "[data-radix-scroll-area-viewport]",
                            ) as HTMLElement | null;
                            viewport?.scrollTo({
                              top: scopeFilePickerScrollTopRef.current,
                            });
                          });
                          return;
                        }
                        scopeFilePickerSelectionRef.current = true;
                        acceptScopeFile(file);
                        event.target.value = "";
                      }}
                    />
                    <div className="flex flex-col items-center gap-3">
                      <span className="inline-flex size-10 items-center justify-center rounded-[28px] border-[6px] border-gray-100 bg-white">
                        <UploadCloud className="size-5 text-gray-500" />
                      </span>
                      <div className="flex items-start justify-center gap-1 text-xs leading-5 text-gray-600">
                        <span>Drag and drop your project scope or</span>
                        <span className="font-semibold text-primary-500 underline">
                          Choose a File
                        </span>
                      </div>
                      <p className="max-w-[408px] text-center text-xs leading-[15px] font-light text-gray-500">
                        Upload a scope document to help clients understand your
                        project details and allow us to generate accurate
                        suggestions.
                      </p>
                      <p className="text-xs leading-[15px] text-gray-500">
                        Recommended Format: PDF or DOCX
                      </p>
                    </div>
                    </label>
                  )}
                </div>
              </>
            ) : null}
          </div>

          {isKnownServiceFlow ? (
            <>
              <div className="mt-16 w-[886px] space-y-3">
                <div className="flex h-7 items-baseline justify-between gap-2">
                  <Label className="flex-1 text-lg leading-7 font-medium text-dark-blue-400">
                    What are the main tasks or deliverables?
                  </Label>
                  <span className="text-sm leading-5 font-normal text-gray-400">
                    {deliverablesWordCount}/{STEP_TWO_WORD_LIMIT} words
                  </span>
                </div>
                <Textarea
                  value={deliverables}
                  isInvalid={deliverablesWordCount > STEP_TWO_WORD_LIMIT}
                  onChange={(event) => {
                    const value = event.target.value;
                    setDeliverables(value);
                    updateDraftDetails({ deliverables: value.trim() });
                  }}
                  placeholder="UX design, front-end development, database setup"
                  className={cn(
                    "h-[160px] w-[886px] rounded-lg border-gray-300 px-4 py-3 text-[16px] leading-6 font-normal text-dark-blue-400 shadow-xs placeholder:text-gray-400",
                    deliverablesWordCount > STEP_TWO_WORD_LIMIT &&
                      "border-error-300 focus:border-error-300 focus:ring-error-100",
                  )}
                />
              </div>

              <div className="mt-16 flex flex-col gap-6">
                <div className="flex h-[52px] w-[886px] flex-col items-center justify-center gap-1">
                  <Label className="w-full text-[18px] leading-7 font-medium text-dark-blue-400">
                    Do you have documentation or a brief to share?
                    <span className="text-gray-400"> (Optional)</span>
                  </Label>
                  <p className="w-full text-sm leading-5 text-dark-blue-400">
                    If you&apos;ve already written a scope or have a doc with
                    details, upload it here. It&apos;ll help us better match the
                    team to your needs.
                  </p>
                </div>
                {scopeFile ? (
                  <div
                    className={cn(
                      "w-[886px] rounded-lg border border-gray-200 bg-white px-4 py-3",
                      scopeUploadStatus === "complete" &&
                        "box-border flex h-[72px] items-center gap-1 rounded-lg border-2 border-dashed border-gray-300 p-4",
                      scopeUploadStatus === "error" &&
                        "border-error-300 bg-error-25",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-x-3",
                        scopeUploadStatus === "complete" &&
                          "flex h-10 min-w-0 flex-1 items-center gap-4",
                      )}
                    >
                      <div
                        className={cn(
                          "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[6px] border-gray-50 bg-gray-100 text-gray-500",
                          scopeUploadStatus === "complete" &&
                            "size-8 rounded-[28px] border-4 border-primary-25 bg-primary-50 text-primary-500",
                          scopeUploadStatus === "error" &&
                            "border-error-50 bg-error-100 text-error-500",
                        )}
                      >
                        {scopeUploadStatus === "error" ? (
                          <AlertCircle className="size-5" />
                        ) : (
                          <FileIcon className="size-5" />
                        )}
                      </div>
                      <div
                        className={cn(
                          "min-w-0 flex-auto",
                          scopeUploadStatus === "complete" &&
                            "flex h-10 min-w-0 flex-1 flex-col gap-1",
                        )}
                      >
                        <p
                          className={cn(
                            "truncate text-xs leading-[18px] font-semibold text-dark-blue-400",
                            scopeUploadStatus === "complete" &&
                              "h-5 text-sm leading-5 font-medium text-gray-700",
                            scopeUploadStatus === "error" && "text-error-500",
                          )}
                        >
                          {scopeFile.name}
                        </p>
                        <p
                          className={cn(
                            "text-xs leading-[18px] text-gray-500",
                            scopeUploadStatus === "complete" &&
                              "h-5 text-sm leading-5 text-gray-600",
                            scopeUploadStatus === "error" && "text-error-500",
                          )}
                        >
                          {convertToKbOrMb(
                            details.briefSizeBytes ?? scopeFile.size,
                          ).replace(/(\d)([A-Za-z])/, "$1 $2")}
                        </p>
                      </div>
                      <IconButton
                        className={cn(
                          "size-8 text-gray-500",
                          scopeUploadStatus === "complete" &&
                            "size-9 shrink-0 rounded-lg p-2 text-gray-400",
                        )}
                        type="button"
                        variant="ghost"
                        visual={scopeUploadStatus === "error" ? "error" : "gray"}
                        onClick={resetScopeFile}
                      >
                        <X className="size-4" />
                      </IconButton>
                    </div>

                    {scopeUploadStatus === "uploading" ? (
                      <div className="mt-2 flex items-center gap-x-3 pl-12">
                        <Progress value={scopeUploadProgress} />
                        <span className="text-xs leading-[18px] font-semibold text-gray-700">
                          {scopeUploadProgress}%
                        </span>
                      </div>
                    ) : null}
                    {scopeUploadStatus === "error" && scopeUploadError ? (
                      <div className="mt-2 flex items-center justify-between gap-x-3 pl-12">
                        <span className="text-xs leading-[18px] text-error-500">
                          {scopeUploadError}
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          visual="error"
                          onClick={() => {
                            const contentType =
                              getScopeFileContentType(scopeFile);
                            if (contentType) {
                              void uploadScopeFile(scopeFile, contentType);
                            }
                          }}
                        >
                          Try again
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <label
                    className={cn(
                      "flex h-[341px] w-[886px] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-[100px] text-center focus-within:ring-2 focus-within:ring-primary-500",
                      isScopeDropActive && "border-primary-500",
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      const viewport = contentRef.current?.closest(
                        "[data-radix-scroll-area-viewport]",
                      ) as HTMLElement | null;
                      scopeFilePickerScrollTopRef.current =
                        viewport?.scrollTop ?? 0;
                      scopeFileInputRef.current?.click();
                    }}
                    onDragEnter={(event) => {
                      event.preventDefault();
                      setIsScopeDropActive(true);
                    }}
                    onDragLeave={(event) => {
                      event.preventDefault();
                      setIsScopeDropActive(false);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "copy";
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      setIsScopeDropActive(false);
                      acceptScopeFile(event.dataTransfer.files?.[0]);
                    }}
                  >
                    <input
                      ref={scopeFileInputRef}
                      className="sr-only"
                      type="file"
                      accept=".pdf,.docx"
                      onFocus={(event) => {
                        event.currentTarget.blur();
                        const viewport = contentRef.current?.closest(
                          "[data-radix-scroll-area-viewport]",
                        ) as HTMLElement | null;
                        viewport?.scrollTo({
                          top: scopeFilePickerScrollTopRef.current,
                        });
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        scopeFilePickerSelectionRef.current = false;
                        const viewport = contentRef.current?.closest(
                          "[data-radix-scroll-area-viewport]",
                        ) as HTMLElement | null;
                        const handleWindowFocus = () => {
                          if (scopeFilePickerSelectionRef.current) return;

                          viewport?.scrollTo({
                            top: scopeFilePickerScrollTopRef.current,
                          });
                        };
                        window.addEventListener("focus", handleWindowFocus, {
                          once: true,
                        });
                      }}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) {
                          window.requestAnimationFrame(() => {
                            const viewport = contentRef.current?.closest(
                              "[data-radix-scroll-area-viewport]",
                            ) as HTMLElement | null;
                            viewport?.scrollTo({
                              top: scopeFilePickerScrollTopRef.current,
                            });
                          });
                          return;
                        }
                        scopeFilePickerSelectionRef.current = true;
                        acceptScopeFile(file);
                        event.target.value = "";
                      }}
                    />
                    <span className="inline-flex size-10 items-center justify-center rounded-[28px] border-[6px] border-gray-100 bg-white">
                      <UploadCloud className="size-5 text-gray-500" />
                    </span>
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-start justify-center gap-1 text-xs leading-5 text-gray-600">
                        Drag and drop your service scope or{" "}
                        <span className="font-semibold text-primary-500 underline">
                          Choose a file
                        </span>
                      </div>
                      <p className="max-w-[408px] text-center text-xs leading-[15px] font-light text-gray-500">
                        Upload a scope document to help clients understand your
                        service details and allow us to generate accurate
                        suggestions.
                      </p>
                      <p className="text-xs leading-[15px] text-gray-500">
                        Recommended Format: PDF or DOCX
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </>
          ) : null}

          <div className={budgetQuestionClassName}>
            <Label className="text-[18px] leading-7 font-medium text-dark-blue-400">
              What&apos;s your estimated budget for this{" "}
              {isService ? "service" : "project"}?
            </Label>
            <div className="flex w-[320px] items-end gap-2">
              <div className="flex w-[176px] flex-col gap-1.5">
                <Label className="text-sm leading-5 font-medium text-gray-500">
                  Amount
                </Label>
                <InputGroup fieldHeight="2.75rem" className="w-[176px]">
                  <InputLeftElement
                    className={cn(
                      "text-[16px] leading-6 text-gray-400",
                      budget !== "" && budget !== "0.00" &&
                        "text-dark-blue-400",
                    )}
                  >
                    $
                  </InputLeftElement>
                  <Input
                    className={cn(
                      "h-11 w-[176px] rounded-[5px] border-gray-300 px-[14px] py-2.5 pl-8 text-[16px] leading-6 font-normal text-gray-400 shadow-xs placeholder:text-gray-400",
                      budget !== "" && budget !== "0.00" &&
                        "text-dark-blue-400",
                      hasNegativeBudget &&
                        "border-error-300 focus:border-error-300 focus:ring-error-100",
                    )}
                    inputMode="decimal"
                    pattern="^\d*(\.\d{0,2})?$"
                    value={budget}
                    isInvalid={hasNegativeBudget}
                    onFocus={() => {
                      if (budget === "0.00") {
                        setBudget("");
                        updateDraftDetails({ budgetAmount: 0 });
                      }
                    }}
                    onChange={(event) => {
                      const nextValue = normalizeBudgetInput(
                        event.target.value,
                      );
                      setBudget(nextValue);
                      updateDraftDetails({
                        budgetAmount: Number(nextValue.replace(/,/g, "")) || 0,
                      });
                    }}
                    onKeyDown={(event) => {
                      const allowedKeys = [
                        "Backspace",
                        "Delete",
                        "ArrowLeft",
                        "ArrowRight",
                        "Tab",
                        "Home",
                        "End",
                      ];
                      if (
                        allowedKeys.includes(event.key) ||
                        (event.metaKey || event.ctrlKey)
                      ) {
                        return;
                      }
                      if (!/^[0-9.-]$/.test(event.key)) {
                        event.preventDefault();
                        return;
                      }
                      if (
                        event.key === "." &&
                        typeof budget === "string" &&
                        budget.includes(".")
                      ) {
                        event.preventDefault();
                      }
                    }}
                    onBlur={() => {
                      const numericValue = Number(budget);
                      if (!Number.isFinite(numericValue)) return;

                      const hasDecimals = budget.includes(".");
                      const nextValue = hasDecimals
                        ? numericValue.toFixed(2)
                        : numericValue.toFixed(2);

                      setBudget(nextValue);
                      updateDraftDetails({
                        budgetAmount: numericValue || 0,
                      });
                    }}
                  />
                </InputGroup>
              </div>
              <div className="flex w-[136px] flex-col gap-1.5">
                <Label className="invisible text-sm leading-5 font-medium text-gray-500">
                  Amount
                </Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outlined"
                      visual="gray"
                      className="h-11 w-full justify-between rounded-[5px] px-[14px] py-2.5 text-[16px] leading-6 font-normal text-dark-blue-400"
                    >
                      {budgetUnit}
                      <ChevronDown
                        className={cn(
                          "size-4 text-gray-400",
                          isService && "size-5",
                        )}
                      />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-[136px]">
                    {["per week", "per month"].map((unit) => (
                      <DropdownMenuItem
                        key={unit}
                        onSelect={() => {
                          setBudgetUnit(unit);
                          updateDraftDetails({
                            budgetFrequency:
                              unit === "per month" ? "per_month" : "per_week",
                          });
                        }}
                      >
                        {unit}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {!isService ? (
            <>
              <div className="mt-16 space-y-3">
                <Label className="text-[18px] leading-7 font-medium text-dark-blue-400">
                  How long do you expect this job to last?
                </Label>
                <RadioGroup
                  value={duration}
                  onValueChange={(value) => {
                    setDuration(value);
                    updateDraftDetails({
                      durationMonths: isService
                        ? undefined
                        : getDraftDurationMonths(value),
                    });
                  }}
                  className="grid w-[886px] grid-cols-2 gap-4"
                >
                  {durationOptions.map((option, index) => {
                    const id = `${option.value}-${option.unit}-${index}`;
                    const selected = duration === id;
                    const isOther = option.value === "Other";
                    return (
                      <HeadlessRadioGroupItem key={id} value={id} asChild>
                        <div
                          className={cn(
                            "box-border flex w-[435px] cursor-pointer items-center gap-4 rounded-lg border border-gray-200 bg-white py-4 pr-6 pl-4 text-left focus-visible:outline-none",
                            isOther && selected
                              ? "h-[116px] flex-col items-start justify-center gap-3"
                              : "h-[84px] flex-row",
                            selected && "border-primary-500",
                          )}
                        >
                          {isOther && selected ? (
                            <>
                              <div className="flex h-7 w-full items-center justify-between gap-2">
                                <span className="block h-7 w-[369px] text-[18px] leading-7 font-semibold text-dark-blue-400">
                                  {option.value}
                                </span>
                                <span className="relative inline-flex size-5 shrink-0 rounded-full border-[1.5px] border-primary-500 box-border">
                                  <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500" />
                                </span>
                              </div>
                              <div className="flex h-11 w-[395px] items-start gap-2">
                                <Input
                                  className={cn(
                                    "h-11 w-[251px] rounded-[5px] px-3.5 text-[16px] leading-6 text-gray-400 placeholder:text-gray-400",
                                    customDuration !== "" &&
                                      "text-dark-blue-400",
                                  )}
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  placeholder="Enter duration"
                                  value={customDuration}
                                  onClick={(event) => event.stopPropagation()}
                                  onChange={(event) => {
                                    const value = event.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    setCustomDuration(value);
                                    updateDraftDetails({
                                      durationMonths: isService
                                        ? undefined
                                        : getDraftDurationMonths(
                                            duration,
                                            value,
                                            customDurationUnit,
                                          ),
                                    });
                                  }}
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outlined"
                                      visual="gray"
                                      className="h-11 w-[136px] justify-between rounded-[5px] px-3.5 text-[16px] leading-6 font-normal text-dark-blue-400"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {customDurationUnit}
                                      <ChevronDown className="size-4 text-gray-500" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="h-[118px] w-[136px] min-w-0 overflow-y-scroll rounded-[5px] border-gray-100 bg-white p-0 shadow-[0px_4px_19px_rgba(0,0,0,0.04)] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg"
                                  >
                                    {projectDurationUnits.map((unit) => (
                                      <DropdownMenuItem
                                        key={unit}
                                        className={cn(
                                          "h-[34px] w-full shrink-0 px-3 py-2.5 text-[13px] leading-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-black focus:bg-gray-50 focus:text-gray-black",
                                          unit === customDurationUnit &&
                                            "bg-gray-50 text-gray-black",
                                        )}
                                        onSelect={() => {
                                          setCustomDurationUnit(unit);
                                          updateDraftDetails({
                                            durationMonths: isService
                                              ? undefined
                                              : getDraftDurationMonths(
                                                  duration,
                                                  customDuration,
                                                  unit,
                                                ),
                                          });
                                        }}
                                      >
                                        {unit}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </>
                          ) : (
                            <>
                              <span
                                className={cn(
                                  "flex h-[52px] w-[361px] flex-col items-start gap-1",
                                  !option.label && "justify-center",
                                )}
                              >
                                <span className="block h-7 self-stretch text-[18px] leading-7 font-semibold text-dark-blue-400">
                                  {option.value}
                                  {option.unit ? (
                                    <span className="ml-1 text-[18px] leading-7 font-semibold text-dark-blue-400">
                                      {" "}
                                      {option.unit}
                                    </span>
                                  ) : null}
                                </span>
                                {option.label ? (
                                  <span className="block h-5 self-stretch text-[14px] leading-5 font-normal text-dark-blue-400">
                                    {option.label}
                                  </span>
                                ) : null}
                              </span>
                              <span
                                className={cn(
                                  "box-border relative inline-flex size-[18px] shrink-0 rounded-full border-[1.5px] border-gray-300",
                                  selected && "border-primary-500",
                                )}
                              >
                                {selected ? (
                                  <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500" />
                                ) : null}
                              </span>
                            </>
                          )}
                        </div>
                      </HeadlessRadioGroupItem>
                    );
                  })}
                </RadioGroup>
              </div>

              {scopeKnowledgeChoice === "known" ? (
                <div className="mt-16 w-[886px] space-y-3">
                  <div className="flex h-7 items-baseline justify-between gap-2">
                    <Label className={descriptionLabelClassName}>
                      How will you know this project is successful?
                    </Label>
                    <span className={descriptionCounterClassName}>
                      {successCriteriaWordCount}/{STEP_TWO_WORD_LIMIT} words
                    </span>
                  </div>
                  <Textarea
                    value={successCriteria}
                    isInvalid={successCriteriaWordCount > STEP_TWO_WORD_LIMIT}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSuccessCriteria(value);
                      updateDraftDetails({
                        successCriteria: value.trim(),
                      });
                    }}
                    placeholder="Launch MVP by October, increase signups by 20%, working prototype demo"
                    className={cn(
                      descriptionTextareaClassName,
                      successCriteriaWordCount > STEP_TWO_WORD_LIMIT &&
                        "border-error-300 focus:border-error-300 focus:ring-error-100",
                    )}
                  />
                </div>
              ) : null}

              {isService ? (
                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-x-4">
                    <Label className="text-base leading-6 font-semibold text-dark-blue-400">
                      How will you know this project is successful?
                    </Label>
                    <span className="text-xs leading-[18px] text-gray-500">
                      {successCriteriaWordCount}/{STEP_TWO_WORD_LIMIT} words
                    </span>
                  </div>
                  <Textarea
                    value={successCriteria}
                    isInvalid={successCriteriaWordCount > STEP_TWO_WORD_LIMIT}
                    onChange={(event) => {
                      const value = event.target.value;
                      setSuccessCriteria(value);
                      updateDraftDetails({
                        successCriteria: isService ? undefined : value.trim(),
                      });
                    }}
                    placeholder="Launch MVP by October, increase signups by 20, working prototype demo"
                    className={cn(
                      "h-20 text-sm",
                      successCriteriaWordCount > STEP_TWO_WORD_LIMIT &&
                        "border-error-300 focus:border-error-300 focus:ring-error-100",
                    )}
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="xs:max-[1024px]:hidden shrink-0 self-start">
          <ProjectInfoTip
            variant={isService ? "describeServiceStep" : "describeProjectStep"}
          />
        </div>
      </div>
    </ScrollArea>
  );
};

const ReviewToolsTechnologiesStep = ({
  setProgress,
  source = "project",
  jobListingId,
}: ProgressProps & {
  source?: "project" | "service" | "roles";
  jobListingId?: string | null;
}) => {
  const { toggleValidation } = useStepContext();
  const { details, setDetails } = useJobListingDraftContext();
  const [tools, setTools] = useState(() =>
    details.tools?.length ? details.tools : serviceToolTags,
  );
  const [isGeneratingTools, setIsGeneratingTools] = useState(false);
  const [toolAutocompleteOptions, setToolAutocompleteOptions] = useState<
    string[]
  >([]);
  const didRequestGeneratedToolsRef = useRef(false);
  const toolAutocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const toolAutocompleteRequestIdRef = useRef(0);

  useIsomorphicLayoutEffect(() => {
    toggleValidation(true);
  }, []);

  useEffect(() => {
    setProgress?.(20);
  }, [setProgress]);

  useEffect(() => {
    if (details.tools?.length) {
      didRequestGeneratedToolsRef.current = true;
      setTools(details.tools);
    }
  }, [details.tools]);

  const updateTools = useCallback(
    (nextTools: string[]) => {
      setTools(nextTools);
      setDetails((current) => ({ ...current, tools: nextTools }));
    },
    [setDetails],
  );

  const handleToolInputValueChange = useCallback((value: string) => {
    const query = value.trim();

    if (toolAutocompleteTimerRef.current) {
      clearTimeout(toolAutocompleteTimerRef.current);
    }

    if (!query) {
      setToolAutocompleteOptions([]);
      return;
    }

    toolAutocompleteTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++toolAutocompleteRequestIdRef.current;

      try {
        const response = await AutocompleteAPI.getByType("tool", query, 10);
        if (currentRequestId !== toolAutocompleteRequestIdRef.current) return;

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data,
        )
          ? response.data
          : [];
        setToolAutocompleteOptions(
          getUniqueOptions(
            apiValues.map((item) => normalizeAutocompleteLabel(item)),
          ),
        );
      } catch {
        if (currentRequestId !== toolAutocompleteRequestIdRef.current) return;
        setToolAutocompleteOptions([]);
      }
    }, 250);
  }, []);

  useEffect(
    () => () => {
      if (toolAutocompleteTimerRef.current) {
        clearTimeout(toolAutocompleteTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (
      !jobListingId ||
      didRequestGeneratedToolsRef.current ||
      details.tools?.length
    ) {
      return;
    }
    didRequestGeneratedToolsRef.current = true;

    const generateTools = async () => {
      setIsGeneratingTools(true);
      try {
        const response = await JobListingAPI.GenerateTools(jobListingId, {
          workType: source === "service" ? "service" : "project",
          description: details.description,
          deliverables: details.deliverables,
        });
        const generatedTools = response?.data?.tools;
        if (Array.isArray(generatedTools) && generatedTools.length > 0) {
          updateTools(generatedTools);
        }
      } catch (error) {
        console.error("Failed to generate tools and technologies", error);
      } finally {
        setIsGeneratingTools(false);
      }
    };

    void generateTools();
  }, [
    details.deliverables,
    details.description,
    jobListingId,
    source,
    updateTools,
  ]);

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="flex min-h-full flex-col gap-8 bg-gray-50 px-5 py-10 md:px-10 min-[1024px]:px-[100px] min-[1024px]:pb-5 min-[1024px]:pt-[50px] min-[1180px]:flex-row min-[1180px]:items-start">
        <div className="min-w-0 flex-auto min-[1180px]:w-[886px]">
          <div className="flex h-20 w-[886px] flex-col items-center justify-center gap-4">
            <h1 className="h-11 w-[886px] text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400">
              Review tools and technologies
            </h1>
            <p className="h-5 w-[886px] text-sm leading-5 text-dark-blue-400">
              We&apos;ve generated a list based on your{" "}
              {source === "roles"
                ? "roles' description"
                : source === "service"
                  ? "service details"
                  : "project details"}
              . Feel free to add or remove anything so it better fits your needs.
            </p>
          </div>

          <TagsInputRoot
            value={tools}
            onValueChange={(details) => updateTools(details.value)}
            className="mt-8"
          >
            <TagsInputContext>
              {(tagsInput) => (
                <TagsInputControl className="flex w-full flex-col items-start gap-4 border-0 bg-transparent p-0 shadow-none focus-within:border-transparent focus-within:ring-0 min-[1180px]:w-[886px] [&>div:first-child>div]:w-full">
                  <div className="relative w-full">
                    <SearchMd className="pointer-events-none absolute left-3 top-1/2 z-10 size-5 -translate-y-1/2 text-gray-400" />
                    <TagsInputInput
                      placeholder="Search tools and technologies"
                      allowCreateOption
                      options={toolAutocompleteOptions}
                      onInputValueChange={handleToolInputValueChange}
                      className="h-11 w-full rounded-[5px] border border-gray-300 bg-white px-[14px] py-2.5 pl-[42px] text-[16px] leading-6 text-gray-500/50 shadow-xs placeholder:text-gray-500/50 focus-visible:outline-none"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isGeneratingTools ? (
                      [152, 176, 128, 164, 144].map((width) => (
                        <span
                          key={width}
                          className="relative h-10 overflow-hidden rounded-lg border border-gray-300 bg-gray-100 shadow-xs"
                          style={{ width }}
                        >
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      ))
                    ) : (
                      tagsInput.value.map((value, index) => (
                        <TagsInputItem key={value} index={index} value={value}>
                          <TagsInputItemPreview
                            size="md"
                            visual="gray"
                            className="h-10 gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 pl-4 text-sm leading-5 text-dark-blue-400 shadow-xs"
                          >
                            <TagsInputItemText>{value}</TagsInputItemText>
                            <TagsInputItemDeleteTrigger className="size-4 text-gray-400 opacity-100 hover:text-gray-700">
                              <X2 className="size-4" />
                            </TagsInputItemDeleteTrigger>
                          </TagsInputItemPreview>
                          <TagsInputItemInput />
                        </TagsInputItem>
                      ))
                    )}
                  </div>
                </TagsInputControl>
              )}
            </TagsInputContext>
            <TagsInputHiddenInput />
          </TagsInputRoot>
        </div>

        <div className="xs:max-[1180px]:hidden shrink-0 self-start">
          <ProjectInfoTip
            variant="reviewToolsTechnologiesStep"
            source={source}
          />
        </div>
      </div>
    </ScrollArea>
  );
};

type TeamRoleRow = {
  role: string;
  assignee: string;
  location: string;
  experience: ExperienceLevel;
  schedule: "Full-time" | "Part-time";
  length: string;
  estimate: string;
  editable: boolean;
};

const teamRoleRows: TeamRoleRow[] = [
  {
    role: "UX Designer",
    assignee: "Unassigned Member",
    location: "India",
    experience: "Senior",
    schedule: "Full-time",
    length: "6 months",
    estimate: "$40 - $80",
    editable: true,
  },
  {
    role: "Full Stack Developer",
    assignee: "Unassigned Member",
    location: "Pakistan",
    experience: "Junior",
    schedule: "Part-time",
    length: "3 months",
    estimate: "$25 - $40",
    editable: true,
  },
  {
    role: "Business Analyst",
    assignee: "Nana @nana_ba03",
    location: "USA",
    experience: "Senior",
    schedule: "Part-time",
    length: "2 months",
    estimate: "$25 - $40",
    editable: false,
  },
  {
    role: "Software Developer",
    assignee: "Abu @software_dev2038",
    location: "Pakistan",
    experience: "Senior",
    schedule: "Full-time",
    length: "6 months",
    estimate: "$25 - $40",
    editable: false,
  },
];

const teamRoleLocationOptions = [
  "United States",
  "India",
  "Pakistan",
  "Canada",
  "United Kingdom",
];
const teamRolePillClassName =
  "h-7 max-w-full gap-x-1.5 whitespace-nowrap rounded-[5px] border border-dashed border-gray-300 bg-gray-100 py-[5px] pl-[5px] pr-2 text-xs font-medium leading-[18px] text-gray-700 [&>span:first-child]:size-[18px] [&>span:first-child]:rounded-full [&>span:not(:first-child)]:min-w-0 [&>span:not(:first-child)]:truncate [&>span:not(:first-child)]:whitespace-nowrap [&>svg]:inline-block [&>svg]:size-[15px] [&>svg]:shrink-0 [&>svg]:text-gray-500";
const teamRoleLocationPillClassName = `${teamRolePillClassName} w-[108px]`;
const teamRoleExperiencePillClassName = `${teamRolePillClassName} w-[73px]`;
const teamRoleSchedulePillClassName = `${teamRolePillClassName} w-[92px]`;
const teamRoleLengthPillClassName = `${teamRolePillClassName} w-[92px]`;

const renderLocationOptionLabel = (location?: string) => {
  const flagUrl = location ? getFlagUrlByName(location) : null;

  return (
    <>
      {flagUrl ? (
        <img
          alt=""
          src={flagUrl}
          className="size-[18px] rounded-full object-cover"
        />
      ) : null}
      <span>{location}</span>
    </>
  );
};
const teamRoleScheduleOptions: TeamRoleRow["schedule"][] = [
  "Full-time",
  "Part-time",
];
const teamRoleLengthOptions = ["1 month", "2 months", "3 months", "6 months"];

const formatTeamBudgetDuration = (durationMonths?: number) => {
  if (typeof durationMonths !== "number" || durationMonths <= 0) {
    return "Ongoing";
  }

  return `${durationMonths} ${durationMonths === 1 ? "month" : "months"}`;
};

const createTeamRoleRow = (
  index: number,
  overrides: Partial<TeamRoleRow> = {},
): TeamRoleRow => ({
  role: `New Team Member ${index + 1}`,
  assignee: "Unassigned Member",
  location: "United States",
  experience: "Junior",
  schedule: "Full-time",
  length: "3 months",
  estimate: "$0 - $0",
  editable: true,
  ...overrides,
});

const toTeamRoleSchedule = (
  schedule?: JobListingWorkSchedule | string,
): TeamRoleRow["schedule"] =>
  schedule === "part_time" || schedule === "Part-time"
    ? "Part-time"
    : "Full-time";

const toTeamRoleExperience = (experience?: string): ExperienceLevel => {
  const normalized = experience?.trim().toLowerCase();
  const match = EXPERIENCE_LEVELS.find(
    (level) => level.toLowerCase() === normalized,
  );

  return match ?? "Junior";
};

const formatHourlyEstimate = (low?: unknown, high?: unknown) => {
  const lowCents = toFiniteNumber(low);
  const highCents = toFiniteNumber(high);

  if (typeof lowCents !== "number") {
    return "$0 - $0";
  }

  const lowUsd = Math.round(lowCents / 100);
  const highUsd =
    typeof highCents === "number" ? Math.round(highCents / 100) : lowUsd;

  return lowUsd === highUsd ? `$${lowUsd}` : `$${lowUsd} - $${highUsd}`;
};

const toJobListingWorkSchedule = (
  schedule: TeamRoleRow["schedule"],
): JobListingWorkSchedule =>
  schedule === "Part-time" ? "part_time" : "full_time";

const createTeamRoleRowsFromApi = (rows: unknown): TeamRoleRow[] =>
  Array.isArray(rows)
    ? rows
        .map((row: any, index) => {
          const role = String(
            row?.role ?? row?.roleTitle ?? row?.title ?? "",
          ).trim();

          if (!role) return null;

          return createTeamRoleRow(index, {
            role,
            assignee: row?.assignedUserId
              ? "Assigned Member"
              : "Unassigned Member",
            location: String(row?.location ?? "USA"),
            experience: toTeamRoleExperience(
              row?.experienceLevel ?? row?.experience,
            ),
            schedule: toTeamRoleSchedule(row?.workSchedule),
            length:
              typeof row?.contractLengthMonths === "number" &&
              row.contractLengthMonths > 0
                ? `${row.contractLengthMonths} ${
                    row.contractLengthMonths === 1 ? "month" : "months"
                  }`
                : "3 months",
            estimate: formatHourlyEstimate(
              row?.hourlyRateLowUsdCents,
              row?.hourlyRateHighUsdCents,
            ),
            editable: true,
          });
        })
        .filter((row): row is TeamRoleRow => Boolean(row))
    : [];

const createTeamRoleRowsPayload = (rows: TeamRoleRow[]) =>
  rows.map((row, positionOrder) => {
    const estimate = parseHourlyEstimateCents(row.estimate);

    return {
      role: row.role,
      positionOrder,
      location: row.location,
      experienceLevel: row.experience,
      workSchedule: toJobListingWorkSchedule(row.schedule),
      contractLengthMonths: parseMonthCount(row.length),
      hourlyRateLowUsdCents: estimate.low,
      hourlyRateHighUsdCents: estimate.high,
    };
  });

const serviceScopePhases = [
  {
    name: "Setup",
    customName: "Custom Name",
    status: "2 weeks",
    statusKind: "one-time",
    phaseType: "setup" as const,
    note: "One-time starting work that begins on Day X and will not repeat again.",
    rows: [
      {
        task: "Account Setup",
        role: "UX Designer",
        location: "USA",
        experience: "Senior",
        duration: "40 hours",
      },
      {
        task: "Tool Config",
        role: "Engineer",
        location: "USA",
        experience: "Junior",
        duration: "30 hours",
      },
    ],
  },
  {
    name: "Recurring",
    customName: "Content Creation",
    status: "Recurs: Monthly, 3 times",
    statusKind: "recurring",
    phaseType: "recurring" as const,
    recurrenceSchedule: "monthly",
    recurrenceCount: 3,
    note: "Work that repeats in cycles. Starts on Day X and runs for the number of cycles you set.",
    rows: [
      {
        task: "Content Writing",
        role: "Copywriter",
        location: "India",
        experience: "Senior",
        duration: "40 hours",
      },
      {
        task: "Visual Assets",
        role: "Designer",
        location: "Pakistan",
        experience: "Mid",
        duration: "30 hours",
      },
    ],
  },
  {
    name: "Ongoing",
    customName: "Reporting",
    status: "Ongoing",
    statusKind: "ongoing",
    phaseType: "ongoing" as const,
    note: "Continuous work starting on Day X with no set end date.",
    rows: [
      {
        task: "Weekly Report",
        role: "Analyst",
        location: "Pakistan",
        experience: "Junior",
        duration: "10 hours",
      },
    ],
  },
];

type ServiceScopeRow = (typeof serviceScopePhases)[number]["rows"][number] & {
  id?: string;
  workSchedule?: JobListingWorkSchedule;
  customHours?: number;
  customFrequency?: string;
  contractLengthMonths?: number;
  hourlyRateLowUsdCents?: number;
  hourlyRateHighUsdCents?: number;
};

type ServiceScopePhase = Omit<(typeof serviceScopePhases)[number], "rows"> & {
  id: string;
  rows: ServiceScopeRow[];
};

const getServicePhaseOrder = (phaseType: ServiceScopePhase["phaseType"]) => {
  if (phaseType === "setup") return 0;
  if (phaseType === "ongoing") return 2;
  return 1;
};

const reorderServicePhases = (phases: ServiceScopePhase[]) =>
  phases
    .map((phase, index) => ({ phase, index }))
    .sort((first, second) => {
      const orderDelta =
        getServicePhaseOrder(first.phase.phaseType) -
        getServicePhaseOrder(second.phase.phaseType);

      return orderDelta || first.index - second.index;
    })
    .map(({ phase }) => phase);

const reorderServiceRecurringPhases = (
  phases: ServiceScopePhase[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier,
) => {
  const setupPhases = phases.filter((phase) => phase.phaseType === "setup");
  const recurringPhases = phases.filter(
    (phase) => phase.phaseType === "recurring",
  );
  const ongoingPhases = phases.filter((phase) => phase.phaseType === "ongoing");
  const oldIndex = recurringPhases.findIndex((phase) => phase.id === activeId);
  const newIndex = recurringPhases.findIndex((phase) => phase.id === overId);

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return phases;
  }

  return [
    ...setupPhases,
    ...arrayMove(recurringPhases, oldIndex, newIndex),
    ...ongoingPhases,
  ];
};

const ServicePhaseSortableCard = ({
  children,
  phase,
}: {
  children: React.ReactNode;
  phase: ServiceScopePhase;
}) => {
  const {
    attributes,
    listeners,
    transform,
    transition,
    setNodeRef,
    isDragging,
    isOver,
  } = useSortable({
    id: phase.id,
    disabled: phase.phaseType !== "recurring",
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 0,
    position: "relative",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isOver &&
          phase.phaseType === "recurring" &&
          "after:absolute after:inset-x-0 after:top-0 after:h-[3px] after:bg-primary-500 after:content-['']",
      )}
      {...(phase.phaseType === "recurring" ? attributes : {})}
      {...(phase.phaseType === "recurring" ? listeners : {})}
    >
      {children}
    </div>
  );
};

const serviceScopePhaseTypeOptions = [
  {
    value: "setup" as const,
    label: "Setup",
    description: "Preparation tasks before work begins",
  },
  {
    value: "recurring" as const,
    label: "Recurring",
    description: "Work that repeats on a set schedule",
  },
  {
    value: "ongoing" as const,
    label: "Ongoing",
    description: "Continuous work without a set end date",
  },
];

const serviceRecurringScheduleOptions = [
  { label: "Weekly", value: "weekly" as const },
  { label: "Monthly", value: "monthly" as const },
  { label: "Quarterly", value: "quarterly" as const },
];

const getServiceRecurringScheduleLabel = (schedule?: string) =>
  serviceRecurringScheduleOptions.find((option) => option.value === schedule)
    ?.label ?? "Monthly";

const createServicePhasesFromGeneratedScope = (
  scope: any,
): ServiceScopePhase[] => {
  const generatedPhases = Array.isArray(scope?.phases) ? scope.phases : [];

  return reorderServicePhases(
    generatedPhases
      .map((phase: any, phaseIndex: number) => {
        const phaseType =
          phase?.phaseType === "recurring" || phase?.phaseType === "ongoing"
            ? phase.phaseType
            : "setup";
        const phaseOption = serviceScopePhaseTypeOptions.find(
          (option) => option.value === phaseType,
        );
        const recurrenceSchedule = phase?.recurrenceSchedule ?? "monthly";
        const recurrenceCount = Number(phase?.recurrenceCount ?? 3) || 3;
        const status =
          phaseType === "ongoing"
            ? "Ongoing"
            : phaseType === "recurring"
              ? `Recurs: ${getServiceRecurringScheduleLabel(recurrenceSchedule)}, ${recurrenceCount} ${recurrenceCount === 1 ? "time" : "times"}`
              : "2 weeks";

        return {
          id: String(
            phase?.id ?? `service-generated-phase-${phaseIndex}-${getId()}`,
          ),
          name: phaseOption?.label ?? `Phase ${phaseIndex + 1}`,
          customName:
            phaseType === "recurring"
              ? String(phase?.phaseName ?? "")
                  .replace(/^Recurring(?:\s+\d+)?\s*/i, "")
                  .trim()
              : "",
          status,
          statusKind: phaseType === "setup" ? "one-time" : phaseType,
          phaseType,
          recurrenceSchedule:
            phaseType === "recurring" ? recurrenceSchedule : undefined,
          recurrenceCount:
            phaseType === "recurring" ? recurrenceCount : undefined,
          note:
            phaseType === "ongoing"
              ? "Continuous work starting on Day X with no set end date."
              : phaseType === "recurring"
                ? "Work that repeats in cycles. Starts on Day X and runs for the number of cycles you set."
                : "One-time starting work that begins on Day X and will not repeat again.",
          rows: Array.isArray(phase?.tasks)
            ? phase.tasks.map((task: any) => ({
                task: String(task?.taskName ?? "New Task"),
                role: String(task?.roleTitle ?? "Specialist"),
                location: String(task?.location ?? "USA"),
                experience: String(task?.experienceLevel ?? "Junior"),
                duration: `${Number(task?.estimatedHours ?? 10) || 10} hours`,
                workSchedule:
                  task?.workSchedule === "part_time"
                    ? "part_time"
                    : task?.workSchedule === "custom"
                      ? "custom"
                      : "full_time",
              }))
            : [],
        };
      })
      .filter(
        (phase: ServiceScopePhase) => phase.name && phase.rows.length > 0,
      ),
  );
};

const getServicePhaseDisplayParts = (
  phaseType: ServiceScopePhase["phaseType"],
  phaseName: string,
  phaseIndex: number,
) => {
  if (phaseType === "ongoing") {
    return {
      name: "Ongoing",
      customName: phaseName.replace(/^Ongoing\s*/i, "").trim(),
    };
  }

  if (phaseType === "recurring") {
    return {
      name: "Recurring",
      customName: phaseName.replace(/^Recurring(?:\s+\d+)?\s*/i, "").trim(),
    };
  }

  return {
    name: "Setup",
    customName: phaseName.replace(/^Setup\s*/i, "").trim(),
  };
};

const createServicePhasesFromPersistedJobListing = (
  phases: any,
): ServiceScopePhase[] => {
  const persistedPhases = Array.isArray(phases) ? phases : [];

  return reorderServicePhases(
    persistedPhases
      .map((phase: any, phaseIndex: number) => {
        const phaseType: ServiceScopePhase["phaseType"] =
          phase?.phaseType === "recurring" || phase?.phaseType === "ongoing"
            ? phase.phaseType
            : "setup";
        const phaseName = String(
          phase?.phaseName ?? phase?.name ?? `Phase ${phaseIndex + 1}`,
        );
        const { name, customName } = getServicePhaseDisplayParts(
          phaseType,
          phaseName,
          phaseIndex,
        );
        const recurrenceSchedule = phase?.recurrenceSchedule ?? "monthly";
        const recurrenceCount = Number(phase?.recurrenceCount ?? 3) || 3;
        const sourceRows = Array.isArray(phase?.rows)
          ? phase.rows
          : Array.isArray(phase?.tasks)
            ? phase.tasks
            : [];
        const rows = sourceRows.map((row: any) => {
          const durationValue =
            typeof row?.duration === "object"
              ? toFiniteNumber(row.duration?.value)
              : toFiniteNumber(row?.estimatedHours ?? row?.durationHours);
          const durationType =
            typeof row?.duration === "object" && row.duration?.type
              ? String(row.duration.type)
              : "hours";

          return {
            id: toNullableString(row?.id),
            task: String(row?.task ?? row?.taskName ?? "New Task"),
            role: String(row?.role ?? row?.roleTitle ?? "Specialist"),
            location: String(row?.location ?? "USA"),
            experience: String(
              row?.experience ?? row?.experienceLevel ?? "Junior",
            ),
            duration: `${durationValue || 10} ${durationType}`,
            workSchedule:
              row?.workSchedule === "part_time"
                ? "part_time"
                : row?.workSchedule === "custom"
                  ? "custom"
                  : "full_time",
            customHours:
              row?.workSchedule === "custom"
                ? Number(row?.customHours) || undefined
                : undefined,
            customFrequency:
              row?.workSchedule === "custom"
                ? (row?.customFrequency ?? undefined)
                : undefined,
            contractLengthMonths: toFiniteNumber(row?.contractLengthMonths),
            hourlyRateLowUsdCents: toFiniteNumber(row?.hourlyRateLowUsdCents),
            hourlyRateHighUsdCents: toFiniteNumber(row?.hourlyRateHighUsdCents),
          };
        });

        return {
          id: String(
            phase?.id ?? `service-persisted-phase-${phaseIndex}-${getId()}`,
          ),
          name,
          customName,
          status:
            phaseType === "ongoing"
              ? "Ongoing"
              : phaseType === "recurring"
                ? `Recurs: ${getServiceRecurringScheduleLabel(recurrenceSchedule)}, ${recurrenceCount} ${recurrenceCount === 1 ? "time" : "times"}`
                : "2 weeks",
          statusKind:
            phaseType === "setup"
              ? "one-time"
              : phaseType === "ongoing"
                ? "ongoing"
                : "recurring",
          phaseType,
          recurrenceSchedule:
            phaseType === "recurring" ? recurrenceSchedule : undefined,
          recurrenceCount:
            phaseType === "recurring" ? recurrenceCount : undefined,
          note:
            phaseType === "ongoing"
              ? "Continuous work starting on Day X with no set end date."
              : phaseType === "recurring"
                ? "Work that repeats in cycles. Starts on Day X and runs for the number of cycles you set."
                : "One-time starting work that begins on Day X and will not repeat again.",
          rows,
        };
      })
      .filter(
        (phase: ServiceScopePhase) =>
          phase.name && phase.customName !== undefined && phase.rows.length > 0,
      ),
  );
};

const projectScopePhaseLabels = [
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

const ExistingContractRoleInfoStep = ({ setProgress }: ProgressProps) => {
  const { toggleValidation } = useStepContext();
  const { setDetails } = useJobListingDraftContext();
  const { projectScopeMethods } = useProjectScopeContext();
  const [, setProjectScopeState] = projectScopeMethods;
  const [roleDescription, setRoleDescription] = useState("");
  const [headcount, setHeadcount] = useState("2");
  const seededRowIdRef = useRef(String(getId()));

  useIsomorphicLayoutEffect(() => {
    toggleValidation(Boolean(roleDescription.trim()) && Boolean(headcount));
  }, [roleDescription, headcount]);

  useEffect(() => {
    const trimmedDescription = roleDescription.trim();
    const parsedHeadcount = Math.max(1, Number.parseInt(headcount, 10) || 1);

    setDetails((previous) => ({
      ...previous,
      description: trimmedDescription || previous.description,
      deliverables: trimmedDescription || previous.deliverables,
      headcount: parsedHeadcount,
    }));

    if (!trimmedDescription) return;

    setProjectScopeState([
      {
        phaseName: "Existing Contract Roles",
        phaseType: "setup",
        rows: [
          {
            id: seededRowIdRef.current,
            task: trimmedDescription,
            role: "Front-End Developer",
            location: "USA",
            experience: "Junior" as ExperienceLevel,
            duration: { value: 40, type: "hours" },
            workSchedule: "full_time",
          },
        ],
      },
    ]);
  }, [headcount, roleDescription, setDetails, setProjectScopeState]);

  useEffect(() => {
    setProgress?.(10);
  }, [setProgress]);

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="px-5 py-10 md:px-10 min-[1024px]:px-[70px] min-[1024px]:py-[50px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 min-[1180px]:flex-row min-[1180px]:items-start">
          <div className="min-w-0 flex-auto max-w-[885px]">
            <h1 className="text-[32px] leading-[40px] font-semibold text-dark-blue-400">
              Describe roles
            </h1>
            <div className="mt-8">
              <div className="flex items-center justify-between gap-x-4">
                <Label className="text-base leading-6 font-semibold text-dark-blue-400">
                  What do you want new team members to do?
                </Label>
                <span className="text-sm leading-5 text-gray-400">
                  67 / 100
                </span>
              </div>
              <Textarea
                className="mt-3 h-40 text-base"
                placeholder="Add tasks and responsibilities (e.g. build product pages, run tests, write content)"
                value={roleDescription}
                onChange={(event) => setRoleDescription(event.target.value)}
              />
            </div>
            <div className="mt-16 max-w-[320px]">
              <Label className="text-base leading-6 font-semibold text-dark-blue-400">
                How many people do you want to add to your team?
              </Label>
              <Label className="mt-6 block text-sm leading-5 font-semibold text-gray-500">
                Amount
              </Label>
              <Input
                className="mt-2"
                inputMode="numeric"
                value={headcount}
                onChange={(event) => setHeadcount(event.target.value)}
              />
            </div>
          </div>
          <div
            className={cn(
              "w-full shrink-0 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-[1180px]:w-[321px] self-start",
              isTeamMode &&
                "box-border flex h-[300px] flex-col gap-4 min-[1180px]:w-[322px]",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-x-2",
                isTeamMode && "h-6 w-full items-start justify-between gap-2",
              )}
            >
              <span
                className={cn(
                  "text-base leading-normal font-semibold text-gray-400",
                  isTeamMode && "h-6 flex-1 leading-6",
                )}
              >
                Quick tip
              </span>
              <Lightbulb05 className="ml-auto size-5 shrink-0 text-gray-400" />
            </div>
            <div className={cn(isTeamMode && "flex h-[220px] flex-col gap-2")}>
              <p
                className={cn(
                  "mt-4 text-base leading-6 font-semibold text-dark-blue-400",
                  isTeamMode &&
                    "mt-0 h-14 text-lg leading-7 font-semibold text-dark-blue-400",
                )}
              >
                Give us a few details now to save time later:
              </p>
              <div
                className={cn(
                  "mt-3 space-y-2",
                  isTeamMode && "mt-0 h-[156px]",
                )}
              >
                {[
                  "What the role or job is about",
                  "Key responsibilities and tasks to be done",
                  "Specific skills, tools or technologies required",
                  "Desired outcomes or deliverables",
                  "Any deadlines or timing constraints",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-x-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-dark-blue-400" />
                    <span className="text-sm leading-5 text-dark-blue-400">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

const NoScopeRoleInfoStep = ({
  setProgress,
  hiringMode,
}: ProgressProps & { hiringMode?: HiringModeChoice }) => {
  const { toggleValidation } = useStepContext();
  const { details, setDetails } = useJobListingDraftContext();
  const { projectScopeMethods } = useProjectScopeContext();
  const [, setProjectScopeState] = projectScopeMethods;
  const isTeamMode = hiringMode !== "individual";
  const useNoScopeLayout = true;
  const [roleDescription, setRoleDescription] = useState("");
  const [headcount, setHeadcount] = useState("");
  const [budget, setBudget] = useState(
    typeof details.budgetAmount === "number"
      ? String(details.budgetAmount)
      : "0.00",
  );
  const [budgetFrequency, setBudgetFrequency] = useState<
    "per_week" | "per_month"
  >("per_week");
  const [durationChoice, setDurationChoice] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [customDurationUnit, setCustomDurationUnit] = useState("months");
  const didHydrateDetailsRef = useRef(false);
  const hasValidDuration =
    !useNoScopeLayout ||
    (durationChoice !== "Other" && durationChoice !== ""
      ? true
      : Number(customDuration) > 0);
  const roleDescriptionWordCount = getWordCount(roleDescription);
  const hasWordLimitError = roleDescriptionWordCount > STEP_TWO_WORD_LIMIT;
  const parsedHeadcount = Number(headcount);
  const hasHeadcountError =
    isTeamMode &&
    headcount.trim().length > 0 &&
    (!Number.isFinite(parsedHeadcount) || parsedHeadcount <= 0);
  const hasValidHeadcount =
    !isTeamMode ||
    (headcount.trim().length > 0 &&
      Number.isFinite(parsedHeadcount) &&
      parsedHeadcount > 0);
  const hasNegativeBudget = budget.trim().startsWith("-");
  const hasValidBudget =
    budget.trim().length > 0 &&
    !hasNegativeBudget &&
    Number.isFinite(Number(budget.replace(/,/g, ""))) &&
    Number(budget.replace(/,/g, "")) >= 0;

  useEffect(() => {
    if (didHydrateDetailsRef.current) return;

    const hasPersistedDetails =
      typeof details.description === "string" ||
      typeof details.deliverables === "string" ||
      typeof details.headcount === "number" ||
      typeof details.budgetAmount === "number" ||
      typeof details.durationMonths === "number";

    if (!hasPersistedDetails) return;

    didHydrateDetailsRef.current = true;
    setRoleDescription(details.description ?? details.deliverables ?? "");
    setHeadcount(
      typeof details.headcount === "number" ? String(details.headcount) : "",
    );
    if (typeof details.budgetAmount === "number") {
      setBudget(String(details.budgetAmount));
    }
    if (
      details.budgetFrequency === "per_week" ||
      details.budgetFrequency === "per_month"
    ) {
      setBudgetFrequency(details.budgetFrequency);
    }

    if (typeof details.durationMonths === "number") {
      const standardDuration = [3, 6, 12, 24].find(
        (months) => months === details.durationMonths,
      );
      if (standardDuration) {
        setDurationChoice(`${standardDuration} months`);
      } else {
        setDurationChoice("Other");
        setCustomDuration(String(details.durationMonths));
        setCustomDurationUnit("months");
      }
    }
  }, [details]);

  useIsomorphicLayoutEffect(() => {
    toggleValidation(
      Boolean(roleDescription.trim()) &&
        !hasWordLimitError &&
        hasValidHeadcount &&
        hasValidBudget &&
        hasValidDuration,
    );
  }, [
    budget,
    customDuration,
    durationChoice,
    hasHeadcountError,
    hasValidHeadcount,
    hasWordLimitError,
    headcount,
    hasValidDuration,
    hasValidBudget,
    roleDescription,
  ]);

  useEffect(() => {
    setProgress?.(12);
  }, [setProgress]);

  useEffect(() => {
    const trimmedDescription = roleDescription.trim();
    const parsedHeadcount = Math.max(1, Number.parseInt(headcount, 10) || 1);
    const parsedBudget = Number.parseFloat(budget);
    const customDurationAmount = Number(customDuration) || 0;
    const durationMonths =
      durationChoice === "Other"
        ? customDurationUnit === "days"
          ? Math.max(1, Math.ceil(customDurationAmount / 30))
          : customDurationUnit === "weeks"
            ? Math.max(1, Math.ceil(customDurationAmount / 4))
            : customDurationUnit === "quarters"
              ? customDurationAmount * 3 || undefined
              : customDurationUnit === "years"
                ? customDurationAmount * 12 || undefined
                : customDurationAmount || undefined
        : Number.parseInt(durationChoice, 10) || undefined;

    setDetails((previous) => ({
      ...previous,
      description: trimmedDescription || previous.description,
      deliverables: trimmedDescription || previous.deliverables,
      headcount: parsedHeadcount,
      budgetAmount: Number.isFinite(parsedBudget)
        ? parsedBudget
        : previous.budgetAmount,
      budgetFrequency,
      durationMonths,
      isOngoing: durationChoice === "24 months" ? true : previous.isOngoing,
    }));

    if (!trimmedDescription) return;

    setProjectScopeState([
      {
        phaseName: isTeamMode ? "Team Roles" : "Individual Role",
        phaseType: "ongoing",
        rows: Array.from({ length: parsedHeadcount }, (_, index) => ({
          id: `no-scope-role-${index}`,
          task: trimmedDescription,
          role: isTeamMode ? `Team Member ${index + 1}` : "Individual Role",
          location: "USA",
          experience: "Junior" as ExperienceLevel,
          duration: { value: 40, type: "hours" },
          workSchedule: "full_time",
        })),
      },
    ]);
  }, [
    budget,
    budgetFrequency,
    customDuration,
    customDurationUnit,
    durationChoice,
    headcount,
    isTeamMode,
    roleDescription,
    setDetails,
    setProjectScopeState,
  ]);

  const durationOptions = isTeamMode
    ? [
        {
          label: "3 months",
          description: "Short-term support, pilot run, or trial period",
        },
        {
          label: "6 months",
          description: "Feature rollouts, seasonal needs, or limited contracts",
        },
        {
          label: "12 months",
          description: "Long-term engagement or steady workload",
        },
        {
          label: "24 months",
          description: "Ongoing responsibilities or evolving team needs",
        },
      ]
    : [
        {
          label: "3 months",
          description: "Short-term contract, pilot work, or temp coverage",
        },
        {
          label: "6 months",
          description: "Seasonal support, rollout projects",
        },
        {
          label: "12 months",
          description: "Long-term hire or retainer",
        },
        {
          label: "24 months",
          description: "Ongoing support or continuous responsibilities",
        },
      ];

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="flex flex-col gap-y-10 px-5 pb-[100px] pt-10 md:px-10 min-[1024px]:flex-row min-[1024px]:gap-x-8 min-[1024px]:px-[100px] min-[1024px]:py-[50px]">
        <div className="contents">
          <div className="flex-auto min-w-0">
            <h1 className="text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400">
              {isTeamMode
                ? "Describe roles you need"
                : "Describe role you need"}
            </h1>

            <div
              className={cn(
                "mt-8",
                useNoScopeLayout && "flex w-[886px] flex-col gap-3",
              )}
            >
              <div
                className={cn(
                  "flex justify-between gap-x-4",
                  useNoScopeLayout
                    ? "h-7 items-baseline gap-2"
                    : "items-center",
                )}
              >
                <Label
                  className={cn(
                    "text-base leading-6 font-semibold text-dark-blue-400",
                    useNoScopeLayout &&
                      "flex-1 text-lg leading-7 font-medium text-dark-blue-400",
                  )}
                >
                  {isTeamMode
                    ? "What do you want your team to work on?"
                    : "What do you want this person to work on?"}
                </Label>
                <span
                  className={cn(
                    "text-sm leading-5 text-gray-400",
                    useNoScopeLayout && "font-normal",
                  )}
                >
                  {roleDescriptionWordCount}/{STEP_TWO_WORD_LIMIT} words
                </span>
              </div>
              <Textarea
                className={cn(
                  "mt-3 h-40 text-base",
                  useNoScopeLayout &&
                    "mt-0 h-[160px] rounded-lg border-gray-300 px-4 py-3 text-[16px] leading-6 font-normal text-gray-400 shadow-xs placeholder:text-gray-400",
                  useNoScopeLayout &&
                    roleDescription !== "" && "text-dark-blue-400",
                  hasWordLimitError &&
                    "border-error-300 focus:border-error-300 focus:ring-error-100",
                )}
                placeholder="Add tasks and responsibilities (e.g. build product pages, run tests, write content)"
                value={roleDescription}
                isInvalid={hasWordLimitError}
                onChange={(event) => setRoleDescription(event.target.value)}
              />
            </div>

            {isTeamMode ? (
              <div
                className={cn(
                  "mt-16 max-w-[320px]",
                  useNoScopeLayout &&
                    "flex w-[886px] max-w-none flex-col gap-4",
                )}
              >
              <Label
                className={cn(
                  "text-base leading-6 font-semibold text-dark-blue-400",
                  useNoScopeLayout &&
                    "text-lg leading-7 font-medium text-dark-blue-400",
                )}
              >
                {isTeamMode
                  ? "How many people do you want to add to your team?"
                  : "How many people do you want to add?"}
              </Label>
              <div
                className={cn(
                  useNoScopeLayout && "flex w-[320px] flex-col gap-1.5",
                )}
              >
                <Label
                  className={cn(
                    "mt-6 block text-sm leading-5 font-semibold text-gray-500",
                    useNoScopeLayout &&
                      "mt-0 font-medium text-gray-500",
                  )}
                >
                  Amount
                </Label>
                <Input
                  className={cn(
                    "mt-2",
                    useNoScopeLayout &&
                      "mt-0 h-11 w-[320px] rounded-[5px] border-gray-300 px-[14px] py-2.5 text-[16px] leading-6 font-normal text-dark-blue-400 shadow-xs",
                    hasHeadcountError &&
                      "border-error-300 focus:border-error-300 focus:ring-error-100",
                  )}
                  inputMode="numeric"
                  pattern={useNoScopeLayout ? "[0-9]*" : undefined}
                  value={headcount}
                  isInvalid={hasHeadcountError}
                  onChange={(event) =>
                    setHeadcount(
                      useNoScopeLayout
                        ? event.target.value.replace(/[^0-9]/g, "")
                        : event.target.value,
                    )
                  }
                />
              </div>
              </div>
            ) : null}

            {useNoScopeLayout ? (
              <div className="mt-16 flex w-[886px] flex-col gap-4">
                <Label className="text-lg leading-7 font-medium text-dark-blue-400">
                  What&apos;s your estimated budget for this {isTeamMode ? "team" : "role"}?
                </Label>
                <div className="flex w-[320px] items-end gap-2">
                  <div className="flex w-[176px] flex-col gap-1.5">
                    <Label className="text-sm leading-5 font-medium text-gray-500">
                      Amount
                    </Label>
                    <InputGroup fieldHeight="2.75rem" className="w-[176px]">
                      <InputLeftElement
                        className={cn(
                          "text-[16px] leading-6 text-gray-400",
                          budget !== "" && budget !== "0.00" &&
                            "text-dark-blue-400",
                        )}
                      >
                        $
                      </InputLeftElement>
                      <Input
                        className={cn(
                          "h-11 w-[176px] rounded-[5px] border-gray-300 px-[14px] py-2.5 pl-8 text-[16px] leading-6 font-normal text-gray-400 shadow-xs",
                          budget !== "" && budget !== "0.00" &&
                            "text-dark-blue-400",
                          hasNegativeBudget &&
                            "border-error-300 focus:border-error-300 focus:ring-error-100",
                        )}
                        inputMode="decimal"
                        pattern="^\d*(\.\d{0,2})?$"
                        value={budget}
                        isInvalid={hasNegativeBudget}
                        onFocus={() => {
                          if (budget === "0.00") {
                            setBudget("");
                            setDetails((previous) => ({
                              ...previous,
                              budgetAmount: 0,
                            }));
                          }
                        }}
                        onChange={(event) => {
                          const value = normalizeBudgetInput(
                            event.target.value,
                          );
                          setBudget(value);
                        }}
                        onKeyDown={(event) => {
                          const allowedKeys = [
                            "Backspace",
                            "Delete",
                            "ArrowLeft",
                            "ArrowRight",
                            "Tab",
                            "Home",
                            "End",
                          ];
                          if (
                            allowedKeys.includes(event.key) ||
                            event.metaKey ||
                            event.ctrlKey
                          ) {
                            return;
                          }
                          if (!/^[0-9.-]$/.test(event.key)) {
                            event.preventDefault();
                            return;
                          }
                          if (event.key === "." && budget.includes(".")) {
                            event.preventDefault();
                          }
                        }}
                        onBlur={() => {
                          const numericValue = Number(budget);
                          if (!Number.isFinite(numericValue)) return;
                          setBudget(numericValue.toFixed(2));
                        }}
                      />
                    </InputGroup>
                  </div>
                  <Select
                    value={budgetFrequency}
                    onValueChange={(value) =>
                      setBudgetFrequency(value as "per_week" | "per_month")
                    }
                  >
                    <SelectTrigger className="h-11 w-[136px] rounded-[5px] px-[14px] py-2.5 text-[16px] leading-6 font-normal text-dark-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { label: "per week", value: "per_week" },
                        { label: "per month", value: "per_month" },
                      ].map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="mt-16">
                <Label className="text-base leading-6 font-semibold text-dark-blue-400">
                  What&apos;s your estimated budget for this role?
                </Label>
                <Label className="mt-6 block text-sm leading-5 font-semibold text-gray-500">
                  Amount
                </Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  <InputGroup className="w-[200px]">
                    <InputLeftAddon>$</InputLeftAddon>
                    <Input
                      inputMode="decimal"
                      value={budget}
                      onChange={(event) => setBudget(event.target.value)}
                    />
                  </InputGroup>
                  <Select
                    value={budgetFrequency}
                    onValueChange={(value) =>
                      setBudgetFrequency(value as "per_week" | "per_month")
                    }
                  >
                    <SelectTrigger className="h-12 w-[154px] px-3 text-sm leading-5 font-semibold text-dark-blue-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[
                        { label: "per week", value: "per_week" },
                        { label: "per month", value: "per_month" },
                      ].map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div
              className={cn(
                "mt-16",
                useNoScopeLayout && "flex w-[886px] flex-col gap-4",
              )}
            >
              <Label
                className={cn(
                  "text-base leading-6 font-semibold text-dark-blue-400",
                  useNoScopeLayout &&
                    "text-lg leading-7 font-medium text-dark-blue-400",
                )}
              >
                {isTeamMode
                  ? "How long do you expect to work with this team?"
                  : "How long do you expect to work with this person?"}
              </Label>
              <RadioGroup
                className={cn(
                  "mt-6 grid gap-4 md:grid-cols-2",
                  useNoScopeLayout && "mt-0 w-[886px] gap-4",
                )}
                value={durationChoice}
                onValueChange={setDurationChoice}
              >
                {durationOptions.map((option) => (
                  <HeadlessRadioGroupItem
                    key={option.label}
                    value={option.label}
                    className={cn(
                      "flex min-h-[84px] items-start gap-x-4 rounded-lg border border-gray-200 bg-white p-4 text-left shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] focus-visible:outline-none",
                      useNoScopeLayout &&
                        "h-[84px] w-[435px] min-h-0 items-center gap-x-4 py-4 pr-6 pl-4",
                      durationChoice === option.label && "border-primary-500",
                    )}
                  >
                    <span className="min-w-0 flex-auto">
                      <span className="block text-lg leading-7 font-semibold text-dark-blue-400">
                        {option.label}
                      </span>
                      <span
                        className={cn(
                          "mt-1 block text-sm leading-5 text-gray-500",
                          useNoScopeLayout && "text-dark-blue-400",
                        )}
                      >
                        {option.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-1 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-gray-300",
                        useNoScopeLayout && "mt-0",
                        durationChoice === option.label &&
                          "border-primary-500",
                      )}
                    >
                      {durationChoice === option.label ? (
                        <span className="size-2 rounded-full bg-primary-500" />
                      ) : null}
                    </span>
                  </HeadlessRadioGroupItem>
                ))}

                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "rounded-lg border border-gray-200 bg-white p-4 text-left shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] focus-visible:outline-none",
                    useNoScopeLayout && durationChoice === "Other"
                      ? "flex h-[116px] w-[435px] flex-col justify-center gap-3 py-4 pr-6 pl-4"
                      : useNoScopeLayout
                        ? "flex h-[84px] w-[435px] items-center gap-4 py-4 pr-6 pl-4"
                        : undefined,
                    durationChoice === "Other" && "border-primary-500",
                  )}
                  onClick={() => setDurationChoice("Other")}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setDurationChoice("Other");
                    }
                  }}
                >
                  <div
                    className={cn(
                      "flex items-start gap-x-4",
                      useNoScopeLayout && durationChoice === "Other"
                        ? "flex h-7 w-[395px] items-center justify-between gap-2"
                        : useNoScopeLayout
                          ? "flex h-[52px] w-[395px] items-center gap-4"
                          : undefined,
                    )}
                  >
                    <span className="min-w-0 flex-auto">
                      <span className="block text-lg leading-7 font-semibold text-dark-blue-400">
                        Other
                      </span>
                    </span>
                    <span
                      className={cn(
                        "mt-1 inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-gray-300",
                        useNoScopeLayout && "mt-0",
                        durationChoice === "Other" &&
                          "border-primary-500",
                      )}
                    >
                      {durationChoice === "Other" ? (
                        <span className="size-2 rounded-full bg-primary-500" />
                      ) : null}
                    </span>
                  </div>
                  {(!useNoScopeLayout || durationChoice === "Other") && (
                    <div
                      className={cn(
                        "mt-4 flex flex-wrap gap-2",
                        useNoScopeLayout && "mt-0 h-11 w-[395px] flex-nowrap",
                      )}
                    >
                      <Input
                        className={cn(
                          "w-[180px] text-gray-400 placeholder:text-gray-400",
                          useNoScopeLayout &&
                            "h-11 w-[251px] rounded-[5px] px-[14px] py-2.5 text-[16px] leading-6 font-normal shadow-xs",
                          useNoScopeLayout &&
                            customDuration !== "" &&
                            "text-dark-blue-400",
                        )}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Enter duration"
                        value={customDuration}
                        onChange={(event) =>
                          setCustomDuration(
                            event.target.value.replace(/\D/g, ""),
                          )
                        }
                      />
                      {useNoScopeLayout ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outlined"
                              visual="gray"
                              className="h-11 w-[136px] justify-between rounded-[5px] px-3.5 text-[16px] leading-6 font-normal text-dark-blue-400"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {customDurationUnit.charAt(0).toUpperCase() +
                                customDurationUnit.slice(1)}
                              <ChevronDown className="size-4 text-gray-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="start"
                            className="h-[118px] w-[136px] min-w-0 overflow-y-scroll rounded-[5px] border-gray-100 bg-white p-0 shadow-[0px_4px_19px_rgba(0,0,0,0.04)] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg"
                          >
                            {projectDurationUnits.map((unit) => (
                              <DropdownMenuItem
                                key={unit}
                                className={cn(
                                  "h-[34px] w-full shrink-0 px-3 py-2.5 text-[13px] leading-[13px] text-gray-500 hover:bg-gray-50 hover:text-gray-black focus:bg-gray-50 focus:text-gray-black",
                                  unit === customDurationUnit &&
                                    "bg-gray-50 text-gray-black",
                                )}
                                onSelect={() => setCustomDurationUnit(unit)}
                              >
                                {unit}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Select
                          value={customDurationUnit}
                          onValueChange={setCustomDurationUnit}
                        >
                          <SelectTrigger className="h-12 w-[150px] px-3 text-sm leading-5 font-semibold text-dark-blue-400">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["months", "weeks"].map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit === "weeks" ? "Weeks" : "Months"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="xs:max-[1024px]:hidden shrink-0 self-start">
            <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-[1024px]:w-[321px] self-start">
            <div className="flex items-center gap-x-2">
              <span className="text-base leading-normal font-semibold text-gray-400">
                Quick tip
              </span>
              <Lightbulb03 className="ml-auto size-5 shrink-0 text-gray-400" />
            </div>
            <p className="mt-4 text-base leading-6 font-semibold text-dark-blue-400">
              Give us a few details now to save time later:
            </p>
            <div className="mt-3 space-y-2">
              {[
                "What the role or job is about",
                "Key responsibilities and tasks to be done",
                "Specific skills, tools or technologies required",
                "Desired outcomes or deliverables",
                "Any deadlines or timing constraints",
              ].map((item) => (
                <div key={item} className="flex items-start gap-x-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-dark-blue-400" />
                  <span className="text-sm leading-5 text-dark-blue-400">
                    {item}
                  </span>
                </div>
              ))}
            </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

const formatProjectRowDuration = (row: PhaseRow) =>
  `${row.duration?.value ?? 1} ${row.duration?.type ?? "hours"}`;

const formatProjectRowSchedule = (row: PhaseRow) => {
  if (row.workSchedule === "part_time") return "Part-time";
  if (row.workSchedule === "custom") {
    return `${row.customHours ?? row.duration?.value ?? 1} hours ${
      row.customFrequency ?? "per week"
    }`;
  }
  return "Full-time";
};

const createPhaseRowFromGeneratedTask = (
  task: any,
  idSuffix: string,
): PhaseRow => ({
  id: String(task?.id ?? `generated-scope-${idSuffix}-${getId()}`),
  task: String(task?.taskName ?? task?.task ?? "New Task"),
  role: String(task?.roleTitle ?? task?.role ?? "Specialist"),
  location: String(task?.location ?? "USA"),
  experience: (task?.experienceLevel ?? "Junior") as ExperienceLevel,
  duration: {
    value: toFiniteNumber(task?.estimatedHours ?? task?.durationHours) ?? 10,
    type: "hours",
  },
  workSchedule:
    task?.workSchedule === "part_time"
      ? "part_time"
      : task?.workSchedule === "custom"
        ? "custom"
        : "full_time",
  customHours:
    task?.workSchedule === "custom"
      ? toFiniteNumber(task?.customHours)
      : undefined,
  customFrequency:
    task?.workSchedule === "custom"
      ? (task?.customFrequency ?? undefined)
      : undefined,
  contractLengthMonths: toFiniteNumber(task?.contractLengthMonths),
  hourlyRateLowUsdCents: toFiniteNumber(task?.hourlyRateLowUsdCents),
  hourlyRateHighUsdCents: toFiniteNumber(task?.hourlyRateHighUsdCents),
});

const createPhasesFromGeneratedScope = (scope: any): Phase[] => {
  const generatedPhases = Array.isArray(scope?.phases) ? scope.phases : [];

  return generatedPhases
    .map((phase: any, phaseIndex: number) => {
      const rows = Array.isArray(phase?.tasks)
        ? phase.tasks.map((task: any, taskIndex: number) =>
            createPhaseRowFromGeneratedTask(task, `${phaseIndex}-${taskIndex}`),
          )
        : [];

      return {
        phaseName: String(phase?.phaseName ?? `Phase ${phaseIndex + 1}`),
        phaseType: phase?.phaseType,
        recurrenceSchedule: phase?.recurrenceSchedule,
        recurrenceCount: phase?.recurrenceCount,
        rows,
      };
    })
    .filter((phase: Phase) => phase.phaseName && (phase.rows ?? []).length > 0);
};

const createPhasesFromPersistedJobListing = (phases: any): Phase[] => {
  const persistedPhases = Array.isArray(phases) ? phases : [];

  return persistedPhases
    .map((phase: any, phaseIndex: number) => {
      const tasks = Array.isArray(phase?.tasks) ? phase.tasks : [];
      const rows = tasks.map((task: any, taskIndex: number) =>
        createPhaseRowFromGeneratedTask(task, `${phaseIndex}-${taskIndex}`),
      );

      return {
        phaseName: String(phase?.phaseName ?? `Phase ${phaseIndex + 1}`),
        phaseType: phase?.phaseType,
        recurrenceSchedule: phase?.recurrenceSchedule ?? undefined,
        recurrenceCount:
          typeof phase?.recurrenceCount === "number"
            ? phase.recurrenceCount
            : undefined,
        rows,
      };
    })
    .filter((phase: Phase) => phase.phaseName && (phase.rows ?? []).length > 0);
};

const createProjectScopePhase = (
  phaseName: string,
): Phase => ({
  phaseName,
  phaseType: "setup",
  rows: [],
});

type ProjectAssistantHistoryItem = {
  id: string
  prompt: string
  result?: string
  status: "pending" | "success" | "error"
  listingBefore?: ProjectAssistantListingSnapshot
  listingAfter?: ProjectAssistantListingSnapshot
}

type ProjectAssistantListingSnapshot = {
  phases: Phase[]
  budgetAmount: number
  isBudgetStale: boolean
  timelineMonths: number
}

type ServiceAssistantHistoryItem = {
  id: string;
  prompt: string;
  result?: string;
  status: "pending" | "success" | "error";
  listingBefore?: ServiceAssistantListingSnapshot;
  listingAfter?: ServiceAssistantListingSnapshot;
};

type ServiceAssistantListingSnapshot = {
  phases: ServiceScopePhase[];
  budgetAmount: number;
  isBudgetStale: boolean;
};

const ProjectScopeEditStep = ({
  setProgress,
  jobListingId,
}: ProgressProps & { jobListingId?: string | null }) => {
  const { toggleValidation } = useStepContext()
  const { projectScopeMethods } = useProjectScopeContext()
  const [projectScopeState, setProjectScopeState] = projectScopeMethods
  const { details: jobListingDraftDetails } = useJobListingDraftContext()
  const [phases, setPhases] = useState<Phase[]>([])
  const [expandedPhaseNames, setExpandedPhaseNames] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState("")
  const [activeRoleKey, setActiveRoleKey] = useState<string | null>(null)
  const [draftRole, setDraftRole] = useState("")
  const [roleAutocompleteOptions, setRoleAutocompleteOptions] = useState<
    string[]
  >([])
  const [isRoleAutocompleteOpen, setRoleAutocompleteOpen] = useState(false)
  const roleAutocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const roleAutocompleteRequestIdRef = useRef(0)
  const [draftSchedule, setDraftSchedule] =
    useState<JobListingWorkSchedule>("full_time")
  const [draftCustomHours, setDraftCustomHours] = useState("15")
  const [draftCustomFrequency, setDraftCustomFrequency] = useState("per_week")
  const [assistantMessage, setAssistantMessage] = useState("")
  const [assistantResult, setAssistantResult] = useState("")
  const [assistantLastPrompt, setAssistantLastPrompt] = useState("")
  const [assistantHistory, setAssistantHistory] = useState<
    ProjectAssistantHistoryItem[]
  >([])
  const [isAssistantLoading, setIsAssistantLoading] = useState(false)
  const assistantChatScrollRef = useRef<HTMLDivElement | null>(null)
  const didGenerateInitialScopeRef = useRef(false)
  const didApplyPersistedScopeRef = useRef(false)
  const skipNextProjectScopeSaveRef = useRef(false)
  const lastSavedProjectScopeSignatureRef = useRef("")
  const assistantUndoSnapshotRef =
    useRef<ProjectAssistantListingSnapshot | null>(null)
  const [budgetAmount, setBudgetAmount] = useState(5000)
  const [isBudgetLoading, setIsBudgetLoading] = useState(false)
  const [isBudgetStale, setIsBudgetStale] = useState(false)
  const [budgetFrequency, setBudgetFrequency] = useState("week")
  const [budgetTooltipOpen, setBudgetTooltipOpen] = useState(false)
  const normalizedSearchValue = normalizeSearchText(searchValue)
  const visiblePhases = normalizedSearchValue
    ? phases.filter((phase) => {
        const phaseText = normalizeSearchText(
          [
            phase.phaseName,
            ...((phase.rows ?? []).flatMap((row) => [
              row.task,
              row.role,
              row.location,
              row.experience,
              formatProjectRowDuration(row),
              formatProjectRowSchedule(row),
            ]) ?? []),
          ].join(" ")
        )

        return phaseText.includes(normalizedSearchValue)
      })
    : phases

  const isScopeValid = phases.some(
    (phase) => phase.phaseName?.trim() && (phase.rows ?? []).length > 0
  )
  const projectTimelineMonths = useMemo(
    () => getProjectTimelineMonthsFromScope(phases),
    [phases]
  )

  useEffect(() => {
    const query = draftRole.trim()

    if (roleAutocompleteTimerRef.current) {
      clearTimeout(roleAutocompleteTimerRef.current)
    }

    if (!activeRoleKey || !query) {
      setRoleAutocompleteOptions([])
      setRoleAutocompleteOpen(false)
      return
    }

    roleAutocompleteTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++roleAutocompleteRequestIdRef.current

      try {
        const response = await AutocompleteAPI.getByType(
          "job_titles",
          query,
          10
        )
        if (currentRequestId !== roleAutocompleteRequestIdRef.current) return

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data
        )
          ? response.data
          : []
        const options = getUniqueOptions(
          apiValues.map((item) => normalizeAutocompleteLabel(item))
        ).filter(
          (option) => option.toLowerCase() !== query.toLowerCase()
        )

        setRoleAutocompleteOptions(options)
        setRoleAutocompleteOpen(options.length > 0)
      } catch {
        if (currentRequestId !== roleAutocompleteRequestIdRef.current) return
        setRoleAutocompleteOptions([])
        setRoleAutocompleteOpen(false)
      }
    }, 250)

    return () => {
      if (roleAutocompleteTimerRef.current) {
        clearTimeout(roleAutocompleteTimerRef.current)
      }
    }
  }, [activeRoleKey, draftRole])

  useEffect(() => {
    if (didApplyPersistedScopeRef.current) return

    const persistedPhases = Array.isArray(projectScopeState)
      ? projectScopeState.filter(
          (phase) => phase?.phaseName?.trim() && (phase.rows ?? []).length > 0
        )
      : []

    if (persistedPhases.length === 0) return

    didApplyPersistedScopeRef.current = true
    didGenerateInitialScopeRef.current = true
    setPhases(persistedPhases)
    setExpandedPhaseNames(
      persistedPhases
        .map((phase) => phase.phaseName)
        .filter((name): name is string => Boolean(name))
    )
  }, [projectScopeState])

  useEffect(() => {
    if (!jobListingId || didGenerateInitialScopeRef.current) return
    didGenerateInitialScopeRef.current = true

    const generateScope = async () => {
      setIsBudgetLoading(true)
      try {
        const response = await JobListingAPI.GenerateScope(jobListingId, {
          workType: "project",
          description: jobListingDraftDetails.description,
          deliverables: jobListingDraftDetails.deliverables,
          successCriteria: jobListingDraftDetails.successCriteria,
          tools: jobListingDraftDetails.tools,
          durationMonths: projectTimelineMonths || 1,
          budgetUsdCents: budgetAmount * 100,
          apply: true,
        })
        const generatedPhases = createPhasesFromGeneratedScope(
          response?.data?.scope
        )

        if (generatedPhases.length > 0) {
          skipNextProjectScopeSaveRef.current = true
          setPhases(generatedPhases)
          setExpandedPhaseNames(
            generatedPhases.map((phase) => phase.phaseName ?? "")
          )
        }
        const totalBudgetUsdCents = toFiniteNumber(
          response?.data?.totalBudgetUsdCents
        )
        if (typeof totalBudgetUsdCents === "number") {
          setBudgetAmount(Math.round(totalBudgetUsdCents / 100))
          setIsBudgetStale(Boolean(response?.data?.isBudgetStale))
        }
      } catch (error) {
        console.error("Failed to generate project scope", error)
      } finally {
        setIsBudgetLoading(false)
      }
    }

    void generateScope()
  }, [
    jobListingId,
    projectTimelineMonths,
    jobListingDraftDetails.description,
    jobListingDraftDetails.deliverables,
    jobListingDraftDetails.successCriteria,
    jobListingDraftDetails.tools,
  ])

  const updatePhase = (phaseName: string, nextValues: Partial<Phase>) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) =>
        phase.phaseName !== phaseName ? phase : { ...phase, ...nextValues }
      )
    )
  }

  const updateRow = (
    phaseName: string,
    rowId: string,
    nextValues: Partial<PhaseRow>
  ) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) =>
        phase.phaseName !== phaseName
          ? phase
          : {
              ...phase,
              rows: (phase.rows ?? []).map((row) =>
                row.id === rowId ? { ...row, ...nextValues } : row
              ),
            }
      )
    )
  }

  const addPhase = () => {
    const nextPhaseName = `Phase ${phases.length + 1} Research`
    setPhases((currentPhases) => [
      ...currentPhases,
      createProjectScopePhase(nextPhaseName),
    ])
    setExpandedPhaseNames((currentNames) => [...currentNames, nextPhaseName])
  }

  const addTask = (phaseName: string) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) =>
        phase.phaseName !== phaseName
          ? phase
          : {
              ...phase,
              rows: [
                ...(phase.rows ?? []),
                {
                  id: `project-scope-new-task-${getId()}`,
                  task: "New Task",
                  role: "Specialist",
                  location: "USA",
                  experience: "Junior",
                  duration: { value: 10, type: "hours" },
                  workSchedule: "full_time",
                },
              ],
            }
      )
    )
    setExpandedPhaseNames((currentNames) =>
      currentNames.includes(phaseName)
        ? currentNames
        : [...currentNames, phaseName]
    )
  }

  const buildProjectAssistantScopeFromPhases = (sourcePhases: Phase[]) => ({
    phases: sourcePhases.map((phase, phaseIndex) => {
      const phaseName = phase.phaseName ?? `Phase ${phaseIndex + 1}`
      const { phaseType, durationDays, recurrenceSchedule, recurrenceCount } =
        getJobListingPhaseFields(
          phase,
          phaseName,
          sourcePhases,
          phaseIndex
        )

      return {
        phaseName,
        phaseType,
        durationDays,
        recurrenceSchedule,
        recurrenceCount,
        tasks: (phase.rows ?? []).map((row) => ({
          taskName: row.task,
          roleTitle: row.role ?? "Specialist",
          location: row.location,
          experienceLevel: row.experience,
          workSchedule: row.workSchedule ?? "full_time",
          customHours: row.customHours,
          customFrequency: row.customFrequency,
          estimatedHours: toEstimatedHours(row),
        })),
      }
    }),
  })

  const buildProjectAssistantScope = () =>
    buildProjectAssistantScopeFromPhases(phases)

  const getProjectAssistantListingSnapshot = (
    sourcePhases: Phase[] = phases,
    sourceBudgetAmount: number = budgetAmount,
    sourceIsBudgetStale: boolean = isBudgetStale
  ): ProjectAssistantListingSnapshot => ({
    phases: sourcePhases,
    budgetAmount: sourceBudgetAmount,
    isBudgetStale: sourceIsBudgetStale,
    timelineMonths: getProjectTimelineMonthsFromScope(sourcePhases),
  })

  const restoreProjectAssistantListingSnapshot = (
    snapshot: ProjectAssistantListingSnapshot
  ) => {
    skipNextProjectScopeSaveRef.current = true
    setPhases(snapshot.phases)
    setExpandedPhaseNames(
      snapshot.phases
        .map((phase) => phase.phaseName)
        .filter((name): name is string => Boolean(name))
    )
    setBudgetAmount(snapshot.budgetAmount)
    setIsBudgetStale(snapshot.isBudgetStale)
  }

  const persistProjectAssistantListingSnapshot = async (
    snapshot: ProjectAssistantListingSnapshot
  ) => {
    if (!jobListingId) return

    const payload = buildProjectAssistantScopeFromPhases(snapshot.phases)

    await JobListingAPI.ApplyGeneratedScope(jobListingId, {
      hasScope: true,
      phases: payload.phases,
    })
  }

  const applyPersistedProjectScopeFromAssistant = (data: any) => {
    const persistedPhases =
      data?.listing?.phases ?? data?.jobListing?.phases ?? data?.phases
    const nextPhases = createPhasesFromPersistedJobListing(persistedPhases)

    if (nextPhases.length > 0) {
      skipNextProjectScopeSaveRef.current = true
      setPhases(nextPhases)
      setExpandedPhaseNames(
        nextPhases
          .map((phase) => phase.phaseName)
          .filter((name): name is string => Boolean(name))
      )
    }

    const budgetUsdCents =
      toFiniteNumber(data?.listing?.budgetAmountUsdCents) ??
      toFiniteNumber(data?.jobListing?.budgetAmountUsdCents) ??
      toFiniteNumber(data?.totalBudgetUsdCents)

    const nextBudgetAmount =
      typeof budgetUsdCents === "number"
        ? Math.round(budgetUsdCents / 100)
        : budgetAmount

    if (typeof budgetUsdCents === "number") {
      setBudgetAmount(nextBudgetAmount)
      setIsBudgetStale(Boolean(data?.isBudgetStale))
    }

    return nextPhases.length > 0
      ? getProjectAssistantListingSnapshot(
          nextPhases,
          nextBudgetAmount,
          typeof budgetUsdCents === "number"
            ? Boolean(data?.isBudgetStale)
            : isBudgetStale
        )
      : null
  }

  const getProjectAssistantResultText = (
    value: unknown,
    fallback: string
  ) => {
    if (typeof value === "string") return value

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "string" ? item : JSON.stringify(item)
        )
        .filter(Boolean)
        .join("\n")
    }

    if (value && typeof value === "object") {
      const objectValue = value as {
        summary?: unknown
        message?: unknown
        suggestions?: unknown
      }

      if (typeof objectValue.summary === "string") return objectValue.summary
      if (typeof objectValue.message === "string") return objectValue.message

      if (Array.isArray(objectValue.suggestions)) {
        return objectValue.suggestions
          .map((item) =>
            typeof item === "string" ? item : JSON.stringify(item)
          )
          .filter(Boolean)
          .join("\n")
      }
    }

    return fallback
  }

  const startProjectAssistantHistoryItem = (
    prompt: string,
    listingBefore: ProjectAssistantListingSnapshot
  ) => {
    const historyId = `project-assistant-history-${getId()}`

    setAssistantHistory((currentHistory) =>
      [
        ...currentHistory,
        {
          id: historyId,
          prompt,
          status: "pending" as const,
          listingBefore,
        },
      ].slice(-20)
    )

    return historyId
  }

  const completeProjectAssistantHistoryItem = (
    id: string,
    prompt: string,
    result: string,
    status: Exclude<ProjectAssistantHistoryItem["status"], "pending"> =
      "success",
    listingAfter?: ProjectAssistantListingSnapshot
  ) => {
    setAssistantResult(result)
    setAssistantLastPrompt(prompt)
    setAssistantHistory((currentHistory) =>
      currentHistory.map((item) =>
        item.id === id ? { ...item, result, status, listingAfter } : item
      )
    )
  }

  useEffect(() => {
    const latestHistoryItem = assistantHistory[assistantHistory.length - 1]
    if (!latestHistoryItem || latestHistoryItem.status === "pending") return

    window.requestAnimationFrame(() => {
      const scrollContainer = assistantChatScrollRef.current
      scrollContainer?.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      })
    })
  }, [assistantHistory])

  const runProjectAssistant = async (message: string) => {
    const prompt = message.trim()
    if (!prompt) return

    const listingBefore = getProjectAssistantListingSnapshot()
    assistantUndoSnapshotRef.current = listingBefore
    setAssistantLastPrompt(prompt)
    const historyId = startProjectAssistantHistoryItem(prompt, listingBefore)
    setAssistantMessage("")

    if (!jobListingId) {
      completeProjectAssistantHistoryItem(
        historyId,
        prompt,
        "Smart Assistant needs a saved job draft first. Please try again in a moment.",
        "error"
      )
      return
    }

    setIsAssistantLoading(true)
    try {
      const response = await JobListingAPI.SmartAssistantScope(jobListingId, {
        command: prompt,
        currentScope: buildProjectAssistantScope(),
        workType: "project",
        currentTotalBudgetUsdCents: Math.round(budgetAmount * 100),
        currentTotalTimelineDays: getProjectTimelineDaysFromScope(phases),
      })
      const data = response?.data ?? {}

      if (data.aiStatus === "AI_UNAVAILABLE") {
        completeProjectAssistantHistoryItem(
          historyId,
          prompt,
          getProjectAssistantResultText(
            data.message,
            "Smart Assistant is temporarily unavailable."
          ),
          "error"
        )
        return
      }

      const listingAfter = applyPersistedProjectScopeFromAssistant(data)

      if (listingAfter) {
        completeProjectAssistantHistoryItem(
          historyId,
          prompt,
          getProjectAssistantResultText(
            data.summary,
            "Applied: Smart Assistant updated the project scope."
          ),
          "success",
          listingAfter
        )
      } else {
        completeProjectAssistantHistoryItem(
          historyId,
          prompt,
          getProjectAssistantResultText(
            data.summary,
            "Smart Assistant did not return an updated scope."
          ),
          "error"
        )
      }
    } catch (error: any) {
      completeProjectAssistantHistoryItem(
        historyId,
        prompt,
        error?.response?.data?.message ||
          error?.message ||
          "Smart Assistant is temporarily unavailable.",
        "error"
      )
    } finally {
      setIsAssistantLoading(false)
    }
  }

  const undoProjectAssistant = async () => {
    if (!assistantUndoSnapshotRef.current) return

    const snapshot = assistantUndoSnapshotRef.current
    setIsAssistantLoading(true)

    try {
      restoreProjectAssistantListingSnapshot(snapshot)
      await persistProjectAssistantListingSnapshot(snapshot)
      assistantUndoSnapshotRef.current = null
      setAssistantResult("")
      setAssistantLastPrompt("")
    } catch (error: any) {
      setAssistantResult(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save the restored scope."
      )
    } finally {
      setIsAssistantLoading(false)
    }
  }

  const restoreProjectAssistantHistoryItem = async (
    item: ProjectAssistantHistoryItem
  ) => {
    if (!item.listingAfter) return

    setIsAssistantLoading(true)

    try {
      restoreProjectAssistantListingSnapshot(item.listingAfter)
      await persistProjectAssistantListingSnapshot(item.listingAfter)
    } catch (error: any) {
      setAssistantResult(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save the restored scope."
      )
    } finally {
      setIsAssistantLoading(false)
    }
  }

  const removePhase = (phaseName: string) => {
    setPhases((currentPhases) =>
      currentPhases.length <= 1
        ? currentPhases
        : currentPhases.filter((phase) => phase.phaseName !== phaseName)
    )
    setExpandedPhaseNames((currentNames) =>
      currentNames.filter((name) => name !== phaseName)
    )
  }

  const togglePhase = (phaseName: string) => {
    setExpandedPhaseNames((currentNames) =>
      currentNames.includes(phaseName)
        ? currentNames.filter((name) => name !== phaseName)
        : [...currentNames, phaseName]
    )
  }

  const openRoleEditor = (phaseName: string, row: PhaseRow) => {
    const key = `${phaseName}-${row.id}`
    setActiveRoleKey(key)
    setDraftRole(row.role ?? "")
    setRoleAutocompleteOptions([])
    setRoleAutocompleteOpen(false)
    setDraftSchedule(row.workSchedule ?? "full_time")
    setDraftCustomHours(String(row.customHours ?? row.duration?.value ?? 15))
    setDraftCustomFrequency(row.customFrequency ?? "per_week")
  }

  const saveRoleEditor = (phaseName: string, rowId: string) => {
    updateRow(phaseName, rowId, {
      role: draftRole.trim() || "Specialist",
      workSchedule: draftSchedule,
      customHours:
        draftSchedule === "custom"
          ? Number(draftCustomHours) || undefined
          : undefined,
      customFrequency:
        draftSchedule === "custom" ? draftCustomFrequency : undefined,
    })
    setActiveRoleKey(null)
    setRoleAutocompleteOpen(false)
  }

  useIsomorphicLayoutEffect(() => {
    toggleValidation(isScopeValid)
  }, [isScopeValid])

  useEffect(() => {
    setProgress?.(22.5)
  }, [setProgress])

  useEffect(() => {
    setProjectScopeState(phases)
  }, [phases, setProjectScopeState])

  useEffect(() => {
    if (!jobListingId || !isScopeValid) return

    const payload = buildProjectAssistantScope()
    const signature = JSON.stringify(payload)

    if (skipNextProjectScopeSaveRef.current) {
      skipNextProjectScopeSaveRef.current = false
      lastSavedProjectScopeSignatureRef.current = signature
      return
    }

    if (signature === lastSavedProjectScopeSignatureRef.current) return

    setIsBudgetLoading(true)
    const timeout = window.setTimeout(() => {
      const saveScope = async () => {
        try {
          const response = await JobListingAPI.ApplyGeneratedScope(jobListingId, {
            hasScope: true,
            phases: payload.phases,
          })
          const totalBudgetUsdCents = toFiniteNumber(
            response?.data?.totalBudgetUsdCents
          )
          if (typeof totalBudgetUsdCents === "number") {
            setBudgetAmount(Math.round(totalBudgetUsdCents / 100))
            setIsBudgetStale(Boolean(response?.data?.isBudgetStale))
          }
          lastSavedProjectScopeSignatureRef.current = signature
        } catch (error) {
          console.error("Failed to save project job listing scope", error)
        } finally {
          setIsBudgetLoading(false)
        }
      }

      void saveScope()
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [phases, isScopeValid, jobListingId])

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      <div className="bg-gray-50 px-5 py-10 md:px-10 min-[1024px]:px-[100px] min-[1024px]:pb-5 min-[1024px]:pt-[50px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 min-[1180px]:flex-row min-[1180px]:items-start">
          <div className="min-w-0 flex-auto min-[1180px]:w-[886px]">
            <div className="flex h-20 w-full shrink-0 flex-col items-center justify-center gap-4 self-stretch p-0">
              <h1 className="h-11 shrink-0 self-stretch text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400">
                Edit your scope
              </h1>
              <p className="h-5 shrink-0 self-stretch text-sm leading-5 font-normal text-dark-blue-400">
                Modify the table as needed manually or with the help of Smart
                Assistant, your project plan will adjust accordingly.
              </p>
            </div>

            <div className="mt-8 grid overflow-hidden rounded-[5px] border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] md:grid-cols-2">
              <div className="flex h-[106px] flex-1 items-center gap-6 border-b border-gray-200 p-6 md:border-b-0 md:border-r">
                <div className="flex h-[58px] flex-1 flex-col items-start gap-2 p-0">
                  <div className="flex h-5 shrink-0 items-center gap-2 self-stretch p-0 text-sm leading-5 font-medium text-gray-400">
                    <span className="h-5 w-[121px] shrink-0">
                      Budget Calculator
                    </span>
                    <TooltipProvider>
                      <Tooltip
                        open={budgetTooltipOpen}
                        onOpenChange={setBudgetTooltipOpen}
                      >
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            type="button"
                            aria-label="Show budget calculator details"
                            className="size-4 p-0 text-inherit"
                            onClick={() =>
                              setBudgetTooltipOpen((isOpen) => !isOpen)
                            }
                          >
                            <Info className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          align="center"
                          sideOffset={12}
                          visual="white"
                          className="flex h-[226px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                        >
                          <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                          <div className="flex h-[186px] w-[182.55px] shrink-0 items-center">
                            <div>
                              <p>Your budget updates automatically based on:</p>
                              <ul className="my-4 list-disc pl-5">
                                <li>Tasks</li>
                                <li>Roles</li>
                                <li>Location</li>
                                <li>Experience level</li>
                                <li>Task duration</li>
                              </ul>
                              <p>
                                Any change here updates the budget shown in the
                                sidebar.
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {isAssistantLoading || isBudgetLoading ? (
                    <span className="relative h-10 w-full overflow-hidden rounded bg-gray-100">
                      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                    </span>
                  ) : (
                    <div className="flex h-[30px] shrink-0 items-baseline gap-1 self-stretch p-0 text-dark-blue-400">
                      <span className="h-[29px] shrink-0 text-center text-2xl font-bold leading-[29px] capitalize">
                        ${budgetAmount.toLocaleString()}
                      </span>
                      <span className="h-[17px] w-[23px] shrink-0 text-sm font-medium leading-[17px]">
                        per
                      </span>
                      <Select
                        value={budgetFrequency}
                        onValueChange={setBudgetFrequency}
                      >
                        <SelectTrigger
                          indicator={false}
                          className="h-[25px] w-[66px] shrink-0 gap-1 rounded border-gray-300 px-[7px] py-[5px] text-sm font-medium leading-[17px] text-dark-blue-400 shadow-xs"
                        >
                          <SelectValue />
                          <ChevronDown className="size-3 shrink-0 text-gray-400" />
                        </SelectTrigger>
                        <SelectContent className="w-32">
                          {["week", "month"].map((frequency) => (
                            <SelectItem key={frequency} value={frequency}>
                              {frequency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isBudgetStale ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                aria-label="Budget rates unavailable"
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-warning-600"
                              >
                                <AlertTriangle className="size-4" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent visual="white" size="md">
                              Some pricing rates are unavailable. The budget may
                              be incomplete.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                  )}
                </div>
                <div className="flex h-14 w-14 items-center justify-center gap-2 rounded-[6px] bg-primary-50">
                  <img
                    src="/job-listing/money-bag.png"
                    alt=""
                    aria-hidden="true"
                    className="size-8"
                  />
                </div>
              </div>
              <div className="flex h-[105px] flex-1 items-start gap-6 p-6">
                <div className="flex h-[57px] flex-1 flex-col items-start gap-2 p-0">
                  <div className="flex h-5 shrink-0 items-center gap-2 self-stretch p-0 text-sm leading-5 font-medium text-gray-400">
                    <span className="h-5 w-[180px] shrink-0">
                      Project Timeline Calculator
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="link"
                            type="button"
                            aria-label="Show timeline calculator details"
                            className="size-4 p-0 text-inherit"
                          >
                            <Info className="size-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="right"
                          align="center"
                          sideOffset={12}
                          visual="white"
                          className="flex h-[190px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                        >
                          <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                          <div className="flex h-[150px] w-[182.55px] shrink-0 items-center">
                            <div>
                              <p>The project timeline adjusts based on:</p>
                              <ul className="my-4 list-disc pl-5">
                                <li>Task durations</li>
                                <li>Assigned work schedules</li>
                                <li>Number of team members</li>
                              </ul>
                              <p>
                                Any change here will update the project's total
                                length.
                              </p>
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {isAssistantLoading ? (
                    <span className="relative h-10 w-full overflow-hidden rounded bg-gray-100">
                      <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                    </span>
                  ) : (
                    <div className="flex h-[29px] shrink-0 items-baseline gap-1 self-stretch p-0 text-dark-blue-400">
                      <span className="h-[29px] w-4 shrink-0 text-center text-2xl font-bold leading-[29px] capitalize">
                        {projectTimelineMonths}
                      </span>
                      <span className="h-[17px] w-[51px] shrink-0 text-sm font-medium leading-[17px]">
                        {projectTimelineMonths === 1 ? "month" : "months"}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex h-14 w-14 items-center justify-center gap-2 rounded-[6px] bg-primary-50">
                  <img
                    src="/job-listing/timeline.png"
                    alt=""
                    aria-hidden="true"
                    className="size-14 rounded-[6px]"
                  />
                </div>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="mx-auto flex h-9 w-[254px] shrink-0 items-center p-0 shadow-xs md:mx-0">
                <Button
                  className="h-9 w-[123px] rounded-l-[5px] rounded-r-none border-y border-l border-r-0 border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 capitalize text-gray-800 shadow-none"
                  variant="outlined"
                  visual="gray"
                  onClick={() =>
                    setExpandedPhaseNames(
                      phases
                        .map((phase) => phase.phaseName)
                        .filter((name): name is string => Boolean(name))
                    )
                  }
                >
                  <ChevronsDown className="size-[15px] shrink-0 text-gray-500" />
                  <span className="h-5 w-[72px] shrink-0 text-center">
                    Expand All
                  </span>
                </Button>
                <Button
                  className="h-9 w-[131px] rounded-l-none rounded-r-[5px] border border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-none"
                  variant="outlined"
                  visual="gray"
                  onClick={() => setExpandedPhaseNames([])}
                >
                  <ChevronsUp className="size-[15px] shrink-0 text-gray-500" />
                  <span className="h-5 w-20 shrink-0 text-center">
                    Collapse All
                  </span>
                </Button>
              </div>
              <div className="flex flex-col gap-3 md:flex-row">
                <SearchField className="h-9 w-full shrink-0 md:w-[223px]">
                  <SearchFieldButton className="left-2.5 size-4 text-gray-400">
                    <SearchMd className="size-4" />
                  </SearchFieldButton>
                  <SearchFieldInput
                    className="h-9 w-[223px] rounded-[5px] py-2.5 pl-[34px] pr-3 text-sm leading-5 text-gray-500 placeholder:text-gray-500 placeholder:opacity-50"
                    placeholder="Find a phase or task"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </SearchField>
                <Button
                  className="h-9 w-[124px] shrink-0 rounded-[5px] border border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-none"
                  variant="outlined"
                  visual="gray"
                  onClick={addPhase}
                >
                  <Plus className="size-[15px] shrink-0 text-gray-500" />
                  <span className="h-5 w-[73px] shrink-0 text-center">
                    Add Phase
                  </span>
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {isAssistantLoading || isBudgetLoading ? (
                <div
                  className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                  aria-busy="true"
                  aria-label="Scope budget is updating"
                >
                  <div className="flex h-14 items-center justify-center gap-4 border-b border-gray-200 p-3">
                    <div className="flex h-8 min-w-0 flex-1 flex-col items-start justify-end gap-1 self-stretch p-0">
                      <div className="flex h-8 min-w-0 items-center gap-2 p-0">
                        <Button
                          variant="link"
                          type="button"
                          aria-label="Scope update in progress"
                          className="size-8 rounded-[5px] p-1.5 text-inherit"
                          disabled
                        >
                          <ChevronDown className="size-5 text-gray-500" />
                        </Button>
                        <span className="relative h-7 w-[179px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-stretch">
                      <span className="relative hidden h-7 w-[120px] shrink-0 overflow-hidden rounded bg-gray-100 md:inline-flex">
                        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                      </span>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        aria-label="Scope actions loading"
                        className="h-[23px] w-[27px] rounded-[5px] px-1.5 py-1"
                        disabled
                      >
                        <MoreHorizontal className="size-[15px] text-gray-500" />
                      </IconButton>
                      <IconButton
                        variant="outlined"
                        visual="gray"
                        aria-label="Add task disabled while Smart Assistant updates"
                        className="size-8 rounded-[5px] border-gray-300 bg-white p-2 shadow-[0px_1px_4px_rgba(0,0,0,0.03)]"
                        disabled
                      >
                        <Plus className="size-3 text-gray-500" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="grid h-11 w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] border-b border-gray-200 bg-gray-50 text-xs font-medium leading-[18px] text-gray-600">
                    {[
                      "Task Name",
                      "Role",
                      "Location",
                      "Experience",
                      "Duration",
                    ].map((header) => (
                      <span
                        key={header}
                        className="flex h-11 items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-6 py-3"
                      >
                        <span className="h-[18px] shrink-0">{header}</span>
                      </span>
                    ))}
                  </div>

                  {Array.from({ length: 4 }).map((_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid h-[72px] w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] items-center border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex h-[72px] w-[240px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                        <span
                          className={cn(
                            "relative h-5 shrink-0 overflow-hidden rounded bg-gray-100",
                            rowIndex === 0 && "w-[120px]",
                            rowIndex === 1 && "w-[180px]",
                            rowIndex === 2 && "w-40",
                            rowIndex === 3 && "w-[86px]"
                          )}
                        >
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[240px] shrink-0 flex-col items-start gap-1 self-stretch px-6 py-4">
                        <span className="relative h-4 w-[180px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                        <span className="relative h-4 w-[104px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-3 py-4">
                        <span className="relative h-7 w-[112px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[135.33px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                        <span className="relative h-7 w-[88px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-6 py-4">
                        <span className="relative h-5 w-[88px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                visiblePhases.map((phase, phaseIndex) => {
                const phaseName = phase.phaseName ?? `Phase ${phaseIndex + 1}`
                const isExpanded = expandedPhaseNames.includes(phaseName)
                const phaseNameParts = phaseName.split(" ")
                const phasePrimaryName = `Phase ${
                  projectScopePhaseLabels[phaseIndex] ?? phaseIndex + 1
                }`
                const phaseSecondaryName =
                  phaseNameParts[0] === "Phase"
                    ? phaseNameParts.slice(2).join(" ")
                    : phaseName
                const { startDay, endDay } = getPhaseDayRange(
                  phases,
                  phaseIndex
                )

                return (
                  <div
                    key={phaseName}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                  >
                    <div className="flex h-14 items-center justify-center gap-4 border-b border-gray-200 p-3">
                      <div className="flex h-8 min-w-0 flex-1 flex-col items-start justify-end gap-1 self-stretch p-0">
                        <div className="flex h-8 min-w-0 items-center gap-2 p-0">
                          <Button
                            variant="link"
                            type="button"
                            aria-label={
                              isExpanded
                                ? `Collapse ${phaseName}`
                                : `Expand ${phaseName}`
                            }
                            className="size-8 rounded-[5px] p-1.5 text-inherit"
                            onClick={() => togglePhase(phaseName)}
                          >
                            <ChevronDown
                              className={cn(
                                "size-5 text-gray-500",
                                !isExpanded && "rotate-180"
                              )}
                            />
                          </Button>
                          <div className="flex h-7 min-w-0 items-center gap-1.5 p-0">
                            <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap text-lg font-semibold leading-7 text-gray-black">
                              {phasePrimaryName}
                            </span>
                            {phaseSecondaryName ? (
                              <span className="inline-flex h-5 min-w-0 items-center whitespace-nowrap text-lg font-light leading-5 text-gray-600">
                                {phaseSecondaryName}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-stretch">
                        <span className="hidden h-4 min-w-[93px] shrink-0 items-center gap-2 whitespace-nowrap text-[13px] font-semibold leading-4 text-[#122A4B] md:inline-flex">
                          <span className="flex h-4 shrink-0 items-center whitespace-nowrap">
                            Day {startDay}
                          </span>
                          {typeof endDay === "number" &&
                          endDay !== startDay ? (
                            <>
                              <span className="flex h-4 w-[7px] shrink-0 items-center justify-center text-center">
                                -
                              </span>
                              <span className="flex h-4 shrink-0 items-center whitespace-nowrap">
                                Day {endDay}
                              </span>
                            </>
                          ) : null}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <IconButton
                              variant="ghost"
                              visual="gray"
                              aria-label={`Open actions for ${phaseName}`}
                              className="h-[23px] w-[27px] rounded-[5px] px-1.5 py-1"
                            >
                              <MoreHorizontal className="size-[15px] text-gray-500" />
                            </IconButton>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => togglePhase(phaseName)}
                            >
                              {isExpanded ? "Collapse Phase" : "Expand Phase"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => addTask(phaseName)}
                            >
                              Add Task
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              visual="destructive"
                              onSelect={() => removePhase(phaseName)}
                            >
                              Remove Phase
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <IconButton
                          variant="outlined"
                          visual="gray"
                          aria-label={`Add task to ${phaseName}`}
                          className="size-8 rounded-[5px] border-gray-300 bg-white p-2 shadow-[0px_1px_4px_rgba(0,0,0,0.03)]"
                          onClick={() => addTask(phaseName)}
                        >
                          <Plus className="size-3 text-gray-500" />
                        </IconButton>
                      </div>
                    </div>

                    {isExpanded ? (
                      <>
                        <div className="grid h-11 w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] border-b border-gray-200 bg-gray-50 text-xs font-medium leading-[18px] text-gray-600">
                          {[
                            "Task Name",
                            "Role",
                            "Location",
                            "Experience",
                            "Duration",
                          ].map((header) => (
                            <span
                              key={header}
                              className="flex h-11 items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-6 py-3"
                            >
                              {header === "Role" ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="h-[18px] shrink-0 cursor-default">
                                        {header}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      align="center"
                                      sideOffset={12}
                                      visual="white"
                                      className="flex w-[222px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                    >
                                      <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                      Defines the type of specialist needed for
                                      this task. Used to match talent and
                                      generate the job description.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : header === "Location" ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="h-[18px] shrink-0 cursor-default">
                                        {header}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      align="center"
                                      sideOffset={12}
                                      visual="white"
                                      className="flex h-[94px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                    >
                                      <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                      Influences team coordination and affects
                                      how the budget is estimated.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : header === "Experience" ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="h-[18px] shrink-0 cursor-default">
                                        {header}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="left"
                                      align="center"
                                      sideOffset={12}
                                      visual="white"
                                      className="flex h-28 w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                    >
                                      <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                      Helps determine the level of skill needed.
                                      Impacts estimated delivery time and team
                                      composition.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : header === "Duration" ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="h-[18px] shrink-0 cursor-default">
                                        {header}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="left"
                                      align="center"
                                      sideOffset={12}
                                      visual="white"
                                      className="flex h-[94px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                    >
                                      <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                      Estimated hours to complete the task.
                                      Directly affects the project&apos;s timeline
                                      and budget.
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="h-[18px] shrink-0">
                                  {header}
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                        {(phase.rows ?? []).map((row) => {
                          const roleKey = `${phaseName}-${row.id}`
                          const isRoleOpen = activeRoleKey === roleKey

                          return (
                            <div
                              key={row.id}
                              className="relative grid h-[72px] w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] items-center border-b border-gray-200 last:border-b-0"
                            >
                              <div className="flex h-[72px] w-[240px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                                <Input
                                  className="h-5 min-w-0 flex-1 truncate rounded-none border-0 bg-transparent p-0 text-sm font-semibold leading-5 text-gray-black shadow-none focus:border-transparent focus:ring-0"
                                  value={row.task}
                                  onChange={(event) =>
                                    updateRow(phaseName, row.id, {
                                      task: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="flex h-[72px] w-[240px] shrink-0 flex-col items-start gap-1 self-stretch px-6 py-4">
                                <Button
                                  variant="link"
                                  type="button"
                                  className="h-[17px] w-[83px] justify-start p-0 text-left text-sm font-normal leading-[17px] text-gray-600 hover:no-underline"
                                  onClick={() => openRoleEditor(phaseName, row)}
                                >
                                  {row.role}
                                </Button>
                                <p className="h-[18px] shrink-0 whitespace-nowrap text-xs font-normal leading-[18px] text-gray-400">
                                  {formatProjectRowSchedule(row)}
                                </p>
                              </div>
                              <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-3 py-4">
                                <CountriesCombobox
                                  value={row.location}
                                  onValueChange={(location) =>
                                    updateRow(phaseName, row.id, { location })
                                  }
                                  placeholder="Location"
                                  triggerClassName="h-7 rounded-[5px] border-dashed border-gray-300 bg-gray-50 px-[5px] pr-2 text-xs leading-[18px] text-gray-700"
                                />
                              </div>
                              <div className="flex h-[72px] w-[135.33px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outlined"
                                      visual="gray"
                                      type="button"
                                      className="h-7 w-max gap-x-1.5 rounded-[5px] border-dashed border-gray-300 bg-gray-50 px-2 py-[5px] text-xs font-medium leading-[18px] text-gray-700 shadow-none"
                                      rightIcon={
                                        <ChevronDown className="size-[15px]" />
                                      }
                                    >
                                      {formatExperienceDisplay(row.experience)}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start">
                                    {EXPERIENCE_LEVELS.map((experience) => (
                                      <DropdownMenuItem
                                        key={experience}
                                        onSelect={() =>
                                          updateRow(phaseName, row.id, {
                                            experience,
                                          })
                                        }
                                      >
                                        {experience}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-6 py-4">
                                <Input
                                  className="h-5 w-[59px] rounded-none border-0 bg-transparent p-0 text-sm font-normal leading-5 text-gray-600 opacity-65 shadow-none focus:border-transparent focus:ring-0"
                                  value={formatProjectRowDuration(row)}
                                  onChange={(event) => {
                                    const [value, type = "hours"] =
                                      event.target.value.split(/\s+/)
                                    updateRow(phaseName, row.id, {
                                      duration: {
                                        value: Number(value) || 1,
                                        type: DURATION_TYPE.includes(
                                          type as (typeof DURATION_TYPE)[number]
                                        )
                                          ? (type as (typeof DURATION_TYPE)[number])
                                          : "hours",
                                      },
                                    })
                                  }}
                                />
                              </div>

                              {isRoleOpen ? (
                                <Dialog
                                  open={isRoleOpen}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setActiveRoleKey(null)
                                    }
                                  }}
                                >
                                  <DialogContent
                                    variant="unanimated"
                                    accessibilityTitle="Edit role"
                                    dialogOverlay={
                                      <DialogOverlay className="bg-[#101828]/20" />
                                    }
                                    className="left-1/2 top-1/2 flex w-[371px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col items-start gap-8 rounded-xl bg-white p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                                  >
                                    <div className="flex w-[323px] flex-col items-start gap-3">
                                      <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
                                        <Label className="h-5 whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                                          Role
                                        </Label>
                                        <Combobox
                                          className="w-[323px]"
                                          value={draftRole}
                                          onChange={(value) => {
                                            setDraftRole(String(value ?? ""))
                                            setRoleAutocompleteOpen(false)
                                          }}
                                          nullable
                                        >
                                          <ComboboxTrigger>
                                            <ComboboxInput
                                              className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-black shadow-xs focus:ring-0 ui-open:pl-[14px]"
                                              value={draftRole}
                                              onChange={(event) =>
                                                setDraftRole(
                                                  event.target.value
                                                )
                                              }
                                              onClick={() =>
                                                setRoleAutocompleteOpen(
                                                  roleAutocompleteOptions.length >
                                                    0
                                                )
                                              }
                                              onFocus={() =>
                                                setRoleAutocompleteOpen(
                                                  roleAutocompleteOptions.length >
                                                    0
                                                )
                                              }
                                              onBlur={() =>
                                                setTimeout(
                                                  () =>
                                                    setRoleAutocompleteOpen(
                                                      false
                                                    ),
                                                  150
                                                )
                                              }
                                            />
                                          </ComboboxTrigger>

                                          {isRoleAutocompleteOpen ? (
                                            <ComboboxOptions className="h-[120px] w-[323px] overflow-hidden">
                                              <ScrollArea viewportClassName="h-[120px]">
                                                {roleAutocompleteOptions.map(
                                                  (option) => (
                                                    <ComboboxOption
                                                      key={option}
                                                      value={option}
                                                    >
                                                      {option}
                                                    </ComboboxOption>
                                                  )
                                                )}
                                              </ScrollArea>
                                            </ComboboxOptions>
                                          ) : null}
                                        </Combobox>
                                      </div>
                                      <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
                                        <Label className="h-5 whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                                          Work Schedule
                                        </Label>
                                        <Select
                                          value={draftSchedule}
                                          onValueChange={(value) =>
                                            setDraftSchedule(
                                              value as JobListingWorkSchedule
                                            )
                                          }
                                        >
                                          <SelectTrigger className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-black shadow-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="w-[323px]">
                                            {[
                                              {
                                                value: "full_time" as const,
                                                label: "Full-time",
                                              },
                                              {
                                                value: "part_time" as const,
                                                label: "Part-time",
                                              },
                                              {
                                                value: "custom" as const,
                                                label: "Custom",
                                              },
                                            ].map((schedule) => (
                                              <SelectItem
                                                key={schedule.value}
                                                value={schedule.value}
                                              >
                                                {schedule.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {draftSchedule === "custom" ? (
                                        <div className="flex h-[70px] w-[323px] shrink-0 items-start gap-3">
                                          <div className="flex h-[70px] w-[155.5px] flex-col items-start gap-1.5">
                                            <Label className="h-5 w-[109px] whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                                              Estimated hours
                                            </Label>
                                            <div className="flex h-11 w-[155.5px] items-start bg-white p-0 shadow-xs">
                                              <input
                                                className="h-11 w-[84.5px] flex-1 rounded-l-[5px] rounded-r-none border border-gray-300 bg-white px-3.5 py-2.5 text-base font-normal leading-6 text-gray-black shadow-none outline-none focus:border-gray-300 focus:outline-none"
                                                value={draftCustomHours}
                                                onChange={(event) =>
                                                  setDraftCustomHours(
                                                    event.target.value
                                                  )
                                                }
                                              />
                                              <span className="-ml-px inline-flex h-11 w-[71px] shrink-0 items-center rounded-l-none rounded-r-[5px] border border-gray-300 bg-white px-3.5 py-2.5 text-base font-normal leading-6 text-gray-500">
                                                <span className="h-6 w-[43px] shrink-0">
                                                  hours
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex h-[70px] w-[155.5px] flex-col items-start gap-1.5 pt-[26px]">
                                            <Select
                                              value={draftCustomFrequency}
                                              onValueChange={
                                                setDraftCustomFrequency
                                              }
                                            >
                                              <SelectTrigger className="h-11 w-[155.5px] rounded-[5px] border-gray-300 bg-white py-2.5 pl-3.5 pr-3 text-base font-normal leading-6 text-gray-black shadow-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="h-[118px] w-[156px] rounded-[5px] border border-gray-100 bg-white p-0 shadow-[0px_4px_19px_rgba(0,0,0,0.04)] [&>div]:h-[118px] [&>div]:overflow-y-scroll [&>div]:py-0 [&>div]:scrollbar-thin [&>div]:scrollbar-thumb-gray-200 [&>div]:scrollbar-track-transparent [&>div]:[scrollbar-gutter:stable]">
                                                {[
                                                  "per_day",
                                                  "per_week",
                                                  "per_month",
                                                  "per_quarter",
                                                  "per_year",
                                                ].map((frequency) => (
                                                  <SelectItem
                                                    key={frequency}
                                                    value={frequency}
                                                    className="h-[34px] w-[156px] rounded-none px-3 py-2.5 text-[13px] font-medium leading-[13px] text-gray-500 focus:bg-gray-50 focus:text-gray-black data-[state=checked]:bg-gray-50 data-[state=checked]:text-gray-black [&>span:first-child]:hidden"
                                                  >
                                                    {frequency.replace(
                                                      "_",
                                                      " "
                                                    )}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex h-9 w-[323px] shrink-0 items-start gap-3">
                                      <Button
                                        type="button"
                                        variant="outlined"
                                        visual="gray"
                                        className="h-9 w-[155.5px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-xs"
                                        onClick={() => setActiveRoleKey(null)}
                                      >
                                        <span className="h-5 w-12 text-center">
                                          Cancel
                                        </span>
                                      </Button>
                                      <Button
                                        type="button"
                                        className="h-9 w-[155.5px] rounded-[5px] bg-primary-500 px-[14px] py-2 text-sm font-semibold leading-5 text-white shadow-xs"
                                        onClick={() =>
                                          saveRoleEditor(phaseName, row.id)
                                        }
                                      >
                                        <span className="h-5 w-9 text-center">
                                          Done
                                        </span>
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : null}
                            </div>
                          )
                        })}
                      </>
                    ) : null}
                  </div>
                )
              }))}
              {!isAssistantLoading && !isBudgetLoading && visiblePhases.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 text-center text-sm leading-5 text-gray-500 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                  No phase or task found.
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex h-[calc(100vh-248px)] min-h-0 w-full shrink-0 flex-col self-stretch rounded-lg border border-gray-200 bg-white shadow-[0px_2px_5px_rgba(0,0,0,0.04)] min-[1180px]:sticky min-[1180px]:top-[50px] min-[1180px]:w-[322px] min-[1180px]:self-start">
            <div className="flex h-12 shrink-0 self-stretch items-start justify-between gap-2 border-b border-gray-200 px-5 py-3">
              <h2 className="h-6 flex-1 text-base leading-6 font-semibold text-dark-blue-400">
                Smart Assistant
              </h2>
              <img
                src="/job-listing/smart-assistant-robot.png"
                alt=""
                aria-hidden="true"
                width={20}
                height={20}
                className="size-5 shrink-0"
              />
            </div>
            <div
              ref={assistantChatScrollRef}
              className="flex min-h-0 shrink grow flex-col items-start gap-4 self-stretch overflow-y-auto px-5 pt-5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg"
            >
              <div className="flex h-[52px] w-[282px] shrink-0 flex-col items-center justify-center gap-1 self-stretch p-0">
                <h3 className="h-7 shrink-0 self-stretch text-lg leading-7 font-semibold text-dark-blue-400">
                  What do you want to do?
                </h3>
                <p className="h-5 shrink-0 self-stretch text-sm leading-5 font-normal text-dark-blue-400">
                  Here are some suggestions:
                </p>
              </div>
              <div className="flex h-[136px] w-[282px] shrink-0 flex-col items-start gap-2 self-stretch">
                {[
                  "Reduce the budget",
                  "Shorten the project timeline",
                  "Improve scope quality",
                ].map((item) => (
                  <Button
                    key={item}
                    className={cn(
                      "h-10 rounded-full py-2.5 pl-4 pr-6 text-sm leading-5 font-normal text-dark-blue-400 shadow-none",
                      item === "Reduce the budget" &&
                        "w-full max-w-[195px] justify-start bg-white",
                      item === "Shorten the project timeline" &&
                        "w-[253px] justify-start bg-white",
                      item === "Improve scope quality" &&
                        "w-[214px] justify-start bg-white"
                    )}
                    variant="outlined"
                    visual="gray"
                    onClick={() => runProjectAssistant(item)}
                  >
                    {item === "Reduce the budget" ? (
                      <>
                        <img
                          src="/job-listing/smart-assistant-money-bag.png"
                          alt=""
                          aria-hidden="true"
                          width={20}
                          height={20}
                          className="size-5 shrink-0"
                        />
                        <span className="h-5 w-[127px] shrink-0">{item}</span>
                      </>
                    ) : item === "Shorten the project timeline" ? (
                      <>
                        <img
                          src="/job-listing/smart-assistant-timeline.png"
                          alt=""
                          aria-hidden="true"
                          width={20}
                          height={20}
                          className="size-5 shrink-0"
                        />
                        <span className="h-5 w-[185px] shrink-0">{item}</span>
                      </>
                    ) : (
                      <>
                        <img
                          src="/job-listing/smart-assistant-target.png"
                          alt=""
                          aria-hidden="true"
                          width={20}
                          height={20}
                          className="size-5 shrink-0"
                        />
                        <span className="h-5 w-[146px] shrink-0">{item}</span>
                      </>
                    )}
                  </Button>
                ))}
              </div>
              {assistantHistory.length > 0 ? (
                <div className="flex w-[282px] flex-col items-start gap-6 self-stretch">
                  {assistantHistory.map((item, itemIndex) => {
                    const isLatest = itemIndex === assistantHistory.length - 1
                    const canRestore =
                      !isLatest &&
                      item.status === "success" &&
                      Boolean(item.listingAfter)
                    const resultLines = (item.result ?? "")
                      .split(/\n+/)
                      .map((line) => line.replace(/^[-•]\s*/, "").trim())
                      .filter(Boolean)

                    return (
                      <div
                        key={item.id}
                        className="flex w-[282px] flex-col items-start gap-6 self-stretch"
                      >
                        <div className="flex w-[282px] justify-end">
                          <p className="max-w-[236px] rounded-[20px] bg-gray-100 px-5 py-3 text-center text-base font-normal leading-6 text-dark-blue-400">
                            {item.prompt}
                          </p>
                        </div>
                        {item.status !== "pending" ? (
                          <div className="text-base font-normal leading-6 text-dark-blue-400">
                            {item.status === "error" ? (
                              <p>{item.result}</p>
                            ) : (
                              <>
                                <p>Here&apos;s what we&apos;ve updated:</p>
                                <ul className="list-disc pl-5">
                                  {resultLines.map((line) => (
                                    <li key={`${item.id}-${line}`}>{line}</li>
                                  ))}
                                </ul>
                              </>
                            )}
                          </div>
                        ) : null}
                        {canRestore ? (
                          <Button
                            type="button"
                            variant="outlined"
                            visual="gray"
                            className="h-7 w-[136px] rounded-[5px] border-gray-300 bg-white py-2 pl-2 pr-3 text-[10px] font-semibold leading-[12px] text-gray-800 shadow-xs"
                            disabled={isAssistantLoading}
                            onClick={() =>
                              void restoreProjectAssistantHistoryItem(item)
                            }
                          >
                            <ArrowUpLeft className="size-3 shrink-0" />
                            Restore This Version
                          </Button>
                        ) : null}
                        {isLatest && item.status !== "pending" ? (
                          <div className="flex h-10 items-start gap-2">
                            <Button
                              type="button"
                              className="h-7 w-[67px] rounded-[5px] bg-primary-50 px-3 py-2 text-[10px] font-semibold leading-[12px] text-primary-500 shadow-none"
                              disabled={isAssistantLoading || !item.prompt}
                              onClick={() => runProjectAssistant(item.prompt)}
                            >
                              <RefreshCcw05 className="size-3 shrink-0 text-primary-500" />
                              Retry
                            </Button>
                            {item.status === "success" ? (
                              <Button
                                type="button"
                                variant="outlined"
                                visual="gray"
                                className="h-7 w-[62px] rounded-[5px] border-gray-300 bg-white py-2 pl-2 pr-3 text-[10px] font-semibold leading-[12px] text-gray-800 shadow-xs"
                                disabled={!assistantUndoSnapshotRef.current}
                                onClick={() => void undoProjectAssistant()}
                              >
                                <ArrowUpLeft className="size-3 shrink-0" />
                                Undo
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
            <div className="flex h-[140px] w-full shrink-0 flex-col items-start gap-2 self-stretch p-5">
              <div className="flex h-[100px] w-[282px] shrink-0 flex-col items-start justify-center gap-3 self-stretch rounded-lg border border-gray-300 bg-gray-50 py-3 pl-2.5 pr-3 focus-within:border-primary-500">
                <Textarea
                  className="h-10 w-[260px] shrink-0 self-stretch resize-none rounded-none border-0 bg-transparent p-0 text-sm leading-5 font-normal text-gray-500 shadow-none placeholder:text-gray-400 focus:border-transparent focus:text-gray-400 focus:ring-0"
                  placeholder="I want to change..."
                  value={assistantMessage}
                  onChange={(event) => setAssistantMessage(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      assistantMessage.trim() &&
                      !isAssistantLoading
                    ) {
                      event.preventDefault()
                      void runProjectAssistant(assistantMessage)
                    }
                  }}
                />
                <div className="flex h-6 w-[260px] shrink-0 self-stretch items-center justify-between gap-2 p-0">
                  <img
                    src="/job-listing/smart-assistant-wand.png"
                    alt=""
                    aria-hidden="true"
                    width={20}
                    height={20}
                    className="size-5 shrink-0"
                  />
                  <Button
                    className="size-6 rounded-full p-1 shadow-none"
                    aria-label="Send message to Smart Assistant"
                    disabled={!assistantMessage.trim() || isAssistantLoading}
                    onClick={() => runProjectAssistant(assistantMessage)}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

const finalReviewRoles = [
  "Front-End Developer",
  "DevOps Engineer",
  "UX Designer",
  "Q/A Engineer",
  "Project Manager",
]

const finalReviewSkills = ["HTML5", "CSS3", "Bootstrap", "JavaScript", "WCAG"]

const finalReviewRichTextEditorClassName =
  "mt-3 rounded-lg border border-gray-300 bg-white transition-colors focus-within:border-primary-500"

const finalReviewRichTextEditorContentClassName =
  "min-h-[330px] w-full max-w-full min-w-0 overflow-x-hidden px-4 py-4 text-base leading-7 text-dark-blue-400 break-words [overflow-wrap:anywhere] [word-break:break-word] [&_.ProseMirror]:min-h-[302px] [&_.ProseMirror]:w-full [&_.ProseMirror]:max-w-full [&_.ProseMirror]:min-w-0 [&_.ProseMirror]:overflow-x-hidden [&_.ProseMirror]:focus:outline-none [&_[data-font-size='large-heading']]:text-2xl [&_[data-font-size='large-heading']]:font-semibold [&_[data-font-size='normal-heading']]:text-xl [&_[data-font-size='normal-heading']]:font-semibold [&_[data-font-size='small-heading']]:text-base [&_[data-font-size='small-heading']]:font-semibold [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_li]:break-words [&_li]:[word-break:break-word] [&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-7 [&_p]:min-h-[1.75rem] [&_p]:break-words [&_p]:[word-break:break-word] [&_p]:whitespace-pre-wrap [&_strong]:font-bold [&_ul]:list-disc [&_ul]:list-outside [&_ul]:pl-7"

const ndaPreviewSections = [
  {
    title: "Parties",
    body: "This agreement is between the client and the team members assigned to the job on Marketeq.",
  },
  {
    title: "Confidential Information",
    body: "Project details, documents, designs, code, business information, and other non-public materials shared through the job are treated as confidential.",
  },
  {
    title: "Use of Information",
    body: "Team members may use confidential information only to evaluate, discuss, and complete the work for this job.",
  },
  {
    title: "Protection and Disclosure",
    body: "Team members must protect confidential information with reasonable care and may not share it with anyone outside the approved project team.",
  },
  {
    title: "Duration",
    body: "Confidentiality obligations continue after the job ends unless the information becomes public through no fault of the receiving party.",
  },
]

const NDA_OFF_WARNING =
  "Without an NDA, your scope and team details will be publicly visible to all talent on Marketeq."

const INHERITED_NDA_MESSAGE =
  "NDA settings are inherited from the parent contract."

const NdaPreviewDialog = ({
  trigger,
  ndaDocumentId,
}: {
  trigger: React.ReactNode
  ndaDocumentId?: string | null
}) => {
  const [open, setOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !ndaDocumentId) {
      return
    }

    let cancelled = false

    const loadPreview = async () => {
      setIsLoading(true)
      setErrorMessage(null)

      try {
        const response = await LegalAPI.GetNdaPreview(ndaDocumentId)
        const nextPdfUrl = response?.data?.pdfUrl

        if (!cancelled) {
          setPdfUrl(typeof nextPdfUrl === "string" ? nextPdfUrl : null)
          if (!nextPdfUrl) {
            setErrorMessage("The NDA preview file is not available yet.")
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          setPdfUrl(null)
          setErrorMessage(
            error?.response?.data?.message ||
              error?.message ||
              "Unable to load the NDA preview."
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadPreview()

    return () => {
      cancelled = true
    }
  }, [open, ndaDocumentId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-[640px] overflow-hidden p-0">
        <DialogHeader className="border-b border-gray-200 px-6 py-4">
          <DialogTitle>NDA Sample</DialogTitle>
        </DialogHeader>
        <div className="max-h-[640px] overflow-y-auto bg-gray-100 px-8 py-6">
          {isLoading ? (
            <div className="flex h-[520px] flex-col items-center justify-center gap-3 rounded-lg bg-white text-sm text-gray-500">
              <Spinner size={32} strokeWidth={4} />
              <span>Loading NDA preview...</span>
            </div>
          ) : pdfUrl ? (
            <iframe
              title="NDA preview"
              src={pdfUrl}
              className="h-[560px] w-full rounded-lg border border-gray-200 bg-white"
            />
          ) : (
            <div className="mx-auto max-w-[460px] space-y-6">
              <div className="rounded-lg bg-white px-8 py-10 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Marketeq generated NDA
                </p>
                <h3 className="mt-3 text-lg font-semibold text-dark-blue-400">
                  Mutual Non-Disclosure Agreement
                </h3>
                <div className="mt-6 space-y-4">
                  {ndaPreviewSections.map((section) => (
                    <section key={section.title}>
                      <h4 className="text-sm font-semibold text-dark-blue-400">
                        {section.title}
                      </h4>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {section.body}
                      </p>
                    </section>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-white px-8 py-10 shadow-sm">
                <h4 className="text-sm font-semibold text-dark-blue-400">
                  Signature and Acknowledgement
                </h4>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Each invited team member will review and sign the NDA before
                  confidential project material is shared.
                </p>
              </div>
            </div>
          )}
          {errorMessage ? (
            <p className="mt-4 text-center text-sm text-error-600">
              {String(errorMessage)}
            </p>
          ) : null}
        </div>
        <DialogFooter className="border-t border-gray-200 px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="outlined" visual="gray">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const renderNdaPreviewDialog = (
  trigger: React.ReactNode,
  ndaDocumentId?: string | null
) => <NdaPreviewDialog trigger={trigger} ndaDocumentId={ndaDocumentId} />

const useDynamicFinalReviewSkills = () => {
  const [skills, setSkills] = useState(finalReviewSkills)
  const [isAddSkillDialogOpen, setAddSkillDialogOpen] = useState(false)
  const [draftSkill, setDraftSkill] = useState("")

  const addSkill = () => {
    setDraftSkill("")
    setAddSkillDialogOpen(true)
  }

  const closeAddSkillDialog = () => {
    setAddSkillDialogOpen(false)
    setDraftSkill("")
  }

  const saveSkill = () => {
    const nextSkill = draftSkill.trim()

    if (!nextSkill) return

    setSkills((currentSkills) =>
      currentSkills.some(
        (skill) => skill.toLowerCase() === nextSkill.toLowerCase()
      )
        ? currentSkills
        : [...currentSkills, nextSkill]
    )
    closeAddSkillDialog()
  }

  const removeSkill = (skillToRemove: string) => {
    setSkills((currentSkills) =>
      currentSkills.filter((skill) => skill !== skillToRemove)
    )
  }

  const addSkillDialog = (
    <Dialog
      open={isAddSkillDialogOpen}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setAddSkillDialogOpen(true)
          return
        }

        closeAddSkillDialog()
      }}
    >
      <DialogContent className="w-[410px] max-w-[calc(100vw-32px)]">
        <DialogHeader>
          <DialogTitle className="text-xl leading-7 font-semibold text-dark-blue-400">
            Add Skill
          </DialogTitle>
          <DialogDescription className="text-sm leading-5 text-gray-500">
            Enter a skill to add to this role.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <Label className="text-sm leading-5 font-semibold text-dark-blue-400">
            Skill
          </Label>
          <Input
            className="mt-2 h-11"
            placeholder="e.g. React"
            value={draftSkill}
            onChange={(event) => setDraftSkill(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                saveSkill()
              }
            }}
          />
        </div>
        <DialogFooter className="mt-8 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outlined"
            visual="gray"
            onClick={closeAddSkillDialog}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!draftSkill.trim()}
            onClick={saveSkill}
          >
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  return { skills, setSkills, addSkill, removeSkill, addSkillDialog }
}

const FinalReviewRichTextField = ({
  title,
  initialValue = "",
  placeholder,
  counterLabel,
  onChange,
}: {
  title: string
  initialValue?: string
  placeholder: string
  counterLabel?: string
  onChange?: (value: string) => void
}) => {
  const [value, setValue] = useState(initialValue)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  const characterCount = getRichTextCharacterCount(value)

  const handleChange = (html: string) => {
    setValue(html)
    onChange?.(html)
  }

  return (
    <>
      <div className="flex items-center justify-between gap-x-4">
        <h3 className="text-base leading-6 font-semibold text-dark-blue-400">
          {title}
        </h3>
        <span className="text-xs leading-[18px] text-gray-500">
          {counterLabel ? `${counterLabel}: ` : ""}
          {characterCount} / 100
        </span>
      </div>
      <RichTextEditor
        defaultValue={value}
        placeholder={`<p class='text-gray-400'>${placeholder}</p>`}
        className={finalReviewRichTextEditorClassName}
        toolbarClassName="left-4"
        editorClassName={finalReviewRichTextEditorContentClassName}
        onUpdate={handleChange}
        onBlur={handleChange}
      />
    </>
  )
}

const FinalReviewTextSection = ({
  title,
  initialValue,
  placeholder,
  onChange,
  children,
}: {
  title: string
  initialValue?: string
  placeholder: string
  onChange?: (value: string) => void
  children?: React.ReactNode
}) => (
  <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
    <FinalReviewRichTextField
      title={title}
      initialValue={initialValue}
      placeholder={placeholder}
      onChange={onChange}
    />
    {children}
  </div>
)

const useFinalReviewSmartAssistant = ({
  jobListingId,
  ensureJobListingDraft,
  getValue,
  onApply,
}: {
  jobListingId?: string | null
  ensureJobListingDraft?: EnsureJobListingDraft
  getValue: (field: SmartAssistantEditableField) => string
  onApply: (field: SmartAssistantEditableField, value: string) => void
}) => {
  const [message, setMessage] = useState("")
  const [result, setResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const run = useCallback(
    async (command: string, field: SmartAssistantEditableField) => {
      const trimmedCommand = command.trim()

      if (!trimmedCommand) {
        return
      }

      setIsLoading(true)
      setResult("")

      try {
        const listingId = jobListingId ?? (await ensureJobListingDraft?.())

        if (!listingId) {
          setResult(
            "Smart Assistant needs a saved job draft first. The draft service is currently unavailable; please try again in a moment."
          )
          return
        }

        const response = await JobListingAPI.SmartAssistant(listingId, {
          mode: "field",
          command: trimmedCommand,
          field,
          currentValue: getValue(field),
        })
        const data = response.data as {
          aiStatus?: "OK" | "AI_UNAVAILABLE"
          updatedValue?: string
          suggestions?: string[]
          message?: string
        }

        if (data.aiStatus === "AI_UNAVAILABLE") {
          setResult(
            data.message ?? "Smart Assistant is temporarily unavailable."
          )
          return
        }

        if (data.updatedValue) {
          const updatedValue = clampSmartAssistantFieldValue(
            field,
            data.updatedValue
          )
          onApply(field, updatedValue)
          setResult(
            field === "title"
              ? `Suggested title: ${updatedValue}`
              : "Smart Assistant updated this section."
          )
          setMessage("")
          return
        }

        setResult("Smart Assistant did not return an update for this section.")
      } catch (error) {
        console.error("Smart Assistant field edit failed", error)
        setResult("Smart Assistant is temporarily unavailable.")
      } finally {
        setIsLoading(false)
      }
    },
    [ensureJobListingDraft, getValue, jobListingId, onApply]
  )

  return {
    message,
    setMessage,
    result,
    isLoading,
    run,
  }
}

const resolveFinalReviewAssistantField = (
  command: string
): SmartAssistantEditableField => {
  const normalized = command.toLowerCase()

  if (
    /\b(title|project title|service title|headline|name)\b/.test(normalized)
  ) {
    return "title"
  }

  if (
    /\b(overview|summary|description|intro|introduction)\b/.test(normalized)
  ) {
    return "overview"
  }

  if (/\b(benefit|benefits|why join|value proposition)\b/.test(normalized)) {
    return "benefits"
  }

  return "responsibilities"
}

const useRoleDescriptionPersistence = ({
  jobListingId,
  ensureJobListingDraft,
  roleTitle,
  overview,
  benefits,
  responsibilities,
  skills,
  onLoad,
}: {
  jobListingId?: string | null
  ensureJobListingDraft?: EnsureJobListingDraft
  roleTitle: string
  overview?: string
  benefits?: string
  responsibilities?: string
  skills?: string[]
  onLoad?: (draft: {
    overview?: string
    benefits?: string
    responsibilities?: string
    skills?: string[]
  }) => void
}) => {
  const loadedKeyRef = useRef("")
  const lastSavedPayloadRef = useRef("")
  const [loadedPersistenceKey, setLoadedPersistenceKey] = useState("")

  useEffect(() => {
    const listingId = jobListingId
    const loadKey = listingId && roleTitle ? `${listingId}:${roleTitle}` : ""
    if (!listingId || !roleTitle || loadedKeyRef.current === loadKey) return
    loadedKeyRef.current = loadKey
    setLoadedPersistenceKey("")

    const loadRoleDescription = async () => {
      try {
        const response = await JobListingAPI.GetRoleDescriptions(listingId)
        const descriptions = Array.isArray(response?.data) ? response.data : []
        const description = descriptions.find(
          (item: any) => item?.roleTitle === roleTitle
        )
        if (!description) return

        const loadedPayload = {
          overview: description.overview ?? undefined,
          benefits: description.benefits ?? undefined,
          responsibilities: description.responsibilities ?? undefined,
          skills: Array.isArray(description.skills)
            ? description.skills
            : undefined,
        }
        lastSavedPayloadRef.current = JSON.stringify({
          roleTitle,
          payload: loadedPayload,
        })
        onLoad?.(loadedPayload)
      } catch (error) {
        console.error("Failed to load role description", error)
      } finally {
        setLoadedPersistenceKey(loadKey)
      }
    }

    void loadRoleDescription()
  }, [jobListingId, onLoad, roleTitle])

  useEffect(() => {
    if (!roleTitle) return

    const payload = {
      overview,
      benefits,
      responsibilities,
      skills,
    }
    const serializedPayload = JSON.stringify({
      roleTitle,
      payload,
    })
    const loadKey =
      jobListingId && roleTitle ? `${jobListingId}:${roleTitle}` : ""

    if (loadKey && loadedPersistenceKey !== loadKey) return

    if (serializedPayload === lastSavedPayloadRef.current) return

    const previousPayload = lastSavedPayloadRef.current
      ? JSON.parse(lastSavedPayloadRef.current)
      : null
    const textSignature = JSON.stringify({
      overview,
      benefits,
      responsibilities,
    })
    const previousTextSignature = JSON.stringify({
      overview: previousPayload?.payload?.overview,
      benefits: previousPayload?.payload?.benefits,
      responsibilities: previousPayload?.payload?.responsibilities,
    })
    const skillsChanged =
      JSON.stringify(skills ?? []) !==
      JSON.stringify(previousPayload?.payload?.skills ?? [])
    const textChanged = textSignature !== previousTextSignature
    const saveDelay = textChanged && !skillsChanged ? 500 : 0

    const timeout = window.setTimeout(() => {
      const saveRoleDescription = async () => {
        try {
          const listingId = jobListingId ?? (await ensureJobListingDraft?.())
          if (!listingId) return

          await JobListingAPI.SaveRoleDescription(listingId, roleTitle, payload)
          lastSavedPayloadRef.current = serializedPayload
        } catch (error) {
          console.error("Failed to save role description", error)
        }
      }

      void saveRoleDescription()
    }, saveDelay)

    return () => window.clearTimeout(timeout)
  }, [
    benefits,
    ensureJobListingDraft,
    jobListingId,
    loadedPersistenceKey,
    overview,
    responsibilities,
    roleTitle,
    skills,
  ])
}

const ReviewEditableTags = ({
  fieldName,
  label,
  addLabel,
  autocompleteType,
  fallbackOptions,
  max,
}: {
  fieldName: "industry" | "languages"
  label: string
  addLabel: string
  autocompleteType: string
  fallbackOptions: string[]
  max: number
}) => {
  const methods = useProjectInfoContext()
  const values = useWatch({ control: methods.control, name: fieldName }) ?? []
  const [isEditing, setIsEditing] = useState(false)
  const [options, setOptions] = useState<string[]>(fallbackOptions)
  const requestRef = useRef(0)

  const updateValues = useCallback(
    (nextValues: string[]) => {
      methods.setValue(fieldName, getUniqueOptions(nextValues).slice(0, max), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
      methods.clearErrors(fieldName)
      void methods.trigger(fieldName)
    },
    [fieldName, max, methods]
  )

  const removeValue = useCallback(
    (value: string) => {
      updateValues(values.filter((item) => item !== value))
    },
    [updateValues, values]
  )

  const loadOptions = useCallback(
    async (query: string) => {
      const requestId = requestRef.current + 1
      requestRef.current = requestId

      try {
        const response = await AutocompleteAPI.getByType(
          autocompleteType,
          query
        )
        if (requestRef.current !== requestId) return

        const nextOptions = Array.isArray(response?.data)
          ? getUniqueOptions(
              response.data
                .map((item: AutocompleteTypeSuggestion) =>
                  normalizeAutocompleteLabel(item)
                )
                .filter(Boolean)
            )
          : []

        setOptions(nextOptions.length ? nextOptions : fallbackOptions)
      } catch {
        if (requestRef.current === requestId) {
          setOptions(fallbackOptions)
        }
      }
    },
    [autocompleteType, fallbackOptions]
  )

  return (
    <div>
      <Label className="text-sm leading-5 text-gray-500">{label}</Label>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {values.length ? (
          values.map((item) => (
            <Badge
              key={item}
              size="md"
              visual="gray"
              className="gap-1 border border-gray-200 bg-white pr-1"
            >
              {item}
              <Button
                variant="link"
                visual="gray"
                type="button"
                className="size-4 rounded-full text-gray-400 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-primary-500"
                aria-label={`Remove ${item}`}
                onClick={() => removeValue(item)}
              >
                <X2 className="size-3" />
              </Button>
            </Badge>
          ))
        ) : (
          <span className="text-sm leading-5 text-gray-400">None added</span>
        )}
        <Button
          className="h-7"
          variant="outlined"
          visual="gray"
          type="button"
          onClick={() => setIsEditing((current) => !current)}
        >
          {addLabel}
        </Button>
      </div>
      {isEditing && (
        <TagsInputRoot
          className="mt-2 space-y-1.5"
          value={values}
          onValueChange={(details) => updateValues(details.value)}
        >
          <TagsInputContext>
            {(tagsInput) => (
              <TagsInputControl className="relative min-h-11 w-full rounded-[5px] border border-gray-300 px-[14px] py-[10px] pr-[34px] focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
                {tagsInput.value.map((value, index) => (
                  <TagsInputItem key={value} index={index} value={value}>
                    <TagsInputItemPreview
                      visual="primary"
                      size="md"
                      className="pr-2 text-primary-500 bg-primary-50"
                    >
                      <TagsInputItemText>{value}</TagsInputItemText>
                      <TagsInputItemDeleteTrigger className="opacity-50 hover:opacity-100">
                        <X2 className="size-3" />
                      </TagsInputItemDeleteTrigger>
                    </TagsInputItemPreview>
                    <TagsInputItemInput />
                  </TagsInputItem>
                ))}
                <TagsInputInput
                  options={options}
                  placeholder={
                    values.length >= max ? `${max}/${max}` : addLabel
                  }
                  disabled={values.length >= max}
                  allowCreateOption
                  onFocus={() => void loadOptions("")}
                  onInputValueChange={(value) => void loadOptions(value)}
                />
                <SearchMd className="size-4 shrink-0 absolute inset-y-0 right-3 my-auto text-gray-400" />
              </TagsInputControl>
            )}
          </TagsInputContext>
          <TagsInputHiddenInput />
        </TagsInputRoot>
      )}
    </div>
  )
}

const ReviewEditableTitle = ({ label }: { label: string }) => {
  const methods = useProjectInfoContext()
  const value = useWatch({ control: methods.control, name: "title" }) ?? ""
  const titleHasError = methods.getFieldState("title").invalid

  const updateTitle = useCallback(
    (nextTitle: string) => {
      methods.setValue("title", nextTitle.slice(0, 100), {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      })
      if (methods.getFieldState("title").error?.type === "manual") {
        methods.clearErrors("title")
      }
    },
    [methods]
  )

  return (
    <div>
      <Label className="text-sm leading-5 text-gray-500">{label}</Label>
      <Input
        className="mt-1.5"
        value={value}
        maxLength={100}
        onChange={(event) => updateTitle(event.target.value)}
        onBlur={() => void methods.trigger("title")}
        isInvalid={titleHasError}
      />
      <HookFormErrorMessage
        errors={methods.formState.errors}
        name="title"
        render={({ message }) => (
          <ErrorMessage className="mt-1" size="sm">
            {message}
          </ErrorMessage>
        )}
      />
    </div>
  )
}

const FinalServiceReviewStep = ({
  setProgress,
  ndaDocumentId,
  jobListingId,
  ensureJobListingDraft,
}: ProgressProps & {
  ndaDocumentId?: string | null
  jobListingId?: string | null
  ensureJobListingDraft?: EnsureJobListingDraft
}) => {
  const { toggleValidation } = useStepContext()
  const { details, setDetails } = useJobListingDraftContext()
  const projectInfoMethods = useProjectInfoContext()
  const { projectScopeMethods } = useProjectScopeContext()
  const [projectScopeState] = projectScopeMethods
  const roleOptions = useMemo(
    () => getScopeRoleOptions(projectScopeState),
    [projectScopeState]
  )
  const [ndaChoice, setNdaChoice] = useState<"yes" | "no">(
    details.ndaEnabled === true ? "yes" : "no"
  )
  const [selectedRole, setSelectedRole] = useState(roleOptions[0])
  const [responsibilities, setResponsibilities] = useState("")
  const didGenerateRoleDescriptionsRef = useRef(false)
  const { skills, setSkills, addSkill, removeSkill, addSkillDialog } =
    useDynamicFinalReviewSkills()
  const getAssistantValue = useCallback(
    (field: SmartAssistantEditableField) => {
      if (field === "title") return projectInfoMethods.getValues("title") ?? ""
      if (field === "overview") return details.description ?? ""
      if (field === "benefits") return details.successCriteria ?? ""
      if (field === "responsibilities") return responsibilities
      return ""
    },
    [
      details.description,
      details.successCriteria,
      projectInfoMethods,
      responsibilities,
    ]
  )
  const applyAssistantValue = useCallback(
    (field: SmartAssistantEditableField, value: string) => {
      if (field === "title") {
        projectInfoMethods.setValue("title", value.slice(0, 100), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      } else if (field === "overview") {
        setDetails((current) => ({ ...current, description: value }))
      } else if (field === "benefits") {
        setDetails((current) => ({ ...current, successCriteria: value }))
      } else if (field === "responsibilities") {
        setResponsibilities(value)
      }
    },
    [projectInfoMethods, setDetails]
  )
  const serviceAssistant = useFinalReviewSmartAssistant({
    jobListingId,
    ensureJobListingDraft,
    getValue: getAssistantValue,
    onApply: applyAssistantValue,
  })
  useEffect(() => {
    if (!roleOptions.includes(selectedRole)) {
      setSelectedRole(roleOptions[0])
    }
  }, [roleOptions, selectedRole])
  const loadSavedRoleDescription = useCallback(
    (draft: {
      overview?: string
      benefits?: string
      responsibilities?: string
      skills?: string[]
    }) => {
      if (draft.overview !== undefined) {
        setDetails((current) => ({ ...current, description: draft.overview }))
      }
      if (draft.benefits !== undefined) {
        setDetails((current) => ({
          ...current,
          successCriteria: draft.benefits,
        }))
      }
      if (draft.responsibilities !== undefined) {
        setResponsibilities(draft.responsibilities)
      }
      if (draft.skills) {
        setSkills(draft.skills)
      }
    },
    [setDetails, setSkills]
  )
  useRoleDescriptionPersistence({
    jobListingId,
    ensureJobListingDraft,
    roleTitle: selectedRole,
    overview: details.description ?? "",
    benefits: details.successCriteria ?? "",
    responsibilities,
    skills,
    onLoad: loadSavedRoleDescription,
  })

  useEffect(() => {
    if (!jobListingId || didGenerateRoleDescriptionsRef.current) return
    if (responsibilities) return
    didGenerateRoleDescriptionsRef.current = true

    const generateRoleDescriptions = async () => {
      try {
        const response = await JobListingAPI.GenerateRoleDescriptions(
          jobListingId,
          {
            workType: "service",
            description: details.description ?? "",
            roles: roleOptions.map((roleTitle) => ({ roleTitle })),
          }
        )
        const descriptions = response?.data?.roleDescriptions
        const description = Array.isArray(descriptions)
          ? descriptions.find((item: any) => item?.roleTitle === selectedRole)
          : null

        if (description?.overview) {
          setDetails((current) => ({
            ...current,
            description: description.overview,
          }))
        }
        if (description?.benefits) {
          setDetails((current) => ({
            ...current,
            successCriteria: description.benefits,
          }))
        }
        if (description?.responsibilities) {
          setResponsibilities(description.responsibilities)
        }
        if (Array.isArray(description?.skills)) {
          setSkills(description.skills)
        }
      } catch (error) {
        console.error("Failed to generate role descriptions", error)
      }
    }

    void generateRoleDescriptions()
  }, [
    details.description,
    jobListingId,
    roleOptions,
    responsibilities,
    selectedRole,
    setDetails,
    setSkills,
  ])

  useIsomorphicLayoutEffect(() => {
    toggleValidation(true)
  }, [])

  useEffect(() => {
    setProgress?.(17.5)
  }, [setProgress])
  useEffect(() => {
    if (details.ndaEnabled === undefined) {
      setDetails((current) => ({ ...current, ndaEnabled: false }))
    }
  }, [details.ndaEnabled, setDetails])

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      {addSkillDialog}
      <div className="bg-gray-50 px-5 py-10 md:px-10 min-[1024px]:px-[100px] min-[1024px]:pb-5 min-[1024px]:pt-[50px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 min-[1180px]:flex-row min-[1180px]:items-start">
          <div className="min-w-0 flex-auto min-[1180px]:w-[887px]">
            <h1 className="text-[32px] leading-[40px] font-semibold text-dark-blue-400">
              One Last Check
            </h1>
            <p className="mt-4 text-sm leading-5 text-dark-blue-400">
              Take a moment to review your setup. If everything looks good, go
              ahead and publish, or make quick edits if needed.
            </p>

            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Basic Information
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReviewEditableTitle label="Service Title" />
                <div>
                  <Label className="text-sm leading-5 text-gray-500">
                    Job Type
                  </Label>
                  <Input className="mt-1.5" value="Website" readOnly />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReviewEditableTags
                  fieldName="industry"
                  label="Industries"
                  addLabel="Add Industry"
                  autocompleteType="industries"
                  fallbackOptions={FALLBACK_INDUSTRY_OPTIONS}
                  max={5}
                />
                <ReviewEditableTags
                  fieldName="languages"
                  label="Languages"
                  addLabel="Add Language"
                  autocompleteType="languages"
                  fallbackOptions={FALLBACK_LANGUAGE_OPTIONS}
                  max={10}
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Include a Non-Disclosure Agreement (NDA)?
              </h2>
              <p className="mt-2 text-sm leading-5 text-gray-500">
                We&apos;ll generate one with your company name. Each team member
                will receive and sign it before starting the project.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { value: "yes" as const, label: "Yes, Include NDA" },
                  { value: "no" as const, label: "No NDA" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant="outlined"
                    visual="gray"
                    type="button"
                    className={cn(
                      "h-9 rounded-full border-gray-300 bg-white px-4 text-sm leading-5 text-dark-blue-400 shadow-none",
                      ndaChoice === option.value &&
                        "border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-50"
                    )}
                    onClick={() => {
                      setNdaChoice(option.value)
                      setDetails((current) => ({
                        ...current,
                        ndaEnabled: option.value === "yes",
                      }))
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {ndaChoice === "yes" ? (
                <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm leading-5 text-dark-blue-400">
                  Your Non-Disclosure Agreement (NDA) has been created. Feel
                  free to review it.{" "}
                  {renderNdaPreviewDialog(
                    <Button
                      type="button"
                      className="h-7 px-2"
                      variant="link"
                      visual="primary"
                    >
                      View NDA
                    </Button>,
                    ndaDocumentId
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-primary-100 bg-warning-50 p-4 text-sm leading-5 text-dark-blue-400">
                  {NDA_OFF_WARNING}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-lg leading-7 font-semibold text-dark-blue-400">
                Description
              </h2>
              <FinalReviewTextSection
                title="Overview"
                initialValue={details.description ?? ""}
                placeholder="Add the service overview"
                onChange={(value) =>
                  setDetails((current) => ({ ...current, description: value }))
                }
              />
              <FinalReviewTextSection
                title="Benefits"
                initialValue={details.successCriteria ?? ""}
                placeholder="Add benefits for joining this service"
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    successCriteria: value,
                  }))
                }
              />

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => (
                    <Button
                      key={role}
                      variant="outlined"
                      visual="gray"
                      type="button"
                      className={cn(
                        "h-8 rounded-full border-gray-300 bg-white px-3 text-xs leading-[18px] text-dark-blue-400 shadow-none",
                        selectedRole === role &&
                          "border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-50"
                      )}
                      onClick={() => setSelectedRole(role)}
                    >
                      {role}
                    </Button>
                  ))}
                  <Button
                    variant="outlined"
                    visual="gray"
                    type="button"
                    className="h-8 rounded-full border-gray-300 bg-white px-3 text-xs leading-[18px] text-dark-blue-400 shadow-none"
                  >
                    + 5 More
                  </Button>
                </div>

                <div className="mt-5">
                  <FinalReviewRichTextField
                    title="Responsibilities"
                    initialValue={responsibilities}
                    placeholder={`Add responsibilities for ${selectedRole}`}
                    onChange={setResponsibilities}
                  />
                </div>

                <div className="mt-5">
                  <h3 className="text-base leading-6 font-semibold text-dark-blue-400">
                    Skills
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        size="md"
                        visual="gray"
                        className="border border-gray-200 bg-white"
                      >
                        {skill}
                        <Button
                          variant="link"
                          visual="gray"
                          type="button"
                          className="ml-2 text-gray-400"
                          onClick={() => removeSkill(skill)}
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    ))}
                    <Button
                      className="h-7"
                      variant="outlined"
                      visual="gray"
                      onClick={addSkill}
                    >
                      Add Skill
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-[1180px]:w-[321px] self-start">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Smart Assistant
              </h2>
              <Copy className="size-5 text-gray-400" />
            </div>
            <div className="p-5">
              <h3 className="text-lg leading-7 font-semibold text-dark-blue-400">
                What do you want to do?
              </h3>
              <p className="text-sm leading-5 text-dark-blue-400">
                Here are some suggestions:
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ["Change a Service Title", "title"],
                  ["Rewrite Overview", "overview"],
                  ["Rewrite Benefits", "benefits"],
                ].map(([item, field]) => (
                  <Button
                    key={item}
                    className="h-10 rounded-full"
                    variant="outlined"
                    visual="gray"
                    disabled={serviceAssistant.isLoading}
                    onClick={() =>
                      serviceAssistant.run(
                        item,
                        field as SmartAssistantEditableField
                      )
                    }
                  >
                    <Copy className="size-4 text-gray-400" />
                    {item}
                  </Button>
                ))}
              </div>
              {serviceAssistant.result ? (
                <p className="mt-4 text-xs leading-[18px] text-primary-600">
                  {serviceAssistant.result}
                </p>
              ) : null}
              <div className="mt-[280px] rounded-[5px] border border-gray-300 bg-white p-3 shadow-xs">
                <Textarea
                  className="h-10 w-full resize-none border-0 bg-transparent p-0 text-sm leading-5 text-gray-500 shadow-none focus:border-0 focus:ring-0 focus-visible:outline-none"
                  placeholder="I want to change..."
                  value={serviceAssistant.message}
                  onChange={(event) =>
                    serviceAssistant.setMessage(event.target.value)
                  }
                />
                <div className="flex items-center justify-between">
                  <RefreshCcw05 className="size-4 text-gray-400" />
                  <Button
                    className="size-8 rounded-full p-0"
                    type="button"
                    disabled={
                      serviceAssistant.isLoading ||
                      !serviceAssistant.message.trim()
                    }
                    onClick={() =>
                      serviceAssistant.run(
                        serviceAssistant.message,
                        resolveFinalReviewAssistantField(
                          serviceAssistant.message
                        )
                      )
                    }
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

const FinalProjectReviewStep = ({
  setProgress,
  ndaDocumentId,
  jobListingId,
  ensureJobListingDraft,
}: ProgressProps & {
  ndaDocumentId?: string | null
  jobListingId?: string | null
  ensureJobListingDraft?: EnsureJobListingDraft
}) => {
  const { toggleValidation } = useStepContext()
  const { details, setDetails } = useJobListingDraftContext()
  const projectInfoMethods = useProjectInfoContext()
  const { projectScopeMethods } = useProjectScopeContext()
  const [projectScopeState] = projectScopeMethods
  const roleOptions = useMemo(
    () => getScopeRoleOptions(projectScopeState),
    [projectScopeState]
  )
  const [ndaChoice, setNdaChoice] = useState<"yes" | "no">(
    details.ndaEnabled === true ? "yes" : "no"
  )
  const [selectedRole, setSelectedRole] = useState(roleOptions[0])
  const [responsibilities, setResponsibilities] = useState("")
  const didGenerateRoleDescriptionsRef = useRef(false)
  const { skills, setSkills, addSkill, removeSkill, addSkillDialog } =
    useDynamicFinalReviewSkills()
  const getAssistantValue = useCallback(
    (field: SmartAssistantEditableField) => {
      if (field === "title") return projectInfoMethods.getValues("title") ?? ""
      if (field === "overview") return details.description ?? ""
      if (field === "benefits") return details.successCriteria ?? ""
      if (field === "responsibilities") return responsibilities
      return ""
    },
    [
      details.description,
      details.successCriteria,
      projectInfoMethods,
      responsibilities,
    ]
  )
  const applyAssistantValue = useCallback(
    (field: SmartAssistantEditableField, value: string) => {
      if (field === "title") {
        projectInfoMethods.setValue("title", value.slice(0, 100), {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        })
      } else if (field === "overview") {
        setDetails((current) => ({ ...current, description: value }))
      } else if (field === "benefits") {
        setDetails((current) => ({ ...current, successCriteria: value }))
      } else if (field === "responsibilities") {
        setResponsibilities(value)
      }
    },
    [projectInfoMethods, setDetails]
  )
  const projectAssistant = useFinalReviewSmartAssistant({
    jobListingId,
    ensureJobListingDraft,
    getValue: getAssistantValue,
    onApply: applyAssistantValue,
  })
  useEffect(() => {
    if (!roleOptions.includes(selectedRole)) {
      setSelectedRole(roleOptions[0])
    }
  }, [roleOptions, selectedRole])
  const loadSavedRoleDescription = useCallback(
    (draft: {
      overview?: string
      benefits?: string
      responsibilities?: string
      skills?: string[]
    }) => {
      if (draft.overview !== undefined) {
        setDetails((current) => ({ ...current, description: draft.overview }))
      }
      if (draft.benefits !== undefined) {
        setDetails((current) => ({
          ...current,
          successCriteria: draft.benefits,
        }))
      }
      if (draft.responsibilities !== undefined) {
        setResponsibilities(draft.responsibilities)
      }
      if (draft.skills) {
        setSkills(draft.skills)
      }
    },
    [setDetails, setSkills]
  )
  useRoleDescriptionPersistence({
    jobListingId,
    ensureJobListingDraft,
    roleTitle: selectedRole,
    overview: details.description ?? "",
    benefits: details.successCriteria ?? "",
    responsibilities,
    skills,
    onLoad: loadSavedRoleDescription,
  })

  useEffect(() => {
    if (!jobListingId || didGenerateRoleDescriptionsRef.current) return
    if (responsibilities) return
    didGenerateRoleDescriptionsRef.current = true

    const generateRoleDescriptions = async () => {
      try {
        const response = await JobListingAPI.GenerateRoleDescriptions(
          jobListingId,
          {
            workType: "project",
            description: details.description ?? "",
            roles: roleOptions.map((roleTitle) => ({ roleTitle })),
          }
        )
        const descriptions = response?.data?.roleDescriptions
        const description = Array.isArray(descriptions)
          ? descriptions.find((item: any) => item?.roleTitle === selectedRole)
          : null

        if (description?.overview) {
          setDetails((current) => ({
            ...current,
            description: description.overview,
          }))
        }
        if (description?.benefits) {
          setDetails((current) => ({
            ...current,
            successCriteria: description.benefits,
          }))
        }
        if (description?.responsibilities) {
          setResponsibilities(description.responsibilities)
        }
        if (Array.isArray(description?.skills)) {
          setSkills(description.skills)
        }
      } catch (error) {
        console.error("Failed to generate role descriptions", error)
      }
    }

    void generateRoleDescriptions()
  }, [
    details.description,
    jobListingId,
    roleOptions,
    responsibilities,
    selectedRole,
    setDetails,
    setSkills,
  ])

  useIsomorphicLayoutEffect(() => {
    toggleValidation(true)
  }, [])

  useEffect(() => {
    setProgress?.(17.5)
  }, [setProgress])
  useEffect(() => {
    if (details.ndaEnabled === undefined) {
      setDetails((current) => ({ ...current, ndaEnabled: false }))
    }
  }, [details.ndaEnabled, setDetails])

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      {addSkillDialog}
      <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px]">
        <div className="flex flex-col gap-8 min-[1180px]:flex-row">
          <div className="min-w-0 flex-auto max-w-[790px]">
            <h1 className="text-[32px] leading-[40px] font-semibold text-dark-blue-400">
              One Last Check
            </h1>
            <p className="mt-4 text-sm leading-5 text-dark-blue-400">
              Take a moment to review your setup. If everything looks good, go
              ahead and publish, or make quick edits if needed.
            </p>

            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Basic Information
              </h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReviewEditableTitle label="Project Title" />
                <div>
                  <Label className="text-sm leading-5 text-gray-500">
                    Job Type
                  </Label>
                  <Input className="mt-1.5" value="Website" readOnly />
                </div>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ReviewEditableTags
                  fieldName="industry"
                  label="Industries"
                  addLabel="Add Industry"
                  autocompleteType="industries"
                  fallbackOptions={FALLBACK_INDUSTRY_OPTIONS}
                  max={5}
                />
                <ReviewEditableTags
                  fieldName="languages"
                  label="Languages"
                  addLabel="Add Language"
                  autocompleteType="languages"
                  fallbackOptions={FALLBACK_LANGUAGE_OPTIONS}
                  max={10}
                />
              </div>
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Include a Non-Disclosure Agreement (NDA)?
              </h2>
              <p className="mt-2 text-sm leading-5 text-gray-500">
                We&apos;ll generate one with your company name. Each team member
                will receive and sign it before starting the project.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {[
                  { value: "yes" as const, label: "Yes, Include NDA" },
                  { value: "no" as const, label: "No NDA" },
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant="outlined"
                    visual="gray"
                    type="button"
                    className={cn(
                      "h-9 rounded-full border-gray-300 bg-white px-4 text-sm leading-5 text-dark-blue-400 shadow-none",
                      ndaChoice === option.value &&
                        "border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-50"
                    )}
                    onClick={() => {
                      setNdaChoice(option.value)
                      setDetails((current) => ({
                        ...current,
                        ndaEnabled: option.value === "yes",
                      }))
                    }}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {ndaChoice === "yes" ? (
                <div className="mt-4 rounded-lg border border-primary-100 bg-primary-50 p-4 text-sm leading-5 text-dark-blue-400">
                  Your Non-Disclosure Agreement (NDA) has been created. Feel
                  free to review it.{" "}
                  {renderNdaPreviewDialog(
                    <Button
                      type="button"
                      className="h-7 px-2"
                      variant="link"
                      visual="primary"
                    >
                      View NDA
                    </Button>,
                    ndaDocumentId
                  )}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-primary-100 bg-warning-50 p-4 text-sm leading-5 text-dark-blue-400">
                  {NDA_OFF_WARNING}
                </div>
              )}
            </div>

            <div className="mt-6 space-y-4">
              <h2 className="text-lg leading-7 font-semibold text-dark-blue-400">
                Description
              </h2>
              <FinalReviewTextSection
                title="Overview"
                initialValue={details.description ?? ""}
                placeholder="Add the project overview"
                onChange={(value) =>
                  setDetails((current) => ({ ...current, description: value }))
                }
              />
              <FinalReviewTextSection
                title="Benefits"
                initialValue={details.successCriteria ?? ""}
                placeholder="Add benefits for joining this project"
                onChange={(value) =>
                  setDetails((current) => ({
                    ...current,
                    successCriteria: value,
                  }))
                }
              />

              <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                <div className="flex flex-wrap gap-2">
                  {roleOptions.map((role) => (
                    <Button
                      key={role}
                      variant="outlined"
                      visual="gray"
                      type="button"
                      className={cn(
                        "h-8 rounded-full border-gray-300 bg-white px-3 text-xs leading-[18px] text-dark-blue-400 shadow-none",
                        selectedRole === role &&
                          "border-primary-500 bg-primary-50 text-primary-700 hover:bg-primary-50"
                      )}
                      onClick={() => setSelectedRole(role)}
                    >
                      {role}
                    </Button>
                  ))}
                  <Button
                    variant="outlined"
                    visual="gray"
                    type="button"
                    className="h-8 rounded-full border-gray-300 bg-white px-3 text-xs leading-[18px] text-dark-blue-400 shadow-none"
                  >
                    + 5 More
                  </Button>
                </div>

                <div className="mt-5">
                  <FinalReviewRichTextField
                    title="Responsibilities"
                    initialValue={responsibilities}
                    placeholder={`Add responsibilities for ${selectedRole}`}
                    onChange={setResponsibilities}
                  />
                </div>

                <div className="mt-5">
                  <h3 className="text-base leading-6 font-semibold text-dark-blue-400">
                    Skills
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge
                        key={skill}
                        size="md"
                        visual="gray"
                        className="border border-gray-200 bg-white"
                      >
                        {skill}
                        <Button
                          variant="link"
                          visual="gray"
                          type="button"
                          className="ml-2 text-gray-400"
                          onClick={() => removeSkill(skill)}
                          aria-label={`Remove ${skill}`}
                        >
                          <X className="size-3" />
                        </Button>
                      </Badge>
                    ))}
                    <Button
                      className="h-7"
                      variant="outlined"
                      visual="gray"
                      onClick={addSkill}
                    >
                      Add Skill
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-[1180px]:w-[321px] self-start">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Smart Assistant
              </h2>
              <Copy className="size-5 text-gray-400" />
            </div>
            <div className="p-5">
              <h3 className="text-lg leading-7 font-semibold text-dark-blue-400">
                What do you want to do?
              </h3>
              <p className="text-sm leading-5 text-dark-blue-400">
                Here are some suggestions:
              </p>
              <div className="mt-4 space-y-3">
                {[
                  ["Change a Project Title", "title"],
                  ["Rewrite Overview", "overview"],
                  ["Rewrite Benefits", "benefits"],
                ].map(([item, field]) => (
                  <Button
                    key={item}
                    className="h-10 rounded-full"
                    variant="outlined"
                    visual="gray"
                    disabled={projectAssistant.isLoading}
                    onClick={() =>
                      projectAssistant.run(
                        item,
                        field as SmartAssistantEditableField
                      )
                    }
                  >
                    <Copy className="size-4 text-gray-400" />
                    {item}
                  </Button>
                ))}
              </div>
              {projectAssistant.result ? (
                <p className="mt-4 text-xs leading-[18px] text-primary-600">
                  {projectAssistant.result}
                </p>
              ) : null}
              <div className="mt-[280px] rounded-[5px] border border-gray-300 bg-white p-3 shadow-xs">
                <Textarea
                  className="h-10 w-full resize-none border-0 bg-transparent p-0 text-sm leading-5 text-gray-500 shadow-none focus:border-0 focus:ring-0 focus-visible:outline-none"
                  placeholder="I want to change..."
                  value={projectAssistant.message}
                  onChange={(event) =>
                    projectAssistant.setMessage(event.target.value)
                  }
                />
                <div className="flex items-center justify-between">
                  <RefreshCcw05 className="size-4 text-gray-400" />
                  <Button
                    className="size-8 rounded-full p-0"
                    type="button"
                    disabled={
                      projectAssistant.isLoading ||
                      !projectAssistant.message.trim()
                    }
                    onClick={() =>
                      projectAssistant.run(
                        projectAssistant.message,
                        resolveFinalReviewAssistantField(
                          projectAssistant.message
                        )
                      )
                    }
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )
}

const ServiceScopeEditStep = ({
  setProgress,
  jobListingId,
}: ProgressProps & { jobListingId?: string | null }) => {
  const { toggleValidation } = useStepContext();
  const { projectScopeMethods } = useProjectScopeContext();
  const [projectScopeState, setProjectScopeState] = projectScopeMethods;
  const { details: jobListingDraftDetails } = useJobListingDraftContext();
  const createDefaultServicePhases = () =>
    reorderServicePhases(
      serviceScopePhases.map((phase, phaseIndex) => ({
        ...phase,
        id: `service-default-phase-${phaseIndex}`,
        rows: phase.rows.map((row) => ({ ...row, workSchedule: "full_time" })),
      })),
    );
  const [phases, setPhases] = useState<ServiceScopePhase[]>(
    createDefaultServicePhases,
  );
  const [expandedPhaseIds, setExpandedPhaseIds] = useState(() =>
    createDefaultServicePhases().map((phase) => phase.id),
  );
  const [searchValue, setSearchValue] = useState("");
  const [isAddPhaseDialogOpen, setAddPhaseDialogOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [newPhaseType, setNewPhaseType] = useState<
    (typeof serviceScopePhaseTypeOptions)[number]["value"] | ""
  >("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [assistantResult, setAssistantResult] = useState("");
  const [assistantLastPrompt, setAssistantLastPrompt] = useState("");
  const [assistantHistory, setAssistantHistory] = useState<
    ServiceAssistantHistoryItem[]
  >([]);
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const assistantChatScrollRef = useRef<HTMLDivElement | null>(null);
  const assistantUndoSnapshotRef =
    useRef<ServiceAssistantListingSnapshot | null>(null);
  const didGenerateInitialScopeRef = useRef(false);
  const [budgetAmount, setBudgetAmount] = useState(5000);
  const [isBudgetLoading, setIsBudgetLoading] = useState(false);
  const [isBudgetStale, setIsBudgetStale] = useState(false);
  const [budgetFrequency, setBudgetFrequency] = useState("week");
  const [activeServicePhaseNoteId, setActiveServicePhaseNoteId] = useState<
    string | null
  >(null);
  const [activeRecurringPhaseId, setActiveRecurringPhaseId] = useState<
    string | null
  >(null);
  const [draftRecurringSchedule, setDraftRecurringSchedule] = useState<
    (typeof serviceRecurringScheduleOptions)[number]["value"]
  >("monthly");
  const [draftRecurringCount, setDraftRecurringCount] = useState(1);
  const [activeServiceRoleKey, setActiveServiceRoleKey] = useState<
    string | null
  >(null);
  const [draftServiceRole, setDraftServiceRole] = useState("");
  const [serviceRoleAutocompleteOptions, setServiceRoleAutocompleteOptions] =
    useState<string[]>([]);
  const [isServiceRoleAutocompleteOpen, setServiceRoleAutocompleteOpen] =
    useState(false);
  const serviceRoleAutocompleteTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const serviceRoleAutocompleteRequestIdRef = useRef(0);
  const [draftServiceSchedule, setDraftServiceSchedule] =
    useState<JobListingWorkSchedule>("full_time");
  const [draftServiceCustomHours, setDraftServiceCustomHours] = useState("15");
  const [draftServiceCustomFrequency, setDraftServiceCustomFrequency] =
    useState("per_week");
  const didApplyPersistedScopeRef = useRef(false);
  const skipNextServiceScopeSaveRef = useRef(false);
  const lastSavedServiceScopeSignatureRef = useRef("");
  const servicePhaseDndSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {}),
  );
  const normalizedSearchValue = normalizeSearchText(searchValue);
  const visiblePhases = normalizedSearchValue
    ? phases.filter((phase) => {
        const phaseText = normalizeSearchText(
          [
            phase.name,
            phase.customName,
            phase.status,
            ...phase.rows.flatMap((row) => [
              row.task,
              row.role,
              row.location,
              row.experience,
              row.duration,
            ]),
          ].join(" "),
        );

        return phaseText.includes(normalizedSearchValue);
      })
    : phases;

  useEffect(() => {
    const query = draftServiceRole.trim();

    if (serviceRoleAutocompleteTimerRef.current) {
      clearTimeout(serviceRoleAutocompleteTimerRef.current);
    }

    if (!activeServiceRoleKey || !query) {
      setServiceRoleAutocompleteOptions([]);
      setServiceRoleAutocompleteOpen(false);
      return;
    }

    serviceRoleAutocompleteTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++serviceRoleAutocompleteRequestIdRef.current;

      try {
        const response = await AutocompleteAPI.getByType(
          "job_titles",
          query,
          10,
        );
        if (currentRequestId !== serviceRoleAutocompleteRequestIdRef.current) {
          return;
        }

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data,
        )
          ? response.data
          : [];
        const options = getUniqueOptions(
          apiValues.map((item) => normalizeAutocompleteLabel(item)),
        ).filter(
          (option) => option.toLowerCase() !== query.toLowerCase(),
        );

        setServiceRoleAutocompleteOptions(options);
        setServiceRoleAutocompleteOpen(options.length > 0);
      } catch {
        if (currentRequestId !== serviceRoleAutocompleteRequestIdRef.current) {
          return;
        }
        setServiceRoleAutocompleteOptions([]);
        setServiceRoleAutocompleteOpen(false);
      }
    }, 250);

    return () => {
      if (serviceRoleAutocompleteTimerRef.current) {
        clearTimeout(serviceRoleAutocompleteTimerRef.current);
      }
    };
  }, [activeServiceRoleKey, draftServiceRole]);

  useEffect(() => {
    if (didApplyPersistedScopeRef.current) return;

    const persistedPhases =
      createServicePhasesFromPersistedJobListing(projectScopeState);

    if (persistedPhases.length === 0) return;

    didApplyPersistedScopeRef.current = true;
    didGenerateInitialScopeRef.current = true;
    skipNextServiceScopeSaveRef.current = true;
    setPhases(persistedPhases);
    setExpandedPhaseIds(persistedPhases.map((phase) => phase.id));
  }, [projectScopeState]);

  useEffect(() => {
    if (!jobListingId || didGenerateInitialScopeRef.current) return;
    didGenerateInitialScopeRef.current = true;

    const generateScope = async () => {
      setIsBudgetLoading(true);
      try {
        const response = await JobListingAPI.GenerateScope(jobListingId, {
          workType: "service",
          description: jobListingDraftDetails.description,
          deliverables: jobListingDraftDetails.deliverables,
          tools: jobListingDraftDetails.tools,
          budgetUsdCents: budgetAmount * 100,
          apply: true,
        });
        const generatedPhases = createServicePhasesFromGeneratedScope(
          response?.data?.scope,
        );

        if (generatedPhases.length > 0) {
          skipNextServiceScopeSaveRef.current = true;
          setPhases(generatedPhases);
          setExpandedPhaseIds(generatedPhases.map((phase) => phase.id));
        }
        const totalBudgetUsdCents = toFiniteNumber(
          response?.data?.totalBudgetUsdCents,
        );
        if (typeof totalBudgetUsdCents === "number") {
          setBudgetAmount(Math.round(totalBudgetUsdCents / 100));
          setIsBudgetStale(Boolean(response?.data?.isBudgetStale));
        }
      } catch (error) {
        console.error("Failed to generate service scope", error);
      } finally {
        setIsBudgetLoading(false);
      }
    };

    void generateScope();
  }, [
    jobListingId,
    jobListingDraftDetails.description,
    jobListingDraftDetails.deliverables,
    jobListingDraftDetails.tools,
  ]);

  const updateRow = (
    phaseId: string,
    taskName: string,
    nextValues: Partial<ServiceScopeRow>,
  ) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) =>
        phase.id !== phaseId
          ? phase
          : {
              ...phase,
              rows: phase.rows.map((row) =>
                row.task === taskName ? { ...row, ...nextValues } : row,
              ),
            },
      ),
    );
  };

  const updateRowAtIndex = (
    phaseId: string,
    rowIndex: number,
    nextValues: Partial<ServiceScopeRow>,
  ) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) =>
        phase.id !== phaseId
          ? phase
          : {
              ...phase,
              rows: phase.rows.map((row, currentRowIndex) =>
                currentRowIndex === rowIndex ? { ...row, ...nextValues } : row,
              ),
            },
      ),
    );
  };

  const formatServiceRowSchedule = (row: ServiceScopeRow) => {
    if (row.workSchedule === "part_time") return "Part-time";
    if (row.workSchedule === "custom") {
      return `${row.customHours ?? 15} hours ${
        row.customFrequency ?? "per week"
      }`;
    }

    return "Full-time";
  };

  const openServiceRoleEditor = (phaseId: string, row: ServiceScopeRow) => {
    const key = `${phaseId}-${row.task}`;
    const [durationValue] = row.duration.split(/\s+/);

    setActiveServiceRoleKey(key);
    setDraftServiceRole(row.role ?? "");
    setServiceRoleAutocompleteOptions([]);
    setServiceRoleAutocompleteOpen(false);
    setDraftServiceSchedule(row.workSchedule ?? "full_time");
    setDraftServiceCustomHours(
      String(row.customHours ?? (Number(durationValue) || 15)),
    );
    setDraftServiceCustomFrequency(row.customFrequency ?? "per_week");
  };

  const saveServiceRoleEditor = (phaseId: string, taskName: string) => {
    const nextHours = Number(draftServiceCustomHours) || 15;

    updateRow(phaseId, taskName, {
      role: draftServiceRole.trim() || "Specialist",
      workSchedule: draftServiceSchedule,
      customHours: draftServiceSchedule === "custom" ? nextHours : undefined,
      customFrequency:
        draftServiceSchedule === "custom"
          ? draftServiceCustomFrequency
          : undefined,
      ...(draftServiceSchedule === "custom"
        ? { duration: `${nextHours} hours` }
        : {}),
    });
    setActiveServiceRoleKey(null);
    setServiceRoleAutocompleteOpen(false);
  };

  const updatePhaseRecurrence = (
    phaseId: string,
    recurrenceSchedule: (typeof serviceRecurringScheduleOptions)[number]["value"],
    recurrenceCount: number,
  ) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) => {
        if (phase.id !== phaseId || phase.phaseType !== "recurring") {
          return phase;
        }

        return {
          ...phase,
          recurrenceSchedule,
          recurrenceCount,
          status: `Recurs: ${getServiceRecurringScheduleLabel(
            recurrenceSchedule,
          )}, ${recurrenceCount} ${recurrenceCount === 1 ? "time" : "times"}`,
        };
      }),
    );
  };

  const formatServiceRecurringStatus = (phase: {
    recurrenceSchedule?: string;
    recurrenceCount?: number;
  }) => {
    const scheduleLabel = getServiceRecurringScheduleLabel(
      phase.recurrenceSchedule,
    );
    const count = phase.recurrenceCount ?? 3;

    return `${scheduleLabel}, ${count} ${count === 1 ? "time" : "times"}`;
  };

  const cloneServicePhases = (sourcePhases: ServiceScopePhase[]) =>
    sourcePhases.map((phase) => ({
      ...phase,
      rows: phase.rows.map((row) => ({ ...row })),
    }));

  const getServiceAssistantListingSnapshot = (
    sourcePhases: ServiceScopePhase[] = phases,
    sourceBudgetAmount: number = budgetAmount,
    sourceIsBudgetStale: boolean = isBudgetStale,
  ): ServiceAssistantListingSnapshot => ({
    phases: cloneServicePhases(sourcePhases),
    budgetAmount: sourceBudgetAmount,
    isBudgetStale: sourceIsBudgetStale,
  });

  const restoreServiceAssistantListingSnapshot = (
    snapshot: ServiceAssistantListingSnapshot,
  ) => {
    const nextPhases = cloneServicePhases(snapshot.phases);
    skipNextServiceScopeSaveRef.current = true;
    setPhases(nextPhases);
    setExpandedPhaseIds(nextPhases.map((phase) => phase.id));
    setBudgetAmount(snapshot.budgetAmount);
    setIsBudgetStale(snapshot.isBudgetStale);
  };

  const persistServiceAssistantListingSnapshot = async (
    snapshot: ServiceAssistantListingSnapshot,
  ) => {
    if (!jobListingId) return;

    await JobListingAPI.ApplyGeneratedScope(jobListingId, {
      hasScope: true,
      phases: snapshot.phases.map((phase) => ({
        phaseName: `${phase.name} ${phase.customName ?? ""}`.trim(),
        phaseType: phase.phaseType,
        recurrenceSchedule: phase.recurrenceSchedule,
        recurrenceCount: phase.recurrenceCount,
        tasks: phase.rows.map((row) => {
          const [durationValue] = row.duration.split(/\s+/);

          return {
            taskName: row.task,
            roleTitle: row.role,
            location: row.location,
            experienceLevel: row.experience,
            workSchedule: row.workSchedule ?? "full_time",
            customHours: row.customHours,
            customFrequency: row.customFrequency,
            estimatedHours:
              row.workSchedule === "custom"
                ? Number(row.customHours) || 1
                : Number(durationValue) || 1,
          };
        }),
      })),
    });
  };

  const startServiceAssistantHistoryItem = (
    prompt: string,
    listingBefore: ServiceAssistantListingSnapshot,
  ) => {
    const historyId = `service-assistant-history-${getId()}`;

    setAssistantHistory((currentHistory) =>
      [
        ...currentHistory,
        {
          id: historyId,
          prompt,
          status: "pending" as const,
          listingBefore,
        },
      ].slice(-20),
    );

    return historyId;
  };

  const completeServiceAssistantHistoryItem = (
    id: string,
    prompt: string,
    result: string,
    status: Exclude<ServiceAssistantHistoryItem["status"], "pending"> =
      "success",
    listingAfter?: ServiceAssistantListingSnapshot,
  ) => {
    setAssistantResult(result);
    setAssistantLastPrompt(prompt);
    setAssistantHistory((currentHistory) =>
      currentHistory.map((item) =>
        item.id === id ? { ...item, result, status, listingAfter } : item,
      ),
    );
  };

  const getServiceAssistantResultText = (value: unknown, fallback: string) => {
    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
      return value
        .map((item) =>
          typeof item === "string" ? item : JSON.stringify(item),
        )
        .filter(Boolean)
        .join("\n");
    }

    if (value && typeof value === "object") {
      const objectValue = value as {
        summary?: unknown;
        message?: unknown;
        suggestions?: unknown;
      };

      if (typeof objectValue.summary === "string") return objectValue.summary;
      if (typeof objectValue.message === "string") return objectValue.message;

      if (Array.isArray(objectValue.suggestions)) {
        return objectValue.suggestions
          .map((item) =>
            typeof item === "string" ? item : JSON.stringify(item),
          )
          .filter(Boolean)
          .join("\n");
      }
    }

    return fallback;
  };

  useEffect(() => {
    const latestHistoryItem = assistantHistory[assistantHistory.length - 1];
    if (!latestHistoryItem || latestHistoryItem.status === "pending") return;

    window.requestAnimationFrame(() => {
      const scrollContainer = assistantChatScrollRef.current;
      scrollContainer?.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [assistantHistory]);

  const openRecurringScheduleDialog = (phase: ServiceScopePhase) => {
    setActiveRecurringPhaseId(phase.id);
    setDraftRecurringSchedule(
      phase.recurrenceSchedule === "weekly" ||
        phase.recurrenceSchedule === "quarterly"
        ? phase.recurrenceSchedule
        : "monthly",
    );
    setDraftRecurringCount(phase.recurrenceCount ?? 1);
  };

  const closeRecurringScheduleDialog = () => {
    setActiveRecurringPhaseId(null);
  };

  const saveRecurringScheduleDialog = () => {
    if (!activeRecurringPhaseId) return;

    updatePhaseRecurrence(
      activeRecurringPhaseId,
      draftRecurringSchedule,
      draftRecurringCount,
    );
    closeRecurringScheduleDialog();
  };

  const isPhaseTypeUnavailable = (
    phaseType: (typeof serviceScopePhaseTypeOptions)[number]["value"],
  ) =>
    phaseType !== "recurring" &&
    phases.some((phase) => phase.phaseType === phaseType);

  const selectedPhaseTypeLabel =
    serviceScopePhaseTypeOptions.find((option) => option.value === newPhaseType)
      ?.label ?? "Select phase type";

  const canCreatePhase =
    Boolean(newPhaseName.trim()) &&
    Boolean(newPhaseType) &&
    (newPhaseType ? !isPhaseTypeUnavailable(newPhaseType) : false);

  const openAddPhaseDialog = () => {
    setNewPhaseName("");
    setNewPhaseType("");
    setAddPhaseDialogOpen(true);
  };

  const insertServicePhase = (
    currentPhases: ServiceScopePhase[],
    nextPhase: ServiceScopePhase,
  ) => {
    if (nextPhase.phaseType === "setup") {
      return [nextPhase, ...currentPhases];
    }

    if (nextPhase.phaseType === "ongoing") {
      return [...currentPhases, nextPhase];
    }

    const ongoingPhaseIndex = currentPhases.findIndex(
      (phase) => phase.phaseType === "ongoing",
    );

    if (ongoingPhaseIndex === -1) {
      return [...currentPhases, nextPhase];
    }

    return [
      ...currentPhases.slice(0, ongoingPhaseIndex),
      nextPhase,
      ...currentPhases.slice(ongoingPhaseIndex),
    ];
  };

  const addPhase = () => {
    if (!canCreatePhase || !newPhaseType) {
      return;
    }

    const selectedOption = serviceScopePhaseTypeOptions.find(
      (option) => option.value === newPhaseType,
    );
    const phaseTypeLabel = selectedOption?.label ?? "Recurring";
    const nextName = phaseTypeLabel;
    const trimmedPhaseName = newPhaseName.trim();
    const nextPhase =
      newPhaseType === "setup"
        ? {
            id: `service-phase-${getId()}`,
            name: nextName,
            customName: trimmedPhaseName,
            status: "2 weeks",
            statusKind: "one-time",
            phaseType: "setup" as const,
            note: "One-time starting work that begins on Day X and will not repeat again.",
            rows: [
              {
                task: "New Task",
                role: "Specialist",
                location: "USA",
                experience: "Junior",
                duration: "10 hours",
              },
            ],
          }
        : newPhaseType === "ongoing"
          ? {
              id: `service-phase-${getId()}`,
              name: nextName,
              customName: trimmedPhaseName,
              status: "Ongoing",
              statusKind: "ongoing",
              phaseType: "ongoing" as const,
              note: "Continuous work starting on Day X with no set end date.",
              rows: [
                {
                  task: "New Task",
                  role: "Specialist",
                  location: "USA",
                  experience: "Junior",
                  duration: "10 hours",
                },
              ],
            }
          : {
              id: `service-phase-${getId()}`,
              name: nextName,
              customName: trimmedPhaseName,
              status: "Recurs: Monthly, 1 time",
              statusKind: "recurring",
              phaseType: "recurring" as const,
              recurrenceSchedule: "monthly",
              recurrenceCount: 1,
              note: "Work that repeats in cycles. Starts on Day X and runs for the number of cycles you set.",
              rows: [
                {
                  task: "New Task",
                  role: "Specialist",
                  location: "USA",
                  experience: "Junior",
                  duration: "10 hours",
                },
              ],
            };

    setPhases((currentPhases) =>
      reorderServicePhases(insertServicePhase(currentPhases, nextPhase)),
    );
    setExpandedPhaseIds((currentIds) => [...currentIds, nextPhase.id]);
    setAddPhaseDialogOpen(false);
    setNewPhaseName("");
    setNewPhaseType("");
  };

  const addTask = (phaseId: string) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase) =>
        phase.id !== phaseId
          ? phase
          : {
              ...phase,
              rows: [
                ...phase.rows,
                {
                  task: `New Task ${phase.rows.length + 1}`,
                  role: "Specialist",
                  location: "USA",
                  experience: "Junior",
                  duration: "10 hours",
                },
              ],
            },
      ),
    );
    setExpandedPhaseIds((currentIds) =>
      currentIds.includes(phaseId) ? currentIds : [...currentIds, phaseId],
    );
  };

  const buildServiceAssistantScope = () => ({
    phases: phases.map((phase) => ({
      phaseName: `${phase.name} ${phase.customName ?? ""}`.trim(),
      phaseType: phase.phaseType,
      recurrenceSchedule: phase.recurrenceSchedule,
      recurrenceCount: phase.recurrenceCount,
      tasks: phase.rows.map((row) => {
        const [durationValue] = row.duration.split(/\s+/);

        return {
          taskName: row.task,
          roleTitle: row.role,
          location: row.location,
          experienceLevel: row.experience,
          workSchedule: row.workSchedule ?? "full_time",
          customHours: row.customHours,
          customFrequency: row.customFrequency,
          estimatedHours:
            row.workSchedule === "custom"
              ? Number(row.customHours) || 1
              : Number(durationValue) || 1,
        };
      }),
    })),
  });

  const applyGeneratedServiceScope = (generatedScope: any) => {
    const generatedPhases = Array.isArray(generatedScope?.phases)
      ? generatedScope.phases
      : [];

    if (!generatedPhases.length) return null;

    const nextPhases: ServiceScopePhase[] = generatedPhases.map(
      (phase: any, index: number) => {
        const phaseType = phase?.phaseType ?? "recurring";
        const phaseName = String(
          phase?.phaseName ??
            (phaseType === "setup"
              ? "Setup"
              : phaseType === "ongoing"
                ? "Ongoing"
                : `Recurring ${index + 1}`),
        );

        return {
          id: String(phase?.id ?? `service-assistant-phase-${index}-${getId()}`),
          name:
            phaseType === "setup"
              ? "Setup"
              : phaseType === "ongoing"
                ? "Ongoing"
                : "Recurring",
          customName:
            phaseType === "setup" || phaseType === "ongoing"
              ? phaseName.replace(/^(Setup|Ongoing)\s*/i, "").trim()
              : phaseName.replace(/^Recurring\s*\d*\s*/i, "").trim(),
          status:
            phaseType === "setup"
              ? "2 weeks"
              : phaseType === "ongoing"
                ? "Ongoing"
                : `Recurs: ${formatServiceRecurringStatus({
                    recurrenceSchedule: phase?.recurrenceSchedule ?? "monthly",
                    recurrenceCount: phase?.recurrenceCount ?? 3,
                  })}`,
          statusKind:
            phaseType === "setup"
              ? "one-time"
              : phaseType === "ongoing"
                ? "ongoing"
                : "recurring",
          phaseType,
          recurrenceSchedule:
            phaseType === "recurring"
              ? (phase?.recurrenceSchedule ?? "monthly")
              : undefined,
          recurrenceCount:
            phaseType === "recurring"
              ? Number(phase?.recurrenceCount) || 3
              : undefined,
          note:
            phaseType === "setup"
              ? "One-time starting work that begins on Day X and will not repeat again."
              : phaseType === "ongoing"
                ? "Continuous work starting on Day X with no set end date."
                : "Work that repeats in cycles. Starts on Day X and runs for the number of cycles you set.",
          rows: (Array.isArray(phase?.tasks) ? phase.tasks : []).map(
            (task: any) => ({
              task: String(task?.taskName ?? "New Task"),
              role: String(task?.roleTitle ?? "Specialist"),
              location: task?.location ?? "USA",
              experience: task?.experienceLevel ?? "Junior",
              duration: `${Number(task?.estimatedHours) || 1} hours`,
              workSchedule: task?.workSchedule ?? "full_time",
              customHours: task?.customHours ?? undefined,
              customFrequency: task?.customFrequency ?? undefined,
            }),
          ),
        };
      },
    );

    const orderedPhases = reorderServicePhases(nextPhases);

    setPhases(orderedPhases);
    setExpandedPhaseIds(orderedPhases.map((phase) => phase.id));
    return orderedPhases;
  };

  const runServiceAssistant = async (message: string) => {
    const prompt = message.trim();
    if (!prompt) return;

    const listingBefore = getServiceAssistantListingSnapshot();
    assistantUndoSnapshotRef.current = listingBefore;
    setAssistantLastPrompt(prompt);
    const historyId = startServiceAssistantHistoryItem(prompt, listingBefore);
    setAssistantMessage("");

    if (!jobListingId) {
      completeServiceAssistantHistoryItem(
        historyId,
        prompt,
        "Smart Assistant needs a saved job draft first. Please try again in a moment.",
        "error",
      );
      return;
    }

    setIsAssistantLoading(true);
    setIsBudgetLoading(true);
    try {
      const response = await JobListingAPI.SmartAssistant(jobListingId, {
        mode: "scope",
        command: prompt,
        currentScope: buildServiceAssistantScope(),
        workType: "service",
        currentTotalBudgetUsdCents: Math.round(budgetAmount * 100),
      });
      const data = response?.data ?? {};

      if (data.aiStatus === "AI_UNAVAILABLE") {
        completeServiceAssistantHistoryItem(
          historyId,
          prompt,
          getServiceAssistantResultText(
            data.message,
            "Smart Assistant is temporarily unavailable.",
          ),
          "error",
        );
        return;
      }

      // The smart-assistant/scope endpoint returns the server-persisted
      // phases (real DB ids, budget/timeline already recalculated) rather
      // than a raw LLM-echoed scope — applyGeneratedServiceScope already
      // tolerates a phase carrying a real `id` (falls back to a generated
      // one only when absent), so this is a drop-in, and now gets stable
      // ids from the server instead of a fresh placeholder on every edit.
      const nextPhases = applyGeneratedServiceScope({ phases: data.phases });

      if (nextPhases) {
        const totalBudgetUsdCents = toFiniteNumber(data.totalBudgetUsdCents);
        let nextBudgetAmount = budgetAmount;
        const nextIsBudgetStale = Boolean(data.isBudgetStale);

        if (typeof totalBudgetUsdCents === "number") {
          nextBudgetAmount = Math.round(totalBudgetUsdCents / 100);
          setBudgetAmount(nextBudgetAmount);
          setIsBudgetStale(nextIsBudgetStale);
        }

        completeServiceAssistantHistoryItem(
          historyId,
          prompt,
          getServiceAssistantResultText(
            data.summary,
            "Applied: Smart Assistant updated the service scope.",
          ),
          "success",
          getServiceAssistantListingSnapshot(
            nextPhases,
            nextBudgetAmount,
            typeof totalBudgetUsdCents === "number"
              ? nextIsBudgetStale
              : isBudgetStale,
          ),
        );
      } else {
        completeServiceAssistantHistoryItem(
          historyId,
          prompt,
          getServiceAssistantResultText(
            data.summary,
            "Smart Assistant did not return an updated scope.",
          ),
          "error",
        );
      }
    } catch (error: any) {
      completeServiceAssistantHistoryItem(
        historyId,
        prompt,
        error?.response?.data?.message ||
          error?.message ||
          "Smart Assistant is temporarily unavailable.",
        "error",
      );
    } finally {
      setIsAssistantLoading(false);
      setIsBudgetLoading(false);
    }
  };

  const undoServiceAssistant = async () => {
    if (!assistantUndoSnapshotRef.current) return;

    const snapshot = assistantUndoSnapshotRef.current;
    setIsAssistantLoading(true);

    try {
      restoreServiceAssistantListingSnapshot(snapshot);
      await persistServiceAssistantListingSnapshot(snapshot);
      assistantUndoSnapshotRef.current = null;
      setAssistantResult("");
      setAssistantLastPrompt("");
    } catch (error: any) {
      setAssistantResult(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save the restored scope.",
      );
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const restoreServiceAssistantHistoryItem = async (
    item: ServiceAssistantHistoryItem,
  ) => {
    if (!item.listingAfter) return;

    setIsAssistantLoading(true);

    try {
      restoreServiceAssistantListingSnapshot(item.listingAfter);
      await persistServiceAssistantListingSnapshot(item.listingAfter);
    } catch (error: any) {
      setAssistantResult(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save the restored scope.",
      );
    } finally {
      setIsAssistantLoading(false);
    }
  };

  const removePhase = (phaseId: string) => {
    setPhases((currentPhases) =>
      currentPhases.length <= 1
        ? currentPhases
        : currentPhases.filter((phase) => phase.id !== phaseId),
    );
    setExpandedPhaseIds((currentIds) =>
      currentIds.filter((id) => id !== phaseId),
    );
  };

  const togglePhase = (phaseId: string) => {
    setExpandedPhaseIds((currentIds) =>
      currentIds.includes(phaseId)
        ? currentIds.filter((id) => id !== phaseId)
        : [...currentIds, phaseId],
    );
  };

  const toggleServicePhaseNote = (phaseId: string) => {
    setActiveServicePhaseNoteId((currentId) =>
      currentId === phaseId ? null : phaseId,
    );
  };

  const handleServicePhaseDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setPhases((currentPhases) =>
      reorderServiceRecurringPhases(currentPhases, active.id, over.id),
    );
  };

  useIsomorphicLayoutEffect(() => {
    toggleValidation(true);
  }, []);

  useEffect(() => {
    setProgress?.(22.5);
  }, [setProgress]);

  useEffect(() => {
    setProjectScopeState(
      phases.map((phase) => ({
        phaseName: `${phase.name} ${phase.customName}`.trim(),
        phaseType: phase.phaseType,
        recurrenceSchedule: phase.recurrenceSchedule,
        recurrenceCount: phase.recurrenceCount,
        rows: phase.rows.map((row) => {
          const [durationValue, durationType = "hours"] =
            row.duration.split(/\s+/);

          return {
            id: String(getId()),
            task: row.task,
            role: row.role,
            location: row.location,
            experience: row.experience as ExperienceLevel,
            workSchedule: row.workSchedule ?? "full_time",
            customHours: row.customHours,
            customFrequency: row.customFrequency,
            duration: {
              value: Number(durationValue) || 1,
              type: durationType as (typeof DURATION_TYPE)[number],
            },
          };
        }),
      })),
    );
  }, [phases, setProjectScopeState]);

  useEffect(() => {
    if (!jobListingId || phases.length === 0) return;

    const payload = buildServiceAssistantScope();
    const signature = JSON.stringify(payload);

    if (skipNextServiceScopeSaveRef.current) {
      skipNextServiceScopeSaveRef.current = false;
      lastSavedServiceScopeSignatureRef.current = signature;
      return;
    }

    if (signature === lastSavedServiceScopeSignatureRef.current) return;

    setIsBudgetLoading(true);
    const timeout = window.setTimeout(() => {
      const saveScope = async () => {
        try {
          const response = await JobListingAPI.ApplyGeneratedScope(jobListingId, {
            hasScope: true,
            phases: payload.phases,
          });
          const totalBudgetUsdCents = toFiniteNumber(
            response?.data?.totalBudgetUsdCents,
          );
          if (typeof totalBudgetUsdCents === "number") {
            setBudgetAmount(Math.round(totalBudgetUsdCents / 100));
            setIsBudgetStale(Boolean(response?.data?.isBudgetStale));
          }
          lastSavedServiceScopeSignatureRef.current = signature;
        } catch (error) {
          console.error("Failed to save service job listing scope", error);
        } finally {
          setIsBudgetLoading(false);
        }
      };

      void saveScope();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [phases, jobListingId]);

  return (
    <>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="bg-gray-50 px-5 py-10 md:px-10 min-[1024px]:px-[100px] min-[1024px]:pb-5 min-[1024px]:pt-[50px]">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8 min-[1180px]:flex-row min-[1180px]:items-start">
            <div className="min-w-0 flex-auto min-[1180px]:w-[886px]">
              <div className="flex h-20 w-full shrink-0 flex-col items-center justify-center gap-4 self-stretch p-0">
                <h1 className="h-11 shrink-0 self-stretch text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400">
                  Edit your scope
                </h1>
                <p className="h-5 shrink-0 self-stretch text-sm leading-5 font-normal text-dark-blue-400">
                  Modify the table as needed manually or with the help of Smart
                  Assistant, your project plan will adjust accordingly.
                </p>
              </div>

              <div className="mt-8 grid overflow-hidden rounded-[5px] border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] md:grid-cols-2">
                <div className="flex h-[106px] flex-1 items-center gap-6 border-b border-gray-200 p-6 md:border-b-0 md:border-r">
                  <div className="flex h-[58px] flex-1 flex-col items-start gap-2 p-0">
                    <div className="flex h-5 shrink-0 items-center gap-2 self-stretch p-0 text-sm leading-5 font-medium text-gray-400">
                      <span className="h-5 w-[121px] shrink-0">
                        Budget Calculator
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="link"
                              type="button"
                              aria-label="Show budget calculator details"
                              className="size-4 p-0 text-inherit"
                            >
                              <Info className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            align="center"
                            sideOffset={12}
                            visual="white"
                            className="flex h-[226px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                          >
                            <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                            <div className="flex h-[186px] w-[182.55px] shrink-0 items-center">
                              <div>
                                <p>Your budget updates automatically based on:</p>
                                <ul className="my-4 list-disc pl-5">
                                  <li>Tasks</li>
                                  <li>Roles</li>
                                  <li>Location</li>
                                  <li>Experience level</li>
                                  <li>Task duration</li>
                                </ul>
                                <p>
                                  Any change here updates the budget shown in the
                                  sidebar.
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {isBudgetLoading ? (
                      <span className="relative h-10 w-full overflow-hidden rounded bg-gray-100">
                        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                      </span>
                    ) : (
                      <div className="flex h-[30px] shrink-0 items-baseline gap-1 self-stretch p-0 text-dark-blue-400">
                        <span className="h-[29px] shrink-0 text-center text-2xl font-bold leading-[29px] capitalize">
                          ${budgetAmount.toLocaleString()}
                        </span>
                        <span className="h-[17px] w-[23px] shrink-0 text-sm font-medium leading-[17px]">
                          per
                        </span>
                        <Select
                          value={budgetFrequency}
                          onValueChange={setBudgetFrequency}
                        >
                          <SelectTrigger
                            indicator={false}
                            className="h-[25px] w-[66px] shrink-0 gap-1 rounded border-gray-300 px-[7px] py-[5px] text-sm font-medium leading-[17px] text-dark-blue-400 shadow-xs"
                          >
                            <SelectValue />
                            <ChevronDown className="size-3 shrink-0 text-gray-400" />
                          </SelectTrigger>
                          <SelectContent className="w-32">
                            {["week", "month"].map((frequency) => (
                              <SelectItem key={frequency} value={frequency}>
                                {frequency}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isBudgetStale ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  aria-label="Budget rates unavailable"
                                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-warning-600"
                                >
                                  <AlertTriangle className="size-4" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent visual="white" size="md">
                                Some pricing rates are unavailable. The budget
                                may be incomplete.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center gap-2 rounded-[6px] bg-primary-50">
                    <img
                      src="/job-listing/money-bag.png"
                      alt=""
                      aria-hidden="true"
                      className="size-8"
                    />
                  </div>
                </div>
                <div className="flex h-[105px] flex-1 items-start gap-6 p-6">
                  <div className="flex h-[57px] flex-1 flex-col items-start gap-2 p-0">
                    <div className="flex h-5 shrink-0 items-center gap-2 self-stretch p-0 text-sm leading-5 font-medium text-gray-400">
                      <span className="h-5 w-[53px] shrink-0">
                        Duration
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="link"
                              type="button"
                              aria-label="Show timeline calculator details"
                              className="size-4 p-0 text-inherit"
                            >
                              <Info className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="right"
                            align="center"
                            sideOffset={12}
                            visual="white"
                            className="flex h-[190px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                          >
                            <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                            <div className="flex h-[150px] w-[182.55px] shrink-0 items-center">
                              <div>
                                <p>The project timeline adjusts based on:</p>
                                <ul className="my-4 list-disc pl-5">
                                  <li>Task durations</li>
                                  <li>Assigned work schedules</li>
                                  <li>Number of team members</li>
                                </ul>
                                <p>
                                  Any change here will update the project's total
                                  length.
                                </p>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex h-[29px] shrink-0 items-baseline gap-1 self-stretch p-0 text-dark-blue-400">
                      <span className="h-[29px] shrink-0 text-center text-2xl font-bold leading-[29px] capitalize">
                        Ongoing
                      </span>
                    </div>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center gap-2 rounded-[6px] bg-primary-50">
                    <img
                      src="/job-listing/timeline.png"
                      alt=""
                      aria-hidden="true"
                      className="size-14 rounded-[6px]"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="mx-auto flex h-9 w-[254px] shrink-0 items-center p-0 shadow-xs md:mx-0">
                  <Button
                    className="h-9 w-[123px] rounded-l-[5px] rounded-r-none border-y border-l border-r-0 border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 capitalize text-gray-800 shadow-none"
                    variant="outlined"
                    visual="gray"
                    type="button"
                    onClick={() =>
                      setExpandedPhaseIds(phases.map((phase) => phase.id))
                    }
                  >
                    <ChevronsDown className="size-[15px] shrink-0 text-gray-500" />
                    <span className="h-5 w-[72px] shrink-0 text-center">
                      Expand All
                    </span>
                  </Button>
                  <Button
                    className="h-9 w-[131px] rounded-l-none rounded-r-[5px] border border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-none"
                    variant="outlined"
                    visual="gray"
                    type="button"
                    onClick={() => setExpandedPhaseIds([])}
                  >
                    <ChevronsUp className="size-[15px] shrink-0 text-gray-500" />
                    <span className="h-5 w-20 shrink-0 text-center">
                      Collapse All
                    </span>
                  </Button>
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <SearchField className="h-9 w-full shrink-0 md:w-[223px]">
                    <SearchFieldButton className="left-2.5 size-4 text-gray-400">
                      <SearchMd className="size-4" />
                    </SearchFieldButton>
                    <SearchFieldInput
                      className="h-9 w-[223px] rounded-[5px] py-2.5 pl-[34px] pr-3 text-sm leading-5 text-gray-500 placeholder:text-gray-500 placeholder:opacity-50"
                      placeholder="Find a phase or task"
                      value={searchValue}
                      onChange={(event) => setSearchValue(event.target.value)}
                    />
                  </SearchField>
                  <Button
                    className="h-9 w-[124px] shrink-0 rounded-[5px] border border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-none"
                    variant="outlined"
                    visual="gray"
                    type="button"
                    onClick={openAddPhaseDialog}
                  >
                    <Plus className="size-[15px] shrink-0 text-gray-500" />
                    <span className="h-5 w-[73px] shrink-0 text-center">
                      Add Phase
                    </span>
                  </Button>
                </div>
              </div>

              {isBudgetLoading ? (
                <div
                  className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]"
                  aria-busy="true"
                  aria-label="Smart Assistant is updating the scope"
                >
                  <div className="flex h-14 items-center justify-center gap-4 border-b border-gray-200 p-3">
                    <div className="flex h-8 min-w-0 flex-1 flex-col items-start justify-end gap-1 self-stretch p-0">
                      <div className="flex h-8 min-w-0 items-center gap-2 p-0">
                        <Button
                          variant="link"
                          type="button"
                          aria-label="Scope update in progress"
                          className="size-8 rounded-[5px] p-1.5 text-inherit"
                          disabled
                        >
                          <ChevronDown className="size-5 text-gray-500" />
                        </Button>
                        <span className="relative h-7 w-[179px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-stretch">
                      <span className="relative hidden h-7 w-[120px] shrink-0 overflow-hidden rounded bg-gray-100 md:inline-flex">
                        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                      </span>
                      <IconButton
                        variant="ghost"
                        visual="gray"
                        aria-label="Scope actions loading"
                        className="h-[23px] w-[27px] rounded-[5px] px-1.5 py-1"
                        disabled
                      >
                        <MoreHorizontal className="size-[15px] text-gray-500" />
                      </IconButton>
                      <IconButton
                        variant="outlined"
                        visual="gray"
                        aria-label="Add task disabled while Smart Assistant updates"
                        className="size-8 rounded-[5px] border-gray-300 bg-white p-2 shadow-[0px_1px_4px_rgba(0,0,0,0.03)]"
                        disabled
                      >
                        <Plus className="size-3 text-gray-500" />
                      </IconButton>
                    </div>
                  </div>

                  <div className="grid h-11 w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] border-b border-gray-200 bg-gray-50 text-xs font-medium leading-[18px] text-gray-600">
                    {[
                      "Task Name",
                      "Role",
                      "Location",
                      "Experience",
                      "Duration",
                    ].map((header) => (
                      <span
                        key={header}
                        className="flex h-11 items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-6 py-3"
                      >
                        <span className="h-[18px] shrink-0">{header}</span>
                      </span>
                    ))}
                  </div>

                  {Array.from({ length: 4 }).map((_, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="grid h-[72px] w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] items-center border-b border-gray-200 last:border-b-0"
                    >
                      <div className="flex h-[72px] w-[240px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                        <span
                          className={cn(
                            "relative h-5 shrink-0 overflow-hidden rounded bg-gray-100",
                            rowIndex === 0 && "w-[120px]",
                            rowIndex === 1 && "w-[180px]",
                            rowIndex === 2 && "w-40",
                            rowIndex === 3 && "w-[86px]",
                          )}
                        >
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[240px] shrink-0 flex-col items-start gap-1 self-stretch px-6 py-4">
                        <span className="relative h-4 w-[180px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                        <span className="relative h-4 w-[104px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-3 py-4">
                        <span className="relative h-7 w-[112px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[135.33px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                        <span className="relative h-7 w-[88px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                      <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-6 py-4">
                        <span className="relative h-5 w-[88px] shrink-0 overflow-hidden rounded bg-gray-100">
                          <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <DndContext
                  collisionDetection={closestCenter}
                  modifiers={[restrictToVerticalAxis]}
                  onDragEnd={handleServicePhaseDragEnd}
                  sensors={servicePhaseDndSensors}
                >
                  <SortableContext
                    items={visiblePhases
                      .filter((phase) => phase.phaseType === "recurring")
                      .map((phase) => phase.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="mt-6 space-y-3">
                      {visiblePhases.map((phase) => {
                  const isExpanded = expandedPhaseIds.includes(phase.id);
                  const phaseIndex = phases.findIndex(
                    (candidate) => candidate.id === phase.id,
                  );
                  const shouldShowPhaseNote =
                    phaseIndex > -1 &&
                    phases.findIndex(
                      (candidate) => candidate.phaseType === phase.phaseType,
                    ) === phaseIndex;

                  return (
                    <ServicePhaseSortableCard key={phase.id} phase={phase}>
                      <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
                      <div className="flex h-14 items-center justify-center gap-4 border-b border-gray-200 p-3">
                        <div className="flex h-8 min-w-0 flex-1 flex-col items-start justify-end gap-1 self-stretch p-0">
                          <div className="flex h-8 min-w-0 items-center gap-2 p-0">
                          <Button
                            variant="link"
                            type="button"
                            aria-label={
                              isExpanded
                                ? `Collapse ${phase.name}`
                                : `Expand ${phase.name}`
                            }
                            className="size-8 rounded-[5px] p-1.5 text-inherit"
                            onClick={() => togglePhase(phase.id)}
                          >
                            <ChevronDown
                              className={cn(
                                "size-5 text-gray-500",
                                !isExpanded && "rotate-180",
                              )}
                            />
                          </Button>
                          <div className="flex h-7 min-w-0 items-center gap-1.5 p-0">
                            <span className="inline-flex h-7 shrink-0 items-center whitespace-nowrap text-lg font-semibold leading-7 text-gray-black">
                              {phase.name}
                            </span>
                            {phase.customName ? (
                              <span className="inline-flex h-5 min-w-0 items-center whitespace-nowrap text-lg font-light leading-5 text-gray-600">
                                {phase.customName}
                              </span>
                            ) : null}
                          </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-stretch">
                          {phase.statusKind === "recurring" ? (
                            <div className="hidden h-[25px] items-center justify-center gap-2 text-[13px] font-semibold leading-4 text-[#122A4B] md:inline-flex">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span
                                      className="inline-flex h-[25px] shrink-0 cursor-pointer items-center gap-2"
                                      role="button"
                                      tabIndex={0}
                                      onClick={() =>
                                        openRecurringScheduleDialog(phase)
                                      }
                                      onKeyDown={(event) => {
                                        if (
                                          event.key === "Enter" ||
                                          event.key === " "
                                        ) {
                                          event.preventDefault();
                                          openRecurringScheduleDialog(phase);
                                        }
                                      }}
                                    >
                                      <span className="inline-flex size-4 shrink-0 items-center justify-center text-success-600">
                                        <svg
                                          aria-hidden="true"
                                          viewBox="0 -960 960 960"
                                          className="size-4 shrink-0"
                                          fill="currentColor"
                                        >
                                          <path d="m360-120-57-56 64-64h-7q-117 0-198.5-81.5T80-520q0-117 81.5-198.5T360-800h240q117 0 198.5 81.5T880-520q0 117-81.5 198.5T600-240v-80q83 0 141.5-58.5T800-520q0-83-58.5-141.5T600-720H360q-83 0-141.5 58.5T160-520q0 83 58.5 142.5T360-312h16l-72-72 56-56 160 160-160 160Z" />
                                        </svg>
                                      </span>
                                      <span className="flex h-4 w-12 shrink-0 items-center">
                                        Recurs:
                                      </span>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="left"
                                    align="center"
                                    sideOffset={12}
                                    visual="white"
                                    className="flex h-[94px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                  >
                                    <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                    Work that repeats in cycles. Starts on Day X
                                    and runs for the number of cycles you set.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Button
                                type="button"
                                variant="ghost"
                                visual="gray"
                                className="h-[25px] min-w-[126px] rounded border border-dashed border-gray-300 bg-gray-100 px-[7px] py-[5px] text-sm font-medium leading-[17px] text-dark-blue-400 shadow-xs hover:bg-gray-100 focus:bg-gray-100"
                                onClick={() =>
                                  openRecurringScheduleDialog(phase)
                                }
                              >
                                <span className="h-[17px] shrink-0 whitespace-nowrap text-left text-dark-blue-400">
                                  {formatServiceRecurringStatus(phase)}
                                </span>
                              </Button>
                            </div>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="link"
                                    visual="gray"
                                    type="button"
                                    className="hidden cursor-default gap-x-2 text-[13px] font-semibold leading-4 text-[#122A4B] hover:no-underline md:inline-flex"
                                  >
                                    {phase.statusKind === "ongoing" ? (
                                      <svg
                                        aria-hidden="true"
                                        viewBox="0 -960 960 960"
                                        className="size-4 shrink-0 text-success-600"
                                        fill="currentColor"
                                      >
                                        <path d="M220-260q-92 0-156-64T0-480q0-92 64-156t156-64q37 0 71 11.5t61 32.5l128 104 128-104q27-21 61-32.5t71-11.5q92 0 156 64t64 156q0 92-64 156t-156 64q-37 0-71-11.5T608-304L480-408 352-304q-27 21-61 32.5T220-260Zm0-80q20 0 38.5-6t33.5-18l124-100-124-100q-15-12-33.5-18t-38.5-6q-59 0-99.5 40.5T80-480q0 59 40.5 99.5T220-340Zm520 0q59 0 99.5-40.5T880-480q0-59-40.5-99.5T740-620q-20 0-38.5 6T668-596L544-496l124 100q15 12 33.5 18t38.5 6Z" />
                                      </svg>
                                    ) : (
                                      <svg
                                        aria-hidden="true"
                                        viewBox="0 0 16 16"
                                        className="size-4 shrink-0 text-success-600"
                                        fill="currentColor"
                                      >
                                        <path d="M4.66667 1.33333C5.03333 1.33333 5.33333 1.63333 5.33333 2V2.66667H10.6667V2C10.6667 1.63333 10.9667 1.33333 11.3333 1.33333C11.7 1.33333 12 1.63333 12 2V2.66667H12.6667C13.4 2.66667 14 3.26667 14 4V12.6667C14 13.4 13.4 14 12.6667 14H3.33333C2.6 14 2 13.4 2 12.6667V4C2 3.26667 2.6 2.66667 3.33333 2.66667H4V2C4 1.63333 4.3 1.33333 4.66667 1.33333ZM3.33333 6V12.6667H12.6667V6H3.33333ZM3.33333 4V4.66667H12.6667V4H3.33333Z" />
                                      </svg>
                                    )}
                                    {phase.status}
                                  </Button>
                                </TooltipTrigger>
                                {phase.statusKind === "ongoing" ? (
                                  <TooltipContent
                                    side="left"
                                    align="center"
                                    sideOffset={12}
                                    visual="white"
                                    className="flex h-[76px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                  >
                                    <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                    Continuous work starting on Day X with no
                                    set end date.
                                  </TooltipContent>
                                ) : (
                                  <TooltipContent
                                    side="left"
                                    align="center"
                                    sideOffset={12}
                                    visual="white"
                                    className="flex h-[94px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                  >
                                    <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                    One-time starting work that begins on Day X
                                    and will not repeat again.
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton
                                variant="ghost"
                                visual="gray"
                                aria-label={`Open actions for ${phase.name}`}
                                className="h-[23px] w-[27px] rounded-[5px] px-1.5 py-1"
                              >
                                <MoreHorizontal className="size-[15px] text-gray-500" />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onSelect={() => togglePhase(phase.id)}
                              >
                                {isExpanded ? "Collapse Phase" : "Expand Phase"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => addTask(phase.id)}
                              >
                                Add Task
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                visual="destructive"
                                onSelect={() => removePhase(phase.id)}
                              >
                                Remove Phase
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <IconButton
                            variant="outlined"
                            visual="gray"
                            type="button"
                            aria-label={`Add task to ${phase.name}`}
                            className="size-8 rounded-[5px] border-gray-300 bg-white p-2 shadow-[0px_1px_4px_rgba(0,0,0,0.03)]"
                            onClick={() => addTask(phase.id)}
                          >
                            <Plus className="size-3 text-gray-500" />
                          </IconButton>
                        </div>
                      </div>

                      {isExpanded ? (
                        <>
                          <div className="grid h-11 w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] border-b border-gray-200 bg-gray-50 text-xs font-medium leading-[18px] text-gray-600">
                            {[
                              "Task Name",
                              "Role",
                              "Location",
                              "Experience",
                              "Duration",
                            ].map((header) => (
                              <span
                                key={header}
                                className="flex h-11 items-center gap-3 self-stretch border-b border-gray-200 bg-gray-50 px-6 py-3"
                              >
                                {header === "Role" ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="h-[18px] shrink-0 cursor-default">
                                          {header}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        align="center"
                                        sideOffset={12}
                                        visual="white"
                                        className="flex w-[222px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                      >
                                        <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                        Defines the type of specialist needed for
                                        this task. Used to match talent and
                                        generate the job description.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : header === "Location" ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="h-[18px] shrink-0 cursor-default">
                                          {header}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        align="center"
                                        sideOffset={12}
                                        visual="white"
                                        className="flex h-[94px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                      >
                                        <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                        Influences team coordination and affects
                                        how the budget is estimated.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : header === "Experience" ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="h-[18px] shrink-0 cursor-default">
                                          {header}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="left"
                                        align="center"
                                        sideOffset={12}
                                        visual="white"
                                        className="flex h-28 w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                      >
                                        <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                        Helps determine the level of skill needed.
                                        Impacts estimated delivery time and team
                                        composition.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : header === "Duration" ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="h-[18px] shrink-0 cursor-default">
                                          {header}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="left"
                                        align="center"
                                        sideOffset={12}
                                        visual="white"
                                        className="flex h-[94px] w-[222.55px] max-w-none items-center rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                      >
                                        <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                        Estimated hours to complete the task.
                                        Directly affects the project&apos;s
                                        timeline and budget.
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (
                                  <span className="h-[18px] shrink-0">
                                    {header}
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                          {phase.rows.map((row, rowIndex) => (
                            <div
                              key={`${phase.id}-${rowIndex}`}
                              className="relative grid h-[72px] w-full min-w-[886px] grid-cols-[240px_240px_135.33px_135.33px_1fr] items-center border-b border-gray-200 last:border-b-0"
                            >
                              <div className="flex h-[72px] w-[240px] min-w-0 shrink-0 items-start gap-3 self-stretch px-6 py-4">
                                <Input
                                  className="h-5 min-w-0 flex-1 truncate rounded-none border-0 bg-transparent p-0 text-sm font-semibold leading-5 text-gray-black shadow-none focus:border-transparent focus:ring-0"
                                  value={row.task}
                                  onChange={(event) =>
                                    updateRowAtIndex(phase.id, rowIndex, {
                                      task: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="flex h-[72px] w-[240px] shrink-0 flex-col items-start gap-1 self-stretch px-6 py-4">
                                <Button
                                  variant="link"
                                  type="button"
                                  className="h-[17px] justify-start p-0 text-left text-sm font-normal leading-[17px] text-gray-600 hover:no-underline"
                                  onClick={() =>
                                    openServiceRoleEditor(phase.id, row)
                                  }
                                >
                                  {row.role}
                                </Button>
                                <p className="text-xs leading-[18px] text-gray-400">
                                  {formatServiceRowSchedule(row)}
                                </p>
                              </div>
                              <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-3 py-4">
                              <CountriesCombobox
                                value={row.location}
                                onValueChange={(location) =>
                                  updateRow(phase.id, row.task, { location })
                                }
                                placeholder="Location"
                                triggerClassName="h-7 rounded-[5px] border-dashed border-gray-300 bg-gray-50 px-2 text-xs leading-[18px] text-gray-700"
                              />
                              </div>
                              <div className="flex h-[72px] w-[135.33px] shrink-0 items-start gap-3 self-stretch px-6 py-4">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outlined"
                                    visual="gray"
                                    type="button"
                                    className="h-7 w-max gap-x-1 border-dashed border-gray-300 bg-gray-50 px-2 text-xs font-normal leading-[18px] text-gray-700 shadow-none"
                                    rightIcon={<ChevronDown className="size-3" />}
                                  >
                                    {formatExperienceDisplay(row.experience)}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  {EXPERIENCE_LEVELS.map((experience) => (
                                    <DropdownMenuItem
                                      key={experience}
                                      onSelect={() =>
                                        updateRow(phase.id, row.task, {
                                          experience,
                                        })
                                      }
                                    >
                                      {experience}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              </div>
                              <div className="flex h-[72px] w-[135.33px] shrink-0 items-start self-stretch px-6 py-4">
                                <span className="h-5 shrink-0 whitespace-nowrap text-sm leading-5 text-gray-500">
                                  {row.duration}
                                </span>
                              </div>

                              {activeServiceRoleKey ===
                              `${phase.id}-${row.task}` ? (
                                <Dialog
                                  open={
                                    activeServiceRoleKey ===
                                    `${phase.id}-${row.task}`
                                  }
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setActiveServiceRoleKey(null);
                                    }
                                  }}
                                >
                                  <DialogContent
                                    variant="unanimated"
                                    accessibilityTitle="Edit role"
                                    dialogOverlay={
                                      <DialogOverlay className="bg-[#101828]/20" />
                                    }
                                    className="left-1/2 top-1/2 flex w-[371px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col items-start gap-8 rounded-xl bg-white p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
                                  >
                                    <div className="flex w-[323px] flex-col items-start gap-3">
                                      <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
                                        <Label className="h-5 whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                                          Role
                                        </Label>
                                        <Combobox
                                          className="w-[323px]"
                                          value={draftServiceRole}
                                          onChange={(value) => {
                                            setDraftServiceRole(
                                              String(value ?? ""),
                                            );
                                            setServiceRoleAutocompleteOpen(false);
                                          }}
                                          nullable
                                        >
                                          <ComboboxTrigger>
                                            <ComboboxInput
                                              className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-black shadow-xs focus:ring-0 ui-open:pl-[14px]"
                                              value={draftServiceRole}
                                              onChange={(event) =>
                                                setDraftServiceRole(
                                                  event.target.value,
                                                )
                                              }
                                              onClick={() =>
                                                setServiceRoleAutocompleteOpen(
                                                  serviceRoleAutocompleteOptions.length >
                                                    0,
                                                )
                                              }
                                              onFocus={() =>
                                                setServiceRoleAutocompleteOpen(
                                                  serviceRoleAutocompleteOptions.length >
                                                    0,
                                                )
                                              }
                                              onBlur={() =>
                                                setTimeout(
                                                  () =>
                                                    setServiceRoleAutocompleteOpen(
                                                      false,
                                                    ),
                                                  150,
                                                )
                                              }
                                            />
                                          </ComboboxTrigger>

                                          {isServiceRoleAutocompleteOpen ? (
                                            <ComboboxOptions className="h-[120px] w-[323px] overflow-hidden">
                                              <ScrollArea viewportClassName="h-[120px]">
                                                {serviceRoleAutocompleteOptions.map(
                                                  (option) => (
                                                    <ComboboxOption
                                                      key={option}
                                                      value={option}
                                                    >
                                                      {option}
                                                    </ComboboxOption>
                                                  ),
                                                )}
                                              </ScrollArea>
                                            </ComboboxOptions>
                                          ) : null}
                                        </Combobox>
                                      </div>
                                      <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
                                        <Label className="h-5 whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                                          Work Schedule
                                        </Label>
                                        <Select
                                          value={draftServiceSchedule}
                                          onValueChange={(value) =>
                                            setDraftServiceSchedule(
                                              value as JobListingWorkSchedule,
                                            )
                                          }
                                        >
                                          <SelectTrigger className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-black shadow-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent className="w-[323px]">
                                            {[
                                              {
                                                value: "full_time" as const,
                                                label: "Full-time",
                                              },
                                              {
                                                value: "part_time" as const,
                                                label: "Part-time",
                                              },
                                              {
                                                value: "custom" as const,
                                                label: "Custom",
                                              },
                                            ].map((schedule) => (
                                              <SelectItem
                                                key={schedule.value}
                                                value={schedule.value}
                                              >
                                                {schedule.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {draftServiceSchedule === "custom" ? (
                                        <div className="flex h-[70px] w-[323px] shrink-0 items-start gap-3">
                                          <div className="flex h-[70px] w-[155.5px] flex-col items-start gap-1.5">
                                            <Label className="h-5 w-[109px] whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                                              Estimated hours
                                            </Label>
                                            <div className="flex h-11 w-[155.5px] items-start bg-white p-0 shadow-xs">
                                              <input
                                                className="h-11 w-[84.5px] flex-1 rounded-l-[5px] rounded-r-none border border-gray-300 bg-white px-3.5 py-2.5 text-base font-normal leading-6 text-gray-black shadow-none outline-none focus:border-gray-300 focus:outline-none"
                                                value={draftServiceCustomHours}
                                                onChange={(event) =>
                                                  setDraftServiceCustomHours(
                                                    event.target.value,
                                                  )
                                                }
                                              />
                                              <span className="-ml-px inline-flex h-11 w-[71px] shrink-0 items-center rounded-l-none rounded-r-[5px] border border-gray-300 bg-white px-3.5 py-2.5 text-base font-normal leading-6 text-gray-500">
                                                <span className="h-6 w-[43px] shrink-0">
                                                  hours
                                                </span>
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex h-[70px] w-[155.5px] flex-col items-start gap-1.5 pt-[26px]">
                                            <Select
                                              value={draftServiceCustomFrequency}
                                              onValueChange={
                                                setDraftServiceCustomFrequency
                                              }
                                            >
                                              <SelectTrigger className="h-11 w-[155.5px] rounded-[5px] border-gray-300 bg-white py-2.5 pl-3.5 pr-3 text-base font-normal leading-6 text-gray-black shadow-xs">
                                                <SelectValue />
                                              </SelectTrigger>
                                              <SelectContent className="h-[118px] w-[156px] rounded-[5px] border border-gray-100 bg-white p-0 shadow-[0px_4px_19px_rgba(0,0,0,0.04)] [&>div]:h-[118px] [&>div]:overflow-y-scroll [&>div]:py-0 [&>div]:scrollbar-thin [&>div]:scrollbar-thumb-gray-200 [&>div]:scrollbar-track-transparent [&>div]:[scrollbar-gutter:stable]">
                                                {[
                                                  "per_day",
                                                  "per_week",
                                                  "per_month",
                                                  "per_quarter",
                                                  "per_year",
                                                ].map((frequency) => (
                                                  <SelectItem
                                                    key={frequency}
                                                    value={frequency}
                                                    className="h-[34px] w-[156px] rounded-none px-3 py-2.5 text-[13px] font-medium leading-[13px] text-gray-500 focus:bg-gray-50 focus:text-gray-black data-[state=checked]:bg-gray-50 data-[state=checked]:text-gray-black [&>span:first-child]:hidden"
                                                  >
                                                    {frequency.replace(
                                                      "_",
                                                      " ",
                                                    )}
                                                  </SelectItem>
                                                ))}
                                              </SelectContent>
                                            </Select>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                    <div className="flex h-9 w-[323px] shrink-0 items-start gap-3">
                                      <Button
                                        type="button"
                                        variant="outlined"
                                        visual="gray"
                                        className="h-9 w-[155.5px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-xs"
                                        onClick={() =>
                                          setActiveServiceRoleKey(null)
                                        }
                                      >
                                        <span className="h-5 w-12 text-center">
                                          Cancel
                                        </span>
                                      </Button>
                                      <Button
                                        type="button"
                                        className="h-9 w-[155.5px] rounded-[5px] bg-primary-500 px-[14px] py-2 text-sm font-semibold leading-5 text-white shadow-xs"
                                        onClick={() =>
                                          saveServiceRoleEditor(
                                            phase.id,
                                            row.task,
                                          )
                                        }
                                      >
                                        <span className="h-5 w-9 text-center">
                                          Done
                                        </span>
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              ) : null}
                            </div>
                          ))}
                        </>
                      ) : null}

                      {phase.note &&
                      shouldShowPhaseNote &&
                      phase.phaseType !== "setup" &&
                      activeServicePhaseNoteId === phase.id ? (
                        <div
                          className={cn(
                            "pointer-events-none absolute hidden w-[230px] rounded-[5px] bg-primary-50 p-4 text-sm leading-5 text-dark-blue-400 shadow-xs min-[1180px]:block",
                            phase.phaseType === "recurring"
                              ? "left-[38%] top-[-22px]"
                              : "left-[52%] top-[-16px]",
                          )}
                        >
                          {phase.note}
                          <span className="absolute right-[-12px] top-1/2 size-6 -translate-y-1/2 rotate-45 bg-primary-50" />
                        </div>
                      ) : null}
                      </div>
                    </ServicePhaseSortableCard>
                  );
                    })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="flex h-[calc(100vh-248px)] min-h-0 w-full shrink-0 flex-col self-stretch rounded-lg border border-gray-200 bg-white shadow-[0px_2px_5px_rgba(0,0,0,0.04)] min-[1180px]:sticky min-[1180px]:top-[50px] min-[1180px]:w-[322px] min-[1180px]:self-start">
              <div className="flex h-12 shrink-0 self-stretch items-start justify-between gap-2 border-b border-gray-200 px-5 py-3">
                <h2 className="h-6 flex-1 text-base leading-6 font-semibold text-dark-blue-400">
                  Smart Assistant
                </h2>
                <img
                  src="/job-listing/smart-assistant-robot.png"
                  alt=""
                  aria-hidden="true"
                  width={20}
                  height={20}
                  className="size-5 shrink-0"
                />
              </div>
              <div
                ref={assistantChatScrollRef}
                className="flex min-h-0 shrink grow flex-col items-start gap-4 self-stretch overflow-y-auto px-5 pt-5 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-thumb-rounded-lg"
              >
                <div className="flex h-[52px] w-[282px] shrink-0 flex-col items-center justify-center gap-1 self-stretch p-0">
                  <h3 className="h-7 shrink-0 self-stretch text-lg leading-7 font-semibold text-dark-blue-400">
                    What do you want to do?
                  </h3>
                  <p className="h-5 shrink-0 self-stretch text-sm leading-5 font-normal text-dark-blue-400">
                    Here are some suggestions:
                  </p>
                </div>
                <div className="flex h-[136px] w-[282px] shrink-0 flex-col items-start gap-2 self-stretch">
                  {[
                    "Reduce the budget",
                    "Improve scope quality",
                  ].map((item) => (
                    <Button
                      key={item}
                      className={cn(
                        "h-10 rounded-full py-2.5 pl-4 pr-6 text-sm leading-5 font-normal text-dark-blue-400 shadow-none",
                        item === "Reduce the budget" &&
                          "w-full max-w-[195px] justify-start bg-white",
                        item === "Shorten the project timeline" &&
                          "w-[253px] justify-start bg-white",
                        item === "Improve scope quality" &&
                          "w-[214px] justify-start bg-white"
                      )}
                      variant="outlined"
                      visual="gray"
                      onClick={() => runServiceAssistant(item)}
                    >
                      {item === "Reduce the budget" ? (
                        <>
                          <img
                            src="/job-listing/smart-assistant-money-bag.png"
                            alt=""
                            aria-hidden="true"
                            width={20}
                            height={20}
                            className="size-5 shrink-0"
                          />
                          <span className="h-5 w-[127px] shrink-0">
                            {item}
                          </span>
                        </>
                      ) : item === "Shorten the project timeline" ? (
                        <>
                          <img
                            src="/job-listing/smart-assistant-timeline.png"
                            alt=""
                            aria-hidden="true"
                            width={20}
                            height={20}
                            className="size-5 shrink-0"
                          />
                          <span className="h-5 w-[185px] shrink-0">
                            {item}
                          </span>
                        </>
                      ) : (
                        <>
                          <img
                            src="/job-listing/smart-assistant-target.png"
                            alt=""
                            aria-hidden="true"
                            width={20}
                            height={20}
                            className="size-5 shrink-0"
                          />
                          <span className="h-5 w-[146px] shrink-0">
                            {item}
                          </span>
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                {assistantHistory.length > 0 ? (
                  <div className="flex w-[282px] flex-col items-start gap-6 self-stretch">
                    {assistantHistory.map((item, itemIndex) => {
                      const isLatest = itemIndex === assistantHistory.length - 1;
                      const canRestore =
                        !isLatest &&
                        item.status === "success" &&
                        Boolean(item.listingAfter);
                      const resultLines = (item.result ?? "")
                        .split(/\n+/)
                        .map((line) => line.replace(/^[-•]\s*/, "").trim())
                        .filter(Boolean);

                      return (
                        <div
                          key={item.id}
                          className="flex w-[282px] flex-col items-start gap-6 self-stretch"
                        >
                          <div className="flex w-[282px] justify-end">
                            <p className="max-w-[236px] rounded-[20px] bg-gray-100 px-5 py-3 text-center text-base font-normal leading-6 text-dark-blue-400">
                              {item.prompt}
                            </p>
                          </div>
                          {item.status !== "pending" ? (
                            <div className="text-base font-normal leading-6 text-dark-blue-400">
                              {item.status === "error" ? (
                                <p>{item.result}</p>
                              ) : (
                                <>
                                  <p>Here&apos;s what we&apos;ve updated:</p>
                                  <ul className="list-disc pl-5">
                                    {resultLines.map((line) => (
                                      <li key={`${item.id}-${line}`}>{line}</li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          ) : null}
                          {canRestore ? (
                            <Button
                              type="button"
                              variant="outlined"
                              visual="gray"
                              className="h-7 w-[136px] rounded-[5px] border-gray-300 bg-white py-2 pl-2 pr-3 text-[10px] font-semibold leading-[12px] text-gray-800 shadow-xs"
                              disabled={isAssistantLoading}
                              onClick={() =>
                                void restoreServiceAssistantHistoryItem(item)
                              }
                            >
                              <ArrowUpLeft className="size-3 shrink-0" />
                              Restore This Version
                            </Button>
                          ) : null}
                          {isLatest && item.status !== "pending" ? (
                            <div className="flex h-10 items-start gap-2">
                              <Button
                                type="button"
                                className="h-7 w-[67px] rounded-[5px] bg-primary-50 px-3 py-2 text-[10px] font-semibold leading-[12px] text-primary-500 shadow-none"
                                disabled={isAssistantLoading || !item.prompt}
                                onClick={() => runServiceAssistant(item.prompt)}
                              >
                                <RefreshCcw05 className="size-3 shrink-0 text-primary-500" />
                                Retry
                              </Button>
                              {item.status === "success" ? (
                                <Button
                                  type="button"
                                  variant="outlined"
                                  visual="gray"
                                  className="h-7 w-[62px] rounded-[5px] border-gray-300 bg-white py-2 pl-2 pr-3 text-[10px] font-semibold leading-[12px] text-gray-800 shadow-xs"
                                  disabled={!assistantUndoSnapshotRef.current}
                                  onClick={() => void undoServiceAssistant()}
                                >
                                  <ArrowUpLeft className="size-3 shrink-0" />
                                  Undo
                                </Button>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <div className="flex h-[140px] w-full shrink-0 flex-col items-start gap-2 self-stretch p-5">
                <div className="flex h-[100px] w-[282px] shrink-0 flex-col items-start justify-center gap-3 self-stretch rounded-lg border border-gray-300 bg-gray-50 py-3 pl-2.5 pr-3 focus-within:border-primary-500">
                  <Textarea
                    className="h-10 w-[260px] shrink-0 self-stretch resize-none rounded-none border-0 bg-transparent p-0 text-sm leading-5 font-normal text-gray-500 shadow-none placeholder:text-gray-400 focus:border-transparent focus:text-gray-400 focus:ring-0"
                    placeholder="I want to change..."
                    value={assistantMessage}
                    onChange={(event) =>
                      setAssistantMessage(event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.shiftKey &&
                        assistantMessage.trim() &&
                        !isAssistantLoading
                      ) {
                        event.preventDefault()
                        void runServiceAssistant(assistantMessage)
                      }
                    }}
                  />
                  <div className="flex h-6 w-[260px] shrink-0 self-stretch items-center justify-between gap-2 p-0">
                    <img
                      src="/job-listing/smart-assistant-wand.png"
                      alt=""
                      aria-hidden="true"
                      width={20}
                      height={20}
                      className="size-5 shrink-0"
                    />
                    <Button
                      className="size-6 rounded-full p-1 shadow-none"
                      aria-label="Send message to Smart Assistant"
                      disabled={!assistantMessage.trim() || isAssistantLoading}
                      onClick={() => runServiceAssistant(assistantMessage)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      <Dialog open={isAddPhaseDialogOpen} onOpenChange={setAddPhaseDialogOpen}>
        <DialogContent
          accessibilityTitle="Add Phase"
          className="flex h-[314px] w-[371px] max-w-[calc(100vw-32px)] flex-col items-center gap-8 rounded-xl bg-white p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        >
          <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5 self-stretch">
            <Label className="h-5 text-sm font-medium leading-5 text-dark-blue-400">
              Phase Name
            </Label>
            <Input
              className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-500 shadow-xs placeholder:text-gray-500"
              placeholder="Enter phase name"
              value={newPhaseName}
              onChange={(event) => setNewPhaseName(event.target.value)}
            />
          </div>
          <div className="flex h-24 w-[323px] flex-col items-start gap-1.5 self-stretch">
            <Label className="h-5 text-sm font-medium leading-5 text-dark-blue-400">
              Phase Type
            </Label>
            <div className="flex h-11 w-[323px] flex-col items-start gap-1.5 self-stretch">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outlined"
                    visual="gray"
                    type="button"
                    className={cn(
                      "h-11 w-[323px] justify-between rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-left text-base font-normal leading-6 shadow-xs",
                      newPhaseType ? "text-dark-blue-400" : "text-gray-500",
                    )}
                    rightIcon={
                      <ChevronDown className="size-5 rotate-180 text-gray-400" />
                    }
                  >
                    {selectedPhaseTypeLabel}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[323px]">
                  {serviceScopePhaseTypeOptions.map((option) => {
                    const isUnavailable = isPhaseTypeUnavailable(option.value);

                    return (
                      <DropdownMenuItem
                        key={option.value}
                        disabled={isUnavailable}
                        onSelect={() => {
                          if (!isUnavailable) {
                            setNewPhaseType(option.value);
                          }
                        }}
                      >
                        <div>
                          <p
                            className={cn(
                              "text-sm leading-5 font-semibold",
                              isUnavailable
                                ? "text-gray-400"
                                : "text-dark-blue-400",
                            )}
                          >
                            {option.label}
                          </p>
                          <p className="text-xs leading-[18px] text-gray-500">
                            {isUnavailable
                              ? "Phase type already included"
                              : option.description}
                          </p>
                        </div>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="h-5 w-[323px] text-sm font-normal leading-5 text-gray-500">
              Helps organize tasks by timing and frequency
            </p>
          </div>
          <DialogFooter className="grid h-9 w-[323px] grid-cols-2 gap-3 self-stretch">
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              className="h-9 w-[155.5px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-xs"
              onClick={() => setAddPhaseDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 w-[155.5px] rounded-[5px] bg-primary-500 px-[14px] py-2 text-sm font-semibold leading-5 text-white shadow-xs"
              disabled={!canCreatePhase}
              onClick={addPhase}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(activeRecurringPhaseId)}
        onOpenChange={(open) => {
          if (!open) {
            closeRecurringScheduleDialog();
          }
        }}
      >
        <DialogContent
          accessibilityTitle="Recurring schedule"
          className="flex h-[268px] w-[371px] max-w-[calc(100vw-32px)] flex-col items-center gap-8 rounded-xl bg-white p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]"
        >
          <div className="flex h-[152px] w-[323px] flex-col items-start gap-3 self-stretch">
            <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5 self-stretch">
              <Label className="h-5 text-sm font-medium leading-5 text-dark-blue-400">
                Recurring schedule
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outlined"
                    visual="gray"
                    type="button"
                    className="h-11 w-[323px] justify-between rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-left text-base font-normal leading-6 text-dark-blue-400 shadow-xs"
                    rightIcon={
                      <ChevronDown className="size-5 text-gray-500" />
                    }
                  >
                    {serviceRecurringScheduleOptions.find(
                      (option) => option.value === draftRecurringSchedule,
                    )?.label ?? "Monthly"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="h-36 w-[155px] overflow-y-scroll rounded-[5px] border border-gray-100 bg-white p-0 shadow-[0px_0px_4px_rgba(0,0,0,0.04),0px_4px_8px_rgba(0,0,0,0.06)]"
                >
                  {serviceRecurringScheduleOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      className={cn(
                        "h-12 w-[155px] rounded-none px-3 py-2 text-[13px] font-medium leading-[13px] text-gray-500 focus:bg-gray-50 focus:text-dark-blue-400",
                        draftRecurringSchedule === option.value &&
                          "bg-gray-50 text-dark-blue-400",
                      )}
                      onSelect={() => setDraftRecurringSchedule(option.value)}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
              <Label className="h-5 text-sm font-medium leading-5 text-dark-blue-400">
                Repeats
              </Label>
              <div className="flex h-11 w-[323px] items-start overflow-hidden rounded-[5px] border border-gray-300 bg-white shadow-xs">
                <Button
                  type="button"
                  variant="ghost"
                  visual="gray"
                  className="h-11 w-12 rounded-none border-0 border-r border-gray-300 bg-white px-[14px] py-2.5 text-gray-500 shadow-none hover:bg-white"
                  onClick={() =>
                    setDraftRecurringCount((count) => Math.max(1, count - 1))
                  }
                >
                  <span className="h-5 w-5 text-xl font-normal leading-5">
                    -
                  </span>
                </Button>
                <div className="flex h-11 w-[227px] flex-1 items-center justify-center px-3.5 py-2.5 text-center text-base font-normal leading-6 text-gray-900">
                  <span>{draftRecurringCount}</span>
                  <span className="ml-1 text-gray-400">
                    {draftRecurringCount === 1 ? "time" : "times"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  visual="gray"
                  className="h-11 w-12 rounded-none border-0 border-l border-gray-300 bg-white px-[14px] py-2.5 text-gray-500 shadow-none hover:bg-white"
                  onClick={() =>
                    setDraftRecurringCount((count) => Math.min(99, count + 1))
                  }
                >
                  <Plus className="size-5" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter className="grid h-9 w-[323px] grid-cols-2 gap-3 self-stretch">
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              className="h-9 w-[155.5px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-xs"
              onClick={closeRecurringScheduleDialog}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 w-[155.5px] rounded-[5px] bg-primary-500 px-[14px] py-2 text-sm font-semibold leading-5 text-white shadow-xs"
              onClick={saveRecurringScheduleDialog}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ExistingContractFinalReviewStep = ({
  setProgress,
  ndaDocumentId,
  inheritedNda = false,
  jobListingId,
  ensureJobListingDraft,
}: ProgressProps & {
  ndaDocumentId?: string | null;
  inheritedNda?: boolean;
  jobListingId?: string | null;
  ensureJobListingDraft?: EnsureJobListingDraft;
}) => {
  const { toggleValidation } = useStepContext();
  const { setDetails } = useJobListingDraftContext();
  const [selectedRole, setSelectedRole] = useState("Front-End Developer");
  const [includeNda, setIncludeNda] = useState(false);
  const [responsibilities, setResponsibilities] = useState("");
  const didGenerateRoleDescriptionsRef = useRef(false);
  const { skills, setSkills, addSkill, removeSkill, addSkillDialog } =
    useDynamicFinalReviewSkills();
  const getAssistantValue = useCallback(
    (field: SmartAssistantEditableField) =>
      field === "responsibilities" ? responsibilities : "",
    [responsibilities],
  );
  const applyAssistantValue = useCallback(
    (field: SmartAssistantEditableField, value: string) => {
      if (field === "responsibilities") {
        setResponsibilities(value);
      }
    },
    [],
  );
  const roleAssistant = useFinalReviewSmartAssistant({
    jobListingId,
    ensureJobListingDraft,
    getValue: getAssistantValue,
    onApply: applyAssistantValue,
  });
  const loadSavedRoleDescription = useCallback(
    (draft: { responsibilities?: string; skills?: string[] }) => {
      if (draft.responsibilities !== undefined) {
        setResponsibilities(draft.responsibilities);
      }
      if (draft.skills) {
        setSkills(draft.skills);
      }
    },
    [setSkills],
  );
  useRoleDescriptionPersistence({
    jobListingId,
    ensureJobListingDraft,
    roleTitle: selectedRole,
    responsibilities,
    skills,
    onLoad: loadSavedRoleDescription,
  });

  useEffect(() => {
    if (!jobListingId || didGenerateRoleDescriptionsRef.current) return;
    if (responsibilities) return;
    didGenerateRoleDescriptionsRef.current = true;

    const generateRoleDescriptions = async () => {
      try {
        const response = await JobListingAPI.GenerateRoleDescriptions(
          jobListingId,
          {
            workType: "project",
            roles: [selectedRole].map((roleTitle) => ({ roleTitle })),
          },
        );
        const descriptions = response?.data?.roleDescriptions;
        const description = Array.isArray(descriptions)
          ? descriptions.find((item: any) => item?.roleTitle === selectedRole)
          : null;

        if (description?.responsibilities) {
          setResponsibilities(description.responsibilities);
        }
        if (Array.isArray(description?.skills)) {
          setSkills(description.skills);
        }
      } catch (error) {
        console.error("Failed to generate role descriptions", error);
      }
    };

    void generateRoleDescriptions();
  }, [jobListingId, responsibilities, selectedRole, setSkills]);

  useIsomorphicLayoutEffect(() => {
    toggleValidation(true);
  }, []);

  useEffect(() => {
    setProgress?.(17.5);
  }, [setProgress]);

  return (
    <ScrollArea
      className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
      viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
      scrollBar={<ScrollBar className="w-4 p-1" />}
    >
      {addSkillDialog}
      <div className="py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-[75px]">
        <div className="flex flex-col gap-8 min-[1180px]:flex-row">
          <div className="min-w-0 flex-auto max-w-[790px]">
            <h1 className="text-[32px] leading-[40px] font-semibold text-dark-blue-400">
              One Last Check
            </h1>
            <p className="mt-4 text-sm leading-5 text-dark-blue-400">
              Take a moment to review your setup. If everything looks good, go
              ahead and publish, or make quick edits if needed.
            </p>

            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <div className="flex items-center gap-x-2">
                <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                  Include a Non-Disclosure Agreement (NDA)?
                </h2>
                <HelpCircle className="size-4 text-gray-400" />
              </div>
              {inheritedNda ? (
                <div className="mt-5 flex flex-col gap-4 rounded-lg bg-primary-50 p-5 text-dark-blue-400 md:flex-row md:items-center">
                  <AlertCircle className="size-5 shrink-0 text-primary-500" />
                  <p className="min-w-0 flex-auto text-sm leading-5">
                    {INHERITED_NDA_MESSAGE}
                  </p>
                  {ndaDocumentId
                    ? renderNdaPreviewDialog(
                        <Button
                          type="button"
                          variant="outlined"
                          visual="primary"
                          className="h-10 shrink-0"
                        >
                          View NDA
                        </Button>,
                        ndaDocumentId,
                      )
                    : null}
                </div>
              ) : (
                <>
                  <p className="mt-2 text-sm leading-5 text-dark-blue-400">
                    We&apos;ll generate one with your company name. Each team
                    member will receive and sign it before starting the project.
                  </p>
                  <RadioGroup
                    className="mt-5 flex flex-wrap gap-2"
                    value={includeNda ? "yes" : "no"}
                    onValueChange={(value) => {
                      const nextIncludeNda = value === "yes";

                      setIncludeNda(nextIncludeNda);
                      setDetails((current) => ({
                        ...current,
                        ndaEnabled: nextIncludeNda,
                      }));
                    }}
                  >
                    {[
                      { value: "yes", label: "Yes, Include NDA" },
                      { value: "no", label: "No NDA" },
                    ].map((option) => (
                      <HeadlessRadioGroupItem
                        key={option.label}
                        value={option.value}
                        className={cn(
                          "inline-flex h-10 items-center justify-center rounded-full border border-gray-300 bg-white px-4 text-sm leading-5 font-semibold text-dark-blue-400 shadow-xs focus-visible:outline-none",
                          (includeNda ? "yes" : "no") === option.value &&
                            "border-primary-500 text-primary-500",
                        )}
                      >
                        {option.label}
                      </HeadlessRadioGroupItem>
                    ))}
                  </RadioGroup>
                  {includeNda ? (
                    <div className="mt-6 flex flex-col gap-4 rounded-lg bg-primary-50 p-5 text-dark-blue-400 md:flex-row md:items-center">
                      <AlertCircle className="size-5 shrink-0 text-primary-500" />
                      <p className="min-w-0 flex-auto text-sm leading-5">
                        Your Non-Disclosure Agreement (NDA) has been created.
                        Feel free to review it.
                      </p>
                      {renderNdaPreviewDialog(
                        <Button
                          type="button"
                          variant="outlined"
                          visual="primary"
                          className="h-10 shrink-0"
                        >
                          View NDA
                        </Button>,
                        ndaDocumentId,
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 rounded-lg border border-primary-100 bg-warning-50 p-5 text-sm leading-5 text-dark-blue-400">
                      {NDA_OFF_WARNING}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-8 rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)]">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Role Description
              </h2>

              <RadioGroup
                className="mt-6 flex flex-wrap gap-2"
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                {[...finalReviewRoles, "+ 5 More"].map((role) => (
                  <HeadlessRadioGroupItem
                    key={role}
                    value={role}
                    className={cn(
                      "inline-flex h-10 items-center justify-center rounded-full border border-gray-300 bg-white px-4 text-sm leading-5 font-semibold text-dark-blue-400 focus-visible:outline-none",
                      selectedRole === role &&
                        "border-primary-500 text-primary-500",
                    )}
                  >
                    {role}
                  </HeadlessRadioGroupItem>
                ))}
              </RadioGroup>

              <div className="mt-6">
                <FinalReviewRichTextField
                  title="Responsibilities"
                  initialValue={responsibilities}
                  placeholder={`Add responsibilities for ${selectedRole}`}
                  counterLabel="Words"
                  onChange={setResponsibilities}
                />
              </div>

              <div className="mt-8">
                <h3 className="text-sm leading-5 font-semibold text-dark-blue-400">
                  Skills
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge
                      key={skill}
                      size="md"
                      visual="gray"
                      className="border border-gray-200 bg-white"
                    >
                      {skill}
                      <Button
                        variant="link"
                        visual="gray"
                        type="button"
                        className="ml-2 text-gray-400"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        <X className="size-3" />
                      </Button>
                    </Badge>
                  ))}
                  <Button
                    className="h-10"
                    variant="outlined"
                    visual="primary"
                    onClick={addSkill}
                  >
                    Add Skill <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-[1180px]:w-[321px] self-start">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <h2 className="text-base leading-6 font-semibold text-dark-blue-400">
                Smart Assistant
              </h2>
              <Copy className="size-5 text-gray-400" />
            </div>
            <div className="p-5">
              <h3 className="text-lg leading-7 font-semibold text-dark-blue-400">
                Carify what this role involves
              </h3>
              <p className="text-sm leading-5 text-dark-blue-400">
                Here are some suggestions:
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Add more specifics",
                  "Simplify the task list",
                  "Group similar tasks",
                ].map((item) => (
                  <Button
                    key={item}
                    className="h-10 rounded-full"
                    variant="outlined"
                    visual="gray"
                    disabled={roleAssistant.isLoading}
                    onClick={() => roleAssistant.run(item, "responsibilities")}
                  >
                    {item}
                  </Button>
                ))}
              </div>
              {roleAssistant.result ? (
                <p className="mt-4 text-xs leading-[18px] text-primary-600">
                  {roleAssistant.result}
                </p>
              ) : null}
              <div className="mt-[280px] rounded-[5px] border border-gray-300 bg-white p-3 shadow-xs">
                <Textarea
                  className="h-10 w-full resize-none border-0 bg-transparent p-0 text-sm leading-5 text-gray-500 shadow-none focus:border-transparent focus:ring-0"
                  placeholder="I want to change..."
                  value={roleAssistant.message}
                  onChange={(event) =>
                    roleAssistant.setMessage(event.target.value)
                  }
                />
                <div className="flex items-center justify-between">
                  <RefreshCcw05 className="size-4 text-gray-400" />
                  <Button
                    className="size-8 rounded-full p-0"
                    disabled={
                      roleAssistant.isLoading || !roleAssistant.message.trim()
                    }
                    onClick={() =>
                      roleAssistant.run(
                        roleAssistant.message,
                        "responsibilities",
                      )
                    }
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

const TeamRoles = ({
  setProgress,
  initialValid = false,
  existingContractId,
  hiringMode,
  jobListingId,
  ensureJobListingDraft,
}: ProgressProps & {
  initialValid?: boolean;
  existingContractId?: string | null;
  hiringMode?: HiringModeChoice;
  jobListingId?: string | null;
  ensureJobListingDraft?: EnsureJobListingDraft;
}) => {
  const { toggleValidation } = useStepContext();
  const { toast } = useToast();
  const { details, setDetails } = useJobListingDraftContext();
  const { projectScopeMethods } = useProjectScopeContext();
  const [projectScopeState, setProjectScopeState] = projectScopeMethods;
  const isExistingProject = existingContractId === "marketeq-projects-network";
  const isIndividualMode = hiringMode === "individual";
  // AI generates the team table only for a new (non-existing-contract) team.
  const shouldAutoGenerateTeam = hiringMode === "team" && !existingContractId;
  // The step-2 budget is the client's target, so a new team must not overwrite
  // it with the rows' estimate.
  const keepStepTwoBudget = shouldAutoGenerateTeam;
  const [isGeneratingTeamRows, setIsGeneratingTeamRows] = useState(false);
  const [teamRowsGenerationFailed, setTeamRowsGenerationFailed] =
    useState(false);
  const didAttemptTeamGenerationRef = useRef(false);
  const [budgetFrequency, setBudgetFrequency] = useState(
    shouldAutoGenerateTeam && details.budgetFrequency === "per_month"
      ? "month"
      : "week",
  );
  const [roleDialogMode, setRoleDialogMode] = useState<"add" | "rename" | null>(
    null,
  );
  const [activeRoleIndex, setActiveRoleIndex] = useState<number | null>(null);
  const [draftRoleTitle, setDraftRoleTitle] = useState("");
  const [draftRoleSchedule, setDraftRoleSchedule] =
    useState<TeamRoleRow["schedule"]>("Full-time");
  const [teamRoleAutocompleteOptions, setTeamRoleAutocompleteOptions] =
    useState<string[]>([]);
  const [isTeamRoleAutocompleteOpen, setTeamRoleAutocompleteOpen] =
    useState(false);
  const teamRoleAutocompleteTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const teamRoleAutocompleteRequestIdRef = useRef(0);
  const [rows, setRows] = useState<TeamRoleRow[]>(() => {
    if (details.teamRoleRows?.length) {
      return details.teamRoleRows;
    }

    if (!existingContractId && !isIndividualMode) {
      return [];
    }

    const scopedRows = projectScopeState?.[0]?.rows ?? [];

    if (scopedRows.length > 0 && !existingContractId) {
      return scopedRows.map((row, index) =>
        createTeamRoleRow(index, {
          role: row.role || row.task || `Team Member ${index + 1}`,
          location: row.location || "USA",
          experience: (row.experience as ExperienceLevel) || "Junior",
          schedule:
            row.workSchedule === "part_time" ? "Part-time" : "Full-time",
        }),
      );
    }

    if (isIndividualMode) {
      return [createTeamRoleRow(0, { role: "Individual Role" })];
    }

    return teamRoleRows;
  });
  const persistTeamRoleRows = useCallback(
    async (nextRows: TeamRoleRow[]) => {
      setDetails((previous) => ({
        ...previous,
        teamRoleRows: nextRows,
      }));

      const listingId = jobListingId ?? (await ensureJobListingDraft?.());
      if (!listingId) {
        toast({
          title: "Unable to save team members. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      try {
        const response = await JobListingAPI.ReplaceRoleRows(
          listingId,
          createTeamRoleRowsPayload(nextRows),
        );
        const savedRows = createTeamRoleRowsFromApi(
          getResponsePayload(response)?.teamMemberRows ??
            getResponsePayload(response)?.roles ??
            getResponsePayload(response),
        );
        if (savedRows.length > 0) {
          setRows(savedRows);
          setDetails((previous) => ({
            ...previous,
            teamRoleRows: savedRows,
          }));
        }
        return true;
      } catch (error) {
        console.error("Failed to save team member rows", error);
        toast({
          title: "Unable to save team members. Please try again.",
          variant: "destructive",
        });
        return false;
      }
    },
    [ensureJobListingDraft, jobListingId, setDetails, toast],
  );
  const updateRow = (rowIndex: number, nextValues: Partial<TeamRoleRow>) => {
    const nextRows = rows.map((row, index) =>
      index === rowIndex ? { ...row, ...nextValues } : row,
    );
    setRows(nextRows);
    void persistTeamRoleRows(nextRows);
  };
  useEffect(() => {
    if (
      !shouldAutoGenerateTeam ||
      !jobListingId ||
      rows.length > 0 ||
      didAttemptTeamGenerationRef.current
    ) {
      return;
    }
    didAttemptTeamGenerationRef.current = true;

    const generateTeamRows = async () => {
      setIsGeneratingTeamRows(true);
      try {
        // Saved rows can arrive after this step mounts (draft hydration on
        // re-entry); never replace a team that already exists server-side.
        const listingResponse = await JobListingAPI.Get(jobListingId);
        const savedRows = createTeamRoleRowsFromApi(
          getResponsePayload(listingResponse)?.teamMemberRows,
        );
        if (savedRows.length > 0) {
          setRows(savedRows);
          setDetails((previous) => ({
            ...previous,
            teamRoleRows: savedRows,
          }));
          return;
        }

        const response = await JobListingAPI.GenerateTeamRows(jobListingId);
        const payload = getResponsePayload(response);
        const generated: any[] = Array.isArray(payload?.rows)
          ? payload.rows
          : [];
        const durationMonths = toFiniteNumber(payload?.durationMonths);

        if (payload?.aiStatus !== "OK" || generated.length === 0) {
          setTeamRowsGenerationFailed(true);
          return;
        }

        const nextRows = generated.map((row, index) =>
          createTeamRoleRow(index, {
            role: String(row?.roleTitle ?? "").trim(),
            location: String(row?.location ?? "United States"),
            experience: toTeamRoleExperience(row?.experienceLevel),
            schedule: toTeamRoleSchedule(row?.workSchedule),
            length:
              typeof durationMonths === "number" && durationMonths > 0
                ? `${durationMonths} ${
                    durationMonths === 1 ? "month" : "months"
                  }`
                : "3 months",
          }),
        );
        setRows(nextRows);
        const didPersist = await persistTeamRoleRows(nextRows);
        if (!didPersist) {
          setTeamRowsGenerationFailed(true);
        }
      } catch (error) {
        console.error("Failed to generate team rows", error);
        setTeamRowsGenerationFailed(true);
      } finally {
        setIsGeneratingTeamRows(false);
      }
    };

    void generateTeamRows();
  }, [
    jobListingId,
    persistTeamRoleRows,
    rows.length,
    setDetails,
    shouldAutoGenerateTeam,
  ]);
  useEffect(() => {
    const query = draftRoleTitle.trim();

    if (teamRoleAutocompleteTimerRef.current) {
      clearTimeout(teamRoleAutocompleteTimerRef.current);
    }

    if (!roleDialogMode || !query) {
      setTeamRoleAutocompleteOptions([]);
      setTeamRoleAutocompleteOpen(false);
      return;
    }

    teamRoleAutocompleteTimerRef.current = setTimeout(async () => {
      const currentRequestId = ++teamRoleAutocompleteRequestIdRef.current;

      try {
        const response = await AutocompleteAPI.getByType(
          "job_titles",
          query,
          10,
        );
        if (currentRequestId !== teamRoleAutocompleteRequestIdRef.current) {
          return;
        }

        const apiValues: AutocompleteTypeSuggestion[] = Array.isArray(
          response?.data,
        )
          ? response.data
          : [];
        const options = getUniqueOptions(
          apiValues.map((item) => normalizeAutocompleteLabel(item)),
        ).filter(
          (option) => option.toLowerCase() !== query.toLowerCase(),
        );

        setTeamRoleAutocompleteOptions(options);
        setTeamRoleAutocompleteOpen(options.length > 0);
      } catch {
        if (currentRequestId !== teamRoleAutocompleteRequestIdRef.current) {
          return;
        }
        setTeamRoleAutocompleteOptions([]);
        setTeamRoleAutocompleteOpen(false);
      }
    }, 250);

    return () => {
      if (teamRoleAutocompleteTimerRef.current) {
        clearTimeout(teamRoleAutocompleteTimerRef.current);
      }
    };
  }, [draftRoleTitle, roleDialogMode]);

  const closeRoleDialog = () => {
    setRoleDialogMode(null);
    setActiveRoleIndex(null);
    setDraftRoleTitle("");
    setDraftRoleSchedule("Full-time");
    setTeamRoleAutocompleteOptions([]);
    setTeamRoleAutocompleteOpen(false);
  };
  const openAddRoleDialog = () => {
    setRoleDialogMode("add");
    setActiveRoleIndex(null);
    setDraftRoleTitle("");
    setDraftRoleSchedule("Full-time");
    setTeamRoleAutocompleteOptions([]);
    setTeamRoleAutocompleteOpen(false);
  };
  const openRenameRoleDialog = (rowIndex: number) => {
    setRoleDialogMode("rename");
    setActiveRoleIndex(rowIndex);
    setDraftRoleTitle(rows[rowIndex]?.role ?? "");
    setDraftRoleSchedule(rows[rowIndex]?.schedule ?? "Full-time");
    setTeamRoleAutocompleteOptions([]);
    setTeamRoleAutocompleteOpen(false);
  };
  const saveRoleDialog = () => {
    const role = draftRoleTitle.trim();

    if (roleDialogMode === "rename" && activeRoleIndex !== null) {
      if (role) {
        const nextRows = rows.map((row, index) =>
          index === activeRoleIndex
            ? {
                ...row,
                role,
              }
            : row,
        );
        setRows(nextRows);
        void persistTeamRoleRows(nextRows);
      }
      closeRoleDialog();
      return;
    }

    const nextRows = [
      ...rows,
      createTeamRoleRow(rows.length, {
        role: role || `New Team Member ${rows.length + 1}`,
        schedule: draftRoleSchedule,
        length: isExistingProject ? "3 months" : "1 month",
      }),
    ];
    setRows(nextRows);
    void persistTeamRoleRows(nextRows);
    closeRoleDialog();
  };
  const duplicateRow = (rowIndex: number) => {
    const rowToCopy = rows[rowIndex];
    if (!rowToCopy) return;

    const nextRows = [
      ...rows.slice(0, rowIndex + 1),
      {
        ...rowToCopy,
        assignee: "Unassigned Member",
        editable: true,
      },
      ...rows.slice(rowIndex + 1),
    ];
    setRows(nextRows);
    void persistTeamRoleRows(nextRows);
  };
  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return;

    const nextRows = rows.filter((_, index) => index !== rowIndex);
    setRows(nextRows);
    void persistTeamRoleRows(nextRows);
  };
  const rowsAreValid =
    rows.length > 0 &&
    rows.every(
      (row) =>
        Boolean(row.role.trim()) &&
        Boolean(row.location.trim()) &&
        Boolean(row.experience.trim()) &&
        Boolean(row.schedule.trim()) &&
        Boolean(row.length.trim()),
    );
  const estimatedBudgetCents = useMemo(
    () => getTeamRolesEstimatedBudget(rows),
    [rows],
  );
  // estimatedBudgetCents is the whole-contract total. For a new team the card
  // shows it per week or per month (whichever is selected), so it reads in the
  // same unit as the budget entered in step 2. Weeks use the same 4.33
  // weeks/month as the estimate itself.
  const contractMonths =
    details.durationMonths ??
    Math.max(0, ...rows.map((row) => parseMonthCount(row.length) ?? 0));
  const displayedBudgetCents =
    keepStepTwoBudget && contractMonths > 0
      ? estimatedBudgetCents /
        (budgetFrequency === "month" ? contractMonths : contractMonths * 4.33)
      : estimatedBudgetCents;
  const estimatedBudgetDisplay =
    displayedBudgetCents > 0 ? formatUsdFromCents(displayedBudgetCents) : "$0";

  useIsomorphicLayoutEffect(() => {
    toggleValidation(initialValid || rowsAreValid);
  }, [initialValid, rowsAreValid]);

  useEffect(() => {
    if (rows.length > 0 || existingContractId || isIndividualMode) {
      setDetails((previous) => ({
        ...previous,
        teamRoleRows: rows,
        budgetAmount:
          !keepStepTwoBudget && estimatedBudgetCents > 0
            ? Math.round(estimatedBudgetCents / 100)
            : previous.budgetAmount,
        budgetFrequency: keepStepTwoBudget
          ? previous.budgetFrequency
          : budgetFrequency === "month"
            ? "per_month"
            : "per_week",
        durationMonths: isExistingProject ? 6 : previous.durationMonths,
        isOngoing: isExistingProject ? previous.isOngoing : true,
      }));
    }

    setProjectScopeState([
      {
        phaseName: isExistingProject
          ? "Existing Project Team"
          : "Existing Service Team",
        phaseType: isExistingProject ? "setup" : "ongoing",
        rows: rows.map((row, index) => ({
          ...(() => {
            const estimate = parseHourlyEstimateCents(row.estimate);

            return {
              id: `existing-team-role-${index}`,
              task: row.role,
              role: row.role,
              location: row.location,
              experience: row.experience as ExperienceLevel,
              duration: { value: 40, type: "hours" },
              workSchedule:
                row.schedule === "Part-time" ? "part_time" : "full_time",
              contractLengthMonths: parseMonthCount(row.length),
              hourlyRateLowUsdCents: estimate.low,
              hourlyRateHighUsdCents: estimate.high,
            };
          })(),
        })),
      },
    ]);
  }, [
    budgetFrequency,
    estimatedBudgetCents,
    isExistingProject,
    isIndividualMode,
    existingContractId,
    keepStepTwoBudget,
    rows,
    setDetails,
    setProjectScopeState,
  ]);

  useEffect(() => {
    setProgress?.(22.5);
  }, [setProgress]);

  return (
    <>
      <ScrollArea
        className="h-[calc(theme(size.full)-148px)] overflow-x-hidden"
        viewportClassName="[&>div]:!block [&>div]:w-full [&>div]:min-w-0 [&>div]:max-w-full"
        scrollBar={<ScrollBar className="w-4 p-1" />}
      >
        <div className="mx-auto max-w-[1240px] py-10 px-5 md:px-10 min-[1024px]:py-[50px] min-[1024px]:px-0">
          <div className="flex h-20 w-full shrink-0 flex-col items-center justify-center gap-4 self-stretch p-0">
            <h1 className="h-11 shrink-0 self-stretch text-[36px] font-bold leading-[44px] tracking-[-0.02em] text-dark-blue-400">
              {isIndividualMode ? "Customize your role" : "Customize your team"}
            </h1>
            <p className="h-5 shrink-0 self-stretch text-sm leading-5 font-normal text-dark-blue-400">
              {isIndividualMode
                ? "Add the role, location, and experience level you're looking for—we'll estimate pay rates and help you get ready to hire."
                : "Add the roles, locations, and experience levels you're looking for—we'll estimate pay rates and help you build the right team faster."}
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-8 min-[1024px]:flex-row">
            <div className="min-w-0 flex-auto overflow-hidden rounded-lg border border-gray-200 bg-white min-[1024px]:w-[886px] min-[1024px]:flex-none">
              <div className="flex h-[60px] items-center justify-between gap-4 self-stretch border-b border-gray-200 bg-white px-6 py-3">
                <h2 className="text-lg leading-7 font-semibold text-dark-blue-400">
                  {isIndividualMode ? "Role" : "Team Members"}
                </h2>
                <Button
                  size="sm"
                  variant="outlined"
                  visual="gray"
                  onClick={openAddRoleDialog}
                >
                  <Plus className="size-[15px]" />
                  {isIndividualMode ? "Add Role" : "Add Team Member"}
                </Button>
              </div>

              {teamRowsGenerationFailed && rows.length === 0 ? (
                <Alert variant="error" className="self-stretch">
                  <AlertIcon>
                    <AlertCircle className="h-5 w-5 flex-none" />
                  </AlertIcon>
                  <AlertContent>
                    <AlertTitle>We couldn&apos;t generate your team</AlertTitle>
                    <AlertDescription>
                      Add your team members manually using the button above.
                    </AlertDescription>
                  </AlertContent>
                </Alert>
              ) : null}

              <div className="self-stretch overflow-x-auto bg-white">
                <Table className="min-w-[886px] table-fixed bg-white">
                  <colgroup>
                    <col className="w-[216px]" />
                    <col className="w-[140px]" />
                    <col className="w-[105px]" />
                    <col className="w-[124px]" />
                    <col className="w-[126px]" />
                    <col className="w-[100px]" />
                    <col className="w-[75px]" />
                  </colgroup>
                  <TableHeader className="bg-gray-50 [&_tr]:border-y-0">
                    <TableRow className="h-11 border-b border-gray-200 hover:bg-transparent">
                      <TableHead className="h-11 w-[216px] px-0 py-0">
                        <div className="flex h-11 items-center gap-3 px-6 py-3 pr-3 text-xs font-medium leading-[18px] text-gray-600">
                          <span className="h-[18px] w-[180px]">Role</span>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[140px] px-0 py-0">
                        <div className="flex h-11 items-center gap-3 px-4 py-3 text-xs font-medium leading-[18px] text-gray-600">
                          <TooltipProvider delayDuration={75}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="h-[18px] w-[50px] cursor-default">
                                  Location
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                align="center"
                                sideOffset={12}
                                visual="white"
                                className="flex h-[94px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                              >
                                <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                <span className="flex h-[54px] w-[182.55px] items-center">
                                  Affects cost, availability, and potential time
                                  zone alignment with your team.
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[105px] px-0 py-0">
                        <div className="flex h-11 items-center gap-3 px-4 py-3 text-xs font-medium leading-[18px] text-gray-600">
                          <span className="h-[18px] w-16">Experience</span>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[124px] px-0 py-0">
                        <div className="flex h-11 items-center gap-3 px-4 py-3 text-xs font-medium leading-[18px] text-gray-600">
                          <TooltipProvider delayDuration={75}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="h-[18px] w-[54px] cursor-default">
                                  Schedule
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                align="center"
                                sideOffset={12}
                                visual="white"
                                className="flex h-[94px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                              >
                                <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                <span className="flex h-[54px] w-[182.55px] items-center">
                                  Defines how much time the freelancer will
                                  commit. Impacts total cost.
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[126px] px-0 py-0">
                        <div className="flex h-11 items-center gap-3 px-4 py-3 text-xs font-medium leading-[18px] text-gray-600">
                          <TooltipProvider delayDuration={75}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="h-[18px] w-[94px] cursor-default whitespace-nowrap">
                                  Contract Length
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                align="center"
                                sideOffset={12}
                                visual="white"
                                className="flex h-[94px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                              >
                                <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                <span className="flex h-[54px] w-[182.55px] items-center">
                                  Sets how long the freelancer will be engaged.
                                  Affects overall budget planning.
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[100px] px-0 py-0">
                        <div className="flex h-11 items-center gap-3 px-4 py-3 text-xs font-medium leading-[18px] text-gray-600">
                          <TooltipProvider delayDuration={75}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-default whitespace-nowrap">
                                  Hourly est.
                                </span>
                              </TooltipTrigger>
                              <TooltipContent
                                side="left"
                                align="center"
                                sideOffset={12}
                                visual="white"
                                className="flex h-[94px] w-[222.55px] max-w-none items-start rounded-lg bg-primary-50 p-5 text-xs font-normal leading-[18px] text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                              >
                                <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                <span className="flex h-[54px] w-[182.55px] items-center">
                                  Estimated hourly rate based on the selected
                                  location, experience, and schedule
                                </span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableHead>
                      <TableHead className="h-11 w-[75px] px-0 py-0">
                        <div className="h-11 px-6 py-3 pl-3" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isGeneratingTeamRows && rows.length === 0
                      ? Array.from({ length: 3 }, (_, index) => (
                          <TableRow
                            key={`team-row-skeleton-${index}`}
                            className="h-[72px] border-b border-gray-200 hover:bg-transparent"
                          >
                            <TableCell colSpan={7} className="h-[72px] px-6 py-4">
                              <span className="relative block h-10 w-full overflow-hidden rounded bg-gray-100">
                                <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100" />
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      : null}
                    {rows.map((row, index) => (
                      <TableRow
                        key={`${row.role}-${index}`}
                        className="h-[72px] border-b border-gray-200 hover:bg-transparent"
                      >
                        <TableCell className="h-[72px] w-[216px] px-0 py-0">
                          <div className="flex h-[72px] items-center gap-3 px-6 py-4 pr-4">
                            {row.editable ? (
                              <Button
                                type="button"
                                variant="ghost"
                                visual="gray"
                                className="flex h-10 w-44 flex-col items-start justify-start gap-0 p-0 text-left hover:bg-transparent"
                                onClick={() => openRenameRoleDialog(index)}
                              >
                                <span className="h-5 w-44 truncate text-sm font-semibold leading-5 text-dark-blue-400">
                                  {row.role}
                                </span>
                                <span className="h-5 max-w-44 truncate text-sm font-normal leading-5 text-gray-500">
                                  {row.assignee?.trim() || "Unassigned Member"}
                                </span>
                              </Button>
                            ) : (
                              <div className="flex h-10 w-44 flex-col items-start">
                                <p className="h-5 w-44 truncate text-sm font-semibold leading-5 text-dark-blue-400">
                                  {row.role}
                                </p>
                                <p className="h-5 max-w-44 truncate text-sm font-normal leading-5 text-gray-500">
                                  {row.assignee?.trim() || "Unassigned Member"}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-[72px] w-[140px] px-0 py-0">
                          <div className="flex h-[72px] min-w-0 items-center gap-3 px-4 py-4">
                            {row.editable ? (
                              <CountriesCombobox
                                value={row.location}
                                onValueChange={(location) =>
                                  updateRow(index, { location })
                                }
                                placeholder="Select country"
                                triggerClassName={teamRoleLocationPillClassName}
                              />
                            ) : (
                              <Badge
                                size="lg"
                                visual="gray"
                                className={teamRoleLocationPillClassName}
                              >
                                {renderLocationOptionLabel(row.location)}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-[72px] w-[105px] px-0 py-0">
                          <div className="flex h-[72px] min-w-0 items-center gap-3 px-4 py-4">
                            {row.editable ? (
                              <Select
                                value={row.experience}
                                onValueChange={(experience) =>
                                  updateRow(index, {
                                    experience: experience as ExperienceLevel,
                                  })
                                }
                              >
                                <SelectTrigger
                                  className={teamRoleExperiencePillClassName}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {EXPERIENCE_LEVELS.map((experience) => (
                                    <SelectItem
                                      key={experience}
                                      value={experience}
                                    >
                                      {experience}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                size="lg"
                                visual="gray"
                                className={teamRoleExperiencePillClassName}
                              >
                                {row.experience}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-[72px] w-[124px] px-0 py-0">
                          <div className="flex h-[72px] min-w-0 items-center gap-3 px-4 py-4">
                            {row.editable ? (
                              <Select
                                value={row.schedule}
                                onValueChange={(schedule) =>
                                  updateRow(index, {
                                    schedule:
                                      schedule as TeamRoleRow["schedule"],
                                  })
                                }
                              >
                                <SelectTrigger
                                  className={teamRoleSchedulePillClassName}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamRoleScheduleOptions.map((schedule) => (
                                    <SelectItem key={schedule} value={schedule}>
                                      {schedule}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                size="lg"
                                visual="gray"
                                className={teamRoleSchedulePillClassName}
                              >
                                {row.schedule}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-[72px] w-[126px] px-0 py-0">
                          <div className="flex h-[72px] min-w-0 items-center gap-3 px-4 py-4">
                            {row.editable ? (
                              <Select
                                value={row.length}
                                onValueChange={(length) =>
                                  updateRow(index, { length })
                                }
                              >
                                <SelectTrigger
                                  className={teamRoleLengthPillClassName}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {teamRoleLengthOptions.map((length) => (
                                    <SelectItem key={length} value={length}>
                                      {length}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Badge
                                size="lg"
                                visual="gray"
                                className={teamRoleLengthPillClassName}
                              >
                                {row.length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="h-[72px] w-[100px] px-0 py-0">
                          <div className="flex h-[72px] items-center px-3 py-4">
                            <TooltipProvider delayDuration={75}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="cursor-default whitespace-nowrap text-sm leading-5 text-gray-600">
                                    {row.estimate}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  align="center"
                                  sideOffset={12}
                                  visual="white"
                                  className="flex h-[246px] w-[252px] max-w-none flex-col items-start gap-4 rounded-lg bg-primary-50 p-5 text-dark-blue-400 shadow-[0px_4px_19px_rgba(0,0,0,0.04)]"
                                >
                                  <TooltipArrow className="h-[25.45px] w-[35px] fill-primary-50" />
                                  <span className="h-6 w-[90px] text-base font-semibold leading-6 text-gray-800">
                                    Price Guide
                                  </span>
                                  <div className="relative h-[166px] w-[212px]">
                                    <div className="absolute bottom-0 left-0 flex h-[120px] w-[212px] items-end gap-1">
                                      {[
                                        ["h-6", "bg-primary-100"],
                                        ["h-[39px]", "bg-primary-100"],
                                        ["h-[78px]", "bg-primary-100"],
                                        ["h-[104px]", "bg-primary-500"],
                                        ["h-[120px]", "bg-primary-500"],
                                        ["h-24", "bg-primary-500"],
                                        ["h-[68px]", "bg-primary-100"],
                                        ["h-12", "bg-primary-100"],
                                        ["h-[13px]", "bg-primary-100"],
                                      ].map(([heightClassName, colorClassName], barIndex) => (
                                        <div
                                          key={barIndex}
                                          className={cn(
                                            "w-5 rounded",
                                            heightClassName,
                                            colorClassName,
                                          )}
                                        />
                                      ))}
                                    </div>
                                    {(() => {
                                      const estimate =
                                        parseHourlyEstimateCents(row.estimate);
                                      const low =
                                        typeof estimate.low === "number"
                                          ? Math.round(estimate.low / 100)
                                          : null;
                                      const high =
                                        typeof estimate.high === "number"
                                          ? Math.round(estimate.high / 100)
                                          : null;
                                      const median =
                                        typeof low === "number" &&
                                        typeof high === "number"
                                          ? Math.round((low + high) / 2)
                                          : null;
                                      const guideValues = [
                                        {
                                          label: "Low",
                                          value: low,
                                          className:
                                            "left-[49.54px] top-4 w-[30px]",
                                        },
                                        {
                                          label: "Median",
                                          value: median,
                                          className:
                                            "left-[86.54px] top-0 w-[39px]",
                                        },
                                        {
                                          label: "High",
                                          value: high,
                                          className:
                                            "left-[131.54px] top-6 w-[30px]",
                                        },
                                      ];

                                      return guideValues.map(
                                        ({ label, value, className }) => (
                                          <div
                                            key={label}
                                            className={cn(
                                              "absolute flex h-[34px] flex-col items-center gap-1 p-0",
                                              className,
                                            )}
                                          >
                                            <span className="h-[13px] text-[11px] font-normal leading-[13px] tracking-[0.06px] text-dark-blue-400">
                                              {label}
                                            </span>
                                            <span className="flex h-[17px] items-center justify-center rounded bg-black px-1 py-0.5 text-[11px] font-normal leading-[13px] tracking-[0.06px] text-white">
                                              {typeof value === "number"
                                                ? `$${value}`
                                                : "--"}
                                            </span>
                                          </div>
                                        ),
                                      );
                                    })()}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="h-[72px] w-[75px] px-0 py-0">
                          <div className="flex h-[72px] items-center justify-center px-6 py-4">
                            {row.editable ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <IconButton
                                    variant="ghost"
                                    visual="gray"
                                    className="size-[27px] p-0 text-gray-500"
                                  >
                                    <MoreHorizontal className="size-[15px]" />
                                  </IconButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="flex h-[88px] w-[153px] flex-col items-start rounded-lg border border-gray-100 bg-white p-0 shadow-lg"
                                >
                                  <DropdownMenuItem
                                    onSelect={() => duplicateRow(index)}
                                    className="flex h-11 w-[153px] items-center justify-start gap-2 rounded-none border-b border-gray-200 px-4 py-3 text-sm font-normal leading-5 text-black focus:bg-gray-50"
                                  >
                                    <Copy className="size-[18px] shrink-0 text-gray-400" />
                                    <span className="h-5 w-[95px] shrink-0 whitespace-nowrap rounded text-sm font-normal leading-5 text-black">
                                      Duplicate Role
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => removeRow(index)}
                                    className="flex h-11 w-[153px] items-center justify-start gap-2 rounded-none px-4 py-3 text-sm font-normal leading-5 text-black focus:bg-gray-50"
                                  >
                                    <Trash01 className="size-[18px] shrink-0 text-gray-400" />
                                    <span className="h-5 w-[95px] shrink-0 whitespace-nowrap rounded text-sm font-normal leading-5 text-black">
                                      Delete
                                    </span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <IconButton
                                aria-hidden="true"
                                tabIndex={-1}
                                variant="ghost"
                                visual="gray"
                                className="invisible size-[27px] p-0"
                              >
                                <MoreHorizontal className="size-[15px]" />
                              </IconButton>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex h-[174px] w-full flex-col items-start justify-center gap-5 self-start rounded-lg border border-gray-200 bg-white p-6 shadow-[0px_1px_5px_0px_rgba(16,24,40,.02)] min-[1024px]:w-[322px]">
              <div className="flex h-[58px] w-full flex-col items-start gap-2 self-stretch">
                <div className="flex h-5 w-full items-center gap-2">
                  <p className="h-5 w-[120px] rounded-[4.83879px] text-sm font-medium leading-5 text-gray-400">
                    Estimated Budget
                  </p>
                </div>
                <div className="flex h-[30px] w-full items-baseline gap-1 text-dark-blue-400">
                  <span className="text-2xl font-bold leading-[29px] capitalize">
                    {estimatedBudgetDisplay}
                  </span>
                  <span className="text-sm font-medium leading-[17px]">per</span>
                  <Select
                    value={budgetFrequency}
                    onValueChange={setBudgetFrequency}
                  >
                    <SelectTrigger className="h-[25px] w-[66px] gap-1 rounded border-gray-300 bg-white px-[7px] py-[5px] text-sm font-medium leading-[17px] text-dark-blue-400 shadow-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["week", "month"].map((frequency) => (
                        <SelectItem key={frequency} value={frequency}>
                          {frequency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex h-12 w-full flex-col items-start gap-3 self-stretch">
                <div className="flex h-[18px] items-center gap-2 self-stretch text-sm font-medium leading-[17px] text-dark-blue-400">
                  <Clock className="size-[18px] text-primary-500" />
                  {isExistingProject
                    ? "6 month project"
                    : isIndividualMode
                      ? (rows[0]?.length ?? "3 months")
                      : formatTeamBudgetDuration(details.durationMonths)}
                </div>
                <div className="flex h-[18px] items-center gap-2 self-stretch text-sm font-medium leading-[17px] text-dark-blue-400">
                  <Users className="size-[18px] text-primary-500" />
                  {rows.length} {isIndividualMode ? "role" : "team members"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
      <Dialog
        open={roleDialogMode !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeRoleDialog();
          }
        }}
      >
        <DialogContent
          variant="unanimated"
          accessibilityTitle={
            roleDialogMode === "rename"
              ? "Rename role"
              : isIndividualMode
                ? "Add role"
                : "Add team member"
          }
          dialogOverlay={<DialogOverlay className="bg-[#101828]/20" />}
          className={cn(
            "left-1/2 top-1/2 flex w-[371px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col items-start gap-8 rounded-xl bg-white p-6 shadow-[0px_20px_24px_-4px_rgba(16,24,40,0.08),0px_8px_8px_-4px_rgba(16,24,40,0.03)]",
          )}
        >
          <div className="flex w-[323px] flex-col items-start gap-3">
            <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
              <Label className="h-5 whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                Role
              </Label>
              <Combobox
                className="w-[323px]"
                value={draftRoleTitle}
                onChange={(value) => {
                  setDraftRoleTitle(String(value ?? ""));
                  setTeamRoleAutocompleteOpen(false);
                }}
                nullable
              >
                <ComboboxTrigger>
                  <ComboboxInput
                    className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-black shadow-xs focus:ring-0 ui-open:pl-[14px]"
                    value={draftRoleTitle}
                    onChange={(event) => setDraftRoleTitle(event.target.value)}
                    onClick={() =>
                      setTeamRoleAutocompleteOpen(
                        teamRoleAutocompleteOptions.length > 0,
                      )
                    }
                    onFocus={() =>
                      setTeamRoleAutocompleteOpen(
                        teamRoleAutocompleteOptions.length > 0,
                      )
                    }
                    onBlur={() =>
                      setTimeout(() => setTeamRoleAutocompleteOpen(false), 150)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        saveRoleDialog();
                      }
                    }}
                  />
                </ComboboxTrigger>

                {isTeamRoleAutocompleteOpen ? (
                  <ComboboxOptions className="h-[120px] w-[323px] overflow-hidden">
                    <ScrollArea viewportClassName="h-[120px]">
                      {teamRoleAutocompleteOptions.map((option) => (
                        <ComboboxOption key={option} value={option}>
                          {option}
                        </ComboboxOption>
                      ))}
                    </ScrollArea>
                  </ComboboxOptions>
                ) : null}
              </Combobox>
            </div>
            {roleDialogMode === "add" ? (
              <div className="flex h-[70px] w-[323px] flex-col items-start gap-1.5">
                <Label className="h-5 whitespace-nowrap text-sm font-medium leading-5 text-[#344054]">
                  Work Schedule
                </Label>
                <Select
                  value={draftRoleSchedule}
                  onValueChange={(value) =>
                    setDraftRoleSchedule(value as TeamRoleRow["schedule"])
                  }
                >
                  <SelectTrigger className="h-11 w-[323px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2.5 text-base font-normal leading-6 text-gray-black shadow-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="w-[323px]">
                    {teamRoleScheduleOptions.map((schedule) => (
                      <SelectItem key={schedule} value={schedule}>
                        {schedule}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {roleDialogMode === "rename" ? (
              <div className="flex h-8 w-[323px] items-center gap-4">
                <span className="w-20 shrink-0 text-sm font-medium text-gray-600">
                  Assigned to
                </span>
                <AvatarRoot>
                  <AvatarGroupButton
                    size="sm"
                    className="pointer-events-none !inline-flex !h-8 !w-8 !rounded-full !p-0 !text-gray-400"
                    aria-label="Assigned to"
                  >
                    <Plus className="h-4 w-4" />
                  </AvatarGroupButton>
                </AvatarRoot>
              </div>
            ) : null}
          </div>
          <div className="flex h-9 w-[323px] shrink-0 items-start gap-3">
            <Button
              type="button"
              variant="outlined"
              visual="gray"
              className="h-9 w-[155.5px] rounded-[5px] border-gray-300 bg-white px-[14px] py-2 text-sm font-semibold leading-5 text-gray-800 shadow-xs"
              onClick={closeRoleDialog}
            >
              <span className="h-5 w-12 text-center">Cancel</span>
            </Button>
            <Button
              type="button"
              className="h-9 w-[155.5px] rounded-[5px] bg-primary-500 px-[14px] py-2 text-sm font-semibold leading-5 text-white shadow-xs"
              onClick={saveRoleDialog}
            >
              <span className="h-5 w-9 text-center">Done</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

const steps: Steps[] = [
  { label: "Project Info", isValid: false, disabled: false },
  { label: "Describe Project", isValid: false, disabled: false },
  { label: "Project Scope", isValid: false, disabled: false },
  { label: "Team Roles", isValid: false, disabled: false },
  { label: "Final Check", isValid: false, disabled: false },
];

const [ProjectInfoProvider, useProjectInfoContext] = createContext<
  UseFormReturn<ProjectInfoFormValues>
>({
  displayName: "ProjectInfoProvider",
  errorMessage: `useProjectInfoContext returned is 'undefined'. Seems you forgot to wrap the components in "<ProjectInfoPopover />"`,
});

const [MediaProvider, useMediaContext] = createContext<
  UseFormReturn<MediaFormValues>
>({
  displayName: "MediaProvider",
  errorMessage: `useMediaContext returned is 'undefined'. Seems you forgot to wrap the components in "<MediaPopover />"`,
});

const [JobListingDraftProvider, useJobListingDraftContext] = createContext<{
  details: JobListingDraftDetails;
  setDetails: React.Dispatch<React.SetStateAction<JobListingDraftDetails>>;
}>({
  displayName: "JobListingDraftProvider",
  errorMessage: `useJobListingDraftContext returned is 'undefined'. Seems you forgot to wrap the components in "<JobListingDraftProvider />"`,
});

type EnsureJobListingDraft = () => Promise<string | null>;

const [ProjectScopeProvider, useProjectScopeContext] = createContext<{
  projectScopeMethods: [Phase[], React.Dispatch<React.SetStateAction<Phase[]>>];
  isProjectSubmitted: boolean;
  setIsProjectSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
  submissionOutcome: SubmissionOutcome | null;
  setSubmissionOutcome: React.Dispatch<
    React.SetStateAction<SubmissionOutcome | null>
  >;
  isTaskSearchDialogOpen: boolean;
  setTaskSearchDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({
  displayName: "MediaProvider",
  errorMessage: `useMediaContext returned is 'undefined'. Seems you forgot to wrap the components in "<MediaPopover />"`,
});

function PublishProject({
  media,
  projectInfo,
  projectScope,
  teamRoles,
}: {
  projectInfo?: React.ReactElement<ProjectInfoProps>;
  media?: React.ReactElement<
    ProgressProps & {
      workType?: WorkTypeChoice;
      jobListingId?: string | null;
      scopeKnowledgeChoice?: ScopeKnowledgeChoice;
    }
  >;
  projectScope?: React.ReactElement<ProgressProps>;
  teamRoles?: React.ReactElement<ProgressProps>;
}) {
  const initialStep = useMemo(() => {
    if (typeof window === "undefined") return undefined;

    const urlParams = new URLSearchParams(window.location.search);
    const urlJobListingId = urlParams.get("jobListingId");
    const isJobListingRoute = window.location.pathname.startsWith(
      "/job-listing",
    );
    return !isJobListingRoute &&
      (urlParams.get("edit") === "1" ||
        Boolean(urlJobListingId && UUID_PATTERN.test(urlJobListingId)))
      ? 1
      : undefined;
  }, []);
  const {
    nextStep,
    prevStep,
    setStep,
    toggleStepValidation,
    state: { currentStep, hasNextStep, hasPreviousStep, totalSteps },
    stepsState,
  } = useStepper({
    steps,
    currentStep: initialStep,
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const stepperValue = useMemo(
    () => ({ nextStep, prevStep, setStep, toggleStepValidation }),
    [nextStep, prevStep, setStep, toggleStepValidation],
  );
  const stepperRootValue = useMemo(
    () => ({
      currentStep,
      hasNextStep,
      hasPreviousStep,
      totalSteps,
      stepsState,
    }),
    [currentStep, hasNextStep, hasPreviousStep, totalSteps, stepsState],
  );
  const [isSaveExitDialogOpen, toggleIsSaveExitDialogOpen] = useToggle(false);
  const router = useRouter();
  const projectInfoMethods = useForm<ProjectInfoFormValues>({
    resolver: zodResolver(projectInfoSchema),
    defaultValues: {
      title: "",
      category: [
        { category: "Design", subCategories: ["UI/UX Design"] },
        { category: "Development", subCategories: ["Web Development"] },
        { category: "Marketing", subCategories: ["E-commerce"] },
      ],
      industry: ["E-commerce"],
      languages: ["English", "Spanish", "Japanese"],
      shortDescription:
        "This project needs support defining the scope, expected deliverables, and team requirements for a successful launch.",
      fullDescription:
        "This project needs support defining the scope, expected deliverables, and team requirements for a successful launch. The final listing should help match the right roles, skills, timeline, and budget before backend integration is connected.",
      tags: ["website", "e-commerce", "launch"],
      skills: ["UI/UX Design"],
    },
  });
  const mediaMethods = useForm<MediaFormValues>({
    resolver: zodResolver(mediaFormSchema),
    defaultValues: {
      featuredVideo: "",
    },
  });
  const projectScopeMethods = useState<Phase[]>([{}]);
  const [isProjectSubmitted, setIsProjectSubmitted] = useState(false);
  const [submissionOutcome, setSubmissionOutcome] =
    useState<SubmissionOutcome | null>(null);
  const [isTaskSearchDialogOpen, setTaskSearchDialogOpen] = useState(false);
  const [jobListingDraftDetails, setJobListingDraftDetails] =
    useState<JobListingDraftDetails>({});
  const [selectedWorkType, setSelectedWorkType] =
    useState<WorkTypeChoice>(null);
  const [selectedHiringMode, setSelectedHiringMode] =
    useState<HiringModeChoice>(null);
  const [scopeKnowledgeChoice, setScopeKnowledgeChoice] =
    useState<ScopeKnowledgeChoice>(null);
  const [isExistingContractFlow, setIsExistingContractFlow] = useState(false);
  const [isNoScopeFlow, setIsNoScopeFlow] = useState(false);
  const [selectedExistingContractId, setSelectedExistingContractId] = useState<
    string | null
  >(null);
  const lastCompletedStepRef = useRef(1);
  const [draftProjectId, setDraftProjectId] = useState<string | null>(null);
  const [jobListingId, setJobListingId] = useState<string | null>(null);
  const [isDraftBootstrapping, setIsDraftBootstrapping] = useState(true);
  const persistedMediaRef = useRef<{
    featuredImage?: string;
    additionalImages?: string[];
    featuredVideo?: string;
  } | null>(null);
  const lastDraftPayloadRef = useRef<string>("");
  const lastScopePayloadRef = useRef<string>("");
  const lastMediaPayloadRef = useRef<string>("");
  const skipNextJobListingDraftSaveRef = useRef(false);
  const jobListingSaveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingJobListingSavesRef = useRef<Set<() => Promise<void>>>(
    new Set(),
  );
  const lastJobListingTextSignatureRef = useRef<string>("");
  const lastJobListingNonTextSignatureRef = useRef<string>("");
  const ensureJobListingDraftPromiseRef = useRef<Promise<string | null> | null>(
    null,
  );
  const ensureJobListingDraftFailedUntilRef = useRef(0);
  const watchedProjectInfo = useWatch({ control: projectInfoMethods.control });

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const hydrateDraft = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const existingDraftId = urlParams.get("draftId");
      const urlJobListingId = urlParams.get("jobListingId");
      const storedJobListingId = window.sessionStorage.getItem(
        "marketeq-job-listing-id",
      );
      const type = urlParams.get("type") ?? "project";
      const isJobListingFlow =
        window.location.pathname.startsWith("/job-listing");
      const hasValidStoredJobListingId = Boolean(
        storedJobListingId && UUID_PATTERN.test(storedJobListingId),
      );
      const redirectToMyJobs = () => {
        if (cancelled) return;
        window.sessionStorage.removeItem("marketeq-job-listing-id");
        setIsDraftBootstrapping(false);
        router.replace("/my-jobs");
      };

      if (
        isJobListingFlow &&
        ((storedJobListingId && !hasValidStoredJobListingId) ||
          (urlJobListingId !== null &&
            (!hasValidStoredJobListingId ||
              urlJobListingId !== storedJobListingId)))
      ) {
        redirectToMyJobs();
        return;
      }

      const existingJobListingId = isJobListingFlow
        ? hasValidStoredJobListingId
          ? storedJobListingId
          : null
        : (existingDraftId ?? null);

      if (
        isJobListingFlow &&
        existingJobListingId &&
        UUID_PATTERN.test(existingJobListingId)
      ) {
        window.history.replaceState(
          window.history.state,
          "",
          `/job-listing?jobListingId=${encodeURIComponent(existingJobListingId)}`,
        );
      }

      try {
        if (
          isJobListingFlow &&
          existingJobListingId &&
          UUID_PATTERN.test(existingJobListingId)
        ) {
          const response = await JobListingAPI.Get(existingJobListingId);

          if (cancelled) return;

          const listing = getResponsePayload(response);
          if (listing?.status !== "draft") {
            redirectToMyJobs();
            return;
          }
          const nextJobListingId = String(
            listing?.id ?? existingJobListingId ?? "",
          );
          const hydratedWorkType = toWorkTypeChoice(
            listing?.workType ?? listing?.listingType,
          );
          const hydratedHiringMode = toHiringModeChoice(listing?.hiringType);
          const hydratedScopeKnowledge =
            listing?.scopeKnowledge === "no_scope_selected"
              ? ("none" as const)
              : listing?.scopeKnowledge === "no_scope"
                ? ("unknown" as const)
                : listing?.scopeKnowledge === "has_scope"
                  ? ("known" as const)
                  : null;

          setJobListingId(nextJobListingId || null);
          setDraftProjectId(null);
          setSelectedWorkType(hydratedWorkType);
          setSelectedHiringMode(hydratedHiringMode);
          setScopeKnowledgeChoice(hydratedScopeKnowledge);
          setIsNoScopeFlow(isNoScopeKnowledge(listing?.scopeKnowledge));
          setIsExistingContractFlow(listing?.contractType === "existing");
          setSelectedExistingContractId(
            typeof listing?.contractId === "string"
              ? listing.contractId
              : null,
          );

          if (nextJobListingId) {
            window.sessionStorage.setItem(
              "marketeq-job-listing-id",
              nextJobListingId,
            );
            const nextUrl = `/job-listing?jobListingId=${encodeURIComponent(
              nextJobListingId,
            )}`;
            window.history.replaceState(window.history.state, "", nextUrl);
          }

          const basicInformation = Array.isArray(listing?.basicInformation)
            ? listing.basicInformation[0]
            : typeof listing?.basicInformation === "object" &&
                listing?.basicInformation !== null
              ? listing.basicInformation
              : undefined;
          if (basicInformation || listing?.description) {
            const currentProjectInfo = projectInfoMethods.getValues();
            projectInfoMethods.reset({
              ...currentProjectInfo,
              title: basicInformation?.title ?? currentProjectInfo.title,
              category: Array.isArray(listing?.categorySelections)
                ? listing.categorySelections
                : currentProjectInfo.category,
              industry: Array.isArray(basicInformation?.industries)
                ? basicInformation.industries
                : currentProjectInfo.industry,
              languages: Array.isArray(basicInformation?.languages)
                ? basicInformation.languages
                : currentProjectInfo.languages,
              tags: Array.isArray(listing?.tags)
                ? listing.tags
                : currentProjectInfo.tags,
              skills: Array.isArray(listing?.skills)
                ? listing.skills
                : currentProjectInfo.skills,
              shortDescription:
                listing?.description ?? currentProjectInfo.shortDescription,
              fullDescription:
                listing?.deliverables ?? currentProjectInfo.fullDescription,
            });
          }
          const listingMedia =
            listing?.media &&
            typeof listing.media === "object" &&
            !Array.isArray(listing.media)
              ? listing.media
              : null;
          const featuredImageName =
            typeof listingMedia?.featuredImageName === "string"
              ? listingMedia.featuredImageName
              : "featured-image.jpg";
          const featuredImageUrl =
            typeof listingMedia?.featuredImage === "string"
              ? listingMedia.featuredImage
              : "";
          const additionalImageUrls = Array.isArray(
            listingMedia?.additionalImages,
          )
            ? listingMedia.additionalImages.filter(
                (url: unknown): url is string => typeof url === "string",
              )
            : [];
          const additionalImageNames = Array.isArray(
            listingMedia?.additionalImageNames,
          )
            ? listingMedia.additionalImageNames.filter(
                (name: unknown): name is string => typeof name === "string",
              )
            : [];
          const hydratedFeaturedImage = featuredImageUrl
            ? await hydrateRemoteMediaFile(featuredImageUrl, featuredImageName)
            : typeof listingMedia?.featuredImageName === "string"
              ? new File([""], listingMedia.featuredImageName, {
                  type: "image/jpeg",
                })
              : null;
          const hydratedAdditionalImages = await Promise.all(
            (additionalImageUrls.length > 0
              ? additionalImageUrls
              : additionalImageNames
            ).map((value: string, index: number) =>
              additionalImageUrls.length > 0
                ? hydrateRemoteMediaFile(
                    value,
                    additionalImageNames[index] ?? "additional-image.jpg",
                  )
                : Promise.resolve(
                    new File([""], value, { type: "image/jpeg" }),
                  ),
            ),
          );

          mediaMethods.reset({
            featuredImages: hydratedFeaturedImage
              ? [
                  {
                    meta: hydratedFeaturedImage,
                    progress: 100,
                    hasError: false,
                  },
                ]
              : [],
            additionalImages: hydratedAdditionalImages.map((file) => [
              {
                meta: file,
                progress: 100,
                hasError: false,
              },
            ]),
            featuredVideo:
              typeof listingMedia?.featuredVideo === "string"
                ? listingMedia.featuredVideo
                : "",
          });
          const nextBudgetAmount =
            toFiniteNumber(listing?.budgetAmount) ??
            toUsdAmountFromCents(listing?.budgetAmountUsdCents);
          const nextHeadcount =
            toFiniteNumber(listing?.headcount) ??
            (Array.isArray(listing?.teamMemberRows) &&
            listing.teamMemberRows.length > 0
              ? listing.teamMemberRows.length
              : undefined);
          const nextTeamRoleRows = createTeamRoleRowsFromApi(
            listing?.teamMemberRows,
          );
          const nextDurationMonths = toFiniteNumber(listing?.durationMonths);
          const nextBriefSizeBytes = toFiniteNumber(listing?.briefSizeBytes);
          setJobListingDraftDetails({
            jobListingId: nextJobListingId || undefined,
            description: toNullableString(listing?.description),
            deliverables: toNullableString(listing?.deliverables),
            successCriteria: toNullableString(listing?.successCriteria),
            headcount: nextHeadcount,
            budgetAmount: nextBudgetAmount,
            budgetFrequency:
              listing?.budgetFrequency === "per_month"
                ? "per_month"
                : listing?.budgetFrequency === "per_week"
                  ? "per_week"
                  : undefined,
            durationMonths: nextDurationMonths,
            isOngoing:
              typeof listing?.isOngoing === "boolean"
                ? listing.isOngoing
                : undefined,
            briefR2Key: toNullableString(listing?.briefR2Key),
            briefFilename: toNullableString(listing?.briefFilename),
            briefSizeBytes: nextBriefSizeBytes,
            tools: Array.isArray(listing?.tools) ? listing.tools : undefined,
            ndaEnabled:
              typeof listing?.ndaEnabled === "boolean"
                ? listing.ndaEnabled
                : undefined,
            ndaDocumentId:
              typeof listing?.ndaDocumentId === "string"
                ? listing.ndaDocumentId
                : null,
            teamRoleRows:
              nextTeamRoleRows.length > 0 ? nextTeamRoleRows : undefined,
          });
          const persistedJobListingScope =
            listing?.workType === "service"
              ? createServicePhasesFromPersistedJobListing(listing?.phases)
              : createPhasesFromPersistedJobListing(listing?.phases);
          if (persistedJobListingScope.length > 0) {
            projectScopeMethods[1](persistedJobListingScope as Phase[]);
          }

          lastDraftPayloadRef.current = "";
          skipNextJobListingDraftSaveRef.current = true;
          lastScopePayloadRef.current = "";
          lastMediaPayloadRef.current = JSON.stringify({
            featuredImage: featuredImageUrl,
            featuredImageName,
            additionalImages: additionalImageUrls,
            additionalImageNames,
            featuredVideo:
              typeof listingMedia?.featuredVideo === "string"
                ? listingMedia.featuredVideo
                : "",
          });
          const rawLastCompletedStep = listing?.lastCompletedStep;
          const lastCompletedStep =
            typeof rawLastCompletedStep === "number" &&
            Number.isInteger(rawLastCompletedStep) &&
            rawLastCompletedStep >= 1
              ? rawLastCompletedStep
              : 1;
          const boundedLastCompletedStep = Math.min(
            lastCompletedStep,
            totalSteps,
          );
          if (lastCompletedStep > totalSteps) {
            console.error(
              "Draft lastCompletedStep exceeds the available workflow steps.",
              { lastCompletedStep, totalSteps },
            );
          }
          lastCompletedStepRef.current = boundedLastCompletedStep;
          setStep(boundedLastCompletedStep - 1);
          setIsDraftBootstrapping(false);
          return;
        }

        if (isJobListingFlow) {
          setIsDraftBootstrapping(false);
          return;
        }

        let response;

        if (existingDraftId && UUID_PATTERN.test(existingDraftId)) {
          response = await ProjectAPI.GetProjectDraft(existingDraftId);
        } else {
          response = await ProjectAPI.CreateProjectDraft({});
          const nextDraftId = String(response?.data?.id ?? "");
          if (nextDraftId) {
            const nextPath = isJobListingFlow
              ? "/job-listing"
              : "/publish-project";
            const nextUrl = `${nextPath}?type=${encodeURIComponent(
              type,
            )}&draftId=${encodeURIComponent(nextDraftId)}`;
            window.history.replaceState(window.history.state, "", nextUrl);
          }
        }

        if (cancelled) return;

        const draft = response?.data ?? {};
        const nextDraftId = String(draft?.id ?? existingDraftId ?? "");
        setDraftProjectId(nextDraftId || null);

        const currentProjectInfo = projectInfoMethods.getValues();
        const shouldKeepCurrentDefaults = isJobListingFlow && !existingDraftId;
        const nextProjectInfo = {
          title:
            shouldKeepCurrentDefaults && !draft?.title
              ? currentProjectInfo.title
              : (draft?.title ?? ""),
          category:
            Array.isArray(draft?.categorySelections) &&
            draft.categorySelections.length > 0
              ? draft.categorySelections
              : shouldKeepCurrentDefaults
                ? (currentProjectInfo.category ?? [])
                : [],
          industry:
            Array.isArray(draft?.industries) && draft.industries.length > 0
              ? draft.industries
              : shouldKeepCurrentDefaults
                ? (currentProjectInfo.industry ?? [])
                : [],
          languages:
            Array.isArray(draft?.languages) && draft.languages.length > 0
              ? draft.languages
              : shouldKeepCurrentDefaults
                ? (currentProjectInfo.languages ?? [])
                : [],
          shortDescription:
            shouldKeepCurrentDefaults && !draft?.shortDescription
              ? currentProjectInfo.shortDescription
              : (draft?.shortDescription ?? ""),
          fullDescription:
            shouldKeepCurrentDefaults && !draft?.fullDescription
              ? currentProjectInfo.fullDescription
              : (draft?.fullDescription ?? ""),
          tags:
            Array.isArray(draft?.tags) && draft.tags.length > 0
              ? draft.tags
              : shouldKeepCurrentDefaults
                ? (currentProjectInfo.tags ?? [])
                : [],
          skills:
            Array.isArray(draft?.skills) && draft.skills.length > 0
              ? draft.skills
              : shouldKeepCurrentDefaults
                ? (currentProjectInfo.skills ?? [])
                : [],
        };

        projectInfoMethods.reset(nextProjectInfo);
        lastDraftPayloadRef.current = shouldKeepCurrentDefaults
          ? ""
          : JSON.stringify(buildProjectDraftPayload(nextProjectInfo));

        const persistedMedia = draft?.media
          ? {
              featuredImage: draft.media.featuredImage,
              additionalImages: Array.isArray(draft.media.additionalImages)
                ? draft.media.additionalImages
                : [],
              featuredVideo: draft.media.featuredVideo ?? "",
            }
          : null;
        persistedMediaRef.current = persistedMedia;

        const hydratedFeaturedImage = persistedMedia?.featuredImage
          ? await hydrateRemoteMediaFile(
              persistedMedia.featuredImage,
              "featured-image.jpg",
            )
          : null;
        const hydratedAdditionalImages = await Promise.all(
          (persistedMedia?.additionalImages ?? []).map((url: string) =>
            hydrateRemoteMediaFile(url, "additional-image.jpg"),
          ),
        );

        mediaMethods.reset({
          featuredImages: hydratedFeaturedImage
            ? [
                {
                  meta: hydratedFeaturedImage,
                  progress: 100,
                  hasError: false,
                },
              ]
            : [],
          additionalImages: hydratedAdditionalImages.map((file) => [
            {
              meta: file,
              progress: 100,
              hasError: false,
            },
          ]),
          featuredVideo: persistedMedia?.featuredVideo ?? "",
        });
        lastMediaPayloadRef.current = JSON.stringify({
          featuredImage: persistedMedia?.featuredImage ?? "",
          additionalImages: persistedMedia?.additionalImages ?? [],
          featuredVideo: persistedMedia?.featuredVideo ?? "",
        });

        const scope = Array.isArray(draft?.scope)
          ? draft.scope.map((phase: any) => ({
              phaseName: phase?.name ?? "",
              rows: Array.isArray(phase?.task)
                ? phase.task.map((task: any) => {
                    const durationRaw = String(task?.duration ?? "").trim();
                    const [durationValue, ...durationTypeParts] =
                      durationRaw.split(/\s+/);
                    return {
                      id: String(task?.id ?? getId()),
                      task: task?.taskName ?? "",
                      role: task?.role ?? "",
                      location: Array.isArray(task?.location)
                        ? (task.location[0] ?? "")
                        : "",
                      experience: Array.isArray(task?.experience)
                        ? (task.experience[0] ?? task?.experienceLevel ?? "")
                        : (task?.experienceLevel ?? ""),
                      duration: {
                        value: Number(durationValue) || 0,
                        type:
                          (durationTypeParts.join(" ") as
                            | "days"
                            | "weeks"
                            | "hours") || "weeks",
                      },
                    };
                  })
                : [],
            }))
          : [];

        projectScopeMethods[1](scope.length > 0 ? scope : [{}]);
        lastScopePayloadRef.current = JSON.stringify(
          buildScopeDraftPayload(nextDraftId, scope.length > 0 ? scope : []),
        );
      } catch (error) {
        console.error("Failed to hydrate project draft", error);
        if (isJobListingFlow && existingJobListingId) {
          redirectToMyJobs();
        }
      } finally {
        if (!cancelled) {
          setIsDraftBootstrapping(false);
        }
      }
    };

    void hydrateDraft();

    return () => {
      cancelled = true;
    };
  }, []);

  const ensureJobListingDraft = useCallback(async () => {
    if (jobListingId) return jobListingId;
    if (ensureJobListingDraftPromiseRef.current) {
      return ensureJobListingDraftPromiseRef.current;
    }
    if (Date.now() < ensureJobListingDraftFailedUntilRef.current) {
      return null;
    }

    ensureJobListingDraftPromiseRef.current = JobListingAPI.Create({
      contractType: isExistingContractFlow ? "existing" : "new",
      contractId: isExistingContractFlow
        ? resolveExistingContractApiId(selectedExistingContractId)
        : undefined,
      scopeKnowledge: getJobListingScopeKnowledge(
        selectedWorkType,
        isNoScopeFlow,
        scopeKnowledgeChoice,
      ),
      workType: getJobListingWorkType(selectedWorkType),
      hiringType: getJobListingHiringType(selectedHiringMode),
    })
      .then((response) => {
        const nextJobListingId = String(response?.data?.id ?? "");

        if (nextJobListingId && typeof window !== "undefined") {
          ensureJobListingDraftFailedUntilRef.current = 0;
          setJobListingId(nextJobListingId);
          window.sessionStorage.setItem(
            "marketeq-job-listing-id",
            nextJobListingId,
          );
          const nextUrl = `/job-listing?jobListingId=${encodeURIComponent(
            nextJobListingId,
          )}`;
          window.history.replaceState(window.history.state, "", nextUrl);
        }

        return nextJobListingId || null;
      })
      .catch((error) => {
        console.error("Failed to create job listing draft", error);
        ensureJobListingDraftFailedUntilRef.current = Date.now() + 10_000;
        return null;
      })
      .finally(() => {
        ensureJobListingDraftPromiseRef.current = null;
      });

    return ensureJobListingDraftPromiseRef.current;
  }, [
    isExistingContractFlow,
    isNoScopeFlow,
    jobListingId,
    scopeKnowledgeChoice,
    selectedExistingContractId,
    selectedHiringMode,
    selectedWorkType,
  ]);

  useEffect(() => {
    if (isProjectSubmitted || isDraftBootstrapping) return;
    const isJobListingFlow =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/job-listing");

    if (isJobListingFlow && jobListingId) {
      const info = {
        ...projectInfoMethods.getValues(),
        ...watchedProjectInfo,
      };
      const mediaPayload = buildJobListingMediaPayload(
        mediaMethods.getValues(),
      );
      const payload = {
        scopeKnowledge: getJobListingScopeKnowledge(
          selectedWorkType,
          isNoScopeFlow,
          scopeKnowledgeChoice,
        ),
        workType: getJobListingWorkType(selectedWorkType),
        hiringType: getJobListingHiringType(selectedHiringMode),
        description:
          jobListingDraftDetails.description ?? info.shortDescription ?? "",
        deliverables:
          jobListingDraftDetails.deliverables ?? info.fullDescription ?? "",
        successCriteria: jobListingDraftDetails.successCriteria,
        headcount: jobListingDraftDetails.headcount,
        categorySelections: info.category ?? [],
        tags: info.tags ?? [],
        skills: info.skills ?? [],
        tools: jobListingDraftDetails.tools ?? [],
        media: mediaPayload,
        budgetAmount: jobListingDraftDetails.budgetAmount,
        budgetDisplayCurrency: user?.currency || "USD",
        budgetFrequency: jobListingDraftDetails.budgetFrequency ?? "per_week",
        durationMonths: jobListingDraftDetails.durationMonths,
        isOngoing: jobListingDraftDetails.isOngoing,
        briefR2Key: jobListingDraftDetails.briefR2Key,
        briefFilename: jobListingDraftDetails.briefFilename,
        briefSizeBytes: jobListingDraftDetails.briefSizeBytes,
        ndaEnabled: jobListingDraftDetails.ndaEnabled,
      };
      if (
        (typeof payload.budgetAmount === "number" &&
          payload.budgetAmount < 0) ||
        getWordCount(payload.description ?? "") > STEP_TWO_WORD_LIMIT ||
        getWordCount(payload.deliverables ?? "") > STEP_TWO_WORD_LIMIT ||
        getWordCount(payload.successCriteria ?? "") > STEP_TWO_WORD_LIMIT
      ) {
        return;
      }
      const basicInfoPayload = {
        title: info.title ?? "",
        jobType: selectedWorkType ?? undefined,
        industries: info.industry ?? [],
        languages: info.languages ?? [],
      };
      const textSignature = JSON.stringify({
        title: basicInfoPayload.title,
        description: payload.description,
        deliverables: payload.deliverables,
        successCriteria: payload.successCriteria,
      });
      const nonTextSignature = JSON.stringify({
        scopeKnowledge: payload.scopeKnowledge,
        workType: payload.workType,
        hiringType: payload.hiringType,
        headcount: payload.headcount,
        budgetAmount: payload.budgetAmount,
        budgetDisplayCurrency: payload.budgetDisplayCurrency,
        budgetFrequency: payload.budgetFrequency,
        durationMonths: payload.durationMonths,
        isOngoing: payload.isOngoing,
        briefR2Key: payload.briefR2Key,
        briefFilename: payload.briefFilename,
        briefSizeBytes: payload.briefSizeBytes,
        ndaEnabled: payload.ndaEnabled,
        categorySelections: payload.categorySelections,
        tags: payload.tags,
        skills: payload.skills,
        tools: payload.tools,
        media: payload.media,
        jobType: basicInfoPayload.jobType,
        industries: basicInfoPayload.industries,
        languages: basicInfoPayload.languages,
      });
      const serializedPayload = JSON.stringify({
        payload,
        basicInfoPayload,
        textSignature,
        nonTextSignature,
      });

      if (skipNextJobListingDraftSaveRef.current) {
        skipNextJobListingDraftSaveRef.current = false;
        lastDraftPayloadRef.current = serializedPayload;
        lastJobListingTextSignatureRef.current = textSignature;
        lastJobListingNonTextSignatureRef.current = nonTextSignature;
        return;
      }

      const textChanged =
        lastJobListingTextSignatureRef.current !== textSignature;
      const nonTextChanged =
        lastJobListingNonTextSignatureRef.current !== nonTextSignature;
      if (!textChanged && !nonTextChanged) return;

      const textPayload = {
        description: payload.description,
        deliverables: payload.deliverables,
        successCriteria: payload.successCriteria,
      };
      const textBasicInfoPayload = {
        title: basicInfoPayload.title,
      };
      const nonTextPayload = {
        scopeKnowledge: payload.scopeKnowledge,
        workType: payload.workType,
        hiringType: payload.hiringType,
        headcount: payload.headcount,
        categorySelections: payload.categorySelections,
        tags: payload.tags,
        skills: payload.skills,
        tools: payload.tools,
        media: payload.media,
        budgetAmount: payload.budgetAmount,
        budgetDisplayCurrency: payload.budgetDisplayCurrency,
        budgetFrequency: payload.budgetFrequency,
        durationMonths: payload.durationMonths,
        isOngoing: payload.isOngoing,
        briefR2Key: payload.briefR2Key,
        briefFilename: payload.briefFilename,
        briefSizeBytes: payload.briefSizeBytes,
        ndaEnabled: payload.ndaEnabled,
      };
      const nonTextBasicInfoPayload = {
        jobType: basicInfoPayload.jobType,
        industries: basicInfoPayload.industries,
        languages: basicInfoPayload.languages,
      };

      const enqueueSave = (
        save: () => Promise<void>,
        delay: number,
      ) => {
        let timeout: number | undefined;
        const runSave = async (throwOnError: boolean) => {
          if (timeout !== undefined) window.clearTimeout(timeout);
          pendingJobListingSavesRef.current.delete(flushSave);

          const savePromise = jobListingSaveQueueRef.current.then(
            save,
            save,
          );
          jobListingSaveQueueRef.current = savePromise.catch(() => undefined);

          try {
            await savePromise;
          } catch (error) {
            console.error("Failed to save job listing draft", error);
            if (throwOnError) throw error;
          }
        };
        const flushSave = () => runSave(true);

        pendingJobListingSavesRef.current.add(flushSave);
        timeout = window.setTimeout(() => {
          void runSave(false);
        }, delay);

        return () => {
          if (timeout !== undefined) window.clearTimeout(timeout);
          pendingJobListingSavesRef.current.delete(flushSave);
        };
      };

      const cleanups: Array<() => void> = [];
      if (nonTextChanged) {
        cleanups.push(
          enqueueSave(async () => {
            await JobListingAPI.Update(jobListingId, nonTextPayload);
            await JobListingAPI.UpdateBasicInformation(
              jobListingId,
              nonTextBasicInfoPayload,
            );
            lastJobListingNonTextSignatureRef.current = nonTextSignature;
          }, 0),
        );
      }
      if (textChanged) {
        cleanups.push(
          enqueueSave(async () => {
            await JobListingAPI.Update(jobListingId, textPayload);
            await JobListingAPI.UpdateBasicInformation(
              jobListingId,
              textBasicInfoPayload,
            );
            lastJobListingTextSignatureRef.current = textSignature;
          }, 500),
        );
      }

      return () => cleanups.forEach((cleanup) => cleanup());
    }

    if (isJobListingFlow) return;

    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return;

    const saveDraft = async () => {
      const info = projectInfoMethods.getValues();
      const payload = buildProjectDraftPayload({
        title: info.title ?? "",
        category: info.category ?? [],
        industry: info.industry ?? [],
        languages: info.languages ?? [],
        tags: info.tags ?? [],
        skills: info.skills ?? [],
        shortDescription: info.shortDescription ?? "",
        fullDescription: info.fullDescription ?? "",
      });

      const serializedPayload = JSON.stringify(payload);
      if (serializedPayload === lastDraftPayloadRef.current) return;

      try {
        await ProjectAPI.UpdateProjectDraft(draftProjectId, payload);
        lastDraftPayloadRef.current = serializedPayload;
      } catch (error) {
        console.error("Failed to save project draft", error);
      }
    };

    void saveDraft();
    const interval = setInterval(() => {
      void saveDraft();
    }, 2000);
    return () => clearInterval(interval);
  }, [
    draftProjectId,
    ensureJobListingDraft,
    jobListingId,
    isDraftBootstrapping,
    isNoScopeFlow,
    scopeKnowledgeChoice,
    jobListingDraftDetails,
    mediaMethods,
    projectInfoMethods,
    isProjectSubmitted,
    selectedHiringMode,
    selectedWorkType,
    user?.currency,
    watchedProjectInfo,
  ]);

  useEffect(() => {
    if (jobListingId) return;
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return;

    const saveScope = async () => {
      const payload = buildScopeDraftPayload(
        draftProjectId,
        projectScopeMethods[0],
      );
      const serializedPayload = JSON.stringify(payload);

      if (serializedPayload === lastScopePayloadRef.current) return;

      try {
        await ProjectAPI.ReplaceProjectScope(draftProjectId, payload);
        lastScopePayloadRef.current = serializedPayload;
      } catch (error) {
        console.error("Failed to save project scope draft", error);
      }
    };

    void saveScope();
    const interval = setInterval(() => {
      void saveScope();
    }, 2000);

    return () => clearInterval(interval);
  }, [
    draftProjectId,
    jobListingId,
    isDraftBootstrapping,
    isProjectSubmitted,
    projectScopeMethods,
  ]);

  useEffect(() => {
    if (jobListingId) return;
    if (!draftProjectId || isProjectSubmitted || isDraftBootstrapping) return;

    const saveMedia = async () => {
      const mediaValues = mediaMethods.getValues();
      const featuredMeta = mediaValues.featuredImages?.[0]?.meta;
      const additionalMeta =
        mediaValues.additionalImages
          ?.flat()
          .map((item) => item?.meta)
          .filter(Boolean) ?? [];
      const videoUrl = mediaValues.featuredVideo?.trim() ?? "";

      const signature = JSON.stringify({
        featuredImage: isPersistedMediaFile(featuredMeta)
          ? featuredMeta.__persistedUrl
          : (featuredMeta?.name ?? ""),
        additionalImages: additionalMeta.map((item: any) =>
          isPersistedMediaFile(item) ? item.__persistedUrl : (item?.name ?? ""),
        ),
        featuredVideo: videoUrl,
      });

      if (signature === lastMediaPayloadRef.current) return;
      if (!featuredMeta) return;

      const formData = new FormData();
      formData.append("projectId", draftProjectId);

      const resolvedFeatured = await resolveMediaFileForUpload(
        featuredMeta,
        "featured-image.jpg",
      );
      if (!resolvedFeatured) return;
      formData.append("featuredImage", resolvedFeatured);

      for (const file of additionalMeta) {
        const resolvedAdditional = await resolveMediaFileForUpload(
          file,
          "additional-image.jpg",
        );
        if (resolvedAdditional) {
          formData.append("additionalImages", resolvedAdditional);
        }
      }

      if (videoUrl) {
        formData.append(
          "videoUrl",
          videoUrl.replace(/^(https?:\/\/)+/i, "https://"),
        );
      }

      try {
        const response = await ProjectAPI.UploadMedia(formData);
        const nextMedia = {
          featuredImage:
            response?.data?.featuredImage ??
            persistedMediaRef.current?.featuredImage ??
            "",
          additionalImages:
            response?.data?.additionalImages ??
            persistedMediaRef.current?.additionalImages ??
            [],
          featuredVideo:
            response?.data?.featuredVideo ??
            response?.data?.videoUrl ??
            videoUrl,
        };

        persistedMediaRef.current = nextMedia;
        lastMediaPayloadRef.current = JSON.stringify(nextMedia);

        mediaMethods.reset({
          featuredImages: nextMedia.featuredImage
            ? [
                {
                  meta: buildPersistedMediaFile(
                    nextMedia.featuredImage,
                    "featured-image.jpg",
                  ),
                  progress: 100,
                  hasError: false,
                },
              ]
            : [],
          additionalImages: (nextMedia.additionalImages ?? []).map(
            (url: string) => [
              {
                meta: buildPersistedMediaFile(url, "additional-image.jpg"),
                progress: 100,
                hasError: false,
              },
            ],
          ),
          featuredVideo: nextMedia.featuredVideo ?? "",
        });
      } catch (error) {
        console.error("Failed to save project media draft", error);
      }
    };

    const interval = setInterval(() => {
      void saveMedia();
    }, 2000);

    return () => clearInterval(interval);
  }, [
    draftProjectId,
    jobListingId,
    isDraftBootstrapping,
    isProjectSubmitted,
    mediaMethods,
  ]);

  const projectScopeValue = useMemo(
    () => ({
      projectScopeMethods,
      isProjectSubmitted,
      setIsProjectSubmitted,
      submissionOutcome,
      setSubmissionOutcome,
      isTaskSearchDialogOpen,
      setTaskSearchDialogOpen,
    }),
    [
      projectScopeMethods,
      isProjectSubmitted,
      setIsProjectSubmitted,
      submissionOutcome,
      setSubmissionOutcome,
      isTaskSearchDialogOpen,
      setTaskSearchDialogOpen,
    ],
  );
  const jobListingDraftValue = useMemo(
    () => ({
      details: jobListingDraftDetails,
      setDetails: setJobListingDraftDetails,
    }),
    [jobListingDraftDetails],
  );
  const isJobListingRoute =
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/job-listing");

  const saveJobListingStepProgress = React.useCallback(
    async (completedStep: number) => {
      if (!jobListingId) return;

      const info = {
        ...projectInfoMethods.getValues(),
        ...watchedProjectInfo,
      };
      const mediaPayload = buildJobListingMediaPayload(
        mediaMethods.getValues(),
      );
      const nextLastCompletedStep = Math.max(
        lastCompletedStepRef.current,
        completedStep,
      );
      const payload = {
        scopeKnowledge: getJobListingScopeKnowledge(
          selectedWorkType,
          isNoScopeFlow,
          scopeKnowledgeChoice,
        ),
        workType: getJobListingWorkType(selectedWorkType),
        hiringType: getJobListingHiringType(selectedHiringMode),
        description:
          jobListingDraftDetails.description ?? info.shortDescription ?? "",
        deliverables:
          jobListingDraftDetails.deliverables ?? info.fullDescription ?? "",
        successCriteria: jobListingDraftDetails.successCriteria,
        headcount: jobListingDraftDetails.headcount,
        categorySelections: info.category ?? [],
        tags: info.tags ?? [],
        skills: info.skills ?? [],
        tools: jobListingDraftDetails.tools ?? [],
        media: mediaPayload,
        budgetAmount: jobListingDraftDetails.budgetAmount,
        budgetDisplayCurrency: user?.currency || "USD",
        budgetFrequency: jobListingDraftDetails.budgetFrequency ?? "per_week",
        durationMonths: jobListingDraftDetails.durationMonths,
        isOngoing: jobListingDraftDetails.isOngoing,
        briefR2Key: jobListingDraftDetails.briefR2Key,
        briefFilename: jobListingDraftDetails.briefFilename,
        briefSizeBytes: jobListingDraftDetails.briefSizeBytes,
        ndaEnabled: jobListingDraftDetails.ndaEnabled,
        lastCompletedStep: nextLastCompletedStep,
      };
      const basicInfoPayload = {
        title: info.title ?? "",
        jobType: selectedWorkType ?? undefined,
        industries: info.industry ?? [],
        languages: info.languages ?? [],
      };
      const save = async () => {
        await JobListingAPI.Update(jobListingId, payload);
        await JobListingAPI.UpdateBasicInformation(
          jobListingId,
          basicInfoPayload,
        );
        lastCompletedStepRef.current = nextLastCompletedStep;
      };
      const savePromise = jobListingSaveQueueRef.current.then(save, save);
      jobListingSaveQueueRef.current = savePromise.catch(() => undefined);
      await savePromise;
    },
    [
      isNoScopeFlow,
      scopeKnowledgeChoice,
      jobListingDraftDetails,
      jobListingId,
      jobListingSaveQueueRef,
      mediaMethods,
      projectInfoMethods,
      selectedHiringMode,
      selectedWorkType,
      user?.currency,
      watchedProjectInfo,
    ],
  );

  //  Validate the current step when Next is clicked
  const validateCurrentStep = React.useCallback(async () => {
    if (currentStep === 0) {
      const isStepValid = isJobListingRoute
        ? Boolean(stepsState[currentStep]?.isValid)
        : await projectInfoMethods.trigger(undefined, {
            shouldFocus: true,
          });

      if (!isStepValid) {
        const firstInvalidTarget = PROJECT_INFO_VALIDATION_TARGETS.find(
          ({ name }) => projectInfoMethods.getFieldState(name).invalid,
        );
        if (firstInvalidTarget) {
          scrollToPublishField(firstInvalidTarget.targetId);
        }

        return false;
      }

      let createdJobListing = false;
      if (isJobListingRoute && !jobListingId) {
        try {
          const response = await JobListingAPI.Create({
            contractType: isExistingContractFlow ? "existing" : "new",
            contractId: isExistingContractFlow
              ? resolveExistingContractApiId(selectedExistingContractId)
              : undefined,
            scopeKnowledge: getJobListingScopeKnowledge(
              selectedWorkType,
              isNoScopeFlow,
              scopeKnowledgeChoice,
            ),
            workType: getJobListingWorkType(selectedWorkType),
            hiringType: getJobListingHiringType(selectedHiringMode),
            lastCompletedStep: 1,
          });

          if (response.status !== 201) {
            throw new Error("Unable to create job listing draft");
          }

          const listing = getResponsePayload(response);
          const nextJobListingId = String(listing?.id ?? "");
          if (!nextJobListingId) {
            throw new Error("Unable to create job listing draft");
          }

          skipNextJobListingDraftSaveRef.current = true;
          setJobListingId(nextJobListingId);
          lastCompletedStepRef.current = 1;
          createdJobListing = true;
          window.sessionStorage.setItem(
            "marketeq-job-listing-id",
            nextJobListingId,
          );
          window.history.replaceState(
            window.history.state,
            "",
            `/job-listing?jobListingId=${encodeURIComponent(nextJobListingId)}`,
          );
        } catch (error) {
          console.error("Failed to create job listing draft", error);
          toast({
            title: "Unable to start the job listing. Please try again.",
            variant: "destructive",
          });
          return false;
        }
      }

      if (isJobListingRoute && !createdJobListing) {
        try {
          await saveJobListingStepProgress(1);
        } catch (error) {
          console.error("Failed to save job listing step progress", error);
          return false;
        }
      }

      return isStepValid;
    }
    if (currentStep === 1) {
      const isStepValid = Boolean(stepsState[currentStep]?.isValid);
      if (!isStepValid) return false;

      if (isJobListingRoute) {
        try {
          await saveJobListingStepProgress(2);
        } catch (error) {
          console.error("Failed to save job listing step progress", error);
          return false;
        }
      }

      return true;
    }

    if (isJobListingRoute) {
      try {
        await saveJobListingStepProgress(currentStep + 1);
      } catch (error) {
        console.error("Failed to save job listing step progress", error);
        return false;
      }
    }

    // Later steps use their own schema checks.
    return true;
  }, [
    currentStep,
    isExistingContractFlow,
    isJobListingRoute,
    isNoScopeFlow,
    jobListingId,
    projectInfoMethods,
    scopeKnowledgeChoice,
    selectedHiringMode,
    selectedWorkType,
    saveJobListingStepProgress,
    stepsState,
    toast,
  ]);

  //  NEW: Track cumulative progress for all steps
  const [projectInfoProgress, setProjectInfoProgress] = useState(0);

  const [mediaProgress, setMediaProgress] = useState(0);
  const [projectScopeProgress, setProjectScopeProgress] = useState(0);
  const [teamRolesProgress, setTeamRolesProgress] = useState(0);
  const [finalReviewProgress, setFinalReviewProgress] = useState(0);

  const overallProgress = useMemo(() => {
    return (
      projectInfoProgress +
      mediaProgress +
      projectScopeProgress +
      teamRolesProgress +
      finalReviewProgress
    );
  }, [
    projectInfoProgress,
    mediaProgress,
    projectScopeProgress,
    teamRolesProgress,
    finalReviewProgress,
  ]);

  const handleSaveExit = React.useCallback(async () => {
    toggleIsSaveExitDialogOpen(false);
    const pendingSaves = Array.from(pendingJobListingSavesRef.current);
    pendingJobListingSavesRef.current.clear();
    try {
      await Promise.all(pendingSaves.map((pendingSave) => pendingSave()));
      await jobListingSaveQueueRef.current;
    } catch {
      return;
    }
    // Jobs live on My Jobs; /my-listings is a leftover from the project flow
    // this screen was built from.
    router.push("/my-jobs");
  }, [router, toggleIsSaveExitDialogOpen]);

  if (isJobListingRoute && isDraftBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Spinner size={32} strokeWidth={4} />
      </div>
    );
  }

  return isProjectSubmitted ? (
    <div className="min-h-screen flex flex-col">
      <Empty
        outcome={submissionOutcome ?? undefined}
        draftId={draftProjectId ?? undefined}
      />
    </div>
  ) : (
    <StepperProvider value={stepperValue}>
      <StepRootProvider value={stepperRootValue}>
        <div className="h-screen flex overflow-x-hidden">
          <ProjectInfoProvider value={projectInfoMethods}>
            <MediaProvider value={mediaMethods}>
              <JobListingDraftProvider value={jobListingDraftValue}>
                <ProjectScopeProvider value={projectScopeValue}>
                  <div className="flex-auto bg-gray-50 min-w-0 overflow-x-hidden">
                    <Header onSaveExit={toggleIsSaveExitDialogOpen} />
                    <SaveExitDialog
                      open={isSaveExitDialogOpen}
                      onOpenChange={toggleIsSaveExitDialogOpen}
                      onConfirm={handleSaveExit}
                    />
                    <StepControl className="contents">
                      {/*  Wrap steps to inject progress setter props */}
                      <Step className="contents">
                        {projectInfo && React.isValidElement(projectInfo)
                          ? React.cloneElement(projectInfo, {
                              setProgress: setProjectInfoProgress, // <-- inject progress
                              selectedWorkType,
                              onSelectedWorkTypeChange: setSelectedWorkType,
                              selectedHiringMode,
                              onSelectedHiringModeChange: setSelectedHiringMode,
                              scopeKnowledgeChoice,
                              isNoScopeFlow,
                              isExistingContractFlow,
                              selectedExistingContractId,
                              isWorkflowLocked: Boolean(jobListingId),
                              onScopeKnowledgeChange: setScopeKnowledgeChoice,
                              onNoScopeFlowChange: setIsNoScopeFlow,
                              onExistingContractFlowChange:
                                setIsExistingContractFlow,
                              onExistingContractSelectionChange:
                                setSelectedExistingContractId,
                            })
                          : null}
                      </Step>
                      <Step className="contents">
                        {isExistingContractFlow ? (
                          <ExistingContractRoleInfoStep
                            setProgress={setMediaProgress}
                          />
                        ) : isNoScopeFlow ? (
                          <NoScopeRoleInfoStep
                            setProgress={setMediaProgress}
                            hiringMode={selectedHiringMode}
                          />
                        ) : media && React.isValidElement(media) ? (
                          React.cloneElement(media, {
                            setProgress: setMediaProgress,
                            workType: selectedWorkType,
                            jobListingId,
                            scopeKnowledgeChoice,
                          })
                        ) : null}
                      </Step>
                      <Step className="contents">
                        <ReviewToolsTechnologiesStep
                          setProgress={setProjectScopeProgress}
                          jobListingId={jobListingId}
                          source={
                            isNoScopeFlow
                              ? "roles"
                              : selectedWorkType === "service"
                                ? "service"
                                : "project"
                          }
                        />
                      </Step>
                      <Step className="contents">
                        {isExistingContractFlow ? (
                          <TeamRoles
                            setProgress={setTeamRolesProgress}
                            initialValid
                            existingContractId={selectedExistingContractId}
                            hiringMode={selectedHiringMode}
                            jobListingId={jobListingId}
                            ensureJobListingDraft={ensureJobListingDraft}
                          />
                        ) : isNoScopeFlow ? (
                          <TeamRoles
                            setProgress={setTeamRolesProgress}
                            initialValid
                            hiringMode={selectedHiringMode}
                            jobListingId={jobListingId}
                            ensureJobListingDraft={ensureJobListingDraft}
                          />
                        ) : selectedWorkType === "service" ? (
                          <ServiceScopeEditStep
                            setProgress={setTeamRolesProgress}
                            jobListingId={jobListingId}
                          />
                        ) : selectedWorkType === "project" ? (
                          <ProjectScopeEditStep
                            setProgress={setTeamRolesProgress}
                            jobListingId={jobListingId}
                          />
                        ) : teamRoles && React.isValidElement(teamRoles) ? (
                          React.cloneElement(teamRoles, {
                            setProgress: setTeamRolesProgress,
                          })
                        ) : null}
                      </Step>
                      <Step className="contents">
                        {isExistingContractFlow ? (
                          <ExistingContractFinalReviewStep
                            setProgress={setFinalReviewProgress}
                            ndaDocumentId={
                              jobListingDraftDetails.ndaDocumentId ??
                              submissionOutcome?.ndaDocumentId ??
                              null
                            }
                            inheritedNda
                            jobListingId={jobListingId}
                            ensureJobListingDraft={ensureJobListingDraft}
                          />
                        ) : isNoScopeFlow ? (
                          <ExistingContractFinalReviewStep
                            setProgress={setFinalReviewProgress}
                            ndaDocumentId={
                              jobListingDraftDetails.ndaDocumentId ??
                              submissionOutcome?.ndaDocumentId ??
                              null
                            }
                            jobListingId={jobListingId}
                            ensureJobListingDraft={ensureJobListingDraft}
                          />
                        ) : selectedWorkType === "service" ? (
                          <FinalServiceReviewStep
                            setProgress={setFinalReviewProgress}
                            ndaDocumentId={
                              jobListingDraftDetails.ndaDocumentId ??
                              submissionOutcome?.ndaDocumentId ??
                              null
                            }
                            jobListingId={jobListingId}
                            ensureJobListingDraft={ensureJobListingDraft}
                          />
                        ) : selectedWorkType === "project" ? (
                          <FinalProjectReviewStep
                            setProgress={setFinalReviewProgress}
                            ndaDocumentId={
                              jobListingDraftDetails.ndaDocumentId ??
                              submissionOutcome?.ndaDocumentId ??
                              null
                            }
                            jobListingId={jobListingId}
                            ensureJobListingDraft={ensureJobListingDraft}
                          />
                        ) : null}
                      </Step>
                    </StepControl>
                    {/* Single BottomBar with global progress */}
                    <BottomBar
                      progressValue={overallProgress}
                      onNextClick={validateCurrentStep}
                      workType={selectedWorkType}
                      jobListingId={jobListingId}
                      selectedHiringMode={selectedHiringMode}
                      scopeKnowledgeChoice={scopeKnowledgeChoice}
                      isNoScopeFlow={isNoScopeFlow}
                      isExistingContractFlow={isExistingContractFlow}
                      selectedExistingContractId={selectedExistingContractId}
                    />{" "}
                    {/* <-- moved here */}
                  </div>
                </ProjectScopeProvider>
              </JobListingDraftProvider>
            </MediaProvider>
          </ProjectInfoProvider>
        </div>
      </StepRootProvider>
    </StepperProvider>
  );
}

export default function PublishRootProject() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "Create a Project | Marketeq";
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <PublishProject
        projectInfo={<ProjectInfo />}
        media={<DescribeProjectStep />}
        projectScope={<ProjectScope />}
        teamRoles={<TeamRoles />}
      />
      <Toaster />
    </>
  );
}
