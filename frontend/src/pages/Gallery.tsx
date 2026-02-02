import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Button } from '@/components/ui/button';

export function Gallery() {
    const { tests } = useOutletContext<AppDataContext>();
    const [selectedPhoto, setSelectedPhoto] = useState<{ id: number; test_id: number; file_path: string; url?: string } | null>(null);
    const [photos, setPhotos] = useState<Array<{ id: number; test_id: number; file_path: string; url?: string }>>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllPhotos = async () => {
            try {
                setLoading(true);
                const allPhotos: Array<{ id: number; test_id: number; file_path: string; url?: string }> = [];
                
                // Fetch photos for each test
                for (const test of tests) {
                    const response = await fetch(`/api/v1/photos/test/${test.id}`);
                    if (response.ok) {
                        const testPhotos = await response.json();
                        
                        // Fetch presigned URLs for each photo
                        const photosWithUrls = await Promise.all(
                            testPhotos.map(async (photo: any) => {
                                // Use direct image endpoint with timestamp to prevent caching
                                return { ...photo, url: `/api/v1/photos/${photo.id}/image?t=${Date.now()}` };
                            })
                        );
                        
                        allPhotos.push(...photosWithUrls);
                    }
                }
                
                setPhotos(allPhotos);
            } catch (error) {
                console.error('Failed to fetch photos:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllPhotos();
    }, [tests]);

    return (
        <div className="page">
            <div className="flex flex-col gap-1">
                <h2 className="page-title">Gallery</h2>
                <p className="page-description">Browse all test photos</p>
            </div>

            {loading ? (
                <p className="page-description">Loading photos...</p>
            ) : (
                <div className="gallery-grid">
                    {photos.length === 0 ? (
                        <p className="page-description">No photos yet. Upload photos when creating a test.</p>
                    ) : (
                        photos.map((photo) => (
                            <div
                                key={photo.id}
                                className="gallery-item"
                                style={{ backgroundColor: '#1f2937' }}
                                onClick={() => setSelectedPhoto(photo)}
                            >
                                {photo.url ? (
                                    <img src={photo.url} alt={`Photo ${photo.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        Loading...
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

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
                            {selectedPhoto.url ? (
                                <img
                                    src={selectedPhoto.url}
                                    alt={`Photo ${selectedPhoto.id}`}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            ) : (
                                <div
                                    className="flex flex-col items-center text-center"
                                    style={{ color: 'white', backgroundColor: '#1f2937', width: '100%', height: '100%', justifyContent: 'center' }}
                                >
                                    <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Photo {selectedPhoto.id}</div>
                                    <div style={{ opacity: 0.8 }}>Test: {selectedPhoto.test_id}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
