import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatEnumLabel,
  TEST_STATUSES,
  TEST_TYPES,
  type TestStatus,
  type TestType,
} from "@/lib/db-constants";
import type { ApiPhoto } from "@/hooks/useTestDetailPhotos";
import { ExistingPhotosGrid } from "./update-test-modal/ExistingPhotosGrid";
import { NewPhotosGrid } from "./update-test-modal/NewPhotosGrid";

interface UpdateDraft {
  jiraId: string;
  productName: string;
  testType: TestType;
  requester: string;
  assignedTo: string;
  description: string;
  deadline: string;
  status: TestStatus;
}

interface UpdateTestModalProps {
  show: boolean;
  isMobile: boolean;
  draft: UpdateDraft;
  apiPhotos: ApiPhoto[];
  photosToDelete: string[];
  newPhotoPreviews: { file: File; url: string }[];
  photoNotice: string | null;
  onClose: () => void;
  onSave: () => void;
  onDraftChange: (updates: Partial<UpdateDraft>) => void;
  onOpenPhotoModal: () => void;
  onPhotoSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveExistingPhoto: (photoId: string) => void;
  onRemoveNewPhoto: (index: number) => void;
}

export function UpdateTestModal({
  show,
  isMobile,
  draft,
  apiPhotos,
  photosToDelete,
  newPhotoPreviews,
  photoNotice,
  onClose,
  onSave,
  onDraftChange,
  onOpenPhotoModal,
  onPhotoSelect,
  onRemoveExistingPhoto,
  onRemoveNewPhoto,
}: UpdateTestModalProps) {
  if (!show) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.3)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
          <h3 className="text-2xl font-bold text-[#111827]">Update Test</h3>
          <p className="mt-1 text-sm text-gray-600">
            Edit the fields below and save your changes.
          </p>
        </div>

        <div className="max-h-[72vh] space-y-5 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Jira ID
              </label>
              <Input
                className="h-11 rounded-xl border-gray-300 text-gray-900"
                value={draft.jiraId}
                onChange={(e) => onDraftChange({ jiraId: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Product Name
              </label>
              <Input
                className="h-11 rounded-xl border-gray-300 text-gray-900"
                value={draft.productName}
                onChange={(e) => onDraftChange({ productName: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Test Type
              </label>
              <Select
                value={draft.testType}
                onValueChange={(value) =>
                  onDraftChange({ testType: value as TestType })
                }
              >
                <SelectTrigger
                  className="h-11 rounded-xl border-gray-300 text-gray-900"
                  id="update-test-type"
                >
                  <SelectValue placeholder="Select test type" />
                </SelectTrigger>
                <SelectContent className="z-[260]">
                  {TEST_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatEnumLabel(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Requester
              </label>
              <Input
                className="h-11 rounded-xl border-gray-300 text-gray-900"
                value={draft.requester}
                onChange={(e) => onDraftChange({ requester: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Assigned To
              </label>
              <Input
                className="h-11 rounded-xl border-gray-300 text-gray-900"
                value={draft.assignedTo}
                onChange={(e) => onDraftChange({ assignedTo: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Deadline
              </label>
              <Input
                type="date"
                className="h-11 rounded-xl border-gray-300 text-gray-900"
                value={draft.deadline || ""}
                onChange={(e) => onDraftChange({ deadline: e.target.value })}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Description
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition-colors focus:border-[#2563eb]"
                placeholder="Enter test description"
                value={draft.description}
                onChange={(e) => onDraftChange({ description: e.target.value })}
                rows={4}
                style={{ resize: "vertical" }}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Status
              </label>
              <Select
                value={draft.status}
                onValueChange={(value) =>
                  onDraftChange({ status: value as TestStatus })
                }
              >
                <SelectTrigger
                  className="h-11 rounded-xl border-gray-300 text-gray-900"
                  id="update-status"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent className="z-[260]">
                  {TEST_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatEnumLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.2em] text-gray-500">
                Add Photos (up to 6 total)
              </label>
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl border-gray-300 px-4 font-semibold text-gray-700"
                onClick={onOpenPhotoModal}
              >
                {isMobile ? "Add Photos" : "Choose Images"}
              </Button>
              <input
                id="camera-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                multiple
                style={{ display: "none" }}
                onChange={onPhotoSelect}
              />
              <input
                id="gallery-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={onPhotoSelect}
              />
              <input
                id="desktop-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={onPhotoSelect}
              />

              {photoNotice && (
                <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {photoNotice}
                </div>
              )}

              {(apiPhotos.length > 0 || newPhotoPreviews.length > 0) && (
                <div className="mt-4 space-y-4">
                  <ExistingPhotosGrid
                    apiPhotos={apiPhotos}
                    photosToDelete={photosToDelete}
                    onRemoveExistingPhoto={onRemoveExistingPhoto}
                  />
                  <NewPhotosGrid
                    newPhotoPreviews={newPhotoPreviews}
                    onRemoveNewPhoto={onRemoveNewPhoto}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-gray-300 px-5 font-semibold text-gray-700"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-11 rounded-xl bg-[#2563eb] px-5 font-semibold text-white hover:bg-[#1d4ed8]"
            onClick={onSave}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
