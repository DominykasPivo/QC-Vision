import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFECT_CATEGORIES,
  DEFECT_SEVERITIES,
  formatEnumLabel,
  type DefectCategory,
  type DefectSeverity,
} from '@/lib/db-constants';
import {
  createDefect,
  deleteDefect,
  getDefectsByPhoto,
  getPhoto,
  updateDefect,
  type DefectRecord,
  type PhotoRecord,
} from '@/lib/api/defects';

type DefectFormState = {
  category: DefectCategory;
  severity: DefectSeverity;
  description: string;
};

export function PhotoDefects() {
  const { photoId } = useParams<{ photoId: string }>();
  const navigate = useNavigate();
  const [photo, setPhoto] = useState<PhotoRecord | null>(null);
  const [defects, setDefects] = useState<DefectRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectRecord | null>(null);
  const [deletingDefect, setDeletingDefect] = useState<DefectRecord | null>(null);
  const [form, setForm] = useState<DefectFormState>({
    category: DEFECT_CATEGORIES[0],
    severity: DEFECT_SEVERITIES[0],
    description: '',
  });

  const photoPreviewUrl = useMemo(() => {
    if (!photoId) {
      return '';
    }
    return `/api/v1/photos/${photoId}/image?t=${Date.now()}`;
  }, [photoId]);

  const resetForm = () => {
    setForm({
      category: DEFECT_CATEGORIES[0],
      severity: DEFECT_SEVERITIES[0],
      description: '',
    });
  };

  const loadDefects = async () => {
    if (!photoId) {
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getDefectsByPhoto(photoId);
      setDefects(Array.isArray(data) ? data : []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load defects.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!photoId) {
      return;
    }
    loadDefects();
    getPhoto(photoId)
      .then((data) => setPhoto(data))
      .catch(() => setPhoto(null));
  }, [photoId]);

  if (!photoId) {
    return (
      <div className="page">
        <button type="button" className="back-link" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h2 className="page-title">Photo</h2>
        <p className="page-description">Photo ID is missing.</p>
      </div>
    );
  }

  const openCreate = () => {
    resetForm();
    setActionError(null);
    setShowCreate(true);
  };

  const openEdit = (defect: DefectRecord) => {
    setForm({
      category: (DEFECT_CATEGORIES.includes(defect.category as DefectCategory)
        ? (defect.category as DefectCategory)
        : DEFECT_CATEGORIES[0]) as DefectCategory,
      severity: (DEFECT_SEVERITIES.includes(defect.severity as DefectSeverity)
        ? (defect.severity as DefectSeverity)
        : DEFECT_SEVERITIES[0]) as DefectSeverity,
      description: defect.description ?? '',
    });
    setActionError(null);
    setEditingDefect(defect);
  };

  const formatTimestamp = (value?: string | null) => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  };

  const handleCreate = async () => {
    if (!photoId || isSaving) {
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      await createDefect(photoId, {
        category: form.category,
        severity: form.severity,
        description: form.description.trim() || null,
      });
      setShowCreate(false);
      resetForm();
      await loadDefects();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to create defect.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingDefect || isSaving) {
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      await updateDefect(editingDefect.id, {
        category: form.category,
        severity: form.severity,
        description: form.description.trim() || null,
      });
      setEditingDefect(null);
      resetForm();
      await loadDefects();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update defect.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingDefect || isSaving) {
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      await deleteDefect(deletingDefect.id);
      setDeletingDefect(null);
      await loadDefects();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to delete defect.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="page">
      <button type="button" className="back-link" onClick={() => navigate(-1)}>
        ← Back
      </button>
      <h2 className="page-title">Photo</h2>
      <p className="page-description">Defects linked to this photo.</p>

      <Card className="details-section">
        <CardHeader className="p-0">
          <CardTitle className="details-section-title">Preview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="photo-preview">
            <img src={photo?.url ?? photoPreviewUrl} alt="Selected photo" />
          </div>
          {photo?.file_path ? (
            <div className="photo-meta">File: {photo.file_path}</div>
          ) : (
            <div className="photo-meta">Photo ID: {photoId}</div>
          )}
        </CardContent>
      </Card>

      <Card className="details-section">
        <CardHeader className="p-0 defect-header">
          <CardTitle className="details-section-title">Defects</CardTitle>
          <Button type="button" className="btn btn-primary" onClick={openCreate}>
            Add defect
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="details-placeholder">Loading defects...</div>
          ) : loadError ? (
            <div className="defect-error">
              <div className="details-placeholder">{loadError}</div>
              <Button type="button" className="btn btn-secondary" onClick={loadDefects}>
                Retry
              </Button>
            </div>
          ) : defects.length === 0 ? (
            <div className="details-placeholder">No defects yet.</div>
          ) : (
            <div className="defect-list">
              {defects.map((defect) => {
                const severityValue = String(defect.severity ?? 'unknown');
                const severityKey = severityValue.toLowerCase();
                const categoryLabel = formatEnumLabel(String(defect.category ?? 'Unknown'));
                return (
                  <Card key={defect.id} className="defect-card">
                    <CardHeader className="defect-card-header">
                      <div>
                        <div className="defect-category">{categoryLabel}</div>
                        <div className="defect-date">
                          Created {formatTimestamp(defect.created_at ?? defect.createdAt)}
                        </div>
                      </div>
                      <span className={`defect-chip defect-chip--${severityKey}`}>
                        {formatEnumLabel(severityValue)}
                      </span>
                    </CardHeader>
                  <CardContent className="defect-card-content">
                    <div className="defect-description">
                      {defect.description?.trim() ? defect.description : 'No description provided.'}
                    </div>
                    <div className="defect-actions">
                      <Button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => openEdit(defect)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setDeletingDefect(defect)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreate && (
        <div className="modal-overlay flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="modal-content defect-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm__title">Add Defect</div>
            <div className="delete-confirm__body">Fill out the details below.</div>
            <div className="flex flex-col gap-3 update-modal__fields">
              <div className="form-group">
                <label className="form-label">Category</label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as DefectCategory }))}
                >
                  <SelectTrigger className="form-select" id="defect-category-create">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="update-select-content">
                    {DEFECT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <Select
                  value={form.severity}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, severity: value as DefectSeverity }))}
                >
                  <SelectTrigger className="form-select" id="defect-severity-create">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent className="update-select-content">
                    {DEFECT_SEVERITIES.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {formatEnumLabel(severity)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              {actionError && <div className="defect-error-text">{actionError}</div>}
            </div>
            <div className="delete-confirm__actions" style={{ marginTop: '16px' }}>
              <Button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreate(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" className="btn btn-primary" onClick={handleCreate} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editingDefect && (
        <div className="modal-overlay flex items-center justify-center" onClick={() => setEditingDefect(null)}>
          <div className="modal-content defect-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm__title">Edit Defect</div>
            <div className="delete-confirm__body">Update the details and save changes.</div>
            <div className="flex flex-col gap-3 update-modal__fields">
              <div className="form-group">
                <label className="form-label">Category</label>
                <Select
                  value={form.category}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, category: value as DefectCategory }))}
                >
                  <SelectTrigger className="form-select" id="defect-category-edit">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="update-select-content">
                    {DEFECT_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group">
                <label className="form-label">Severity</label>
                <Select
                  value={form.severity}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, severity: value as DefectSeverity }))}
                >
                  <SelectTrigger className="form-select" id="defect-severity-edit">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent className="update-select-content">
                    {DEFECT_SEVERITIES.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {formatEnumLabel(severity)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="form-group">
                <label className="form-label">Description (optional)</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                />
              </div>
              {actionError && <div className="defect-error-text">{actionError}</div>}
            </div>
            <div className="delete-confirm__actions" style={{ marginTop: '16px' }}>
              <Button
                type="button"
                className="btn btn-secondary"
                onClick={() => setEditingDefect(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" className="btn btn-primary" onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {deletingDefect && (
        <div className="modal-overlay flex items-center justify-center" onClick={() => setDeletingDefect(null)}>
          <div className="modal-content delete-confirm" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm__title">Delete defect?</div>
            <div className="delete-confirm__body">
              This action cannot be undone.
              {actionError && <div className="defect-error-text">{actionError}</div>}
            </div>
            <div className="delete-confirm__actions">
              <Button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingDefect(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="button" className="btn btn-danger" onClick={handleDelete} disabled={isSaving}>
                {isSaving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
