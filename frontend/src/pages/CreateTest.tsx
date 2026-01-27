import { useState, type FormEvent } from 'react';
import { useOutletContext } from 'react-router-dom';
import type { AppDataContext } from '../components/layout/AppShell';
import type { Test } from '../mock/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function CreateTest() {
    const { tests, auditEvents, addTest, addAuditEvent } = useOutletContext<AppDataContext>();
    const [showToast, setShowToast] = useState(false);
    const [formData, setFormData] = useState({
        externalOrderId: '',
        productType: '',
        testType: '',
        requester: '',
        deadline: '',
        status: 'pending',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const nextTestNumber = tests.length + 1;
        const nextTestId = `TEST-${String(nextTestNumber).padStart(3, '0')}`;
        const nextAuditNumber = auditEvents.length + 1;
        const nextAuditId = `AUD-${String(nextAuditNumber).padStart(3, '0')}`;

        const newTest: Test = {
            id: nextTestId,
            externalOrderId: formData.externalOrderId.trim(),
            productType: formData.productType.trim(),
            testType: formData.testType.trim(),
            requester: formData.requester.trim(),
            deadline: formData.deadline,
            status: formData.status as Test['status'],
        };

        addTest(newTest);
        addAuditEvent({
            id: nextAuditId,
            event: `Test ${newTest.id} created by ${newTest.requester}`,
            timestamp: new Date().toISOString(),
        });

        // Show success toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);

        // Reset form
        setFormData({
            externalOrderId: '',
            productType: '',
            testType: '',
            requester: '',
            deadline: '',
            status: 'pending',
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    return (
        <div className="page">
            <h2 className="page-title">Create Test</h2>
            <p className="page-description">Create a new quality control test</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="form-group">
                    <label className="form-label" htmlFor="externalOrderId">
                        External Order ID
                    </label>
                    <Input
                        type="text"
                        id="externalOrderId"
                        name="externalOrderId"
                        className="form-input"
                        placeholder="e.g. ORD-2024-001"
                        value={formData.externalOrderId}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="form-group flex-1">
                        <label className="form-label" htmlFor="productType">
                            Product Type
                        </label>
                        <Input
                            type="text"
                            id="productType"
                            name="productType"
                            className="form-input"
                            placeholder="Enter product type"
                            value={formData.productType}
                            onChange={handleChange}
                            required
                        />
                    </div>

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
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row">
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
                            required
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

                <Button type="submit" className="btn btn-primary btn-block">
                    Create Test
                </Button>
            </form>

            {showToast && (
                <div className="toast">
                    ✓ Test created and added to Tests and Audit Log.
                </div>
            )}
        </div>
    );
}
