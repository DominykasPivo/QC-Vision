import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFECT_CATEGORIES,
  DEFECT_SEVERITIES,
  formatEnumLabel,
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
import { ImageAnnotator } from '@/components/annotations/ImageAnnotator';
import { AnnotationToolbar } from '@/components/annotations/AnnotationToolbar';
import type { Annotation, AnnotationGeometry, DrawingTool } from '@/lib/annotation-types';

type DefectFormState = {
  category_id: number;
  severity: DefectSeverity;
  description: string;
  annotations: AnnotationGeometry[];
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
    category_id: DEFECT_CATEGORIES[0].id,
    severity: DEFECT_SEVERITIES[0],
    description: '',
    annotations: [],
  });
  const [currentTool, setCurrentTool] = useState<DrawingTool>('select');
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);

  const photoPreviewUrl = useMemo(() => {
    if (!photoId) {
      return '';
    }
    return `/api/v1/photos/${photoId}/image?t=${Date.now()}`;
  }, [photoId]);

  const resetForm = () => {
    setForm({
      category_id: DEFECT_CATEGORIES[0].id,
      severity: DEFECT_SEVERITIES[0],
      description: '',
      annotations: [],
    });
    setCurrentTool('select');
    setSelectedAnnotation(null);
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
    setCurrentTool('rect'); // Start with rectangle tool
  };

  const openEdit = (defect: DefectRecord) => {
    const firstAnnotation = defect.annotations && defect.annotations.length > 0 ? defect.annotations[0] : null;
    setForm({
      category_id: firstAnnotation ? firstAnnotation.category_id : DEFECT_CATEGORIES[0].id,
      severity: (DEFECT_SEVERITIES.includes(defect.severity as DefectSeverity)
        ? (defect.severity as DefectSeverity)
        : DEFECT_SEVERITIES[0]) as DefectSeverity,
      description: defect.description ?? '',
      annotations: [],
    });
    setActionError(null);
    setEditingDefect(defect);
  };

  const handleAnnotationCreate = (geometry: AnnotationGeometry) => {
    setForm(prev => ({
      ...prev,
      annotations: [...prev.annotations, geometry],
    }));
    setCurrentTool('select');
  };

  const handleAnnotationDelete = (index: number) => {
    setForm(prev => ({
      ...prev,
      annotations: prev.annotations.filter((_, i) => i !== index),
    }));
  };

  // Get all annotations for the photo
  const allAnnotations: Annotation[] = useMemo(() => {
    return defects.flatMap(defect => defect.annotations || []);
  }, [defects]);

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
    if (form.annotations.length === 0) {
      setActionError('Please draw at least one annotation on the photo.');
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      const annotationsPayload = form.annotations.map(geometry => ({
        category_id: form.category_id,
        geometry,
      }));
      console.log('Creating defect with payload:', {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
        annotations: annotationsPayload,
      });
      await createDefect(photoId, {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
        annotations: annotationsPayload,
      });
      setShowCreate(false);
      resetForm();
      await loadDefects();
    } catch (error) {
      console.error('Failed to create defect:', error);
      setActionError(error instanceof Error ? error.message : 'Failed to create defect.');
    } finally {
      setIsSaving(false);
    }
  };

  const cancelCreate = () => {
    setShowCreate(false);
    resetForm();
  };

  const openFormModal = () => {
    if (form.annotations.length === 0) {
      setActionError('Please draw at least one annotation on the photo first.');
      return;
    }
    // Keep showCreate true, but we'll show a different modal
  };

  const handleUpdate = async () => {
    if (!editingDefect || isSaving) {
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      console.log('Updating defect with payload:', {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
      });
      await updateDefect(editingDefect.id, {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
      });
      setEditingDefect(null);
      resetForm();
      await loadDefects();
    } catch (error) {
      console.error('Failed to update defect:', error);
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
          <CardTitle className="details-section-title">Photo with Annotations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-4 p-4">
            {showCreate && (
              <>
                <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-4">
                  <div className="text-base font-semibold text-blue-900">
                    📝 New Defect - Fill details and draw on image below
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="form-group">
                      <label className="form-label font-medium">Category *</label>
                      <Select
                        value={String(form.category_id)}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: Number(value) }))}
                      >
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="update-select-content">
                          {DEFECT_CATEGORIES.map((category) => (
                            <SelectItem key={category.id} value={String(category.id)}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label font-medium">Severity *</label>
                      <Select
                        value={form.severity}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, severity: value as DefectSeverity }))}
                      >
                        <SelectTrigger className="form-select">
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
                      <label className="form-label font-medium">Description</label>
                      <input
                        type="text"
                        className="form-input"
                        value={form.description}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="Optional description..."
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center justify-between">
                    <span className="text-sm text-gray-700">
                      {form.annotations.length === 0 ? (
                        <span className="text-orange-600 font-medium">⚠️ Draw at least one shape on the image</span>
                      ) : (
                        <span className="text-green-600 font-medium">✓ {form.annotations.length} annotation{form.annotations.length !== 1 ? 's' : ''} drawn</span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        className="btn btn-secondary"
                        onClick={cancelCreate}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={handleCreate}
                        disabled={form.annotations.length === 0 || isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Defect'}
                      </Button>
                    </div>
                  </div>
                </div>
                
                <AnnotationToolbar
                  currentTool={currentTool}
                  onToolChange={setCurrentTool}
                  disabled={false}
                />
              </>
            )}
            <ImageAnnotator
              imageUrl={photo?.url ?? photoPreviewUrl}
              annotations={showCreate ? form.annotations.map((geom, idx) => ({
                id: -idx - 1,
                defect_id: -1,
                category_id: form.category_id,
                geometry: geom,
                created_at: new Date().toISOString(),
              })) : allAnnotations}
              currentTool={showCreate ? currentTool : 'select'}
              onAnnotationCreate={showCreate ? handleAnnotationCreate : undefined}
              onAnnotationSelect={setSelectedAnnotation}
              selectedAnnotationId={selectedAnnotation?.id}
              readonly={!showCreate}
            />
            {showCreate && form.annotations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Drawn annotations ({form.annotations.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.annotations.map((ann, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded">
                      <span className="text-sm capitalize">{ann.type}</span>
                      <button
                        type="button"
                        onClick={() => handleAnnotationDelete(index)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {photo?.file_path ? (
              <div className="photo-meta">File: {photo.file_path}</div>
            ) : (
              <div className="photo-meta">Photo ID: {photoId}</div>
            )}
            {actionError && <div className="text-red-600 text-sm font-medium">{actionError}</div>}
          </div>
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
                const firstAnnotation = defect.annotations && defect.annotations.length > 0 ? defect.annotations[0] : null;
                const category = firstAnnotation ? DEFECT_CATEGORIES.find(c => c.id === firstAnnotation.category_id) : null;
                const categoryLabel = category ? category.name : 'Unknown';
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

      {editingDefect && (
        <div className="modal-overlay flex items-center justify-center" onClick={() => setEditingDefect(null)}>
          <div className="modal-content defect-modal" onClick={(event) => event.stopPropagation()}>
            <div className="delete-confirm__title">Edit Defect</div>
            <div className="delete-confirm__body">Update the details and save changes.</div>
            <div className="flex flex-col gap-3 update-modal__fields">
              <div className="form-group">
                <label className="form-label">Category</label>
                <Select
                  value={String(form.category_id)}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, category_id: Number(value) }))}
                >
                  <SelectTrigger className="form-select" id="defect-category-edit">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="update-select-content">
                    {DEFECT_CATEGORIES.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
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
