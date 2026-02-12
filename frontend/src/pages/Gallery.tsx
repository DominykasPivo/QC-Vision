import { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Pagination } from '@/components/ui/pagination';

const PAGE_SIZE = 20;

export function Gallery() {
    const { tests } = useOutletContext<AppDataContext>();
    const [photos, setPhotos] = useState<Array<{ id: number; test_id: number; file_path: string; url?: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

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

    const totalPages = Math.max(1, Math.ceil(photos.length / PAGE_SIZE));
    const paginatedPhotos = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return photos.slice(start, start + PAGE_SIZE);
    }, [photos, currentPage]);

    return (
        <div className="page">
            <div className="flex flex-col gap-1">
                <h2 className="page-title">Gallery</h2>
                <p className="page-description">Browse all test photos</p>
            </div>

            {loading ? (
                <p className="page-description">Loading photos...</p>
            ) : photos.length === 0 ? (
                <p className="page-description">No photos yet. Upload photos when creating a test.</p>
            ) : (
                <>
                    <div className="gallery-grid">
                        {paginatedPhotos.map((photo) => (
                            <Link
                                key={photo.id}
                                className="gallery-item"
                                style={{ backgroundColor: '#1f2937' }}
                                to={`/photos/${photo.id}`}
                            >
                                {photo.url ? (
                                    <img src={photo.url} alt={`Photo ${photo.id}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <span style={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        Loading...
                                    </span>
                                )}
                            </Link>
                        ))}
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </>
            )}
        </div>
    );
}
