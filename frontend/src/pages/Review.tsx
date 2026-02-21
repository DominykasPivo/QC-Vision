import { useEffect, useMemo, useState } from 'react';
import { request } from '@/lib/api/http';
import { getStoredUsername, getStoredRole } from '@/lib/auth';

type TestResponse = {
  id: number;
  product_id: number;
  test_type: string;
  requester: string;
  assigned_to: string | null;
  description: string | null;
  status: string;
  review_status: string; // "pending" | "approved" | "rejected"
};

export function Review() {
  const [tests, setTests] = useState<TestResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const username = useMemo(() => getStoredUsername(), []);
  const role = useMemo(() => getStoredRole?.() ?? 'user', []); // in case getStoredRole isn't defined

  const headers = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'X-User': username || 'system',
      'X-Role': role || 'user',
    }),
    [username, role],
  );

  async function loadPending() {
    setLoading(true);
    setError(null);
    try {
      // Your backend list endpoint
      const res = await request<{ items: TestResponse[] }>('/api/v1/tests/?limit=100');

      // Only show pending reviews here
      const pending = (res.items ?? []).filter((t) => t.review_status === 'pending');
      setTests(pending);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load review items');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const approveTest = async (id: number) => {
    try {
      await request<TestResponse>(`/api/v1/tests/${id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ decision: 'approved' }), // ✅ correct payload
      });

      // Remove from review list (because it's no longer pending)
      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'Approve failed');
    }
  };

  const rejectTest = async (id: number) => {
    try {
      await request(`/api/v1/tests/${id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ decision: 'rejected' }),
      });

      setTests((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      alert(e?.message ?? 'Reject failed');
    }
  };


  if (loading) return <div style={{ padding: 24 }}>Loading review queue…</div>;
  if (error) return <div style={{ padding: 24 }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 980 }}>
      <h2 style={{ marginBottom: 6 }}>Review</h2>
      <p style={{ marginTop: 0, color: '#666' }}>Pending Tests will be shown here.</p>

      {tests.length === 0 ? (
        <div style={{ marginTop: 18 }}>No pending tests.</div>
      ) : (
        <div style={{ display: 'grid', gap: 16, marginTop: 18 }}>
          {tests.map((t) => (
            <div
              key={t.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: 14,
                padding: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ color: '#666', fontSize: 14 }}>Test #{t.id}</div>
                <div style={{ fontSize: 26, fontWeight: 700, margin: '6px 0 10px' }}>
                  Product {t.product_id}
                </div>

                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  <div>
                    <b>Type:</b> {t.test_type}
                  </div>
                  <div>
                    <b>Status:</b> {t.status}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 8 }}>
                  <div>
                    <b>Requester:</b> {t.requester}
                  </div>
                  <div>
                    <b>Assigned:</b> {t.assigned_to ?? '—'}
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <b>Description:</b> {t.description ?? '—'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => approveTest(t.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: '1px solid #16a34a',
                    background: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Approve
                </button>

                <button
                  type="button"
                  onClick={() => rejectTest(t.id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 12,
                    border: '1px solid #ef4444',
                    background: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}