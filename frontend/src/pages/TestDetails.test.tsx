import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppDataContext } from "@/components/layout/AppShell";
import { TestDetails } from "./TestDetails";

let currentTestId = "1";
let outletContext: AppDataContext;
const navigateSpy = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );

  return {
    ...actual,
    useParams: () => ({ id: currentTestId }),
    useOutletContext: () => outletContext,
    useNavigate: () => navigateSpy,
  };
});

vi.mock("@/hooks", () => ({
  useDeviceDetection: () => ({ isMobile: false }),
  useTestDetailPhotos: () => ({
    apiPhotos: [],
    setApiPhotos: vi.fn(),
    photosWithDefects: [],
    loadPhotos: vi.fn(),
  }),
  useTestDelete: () => ({
    isDeleting: false,
    showDeleteConfirm: false,
    setShowDeleteConfirm: vi.fn(),
    handleDelete: vi.fn(),
  }),
  useTestUpdate: () => ({
    showUpdateModal: false,
    setShowUpdateModal: vi.fn(),
    showPhotoModal: false,
    setShowPhotoModal: vi.fn(),
    photoNotice: null,
    photosToDelete: [],
    setPhotosToDelete: vi.fn(),
    newPhotoPreviews: [],
    draft: {},
    setDraft: vi.fn(),
    colors: [],
    openUpdate: vi.fn(),
    handlePhotoSelect: vi.fn(),
    handleRemoveNewPhoto: vi.fn(),
    handleRotateNewPhoto: vi.fn(),
    handleOpenCropNewPhoto: vi.fn(),
    handleApplyCropNewPhoto: vi.fn(),
    handleUpdateSave: vi.fn(),
    handleColorCreated: vi.fn(),
    showCropModal: false,
    cropImageUrl: null,
    closeCropModal: vi.fn(),
  }),
}));

vi.mock("@/components/tests", () => ({
  TestNotFound: () => <div>Not Found</div>,
  TestDetailHeader: () => <div>Header</div>,
  TestInformationCard: () => <div>Information</div>,
  PhotoGalleryCard: () => <div>Photos</div>,
  DefectsCard: () => <div>Defects</div>,
  MobileActionButtons: () => <div>Mobile Actions</div>,
  DesktopActionBar: () => <div>Desktop Actions</div>,
  DeleteConfirmModal: () => null,
  UpdateTestModal: () => null,
  PhotoSourceModal: () => null,
  CropModal: () => null,
  QCMatrixCard: () => <div>Matrix</div>,
}));

describe("TestDetails scroll reset", () => {
  let appContentScrollTo: ReturnType<typeof vi.fn>;
  let windowScrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    currentTestId = "1";
    navigateSpy.mockReset();

    outletContext = {
      tests: [
        { id: "1", colors: [] },
        { id: "2", colors: [] },
      ] as unknown as AppDataContext["tests"],
      testsLoaded: true,
      photos: [],
      auditEvents: [],
      addTest: vi.fn(),
      addPhoto: vi.fn(),
      addAuditEvent: vi.fn(),
      removeTest: vi.fn(),
      removePhotosForTest: vi.fn(),
      removePhoto: vi.fn(),
      updateTest: vi.fn(),
      refreshTests: vi.fn(async () => undefined),
    };

    document.body.innerHTML = "";

    const appContent = document.createElement("div");
    appContent.className = "app-content";
    appContentScrollTo = vi.fn();

    Object.defineProperty(appContent, "scrollTo", {
      configurable: true,
      value: appContentScrollTo,
    });

    document.body.appendChild(appContent);

    windowScrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      writable: true,
      value: windowScrollTo,
    });
  });

  it("scrolls the page and app container to the top when the test id changes", () => {
    const { rerender } = render(<TestDetails />);

    expect(windowScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    expect(appContentScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });

    windowScrollTo.mockClear();
    appContentScrollTo.mockClear();

    currentTestId = "2";
    rerender(<TestDetails />);

    expect(windowScrollTo).toHaveBeenCalledOnce();
    expect(windowScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
    expect(appContentScrollTo).toHaveBeenCalledOnce();
    expect(appContentScrollTo).toHaveBeenCalledWith({
      top: 0,
      left: 0,
      behavior: "auto",
    });
  });
});
