import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DEFECT_CATEGORIES,
  DEFECT_COLORS,
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
  updateAnnotation,
  deleteAnnotation,
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
  color: string;
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
    color: DEFECT_COLORS[0].value,
    annotations: [],
  });
  const [currentTool, setCurrentTool] = useState<DrawingTool>('select');
  const [selectedAnnotation, setSelectedAnnotation] = useState<Annotation | null>(null);
  const [previewingDefect, setPreviewingDefect] = useState<DefectRecord | null>(null);
  const [isMoveMode, setIsMoveMode] = useState(false);
  const [isDrawingMode, setIsDrawingMode] = useState(false);

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
      color: DEFECT_COLORS[0].value,
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
    setPreviewingDefect(null);
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
    setPreviewingDefect(null);
    setEditingDefect(null); 
    setShowCreate(true);
    setCurrentTool('rect'); 
  };

  const openEdit = (defect: DefectRecord) => {
    const firstAnnotation = defect.annotations && defect.annotations.length > 0 ? defect.annotations[0] : null;
    setForm({
      category_id: firstAnnotation ? firstAnnotation.category_id : DEFECT_CATEGORIES[0].id,
      severity: (DEFECT_SEVERITIES.includes(defect.severity as DefectSeverity)
        ? (defect.severity as DefectSeverity)
        : DEFECT_SEVERITIES[0]) as DefectSeverity,
      description: defect.description ?? '',
      color: firstAnnotation?.color ?? DEFECT_COLORS[0].value,
      annotations: [],
    });
    setActionError(null);
    setShowCreate(false);
    setIsDrawingMode(false);
    setIsMoveMode(false);
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

  const handleAnnotationUpdate = async (annotationId: number, geometry: AnnotationGeometry) => {
    if (annotationId < 0) {
      // Temporary annotation (from form)
      const index = -annotationId - 1;
      setForm(prev => ({
        ...prev,
        annotations: prev.annotations.map((ann, i) => i === index ? geometry : ann),
      }));
      return;
    }

    // Existing annotation (from database)
    try {
      await updateAnnotation(annotationId, { geometry });
      const refreshedDefects = await getDefectsByPhoto(photoId!);
      setDefects(Array.isArray(refreshedDefects) ? refreshedDefects : []);
      
      // Update editingDefect if we're editing
      if (editingDefect) {
        const updated = refreshedDefects.find(d => d.id === editingDefect.id);
        if (updated) setEditingDefect(updated);
      }
    } catch (error) {
      console.error('Failed to update annotation:', error);
      setActionError(error instanceof Error ? error.message : 'Failed to update annotation.');
    }
  };

  const handleAnnotationDeletePermanent = async (annotationId: number) => {
    if (annotationId < 0) {
      // Temporary annotation (from form)
      const index = -annotationId - 1;
      handleAnnotationDelete(index);
      return;
    }

    // Existing annotation (from database)
    try {
      await deleteAnnotation(annotationId);
      const refreshedDefects = await getDefectsByPhoto(photoId!);
      setDefects(Array.isArray(refreshedDefects) ? refreshedDefects : []);
      
      // Update editingDefect if we're editing
      if (editingDefect) {
        const updated = refreshedDefects.find(d => d.id === editingDefect.id);
        if (updated) setEditingDefect(updated);
      }
    } catch (error) {
      console.error('Failed to delete annotation:', error);
      setActionError(error instanceof Error ? error.message : 'Failed to delete annotation.');
    }
  };

  // Get all annotations for the photo
  const allAnnotations: Annotation[] = useMemo(() => {
    return defects.flatMap(defect => defect.annotations || []);
  }, [defects]);

  // Annotations to display: filtered when previewing a single defect or editing
  const displayedAnnotations: Annotation[] = useMemo(() => {
    if (previewingDefect) {
      return previewingDefect.annotations || [];
    }
    if (editingDefect) {
      return editingDefect.annotations || [];
    }
    return allAnnotations;
  }, [previewingDefect, editingDefect, allAnnotations]);

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
        color: form.color,
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
      const payload: any = {
        category_id: form.category_id,
        severity: form.severity,
        description: form.description.trim() || null,
        color: form.color,
      };
      
      // Add new annotations if any were drawn
      if (form.annotations.length > 0) {
        payload.annotations = form.annotations.map(geom => ({
          category_id: form.category_id,
          geometry: geom,
          color: form.color,
        }));
      }
      
      await updateDefect(editingDefect.id, payload);
      setEditingDefect(null);
      setIsDrawingMode(false);
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
                      <textarea
                        className="form-input"
                        value={form.description}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        placeholder="Optional description..."
                        rows={5}
                        maxLength={500}
                        style={{ resize: 'vertical', minHeight: '100px' }}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-medium">Annotation Color</label>
                    <div className="flex gap-2 items-center">
                      {DEFECT_COLORS.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, color: c.value }))}
                          className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c.value ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
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
            {!showCreate && !editingDefect && (
              <div className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-sm text-gray-700 font-medium">
                  {previewingDefect 
                    ? `Previewing defect #${previewingDefect.id} (${previewingDefect.annotations?.length ?? 0} annotations)` 
                    : 'View all defects'}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className={`btn ${isMoveMode ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                    onClick={() => setIsMoveMode(!isMoveMode)}
                  >
                    {isMoveMode ? '🔓 Moving' : '🔒 Move'}
                  </Button>
                  {previewingDefect && (
                    <Button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                      onClick={() => setPreviewingDefect(null)}
                    >
                      Show All
                    </Button>
                  )}
                </div>
              </div>
            )}
            {editingDefect && !showCreate && (
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <span className="text-sm text-orange-800 font-medium">
                    ✏️ Editing defect #{editingDefect.id} - {(editingDefect.annotations?.length ?? 0) + form.annotations.length} annotation(s)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      className={`btn ${isDrawingMode ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                      onClick={() => {
                        setIsDrawingMode(!isDrawingMode);
                        setIsMoveMode(false);
                        if (!isDrawingMode) {
                          setCurrentTool('rect');
                        } else {
                          setCurrentTool('select');
                        }
                      }}
                    >
                      {isDrawingMode ? '✏️ Drawing' : '➕ Draw'}
                    </Button>
                    <Button
                      type="button"
                      className={`btn ${isMoveMode ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                      onClick={() => {
                        setIsMoveMode(!isMoveMode);
                        setIsDrawingMode(false);
                        setCurrentTool('select');
                      }}
                    >
                      {isMoveMode ? '🔓 Moving' : '🔒 Move'}
                    </Button>
                    <Button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '2px 10px', fontSize: '0.8rem' }}
                      onClick={() => {
                        if (form.annotations.length > 0) {
                          handleUpdate();
                        } else {
                          setEditingDefect(null);
                          setSelectedAnnotation(null);
                          setIsMoveMode(false);
                          setIsDrawingMode(false);
                          setCurrentTool('select');
                        }
                      }}
                    >
                      {form.annotations.length > 0 ? 'Save' : 'Done'}
                    </Button>
                  </div>
                </div>
                {isMoveMode && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    🔓 <strong>Move Mode Active:</strong> Click and drag annotations to reposition them
                  </div>
                )}
                {isDrawingMode && (
                  <div className="p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                    ✏️ <strong>Drawing Mode Active:</strong> Draw new annotations to add to this defect
                  </div>
                )}
                
                {isDrawingMode && (
                  <AnnotationToolbar
                    currentTool={currentTool}
                    onToolChange={setCurrentTool}
                    disabled={false}
                  />
                )}
              </div>
            )}
            <ImageAnnotator
              imageUrl={photo?.url ?? photoPreviewUrl}
              annotations={
                showCreate 
                  ? form.annotations.map((geom, idx) => ({
                      id: -idx - 1,
                      defect_id: -1,
                      category_id: form.category_id,
                      geometry: geom,
                      color: form.color,
                      created_at: new Date().toISOString(),
                    }))
                  : editingDefect
                    ? [
                        ...(editingDefect.annotations || []),
                        ...form.annotations.map((geom, idx) => ({
                          id: -(idx + 1 + (editingDefect.annotations?.length || 0)),
                          defect_id: editingDefect.id as number,
                          category_id: form.category_id,
                          geometry: geom,
                          color: form.color,
                          created_at: new Date().toISOString(),
                        }))
                      ]
                    : displayedAnnotations
              }
              currentTool={showCreate || isDrawingMode ? currentTool : 'select'}
              onAnnotationCreate={showCreate || isDrawingMode ? handleAnnotationCreate : undefined}
              onAnnotationSelect={setSelectedAnnotation}
              onAnnotationUpdate={handleAnnotationUpdate}
              onAnnotationDelete={handleAnnotationDeletePermanent}
              selectedAnnotationId={selectedAnnotation?.id}
              readonly={false}
              enableMove={!showCreate && !isDrawingMode && isMoveMode}
            />
            {!showCreate && !editingDefect && isMoveMode && (
              <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                🔓 <strong>Move Mode Active:</strong> Click and drag any annotation to reposition it
              </div>
            )}
            {editingDefect && form.annotations.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  New annotations to add ({form.annotations.length}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {form.annotations.map((ann, index) => (
                    <div key={index} className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded">
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
                        className={`btn ${previewingDefect?.id === defect.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPreviewingDefect(prev => prev?.id === defect.id ? null : defect)}
                      >
                        {previewingDefect?.id === defect.id ? 'Previewing' : 'Preview'}
                      </Button>
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

      {editingDefect && !isDrawingMode && (
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
              <div className="form-group">
                <label className="form-label">Annotation Color</label>
                <div className="flex gap-2 items-center">
                  {DEFECT_COLORS.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, color: c.value }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c.value ? 'border-gray-800 scale-110' : 'border-gray-300'}`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
              {editingDefect && editingDefect.annotations && editingDefect.annotations.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Annotations ({editingDefect.annotations.length})</label>
                  <div className="space-y-2">
                    {editingDefect.annotations.map((ann) => {
                      const category = DEFECT_CATEGORIES.find(c => c.id === ann.category_id);
                      return (
                        <div key={ann.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full border border-gray-300" 
                              style={{ backgroundColor: ann.color ?? form.color }}
                            />
                            <span className="text-sm capitalize font-medium">{ann.geometry.type}</span>
                            <span className="text-xs text-gray-500">• {category ? category.name : 'Unknown'}</span>
                          </div>
                          <Button
                            type="button"
                            onClick={async () => {
                              if (confirm('Delete this annotation?')) {
                                await handleAnnotationDeletePermanent(ann.id);
                                
                              }
                            }}
                            className="btn btn-danger"
                            style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                            disabled={isSaving}
                          >
                            Delete
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {form.annotations.length > 0 && (
                <div className="form-group">
                  <label className="form-label">New Annotations to Add ({form.annotations.length})</label>
                  <div className="space-y-2">
                    {form.annotations.map((ann, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-gray-300" 
                            style={{ backgroundColor: form.color }}
                          />
                          <span className="text-sm capitalize font-medium">{ann.type}</span>
                          <span className="text-xs text-green-600">• New</span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleAnnotationDelete(index)}
                          className="btn btn-danger"
                          style={{ padding: '4px 12px', fontSize: '0.875rem' }}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {actionError && <div className="defect-error-text">{actionError}</div>}
            </div>
            <div className="delete-confirm__actions" style={{ marginTop: '16px' }}>
              <Button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingDefect(null);
                  resetForm();
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsDrawingMode(true);
                  setCurrentTool('rect');
                }}
                disabled={isSaving}
              >
                ✏️ Add Annotations
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
