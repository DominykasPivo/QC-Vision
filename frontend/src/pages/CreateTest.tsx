import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CreateTest() {
    const navigate = useNavigate();
    const [showToast, setShowToast] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        productId: '',
        testType: '',
        requester: '',
        assignedTo: '',
        deadline: '',
        status: 'pending',
    });

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/v1/tests/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: parseInt(formData.productId),
                    testType: formData.testType.trim(),
                    requester: formData.requester.trim(),
                    assignedTo: formData.assignedTo.trim() || null,
                    status: formData.status,
                    deadlineAt: formData.deadline ? new Date(formData.deadline).toISOString() : null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to create test');
            }

            await response.json();
            
            // Show success toast
            setShowToast(true);
            setTimeout(() => {
                setShowToast(false);
                navigate('/tests'); // Redirect to tests list
            }, 2000);

            // Reset form
            setFormData({
                productId: '',
                testType: '',
                requester: '',
                assignedTo: '',
                deadline: '',
                status: 'pending',
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create test');
            console.error('Error creating test:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="page">
            <h2 className="page-title">Create Test</h2>
            <p className="page-description">Create a new quality control test</p>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="form-group">
                    <label className="form-label" htmlFor="productId">
                        Product ID
                    </label>
                    <Input
                        type="number"
                        id="productId"
                        name="productId"
                        className="form-input"
                        placeholder="e.g. 12345"
                        value={formData.productId}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="testType">
                            Test Type
                        </label>
                        <Input
                            type="text"
                            id="testType"
                            name="testType"
                            className="form-input"
                            placeholder="Enter test type"
                            value={formData.testType}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="requester">
                            Requester
                        </label>
                        <Input
                            type="text"
                            id="requester"
                            name="requester"
                            className="form-input"
                            placeholder="Enter requester name"
                            value={formData.requester}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="assignedTo">
                            Assigned To (Optional)
                        </label>
                        <Input
                            type="text"
                            id="assignedTo"
                            name="assignedTo"
                            className="form-input"
                            placeholder="Enter assignee name"
                            value={formData.assignedTo}
                            onChange={handleChange}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="deadline">
                            Deadline
                        </label>
                        <Input
                            type="date"
                            id="deadline"
                            name="deadline"
                            className="form-input"
                            value={formData.deadline}
                            onChange={handleChange}
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="status">
                        Status
                    </label>
                    <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}
                        disabled={isLoading}
                    >
                        <SelectTrigger id="status" className="form-select">
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Button type="submit" className="btn btn-primary btn-block" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Test'}
                </Button>
            </form>

            {showToast && (
                <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded shadow-lg">
                    ✓ Test created successfully! Redirecting...
                </div>
            )}
        </div>
    );
}