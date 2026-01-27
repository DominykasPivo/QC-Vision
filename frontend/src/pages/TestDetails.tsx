import { Link, useOutletContext, useParams } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TestDetails() {
    const { tests } = useOutletContext<AppDataContext>();
    const { id } = useParams<{ id: string }>();
    const test = tests.find((t) => t.id === id);

    if (!test) {
        return (
            <div className="page">
                <Link to="/tests" className="back-link">
                    ← Back to Tests
                </Link>
                <h2 className="page-title">Test Not Found</h2>
                <p className="page-description">The requested test could not be found.</p>
            </div>
        );
    }

    return (
        <div className="page">
            <Link to="/tests" className="back-link">
                ← Back to Tests
            </Link>

            <h2 className="page-title">{test.id}</h2>
            <p className="page-description">{test.productType} • {test.testType}</p>

            <div className="flex flex-col gap-4">
                <Card className="details-section">
                    <CardHeader className="p-0">
                        <CardTitle className="details-section-title">Test Information</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-2 p-0">
                        <div><strong>External Order:</strong> {test.externalOrderId}</div>
                        <div><strong>Product Type:</strong> {test.productType}</div>
                        <div><strong>Test Type:</strong> {test.testType}</div>
                        <div><strong>Requester:</strong> {test.requester}</div>
                        <div><strong>Deadline:</strong> {test.deadline}</div>
                        <div><strong>Status:</strong> {test.status}</div>
                    </CardContent>
                </Card>

                <div className="flex flex-col gap-4 md:flex-row">
                    <Card className="details-section flex-1">
                        <CardHeader className="p-0">
                            <CardTitle className="details-section-title">Photos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="details-placeholder" />
                        </CardContent>
                    </Card>

                    <Card className="details-section flex-1">
                        <CardHeader className="p-0">
                            <CardTitle className="details-section-title">Defects</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="details-placeholder" />
                        </CardContent>
                    </Card>
                </div>

                <Card className="details-section">
                    <CardHeader className="p-0">
                        <CardTitle className="details-section-title">Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="details-placeholder" />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
