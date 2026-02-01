import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Button } from '@/components/ui/button';

export function Gallery() {
    const { photos } = useOutletContext<AppDataContext>();
    const [selectedPhoto, setSelectedPhoto] = useState<(typeof photos)[0] | null>(null);

    return (
        <div className="page">
            <div className="flex flex-col gap-1">
                <h2 className="page-title">Gallery</h2>
                <p className="page-description">Browse all test photos</p>
            </div>

            <div className="gallery-grid">
                {photos.length === 0 ? (
                    <p className="page-description">No photos yet. Upload photos when creating a test.</p>
                ) : (
                    photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="gallery-item"
                            style={{ backgroundColor: photo.color }}
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            {photo.imageUrl ? (
                                <img src={photo.imageUrl} alt={photo.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                    {photo.label}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>

            {selectedPhoto && (
                <div className="modal-overlay flex items-center justify-center" onClick={() => setSelectedPhoto(null)}>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="modal-close text-white"
                        onClick={() => setSelectedPhoto(null)}
                        aria-label="Close"
                    >
                        ✕
                    </Button>
                    <div className="modal-content flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-image flex flex-col items-center justify-center">
                            {selectedPhoto.imageUrl ? (
                                <img
                                    src={selectedPhoto.imageUrl}
                                    alt={selectedPhoto.label}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <div
                                    className="flex flex-col items-center text-center"
                                    style={{ color: 'white', backgroundColor: selectedPhoto.color, width: '100%', height: '100%', justifyContent: 'center' }}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{selectedPhoto.label}</div>
                                    <div style={{ opacity: 0.8 }}>Test: {selectedPhoto.testId}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
